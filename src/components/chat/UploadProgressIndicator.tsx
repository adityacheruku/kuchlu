
"use client";

import { AlertTriangle, Film, FileText } from "lucide-react";
import Image from "next/image";
import Spinner from "../common/Spinner";
import { Button } from "../ui/button";
import type { Message } from "@/types";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

interface UploadProgressIndicatorProps {
  message: Message;
  onRetry: () => void;
}

export default function UploadProgressIndicator({ message, onRetry }: UploadProgressIndicatorProps) {
    const containerClasses = "w-full h-full rounded-md overflow-hidden bg-muted relative flex items-center justify-center";

    // Failed State UI
    if (message.status === 'failed' || message.uploadStatus === 'failed') {
        return (
            <div className={cn(containerClasses, "border-2 border-dashed border-destructive/50 bg-destructive/10")}>
                {message.thumbnailDataUrl ? (
                     <Image src={message.thumbnailDataUrl} alt="Failed upload preview" fill sizes="(max-width: 640px) 50vw, 250px" className="object-cover blur-sm opacity-30" loading="lazy"/>
                ) : (
                    <div className="absolute inset-0 bg-muted"></div>
                )}
                <div className="absolute inset-0 bg-black/50" />
                <div className="relative flex flex-col items-center justify-center text-center text-destructive-foreground z-10 p-2">
                    <AlertTriangle size={28} className="mb-2 text-destructive" />
                    <p className="text-xs font-semibold mb-2">Upload Failed</p>
                    {message.uploadError?.retryable !== false && (
                        <Button variant="secondary" size="sm" onClick={onRetry} className="h-auto px-3 py-1 text-xs">
                            <RefreshCw size={12} className="mr-1.5" />
                            Retry
                        </Button>
                    )}
                </div>
            </div>
        );
    }
    
    // In-progress states (compressing, uploading, processing)
    const imageUrl = message.thumbnailDataUrl;
    const isDocument = message.message_subtype === 'document';
    const isVideo = message.message_subtype === 'clip';

    let statusText = "Uploading...";
    if (message.uploadStatus === 'compressing') {
        statusText = "Compressing...";
    } else if (message.uploadStatus === 'pending_processing') {
        statusText = "Processing...";
    } else if (message.uploadProgress !== undefined && message.uploadStatus === 'uploading') {
        statusText = `${message.uploadProgress}%`;
    }

    return (
        <div className={cn(containerClasses, 'animate-pulse')}>
            {imageUrl && !isDocument ? (
                <Image src={imageUrl} alt="Uploading preview" fill sizes="(max-width: 640px) 50vw, 250px" className="object-cover blur-sm" loading="lazy" />
            ) : isDocument ? (
                 <div className="flex flex-col items-center justify-center text-muted-foreground text-center p-2">
                    <FileText size={40} />
                    <p className="text-xs mt-2 break-all line-clamp-2">{message.file?.name}</p>
                 </div>
            ) : isVideo ? (
                 <div className="flex flex-col items-center justify-center text-muted-foreground text-center">
                    <Film size={40} />
                 </div>
            ) : (
                <div className="w-full h-full bg-muted"></div>
            )}
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-2 text-center z-10">
                <Spinner />
                <p className="text-sm font-semibold mt-2">
                    {statusText}
                </p>
            </div>
        </div>
    );
}
