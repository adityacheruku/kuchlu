"use client";

import type { Message } from '@/types';
import { memo } from 'react';

interface RepliedMessagePreviewProps {
    message: Message;
    senderName: string;
}

const RepliedMessagePreview = ({ message, senderName }: RepliedMessagePreviewProps) => {
  const content = message.text ? (message.text.length > 70 ? message.text.substring(0, 70) + '...' : message.text) : 'Attachment';
  return (
    <div className="p-2 mb-1 bg-black/10 dark:bg-white/10 rounded-t-lg border-l-2 border-accent/50 mx-1 mt-1">
      <p className="font-semibold text-xs text-accent">{senderName}</p>
      <p className="text-xs text-current/80 opacity-90">{content}</p>
    </div>
  );
};

export default memo(RepliedMessagePreview);
