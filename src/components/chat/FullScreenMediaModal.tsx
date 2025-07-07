"use client";

import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import { X, Download, Share2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
// Mock useToast as it's an external hook
const useToast = () => ({
  toast: ({ title, description, variant }: { title: string; description?: string; variant?: string }) => {
    console.log(`Toast: ${title} - ${description || ''} (Variant: ${variant || 'default'})`);
    // In a real app, you'd show a visual toast notification here.
  }
});

// Mock useZoomAndPan hook
const useZoomAndPan = () => {
  const imageRef = useRef(null);
  const [style, setStyle] = useState({});

  // Basic mock for zoom/pan functionality
  const containerHandlers = {
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault();
      console.log("Mouse down for zoom/pan (mock)");
    },
    onMouseMove: (e: React.MouseEvent) => {
      e.preventDefault();
      console.log("Mouse move for zoom/pan (mock)");
    },
    onMouseUp: (e: React.MouseEvent) => {
      e.preventDefault();
      console.log("Mouse up for zoom/pan (mock)");
    },
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault();
      console.log("Touch start for zoom/pan (mock)");
    },
    onTouchMove: (e: React.TouchEvent) => {
      e.preventDefault();
      console.log("Touch move for zoom/pan (mock)");
    },
    onTouchEnd: (e: React.TouchEvent) => {
      e.preventDefault();
      console.log("Touch end for zoom/pan (mock)");
    },
  };

  // Set a default style for the image to make it visible in the preview
  useEffect(() => {
    setStyle({
      transform: 'scale(1) translate(0px, 0px)',
      cursor: 'grab'
    });
  }, []);

  return { imageRef, containerHandlers, style };
};

// Mock cn utility function
const cn = (...args: any[]) => args.filter(Boolean).join(' ');

// Mock Message type (simplified for compilation)
type Message = {
  message_subtype: 'image' | 'clip';
  file_metadata?: { format: string };
  caption?: string;
  // Add other properties if they are used in the component
};

// Mock mediaCacheService
const mediaCacheService = {
  getOrFetchMediaUrl: async (message: Message, version: string) => {
    console.log(`Mocking media fetch for: ${message.message_subtype}, version: ${version}`);
    // Return a placeholder image/video URL for demonstration
    if (message.message_subtype === 'image') {
      return 'https://placehold.co/1280x720/000000/FFFFFF?text=Image+Placeholder';
    } else if (message.message_subtype === 'clip') {
      // You might need a real, small test video URL here for ReactPlayer to work
      // For now, returning an empty string or a placeholder that will likely fail to play
      return 'https://www.w3schools.com/html/mov_bbb.mp4'; // Example test video
    }
    return '';
  }
};

// Mock capacitorService
const capacitorService = {
  share: async ({ title, text, url }: { title: string; text: string; url: string }) => {
    console.log(`Mocking share: Title: ${title}, Text: ${text}, URL: ${url}`);
    // In a real app, this would trigger native sharing.
    // For web, you might use navigator.share if available.
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        console.log('Shared successfully via Web Share API');
      } catch (error) {
        console.error('Error sharing via Web Share API:', error);
        throw new Error('Web Share API failed');
      }
    } else {
      console.log('Web Share API not supported, mock sharing to console.');
      // Fallback for environments without Web Share API
      // You could open a new window or copy to clipboard here
      prompt("Share URL (mock):", url);
    }
  }
};

import { useState, useEffect, useCallback, useRef } from "react";

// Mock Spinner component
const Spinner = () => (
  <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-4 border-white border-t-transparent"></div>
);

// Directly import ReactPlayer as next/dynamic is not resolvable
import ReactPlayer from 'react-player/lazy';


interface FullScreenMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
}

// Shimmer effect component for loading state
const ShimmerLoader = () => (
  <div className="relative w-full h-full overflow-hidden bg-neutral-800 flex items-center justify-center">
    {/* Shimmer effect */}
    <div className="absolute inset-0 animate-shimmer"></div>
    <Spinner />
  </div>
);

export default function App({
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
  const [showClickOverlay, setShowClickOverlay] = useState(false); // State for click feedback overlay

  // Define custom Tailwind animations for the shimmer effect
  // This would typically be in your tailwind.config.js, but included here for completeness.
  // Make sure these are properly configured in your actual project.
  const customTailwindStyles = `
    @keyframes shimmer {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }
    .animate-shimmer {
      background: linear-gradient(to right, transparent 0%, rgba(255, 255, 255, 0.1) 20%, transparent 40%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
  `;

  // Function to hide controls
  const hideControls = useCallback(() => {
    setControlsVisible(false);
  }, []);

  // Function to show controls and then hide them after a timeout
  const showAndAutoHideControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(hideControls, 3000);
  }, [hideControls]);

  // Effect to manage controls visibility on modal open/close
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

  // Effect to load media when modal opens or message changes
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

  // Toggle controls visibility on media click
  const toggleControls = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent click from propagating to dialog close
    if (controlsVisible) {
      hideControls();
    } else {
      showAndAutoHideControls();
    }

    // Show brief click feedback overlay for images
    if (message?.message_subtype === 'image') {
      setShowClickOverlay(true);
      const feedbackTimeout = setTimeout(() => setShowClickOverlay(false), 200); // Overlay visible for 200ms
      return () => clearTimeout(feedbackTimeout);
    }
  };

  // If modal is not open or no message, render nothing
  if (!isOpen || !message) {
    return null;
  }

  const { message_subtype: mediaType, file_metadata } = message;

  // Handle media download
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
  
  // Handle media sharing
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
      <style>{customTailwindStyles}</style> {/* Inject custom keyframes */}
      <DialogContent 
        className={cn(
          // Base styles for full screen and dark background with blur
          "p-0 bg-neutral-950/80 border-none shadow-2xl h-[100svh] w-screen max-w-full rounded-none flex items-center justify-center",
          "backdrop-filter backdrop-blur-lg", // Frosted glass effect

          // Enhanced open animation: fade-in, zoom-in, and slide-up
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2",
          // Enhanced close animation: fade-out, zoom-out, and slide-down
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-2"
        )}
        onClick={toggleControls}
      >
        {isLoading ? (
          <ShimmerLoader /> // Use the enhanced shimmer loader
        ) : mediaType === 'image' && mediaUrl ? (
          <div
            className="relative w-full h-full touch-none overflow-hidden flex items-center justify-center"
            {...containerHandlers}
          >
            <img
              ref={imageRef}
              src={mediaUrl}
              alt="Full screen media"
              // Increased transition duration for smoother zoom/pan
              className="max-w-full max-h-full transition-transform duration-300 ease-in-out"
              style={style}
              draggable="false"
            />
            {/* Click feedback overlay for images */}
            <div className={cn(
              "absolute inset-0 bg-black/30 transition-opacity duration-100",
              showClickOverlay ? "opacity-100" : "opacity-0 pointer-events-none"
            )}></div>
          </div>
        ) : message.message_subtype === 'clip' && mediaUrl ? (
          <div className="w-full h-full flex items-center justify-center">
            <ReactPlayer
              url={mediaUrl}
              playing
              controls // Keep native controls for ReactPlayer for now
              width="100%"
              height="100%" // Ensure video takes full height if possible
              config={{ file: { forceHLS: true }}}
            />
          </div>
        ) : null}

        {/* Floating control bar */}
        <div 
          className={cn(
            "absolute top-4 right-4 flex gap-2 p-2 rounded-full", // Pill shape
            "bg-black/40 backdrop-filter backdrop-blur-md shadow-lg", // Translucent background with blur and shadow
            "transition-opacity duration-300",
            controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            // Enhanced button styles: text-white, subtle background, scale on hover
            className="text-white bg-white/10 hover:bg-white/20 hover:scale-105 transition-all duration-150 rounded-full"
            aria-label="Share media"
          >
            <Share2 className="h-6 w-6" />
            <span className="sr-only">Share</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            // Enhanced button styles
            className="text-white bg-white/10 hover:bg-white/20 hover:scale-105 transition-all duration-150 rounded-full"
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
              // Enhanced button styles
              className="text-white bg-white/10 hover:bg-white/20 hover:scale-105 transition-all duration-150 rounded-full"
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
