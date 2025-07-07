"use client";

import Image from 'next/image';
import type { Message } from '@/types';
import { useCachedMediaUrl } from '@/hooks/useCachedMediaUrl';
import Spinner from '@/components/common/Spinner';
import { ImageOff } from 'lucide-react';

interface SecureMediaImageProps {
    message: Message;
    onShowMedia: (message: Message) => void;
    alt: string;
}

const SecureMediaImage = ({ message, onShowMedia, alt }: SecureMediaImageProps) => {
    const version = message.file_metadata?.urls?.preview_800 ? 'preview_800' : 'original';
    const { displayUrl: imageUrl, isLoading } = useCachedMediaUrl(message, version);
    const { displayUrl: thumbnailUrl, isLoading: isLoadingThumb } = useCachedMediaUrl(message, 'thumbnail_250');

    if ((isLoadingThumb || isLoading) && !thumbnailUrl) return <div className="w-full max-w-[250px] aspect-[4/3] bg-muted flex items-center justify-center rounded-lg"><Spinner/></div>;
    
    if (!isLoading && !imageUrl && !thumbnailUrl) {
      return (
        <div className="w-full max-w-[250px] aspect-[4/3] bg-muted flex flex-col items-center justify-center rounded-lg text-destructive">
          <ImageOff size={24} />
          <p className="text-xs mt-1">Image unavailable</p>
        </div>
      )
    }

    return (
        <button onClick={() => imageUrl && onShowMedia(message)} className="block w-full h-full relative group/media rounded-lg overflow-hidden bg-muted transition-transform active:scale-95 md:hover:scale-105" aria-label={alt}>
            <Image src={thumbnailUrl || imageUrl || "https://placehold.co/400x300.png"} alt={alt} fill sizes="(max-width: 640px) 85vw, 320px" className="object-cover" data-ai-hint="chat photo" loading="lazy"/>
        </button>
    );
};

export default SecureMediaImage;
