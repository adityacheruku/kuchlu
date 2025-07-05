

"use client";

import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import { X, Download } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useZoomAndPan } from "@/hooks/useZoomAndPan";
import { cn } from "@/lib/utils";
import { Message } from "@/types";
import { mediaCacheService } from "@/services/mediaCacheService";
import { useState, useEffect } from "react";
import Spinner from "../common/Spinner";

interface FullScreenMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null; // Pass the whole message object
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

  if (!isOpen || !message) {
    return null;
  }
  const { message_subtype: mediaType } = message;

  const handleDownload = async () => {
    if (!mediaUrl) return;
    try {
      // The mediaUrl is already a blob URL from the cache, so we can fetch it directly
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const fileExtension = message.file_metadata?.format || (mediaType === 'image' ? 'jpg' : 'mp4');
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
            "p-0 bg-black/80 border-none shadow-2xl h-[100svh] w-screen max-w-full rounded-none flex items-center justify-center",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        )}
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
        ) : mediaType === 'video' && mediaUrl ? (
          <video
            src={mediaUrl}
            controls
            autoPlay
            className="max-w-full max-h-full"
          />
        ) : null}
        <div className="absolute top-4 right-4 flex gap-2">
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

