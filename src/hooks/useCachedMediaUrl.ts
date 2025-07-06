"use client";

import { useState, useEffect } from 'react';
import { mediaCacheService } from '@/services/mediaCacheService';
import type { Message } from '@/types';

export const useCachedMediaUrl = (message: Message | null, version: string) => {
    const [displayUrl, setDisplayUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let objectUrl: string | null = null;
        let isCancelled = false;
        
        const loadMedia = async () => {
            if (!message) {
                setDisplayUrl(null);
                return;
            }
            
            // Don't try to load if it's still uploading/processing.
            if (message.status === 'uploading' || message.uploadStatus === 'pending_processing') {
                setDisplayUrl(null);
                return;
            }

            setIsLoading(true);
            try {
                const url = await mediaCacheService.getOrFetchMediaUrl(message, version);
                if (!isCancelled) {
                    objectUrl = url; // Keep track to revoke later
                    setDisplayUrl(url);
                }
            } catch (error) {
                if (!isCancelled) {
                    console.error(`useCachedMediaUrl: Failed to load media version '${version}' for message '${message.id}'`, error);
                    setDisplayUrl(null);
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        loadMedia();

        return () => {
            isCancelled = true;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [message, version]);

    return { displayUrl, isLoading };
};
