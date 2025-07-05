
"use client";

import { v4 as uuidv4 } from 'uuid';
import { api } from './api';
import type { UploadItem, UploadProgress, UploadError, MessageSubtype, Message, CloudinaryUploadParams, MediaMessagePayload } from '@/types';
import { UploadErrorCode, ERROR_MESSAGES } from '@/types/uploadErrors';
import { storageService } from './storageService';
import { imageProcessor } from './imageProcessor';
import { videoCompressor } from './videoCompressor';
import { networkMonitor, type NetworkQuality } from './networkMonitor';

// A simple event emitter
type ProgressListener = (progress: UploadProgress) => void;
const progressListeners: Set<ProgressListener> = new Set();

const emitProgress = (progress: UploadProgress) => {
  progressListeners.forEach(listener => listener(progress));
};

class UploadManager {
  private queue: UploadItem[] = [];
  private activeUploads: Map<string, XMLHttpRequest> = new Map();
  private maxConcurrentUploads = 3;
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
        if ((window as any).uploadManagerInstance) {
            return (window as any).uploadManagerInstance;
        }
        (window as any).uploadManagerInstance = this;
        this.init();
        networkMonitor.subscribe(this.handleNetworkChange);
        this.handleNetworkChange(networkMonitor.getQuality());
    }
  }

  private async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;
    const pendingItems = await storageService.getAllPendingUploads();
    if (pendingItems.length > 0) {
      console.log(`UploadManager: Resuming ${pendingItems.length} pending uploads.`);
      this.queue.unshift(...pendingItems.map(item => ({ ...item, status: 'pending', progress: 0 })));
      this.processQueue();
    }
  }

  private handleNetworkChange = (quality: NetworkQuality) => {
    switch (quality) {
        case 'excellent': this.maxConcurrentUploads = 5; break;
        case 'good': this.maxConcurrentUploads = 3; break;
        case 'poor': this.maxConcurrentUploads = 1; break;
        case 'offline': this.maxConcurrentUploads = 0; break;
    }
    if (quality !== 'offline') this.processQueue();
  }

  public subscribe(callback: ProgressListener): () => void {
    progressListeners.add(callback);
    return () => progressListeners.delete(callback);
  }

  public async addToQueue(item: Omit<UploadItem, 'status' | 'progress' | 'retryCount' | 'createdAt' | 'id'>): Promise<void> {
    const fullItem: UploadItem = { 
        ...item, 
        id: item.cloudinaryPublicId, 
        status: 'pending', 
        progress: 0, 
        retryCount: 0, 
        createdAt: new Date() 
    };
    await storageService.addUploadItem(fullItem);
    this.queue.push(fullItem);
    this.queue.sort((a, b) => a.priority - b.priority);
    this.processQueue();
  }

  private processQueue(): void {
    while (this.activeUploads.size < this.maxConcurrentUploads) {
        const nextItem = this.queue.find(item => item.status === 'pending');
        if (!nextItem) break;
        this.processUploadItem(nextItem);
    }
  }

  private async processUploadItem(item: UploadItem): Promise<void> {
    item.status = 'processing';
    emitProgress({ messageId: item.messageId, status: 'processing', progress: 0 });
    
    try {
        // 1. Get Signed Cloudinary Upload Parameters from Backend
        const signatureResponse: CloudinaryUploadParams = await api.getCloudinaryUploadSignature({
            public_id: item.cloudinaryPublicId,
            resource_type: item.cloudinaryResourceType,
            folder: "kuchlu_chat_media"
        });

        // 2. Client-side Processing
        let fileToUpload: Blob = item.file;
        let thumbnailDataUrl: string | undefined;

        if (item.type === 'image') {
            const variants = await imageProcessor.processImage(item.file);
            fileToUpload = variants.compressed.blob;
            thumbnailDataUrl = variants.thumbnail.dataUrl;
            emitProgress({ messageId: item.messageId, status: 'processing', progress: 0, thumbnailDataUrl });
        } else if (item.type === 'video' || item.type === 'voice_message') {
            item.status = 'compressing';
            emitProgress({ messageId: item.messageId, status: 'compressing', progress: 0 });
            fileToUpload = item.type === 'video' 
                ? await videoCompressor.compressVideo(item.file, 'medium', p => emitProgress({ messageId: item.messageId, status: 'compressing', progress: p.progress }))
                : await videoCompressor.compressAudio(item.file, p => emitProgress({ messageId: item.messageId, status: 'compressing', progress: p.progress }));
        }

        // 3. Direct Upload to Cloudinary
        item.status = 'uploading';
        emitProgress({ messageId: item.messageId, status: 'uploading', progress: 0, thumbnailDataUrl });

        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('api_key', signatureResponse.api_key);
        formData.append('timestamp', String(signatureResponse.timestamp));
        formData.append('signature', signatureResponse.signature);
        formData.append('public_id', signatureResponse.public_id);
        formData.append('folder', signatureResponse.folder);
        formData.append('type', 'private');

        const cloudinaryUploadUrl = `https://api.cloudinary.com/v1_1/${signatureResponse.cloud_name}/${signatureResponse.resource_type}/upload`;
        
        const xhr = new XMLHttpRequest();
        this.activeUploads.set(item.id, xhr);
        
        const cloudinaryData = await new Promise<any>((resolve, reject) => {
            xhr.open('POST', cloudinaryUploadUrl, true);
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    this.updateUploadProgress(item.id, progress);
                }
            };
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try { resolve(JSON.parse(xhr.responseText)); }
                    catch (e) { reject(new Error('Failed to parse Cloudinary response.')); }
                } else {
                    let errorMsg = `Upload failed with status ${xhr.status}`;
                    try { const parsedError = JSON.parse(xhr.responseText); errorMsg = parsedError.error.message || errorMsg; } catch (e) {}
                    reject(new Error(errorMsg));
                }
            };
            xhr.onerror = () => reject(new Error('Network error during direct upload.'));
            xhr.onabort = () => reject({ name: 'AbortError' });
            xhr.send(formData);
        });

        // 4. Notify Backend of successful upload
        const mediaPayload: MediaMessagePayload = {
            client_temp_id: item.messageId,
            chat_id: item.chatId,
            public_id: cloudinaryData.public_id,
            media_type: item.type,
            cloudinary_metadata: cloudinaryData
        };
        await api.sendMediaMessage(mediaPayload);
        
        this.updateUploadStatus(item.id, 'completed');

    } catch (error: any) {
        if (error.name === 'AbortError') {
            this.updateUploadStatus(item.id, 'cancelled');
        } else {
            console.error('Upload failed for item:', item.id, error);
            this.updateUploadStatus(item.id, 'failed', {
                code: UploadErrorCode.SERVER_ERROR,
                message: error.message,
                retryable: true
            });
        }
    } finally {
        this.activeUploads.delete(item.id);
        this.processQueue();
    }
  }

  private updateUploadProgress(itemId: string, progress: number) {
    const item = this.queue.find(q => q.id === itemId);
    if (item) {
        item.progress = progress;
        emitProgress({ messageId: item.messageId, status: 'uploading', progress });
    }
  }
  
  private async updateUploadStatus(itemId: string, status: UploadItem['status'], error?: UploadError) {
      const itemIndex = this.queue.findIndex(q => q.id === itemId);
      if (itemIndex > -1) {
          const item = this.queue[itemIndex];
          item.status = status;
          item.error = error;
          emitProgress({ messageId: item.messageId, status, progress: status === 'completed' ? 100 : item.progress, error });

          if (status === 'completed' || status === 'cancelled') {
              this.queue.splice(itemIndex, 1);
              await storageService.removeUploadItem(item.id);
          } else {
              await storageService.updateUploadItem(item);
          }
      }
  }

  public retryUpload(messageId: string): void {
      const item = this.queue.find(q => q.messageId === messageId && q.status === 'failed');
      if (item) {
          item.status = 'pending';
          item.retryCount = (item.retryCount || 0) + 1;
          this.processQueue();
      }
  }

  public cancelUpload(messageId: string): void {
      const xhr = Array.from(this.activeUploads.entries()).find(([id, _]) => this.queue.find(q => q.id === id)?.messageId === messageId)?.[1];
      if (xhr) {
          xhr.abort();
      } else {
          const item = this.queue.find(q => q.messageId === messageId);
          if (item) this.updateUploadStatus(item.id, 'cancelled');
      }
  }
}

export const uploadManager = typeof window !== 'undefined' ? new UploadManager() : {} as UploadManager;
