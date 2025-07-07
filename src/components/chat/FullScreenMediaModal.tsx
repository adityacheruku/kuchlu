
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, Share2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useZoomAndPan } from '@/hooks/useZoomAndPan';
import { cn } from '@/lib/utils';
import type { Message } from '@/types';
import { useCachedMediaUrl } from '@/hooks/useCachedMediaUrl';
import { capacitorService } from '@/services/capacitorService';
import Spinner from '@/components/common/Spinner';

const ReactPlayer = dynamic(() => import('react-player/lazy'), { 
  ssr: false, 
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-neutral-900/50 animate-pulse rounded-lg">
      <Spinner />
    </div>
  ) 
});

interface FullScreenMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
}

const ShimmerLoader = () => (
  <div className="relative w-full h-full overflow-hidden bg-neutral-800 flex items-center justify-center">
    <div className="absolute inset-0 animate-[shimmer_1.5s_infinite] bg-[linear-gradient(to_right,transparent_0%,rgba(255,255,255,0.1)_20%,transparent_40%)] bg-[length:200%_100%]"></div>
    <Spinner />
  </div>
);

export default function FullScreenMediaModal({ isOpen, onClose, message }: FullScreenMediaModalProps) {
  const { toast } = useToast();
  const { imageRef, containerHandlers, style } = useZoomAndPan();
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const version = message?.message_subtype === 'image' ? 'original' : (message?.file_metadata?.urls?.hls_manifest ? 'hls_manifest' : 'mp4_video');
  const { displayUrl: mediaUrl, isLoading } = useCachedMediaUrl(message, version);

  const hideControls = useCallback(() => setControlsVisible(false), []);
  const showAndAutoHideControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(hideControls, 3000);
  }, [hideControls]);

  useEffect(() => {
    if (isOpen) showAndAutoHideControls();
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current) };
  }, [isOpen, showAndAutoHideControls]);

  const toggleControls = (e: React.MouseEvent) => {
    e.stopPropagation();
    controlsVisible ? hideControls() : showAndAutoHideControls();
  };
  
  const handleDownload = async () => {
    if (!mediaUrl || !message) return;
    try {
        const response = await fetch(mediaUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileExtension = message.file_metadata?.format || (message.message_subtype === 'image' ? 'jpg' : 'mp4');
        a.download = `chirpchat-media-${Date.now()}.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast({ title: "Download Started" });
    } catch (error) {
        toast({ variant: 'destructive', title: "Download Failed", description: "Could not download the file." });
    }
  };
  
  const handleShare = async () => {
    if (!mediaUrl || !message) return;
    try {
      await capacitorService.share({
        title: "Share from ChirpChat",
        text: message.caption || "Check out this media!",
        url: mediaUrl,
      });
    } catch (error) {
      toast({ variant: "destructive", title: "Sharing not available", description: "Could not open the share sheet." });
    }
  };

  if (!isOpen || !message) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn("p-0 bg-neutral-950/80 border-none shadow-2xl h-[100svh] w-screen max-w-full rounded-none flex items-center justify-center backdrop-blur-lg",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        )}
        onClick={toggleControls}
      >
        {isLoading ? <ShimmerLoader /> : mediaUrl ? (
            message.message_subtype === 'image' ? (
                <div className="relative w-full h-full touch-none overflow-hidden flex items-center justify-center" {...containerHandlers}>
                    <img ref={imageRef} src={mediaUrl} alt={message.caption || "Full screen media"} className="max-w-full max-h-full transition-transform duration-300 ease-in-out" style={style} draggable="false" />
                </div>
            ) : message.message_subtype === 'clip' ? (
                <div className="w-full h-full flex items-center justify-center">
                    <ReactPlayer url={mediaUrl} playing controls width="100%" height="auto" config={{ file: { forceHLS: true }}} />
                </div>
            ) : null
        ) : null}

        <div className={cn("absolute top-4 right-4 flex gap-2 p-2 rounded-full bg-black/40 backdrop-blur-md shadow-lg transition-opacity duration-300", controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none")}>
          <Button variant="ghost" size="icon" onClick={handleShare} className="text-white bg-white/10 hover:bg-white/20 hover:scale-105 transition-all duration-150 rounded-full" aria-label="Share media"><Share2 className="h-6 w-6" /></Button>
          <Button variant="ghost" size="icon" onClick={handleDownload} className="text-white bg-white/10 hover:bg-white/20 hover:scale-105 transition-all duration-150 rounded-full" aria-label="Download media"><Download className="h-6 w-6" /></Button>
          <DialogClose asChild><Button variant="ghost" size="icon" onClick={onClose} className="text-white bg-white/10 hover:bg-white/20 hover:scale-105 transition-all duration-150 rounded-full" aria-label="Close media viewer"><X className="h-6 w-6" /></Button></DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
