

"use client";

import { AlertTriangle, RefreshCw, UploadCloud } from "lucide-react";
import Spinner from "../common/Spinner";
import { Button } from "../ui/button";
import type { Message } from "@/types";
import { cn } from "@/lib/utils";

interface UploadProgressIndicatorProps {
  message: Message;
  onRetry: () => void;
}

export default function UploadProgressIndicator({ message, onRetry }: UploadProgressIndicatorProps) {
  const containerClasses = "absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-lg";

  // Failed State UI
  if (message.status === 'failed' || message.uploadStatus === 'failed') {
    return (
      <div className={cn(containerClasses, "flex-col p-4 text-center text-white")}>
        <div className="w-16 h-16 rounded-full bg-destructive/80 flex items-center justify-center mb-2">
            <AlertTriangle size={32} />
        </div>
        <p className="text-sm font-semibold mb-2">Upload Failed</p>
        {message.uploadError?.retryable !== false && (
          <Button variant="secondary" size="sm" onClick={onRetry} className="h-auto px-4 py-1.5 text-xs">
            <RefreshCw size={14} className="mr-1.5" />
            Retry
          </Button>
        )}
      </div>
    );
  }
  
  // In-progress states
  let statusText = "Uploading...";
  if (message.uploadStatus === 'compressing') {
    statusText = "Compressing...";
  } else if (message.uploadStatus === 'pending_processing') {
    statusText = "Processing...";
  }

  return (
    <div className={cn(containerClasses, 'flex-col p-4 text-center text-white')}>
      <div className="relative w-16 h-16 flex items-center justify-center">
        <Spinner />
        {message.uploadStatus === 'uploading' && message.uploadProgress !== undefined && (
          <span className="absolute text-xs font-bold">{message.uploadProgress}%</span>
        )}
      </div>
      <p className="text-sm font-semibold mt-2">{statusText}</p>
    </div>
  );
}
