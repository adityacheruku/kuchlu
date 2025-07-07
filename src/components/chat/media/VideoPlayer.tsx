
"use client";

import dynamic from 'next/dynamic';
import { memo } from 'react';
import type { Message } from '@/types';
import { useCachedMediaUrl } from '@/hooks/useCachedMediaUrl';
import Spinner from '@/components/common/Spinner';
import { Film, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const ReactPlayer = dynamic(() => import('react-player/lazy'), { 
  ssr: false, 
  loading: () => <VideoShimmerLoader />
});

const VideoShimmerLoader = () => (
    <div className="relative w-full aspect-video overflow-hidden bg-neutral-800 flex items-center justify-center rounded-lg">
        <div className="absolute inset-0 animate-[shimmer_1.5s_infinite] bg-[linear-gradient(to_right,transparent_0%,rgba(255,255,255,0.1)_20%,transparent_40%)] bg-[length:200%_100%]"></div>
        <Spinner size={32} className="text-white" />
    </div>
);

interface VideoPlayerProps {
    message: Message;
}

const VideoPlayer = ({ message }: VideoPlayerProps) => {
    const { displayUrl: hlsUrl, isLoading: isLoadingHls } = useCachedMediaUrl(message, 'hls_manifest');
    const { displayUrl: mp4Url, isLoading: isLoadingMp4 } = useCachedMediaUrl(message, 'mp4_video');
    const { displayUrl: thumbnailUrl, isLoading: isLoadingThumb } = useCachedMediaUrl(message, 'static_thumbnail');
    
    const finalUrl = hlsUrl || mp4Url;
    const isLoading = (isLoadingHls || isLoadingMp4) && !finalUrl;

    if (isLoading && !thumbnailUrl) {
        return <VideoShimmerLoader />;
    }

    if (!isLoading && !finalUrl) {
      return (
        <div className="w-full max-w-[320px] aspect-video bg-destructive/10 border border-destructive/20 flex flex-col items-center justify-center rounded-lg text-destructive p-4">
          <Film size={32} className="mb-2" />
          <p className="text-sm font-medium text-center">Video unavailable</p>
        </div>
      );
    }
    
    return (
        <div className={cn("w-full h-full relative rounded-xl overflow-hidden bg-black group/video shadow-lg")}>
            <ReactPlayer
                url={finalUrl || ''}
                light={thumbnailUrl || true}
                playing={true}
                controls
                width="100%"
                height="100%"
                config={{ file: { forceHLS: true }}}
                playIcon={
                    <div className="relative">
                        <PlayCircle size={64} className="text-white/90 transition-transform duration-200 group-hover/video:scale-110 group-hover/video:text-white" />
                        <div className="absolute inset-0 -m-2 rounded-full bg-white/20 opacity-0 transition-opacity duration-300 group-hover/video:opacity-100"></div>
                    </div>
                }
            />
        </div>
    );
};

export default memo(VideoPlayer);
