
import { api } from './api';
import type { UploadItem, UploadProgress, UploadError, MessageSubtype, FileAnalyticsPayload } from '@/types';
import { UploadErrorCode, ERROR_MESSAGES } from '@/types/uploadErrors';
import { validateFile } from '@/utils/fileValidation';
import { imageProcessor } from './imageProcessor';
import { videoCompressor } from './videoCompressor';
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
  private maxConcurrentUploads = 3; // Default, will be updated by network monitor
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
    try {
      const pendingItems = await storageService.getAllPendingUploads();
      if (pendingItems.length > 0) {
          console.log(`UploadManager: Resuming ${pendingItems.length} pending uploads.`);
          // Reset status to 'pending' for items that were interrupted
          const itemsToRequeue = pendingItems.map(item => ({
              ...item,
              status: 'pending',
              progress: 0,
          }));
          this.queue.unshift(...itemsToRequeue);
          this.processQueue();
      }
    } catch (error) {
        console.error("UploadManager: Failed to initialize and load from storage", error);
    }
  }

  private handleNetworkChange = (quality: NetworkQuality) => {
    console.log(`UploadManager: Network quality changed to ${quality}`);
    this.updateConcurrency(quality);
    
    if (quality === 'offline') {
        console.log("UploadManager: Network is offline. Pausing new uploads.");
        // Note: In-flight uploads are not cancelled here, they will likely fail and be retried.
        // To pause them, we would need to abort active XHRs.
    } else {
        console.log("UploadManager: Network is online. Resuming queue processing.");
        this.processQueue();
    }
  }

  private updateConcurrency = (quality: NetworkQuality) => {
      switch (quality) {
          case 'excellent':
              this.maxConcurrentUploads = 5;
              break;
          case 'good':
              this.maxConcurrentUploads = 3;
              break;
          case 'poor':
              this.maxConcurrentUploads = 1;
              break;
          case 'offline':
              this.maxConcurrentUploads = 0;
              break;
      }
  }

  public subscribe(callback: ProgressListener): () => void {
    progressListeners.add(callback);
    return () => progressListeners.delete(callback);
  }

  public async addToQueue(item: Omit<UploadItem, 'status' | 'progress' | 'retryCount' | 'createdAt'>): Promise<void> {
    const fullItem: UploadItem = {
      ...item,
      status: 'pending',
      progress: 0,
      retryCount: 0,
      createdAt: new Date(),
    };
    await storageService.addUploadItem(fullItem);
    this.queue.push(fullItem);
    this.queue.sort((a, b) => a.priority - b.priority);
    this.processQueue();
  }

  private processQueue(): void {
    if (networkMonitor.getQuality() === 'offline') {
        return;
    }
    
    if (this.activeUploads.size >= this.maxConcurrentUploads) {
      return;
    }

    const nextItem = this.queue.find(item => item.status === 'pending');
    if (nextItem) {
      this.uploadFile(nextItem);
    }
  }
  
  private async uploadFile(item: UploadItem): Promise<void> {
    const itemInQueue = this.queue.find(q => q.id === item.id);
    if (!itemInQueue) return;
    
    const startTime = Date.now();

    itemInQueue.status = 'processing';
    emitProgress({ messageId: item.messageId, status: 'processing', progress: 0 });

    try {
      const validation = validateFile(item.file);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '), { cause: UploadErrorCode.VALIDATION_FAILED });
      }
      
      let fileToUpload: Blob = item.file;
      let mediaTypeForBackend: MessageSubtype | 'audio' = item.subtype;
      let thumbnailDataUrl: string | undefined = undefined;
      let eagerTransforms: string[] = [];

      if (item.subtype === 'image') {
        const variants = await imageProcessor.processImage(item.file);
        fileToUpload = variants.compressed.blob;
        thumbnailDataUrl = variants.thumbnail.dataUrl;
        emitProgress({ messageId: item.messageId, status: 'processing', progress: 0, thumbnailDataUrl });
        eagerTransforms = ["w_800,c_limit,q_auto,f_auto"];
      } else if (item.subtype === 'clip') { // Video
        const networkQuality = networkMonitor.getQuality();
        let videoCompressionLevel: 'light' | 'medium' | 'heavy' = 'medium';
        switch (networkQuality) {
            case 'excellent': videoCompressionLevel = 'light'; break;
            case 'good': videoCompressionLevel = 'medium'; break;
            case 'poor': videoCompressionLevel = 'heavy'; break;
        }

        itemInQueue.status = 'compressing';
        emitProgress({ messageId: item.messageId, status: 'compressing', progress: 0 });
        fileToUpload = await videoCompressor.compressVideo(item.file, videoCompressionLevel, (progress) => {
            emitProgress({ messageId: item.messageId, status: 'compressing', progress: progress.progress });
        });
        eagerTransforms = ["w_400,h_400,c_limit,f_jpg,so_1"]; // Thumbnail
      } else if (item.subtype === 'voice_message') {
        itemInQueue.status = 'compressing';
        emitProgress({ messageId: item.messageId, status: 'compressing', progress: 0 });
        fileToUpload = await videoCompressor.compressAudio(item.file, (progress) => {
            emitProgress({ messageId: item.messageId, status: 'compressing', progress: progress.progress });
        });
      }

      itemInQueue.status = 'uploading';
      emitProgress({ messageId: item.messageId, status: 'uploading', progress: 0, thumbnailDataUrl });
      
      const payload = { file_type: mediaTypeForBackend, eager: eagerTransforms };
      const { xhr, promise } = api.uploadFile(fileToUpload, payload, (progress) => {
        const currentItem = this.queue.find(q => q.id === item.id);
        if (currentItem) {
          currentItem.progress = progress;
          emitProgress({ messageId: item.messageId, status: 'uploading', progress, thumbnailDataUrl });
        }
      });

      this.activeUploads.set(item.id, xhr);
      const result = await promise;

      this.activeUploads.delete(item.id);
      itemInQueue.status = 'completed';
      emitProgress({ messageId: item.messageId, status: 'completed', progress: 100, result });
      await storageService.removeUploadItem(item.id);

      // Fire-and-forget analytics event
      const analyticsPayload: FileAnalyticsPayload = {
        message_id: item.messageId,
        upload_duration_seconds: (Date.now() - startTime) / 1000,
        file_size_bytes: item.file.size,
        compressed_size_bytes: fileToUpload.size,
        network_quality: networkMonitor.getQuality(),
        file_type: item.subtype,
      };
      api.sendFileAnalytics(analyticsPayload);
      
    } catch (error: any) {
      this.activeUploads.delete(item.id);
      const currentItem = this.queue.find(q => q.id === item.id);
      if (currentItem) {
        currentItem.status = 'failed';
        
        const errorCode = (error.cause || UploadErrorCode.SERVER_ERROR) as UploadErrorCode;
        const uploadError: UploadError = {
            code: errorCode,
            message: error.message || ERROR_MESSAGES[errorCode] || 'An unknown error occurred.',
            retryable: [UploadErrorCode.NETWORK_ERROR, UploadErrorCode.SERVER_ERROR, UploadErrorCode.TIMEOUT].includes(errorCode),
        };
        
        currentItem.error = uploadError;
        await storageService.updateUploadItem(currentItem);
        emitProgress({ messageId: item.messageId, status: 'failed', progress: 0, error: uploadError });
        this.handleRetryLogic(currentItem);
      }
    } finally {
      this.processQueue();
    }
  }

  private handleRetryLogic(item: UploadItem): void {
      if (item.error?.retryable && item.retryCount < 3) {
          item.retryCount++;
          const delay = Math.pow(2, item.retryCount) * 1000;
          setTimeout(async () => {
              const itemInQueue = this.queue.find(q => q.id === item.id);
              if (itemInQueue && itemInQueue.status === 'failed') {
                  itemInQueue.status = 'pending';
                  await storageService.updateUploadItem(itemInQueue);
                  this.processQueue();
              }
          }, delay);
      }
  }

  public async retryUpload(messageId: string): Promise<void> {
    const item = this.queue.find(q => q.messageId === messageId);
    if (item && item.status === 'failed') {
      item.status = 'pending';
      item.error = undefined;
      item.retryCount = 0;
      await storageService.updateUploadItem(item);
      this.processQueue();
    }
  }

  public async cancelUpload(messageId: string): Promise<void> {
    const itemIndex = this.queue.findIndex(q => q.messageId === messageId);
    if (itemIndex !== -1) {
        const item = this.queue[itemIndex];
        const xhr = this.activeUploads.get(item.id);
        if (xhr) {
          xhr.abort();
          this.activeUploads.delete(item.id);
        }
        item.status = 'cancelled';
        emitProgress({ messageId: item.messageId, status: 'cancelled', progress: 0 });
        await storageService.removeUploadItem(item.id);
        this.queue.splice(itemIndex, 1);
        this.processQueue();
    }
  }
}

export const uploadManager = typeof window !== 'undefined' ? new UploadManager() : {} as UploadManager;
