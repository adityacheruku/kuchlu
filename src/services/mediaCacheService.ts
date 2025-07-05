
"use client";

import { storageService } from './storageService';
import { api } from './api';
import type { Message, CachedMediaBlob } from '@/types';

const MAX_CACHE_ITEMS = 500;
const CACHE_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Run every 5 minutes

class MediaCacheService {
    private cleanupInterval: NodeJS.Timeout | null = null;
    private static instance: MediaCacheService;

    constructor() {
        if (typeof window !== 'undefined') {
            if (MediaCacheService.instance) {
                return MediaCacheService.instance;
            }
            this.startCleanupInterval();
            MediaCacheService.instance = this;
        }
    }

    private startCleanupInterval() {
        this.cleanupInterval = setInterval(() => this.cleanupCache(), CACHE_CLEANUP_INTERVAL_MS);
    }

    public async getBlob(messageId: string, version: string): Promise<Blob | undefined> {
        const id = `${messageId}-${version}`;
        const item = await storageService.mediaBlobs.get(id);
        if (item) {
            await storageService.mediaBlobs.update(id, { cachedAt: Date.now() });
            return item.blob;
        }
        return undefined;
    }

    public async cacheBlob(messageId: string, version: string, blob: Blob) {
        const id = `${messageId}-${version}`;
        const item: CachedMediaBlob = { id, messageId, version, blob, cachedAt: Date.now() };
        await storageService.mediaBlobs.put(item);
    }

    private async cleanupCache() {
        try {
            const totalItems = await storageService.mediaBlobs.count();
            if (totalItems > MAX_CACHE_ITEMS) {
                const itemsToDeleteCount = totalItems - MAX_CACHE_ITEMS;
                const oldestItems = await storageService.mediaBlobs.orderBy('cachedAt').limit(itemsToDeleteCount).toArray();
                const idsToDelete = oldestItems.map(item => item.id);
                await storageService.mediaBlobs.bulkDelete(idsToDelete);
                console.log(`MediaCache: Cleaned up ${idsToDelete.length} old media blobs.`);
            }
        } catch (error) {
            console.error("MediaCache: Error during cache cleanup:", error);
        }
    }

    public async getOrFetchMediaUrl(message: Message, version: string): Promise<string | null> {
        if (!message.media_metadata?.urls) return null;

        const cachedBlob = await this.getBlob(message.id, version);
        if (cachedBlob) {
            return URL.createObjectURL(cachedBlob);
        }

        try {
            const response = await api.getSignedMediaUrl(message.id, version);
            const signedUrl = response.url;
            
            if (!signedUrl) throw new Error("Backend did not return a signed URL.");

            const mediaResponse = await fetch(signedUrl);
            if (!mediaResponse.ok) throw new Error(`Failed to fetch media from Cloudinary: ${mediaResponse.statusText}`);
            
            const mediaBlob = await mediaResponse.blob();
            await this.cacheBlob(message.id, version, mediaBlob);

            return URL.createObjectURL(mediaBlob);
        } catch (error) {
            console.error(`MediaCache: Failed to fetch and cache media version '${version}' for message '${message.id}'.`, error);
            return null; // Return null on failure so UI can show an error state
        }
    }
}

export const mediaCacheService = new MediaCacheService();
