"use client";

import { memo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Message } from '@/types';
import { useCachedMediaUrl } from '@/hooks/useCachedMediaUrl';
import Spinner from '@/components/common/Spinner';
import { Film, PlayCircle } from 'lucide-react';

const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false, loading: () => <div className="w-full max-w-[320px] aspect-video bg-muted flex items-center justify-center rounded-lg"><Spinner /></div> });

interface VideoPlayerProps {
    message: Message;
}

const VideoPlayer = ({ message }: VideoPlayerProps) => {
    const { displayUrl: hlsUrl, isLoading: isLoadingHls } = useCachedMediaUrl(message, 'hls_manifest');
    const { displayUrl: mp4Url, isLoading: isLoadingMp4 } = useCachedMediaUrl(message, 'mp4_video');
    const { displayUrl: thumbnailUrl, isLoading: isLoadingThumb } = useCachedMediaUrl(message, 'static_thumbnail');
    
    const [isPlaying, setIsPlaying] = useState(false);
    
    const finalUrl = hlsUrl || mp4Url;
    const isLoading = isLoadingHls || isLoadingMp4 || isLoadingThumb;

    if (isLoading && !thumbnailUrl) {
        return <div className="w-full max-w-[320px] aspect-video bg-muted flex items-center justify-center rounded-lg"><Spinner /></div>;
    }

    if (!isLoading && !finalUrl) {
      return (
        <div className="w-full max-w-[320px] aspect-video bg-muted flex flex-col items-center justify-center rounded-lg text-destructive">
          <Film size={24} />
          <p className="text-xs mt-1">Video unavailable</p>
        </div>
      );
    }
    
    return (
        <div className="w-full h-full relative rounded-lg overflow-hidden bg-black">
             <ReactPlayer
                url={finalUrl || ''}
                light={thumbnailUrl || true}
                playing={isPlaying}
                controls
                width="100%"
                height="100%"
                config={{ file: { forceHLS: true }}}
                playIcon={<PlayCircle size={48} className="text-white/80 transition-transform group-hover/media:scale-110" />}
            />
        </div>
    );
};
VideoPlayer.displayName = "VideoPlayer";
export default memo(VideoPlayer);
