
"use client";

import { v4 as uuidv4 } from 'uuid';
import { api } from './api';
import type { UploadItem, UploadProgress, MessageSubtype, Message, CloudinaryUploadParams } from '@/types';
import { getUploadError, UploadErrorCode } from '@/types/uploadErrors';
import type { UploadError } from '@/types/uploadErrors';
import { storageService } from './storageService';
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
      this.queue.unshift(...pendingItems.map(item => ({ ...item, status: 'pending', progress: 0 } as UploadItem)));
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

  public async addToQueue(item: Omit<UploadItem, 'status' | 'progress' | 'retryCount' | 'createdAt' | 'id'> & { id?: string }): Promise<void> {
    const fullItem: UploadItem = { 
        id: item.id || uuidv4(), 
        ...item, 
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
        // Mark as processing immediately to prevent re-picking
        nextItem.status = 'processing'; 
        this.processUploadItem(nextItem);
    }
  }

  private async processUploadItem(item: UploadItem): Promise<void> {
    await storageService.updateUploadItem(item);
    emitProgress({ messageId: item.messageId, status: 'processing', progress: 0 });
    
    try {
        const fileToUpload: Blob = item.file;
        let thumbnailDataUrl: string | undefined = item.thumbnailDataUrl;

        if (!thumbnailDataUrl && item.file.type.startsWith('image/')) {
            thumbnailDataUrl = URL.createObjectURL(item.file);
        }

        item.status = 'uploading';
        emitProgress({ messageId: item.messageId, status: 'uploading', progress: 0, thumbnailDataUrl });
        
        const resourceType = item.subtype === 'image' ? 'image' : (item.subtype === 'clip' ? 'video' : 'raw');
        const signatureResponse = await api.getCloudinaryUploadSignature({ public_id: item.id, resource_type: resourceType });
        
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('api_key', signatureResponse.api_key);
        formData.append('timestamp', String(signatureResponse.timestamp));
        formData.append('signature', signatureResponse.signature);
        formData.append('public_id', signatureResponse.public_id);
        formData.append('folder', signatureResponse.folder);
        formData.append('upload_preset', signatureResponse.upload_preset);
        formData.append('resource_type', signatureResponse.resource_type);
        formData.append('type', signatureResponse.type);
        if (signatureResponse.notification_url) formData.append('notification_url', signatureResponse.notification_url);
        if (signatureResponse.eager) formData.append('eager', signatureResponse.eager);

        const cloudinaryUploadUrl = `https://api.cloudinary.com/v1_1/${signatureResponse.cloud_name}/${signatureResponse.resource_type}/upload`;
        
        const xhr = new XMLHttpRequest();
        this.activeUploads.set(item.id, xhr);
        
        await new Promise<any>((resolve, reject) => {
            xhr.open('POST', cloudinaryUploadUrl, true);
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    this.updateUploadProgress(item.id, progress);
                }
            };
            xhr.onload = () => {
                this.activeUploads.delete(item.id);
                if (xhr.status >= 200 && xhr.status < 300) {
                    try { resolve(JSON.parse(xhr.responseText)); }
                    catch (e) { reject(new Error('Failed to parse Cloudinary response.')); }
                } else {
                    let errorMsg = `Upload failed with status ${xhr.status}`;
                    let errCode = UploadErrorCode.SERVER_ERROR;
                    try { 
                        const parsedError = JSON.parse(xhr.responseText); 
                        errorMsg = parsedError.error.message || errorMsg; 
                        errCode = UploadErrorCode.CLOUDINARY_API_ERROR;
                    } catch (e) {}
                    reject({ message: errorMsg, code: errCode });
                }
            };
            xhr.onerror = () => { this.activeUploads.delete(item.id); reject({ message: 'Network error during direct upload.', code: UploadErrorCode.NETWORK_ERROR }); };
            xhr.onabort = () => { 
                const cancelledItem = this.queue.find(q => q.id === item.id);
                if (cancelledItem) {
                    this.updateUploadStatus(cancelledItem.id, 'cancelled');
                }
                this.activeUploads.delete(item.id); 
                reject({ name: 'AbortError' });
            };
            xhr.send(formData);
        });
        
        this.updateUploadStatus(item.id, 'pending_processing');

    } catch (error: any) {
        if (error.name !== 'AbortError') {
            console.error('Upload failed for item:', item.id, error);
            const errorCode = error.code || UploadErrorCode.SERVER_ERROR;
            const finalError = getUploadError(errorCode, { originalMessage: error.message });
            this.updateUploadStatus(item.id, 'failed', finalError);
        }
    } finally {
        if(this.activeUploads.has(item.id)) {
            this.activeUploads.delete(item.id);
        }
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
          emitProgress({ messageId: item.messageId, status, progress: status === 'completed' || status === 'pending_processing' ? 100 : item.progress, error });

          if (status === 'completed' || status === 'cancelled' || (status === 'failed' && !error?.retryable)) {
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
      const itemToCancel = this.queue.find(q => q.messageId === messageId);
      if(!itemToCancel) return;

      const xhr = this.activeUploads.get(itemToCancel.id);
      if (xhr) {
          xhr.abort();
      } else if (itemToCancel.status === 'pending') {
          this.updateUploadStatus(itemToCancel.id, 'cancelled');
      }
  }
}

export const uploadManager = typeof window !== 'undefined' ? new UploadManager() : {} as UploadManager;
