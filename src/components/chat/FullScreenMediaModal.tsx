
"use client";

import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import { X, Download, Share2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useZoomAndPan } from "@/hooks/useZoomAndPan";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";
import { mediaCacheService } from "@/services/mediaCacheService";
import { capacitorService } from "@/services/capacitorService";
import { useState, useEffect, useCallback, useRef } from "react";
import Spinner from "../common/Spinner";
import dynamic from 'next/dynamic';

const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false, loading: () => <div className="w-full max-w-[320px] aspect-video bg-muted flex items-center justify-center rounded-lg"><Spinner /></div> });

interface FullScreenMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
}

export default function FullScreenMediaModal({
  isOpen,
  onClose,
  message
}: FullScreenMediaModalProps) {
  const { toast } = useToast();
  const { imageRef, containerHandlers, style } = useZoomAndPan();
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hideControls = useCallback(() => {
    setControlsVisible(false);
  }, []);

  const showAndAutoHideControls = useCallback(() => {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(hideControls, 3000);
  }, [hideControls]);

  useEffect(() => {
      if (isOpen) {
          showAndAutoHideControls();
      }
      return () => {
          if (controlsTimeoutRef.current) {
              clearTimeout(controlsTimeoutRef.current);
          }
      };
  }, [isOpen, showAndAutoHideControls]);

  useEffect(() => {
    if (isOpen && message) {
        let objectUrl: string | null = null;
        const loadMedia = async () => {
            setIsLoading(true);
            const version = message.message_subtype === 'image' ? 'original' : 'mp4_video';
            const url = await mediaCacheService.getOrFetchMediaUrl(message, version);
            objectUrl = url;
            setMediaUrl(url);
            setIsLoading(false);
        };
        loadMedia();
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        }
    }
  }, [isOpen, message]);

  const toggleControls = (e: React.MouseEvent) => {
      // Prevent click from propagating to dialog close
      e.stopPropagation();
      if (controlsVisible) {
          hideControls();
      } else {
          showAndAutoHideControls();
      }
  };

  if (!isOpen || !message) {
    return null;
  }
  const { message_subtype: mediaType, file_metadata } = message;

  const handleDownload = async () => {
    if (!mediaUrl) return;
    try {
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const fileExtension = file_metadata?.format || (mediaType === 'image' ? 'jpg' : 'mp4');
      a.download = `chirpchat-${mediaType}-${Date.now()}.${fileExtension}`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({ title: "Download Started", description: "Your file is being downloaded." });

    } catch (error) {
      console.error("Download failed", error);
      toast({ variant: 'destructive', title: "Download Failed", description: "Could not download the file." });
    }
  };
  
  const handleShare = async () => {
    if (!mediaUrl) return;
    try {
        await capacitorService.share({
            title: "Share from ChirpChat",
            text: message.caption || "Check out this media!",
            url: mediaUrl,
        });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Sharing not available",
            description: "Could not open the share sheet on this device."
        });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
            "p-0 bg-black border-none shadow-2xl h-[100svh] w-screen max-w-full rounded-none flex items-center justify-center",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        )}
        onClick={toggleControls}
      >
        {isLoading ? (
            <Spinner />
        ) : mediaType === 'image' && mediaUrl ? (
           <div
            className="w-full h-full touch-none overflow-hidden flex items-center justify-center"
            {...containerHandlers}
          >
            <img
              ref={imageRef}
              src={mediaUrl}
              alt="Full screen media"
              className="max-w-full max-h-full transition-transform duration-200 ease-out"
              style={style}
              draggable="false"
            />
          </div>
        ) : message.message_subtype === 'clip' && mediaUrl ? (
          <div className="w-full h-full flex items-center justify-center">
            <ReactPlayer
              url={mediaUrl}
              playing
              controls
              width="100%"
              height="auto"
              config={{ file: { forceHLS: true }}}
            />
          </div>
        ) : null}
        <div className={cn("absolute top-4 right-4 flex gap-2 transition-opacity duration-300", controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none")}>
            <Button
                variant="ghost"
                size="icon"
                onClick={handleShare}
                className="text-white bg-black/50 hover:bg-black/70 hover:text-white rounded-full"
                aria-label="Share media"
            >
                <Share2 className="h-6 w-6" />
                <span className="sr-only">Share</span>
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="text-white bg-black/50 hover:bg-black/70 hover:text-white rounded-full"
                aria-label="Download media"
              >
                <Download className="h-6 w-6" />
                <span className="sr-only">Download</span>
            </Button>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white bg-black/50 hover:bg-black/70 hover:text-white rounded-full"
                aria-label="Close media viewer"
              >
                <X className="h-6 w-6" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
