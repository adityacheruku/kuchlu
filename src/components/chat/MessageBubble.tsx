
"use client";

// Imports from React and libraries
import { memo, useCallback, useState, useRef } from 'react';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// UI Components
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StatusDots from './StatusDots';
import AudioPlayer from './media/AudioPlayer';
import VideoPlayer from './media/VideoPlayer';
import SecureMediaImage from './media/SecureMediaImage';
import RepliedMessagePreview from './RepliedMessagePreview';
import UploadProgressIndicator from './UploadProgressIndicator';

// Hooks
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { useSwipe } from '@/hooks/useSwipe';
import { useLongPress } from '@/hooks/useLongPress';

// Types and Icons
import type { Message, User, SupportedEmoji } from '@/types';
import { Reply, Trash2, Info, FileText } from 'lucide-react';


export interface MessageBubbleProps {
  message: Message;
  messages: Message[];
  sender: User;
  isCurrentUser: boolean;
  currentUserId: string;
  onToggleReaction: (messageId: string, emoji: SupportedEmoji) => void;
  onShowReactions: (message: Message, allUsers: Record<string, User>) => void;
  onShowMedia: (message: Message) => void;
  onShowDocumentPreview: (message: Message) => void;
  onShowInfo: (message: Message) => void;
  allUsers: Record<string, User>;
  onRetrySend: (message: Message) => void;
  onDeleteMessage: (message: Message) => void;
  onSetReplyingTo: (message: Message | null) => void;
  isSelectionMode: boolean;
  onEnterSelectionMode: (messageId: string) => void;
  onToggleMessageSelection: (messageId: string) => void;
  isSelected: boolean;
  isInfoOpen: boolean;
}

const parseMarkdown = (text: string = ''): string => {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  html = html.replace(/\*([^\*]+)\*/g, '<strong>$1</strong>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  html = html.replace(/~([^~]+)~/g, '<del>$1</del>');
  html = html.replace(/`([^`]+)`/g, '<code class="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded-sm font-mono">$1</code>');
  return html;
};

function MessageBubble({ 
    message, messages, sender, isCurrentUser, currentUserId, 
    onToggleReaction, onShowMedia, onShowDocumentPreview, 
    onShowInfo, allUsers, onRetrySend, 
    onDeleteMessage: onDelete, onSetReplyingTo, isSelectionMode, 
    onEnterSelectionMode, onToggleMessageSelection, isSelected, isInfoOpen
}: MessageBubbleProps) {
  
  const [isShaking, setIsShaking] = useState(false);

  const handleDoubleTap = useCallback(() => {
    if (message.status !== 'failed' && message.status !== 'sending' && message.mode !== 'incognito' && !isSelectionMode) {
      onToggleReaction(message.id, '❤️');
    }
  }, [message.id, message.status, message.mode, onToggleReaction, isSelectionMode]);
  
  const handleRetry = (message: Message) => {
      setIsShaking(true);
      onRetrySend(message);
      setTimeout(() => setIsShaking(false), 600);
  };
  
  const isJumboEmoji = message.message_subtype === 'emoji_only';
  const isTextMessage = message.message_subtype === 'text';
  const isMediaMessage = ['image', 'clip'].includes(message.message_subtype || '');
  const isAudioMessage = message.message_subtype === 'voice_message' || message.message_subtype === 'audio';
  const isDocumentMessage = message.message_subtype === 'document';
  const isStickerMessage = message.message_subtype === 'sticker';
  const swipeDisabled = isMediaMessage || isStickerMessage || isSelectionMode || isJumboEmoji;
  
  const { translateX, isDragging, events: swipeEvents } = useSwipe({
    onSwipeLeft: () => {
      if (swipeDisabled) return;
      isCurrentUser ? onDelete(message) : onSetReplyingTo(message);
    },
    onSwipeRight: () => {
      if (swipeDisabled) return;
      isCurrentUser ? onSetReplyingTo(message) : onDelete(message);
    },
    onSwipeStart: () => Haptics.impact({ style: ImpactStyle.Light }),
  });

  const longPressHandlers = useLongPress(() => {
    if (!isSelectionMode) onEnterSelectionMode(message.id);
  }, {
    onStart: () => Haptics.impact({ style: ImpactStyle.Medium })
  });

  const doubleTapEvents = useDoubleTap(handleDoubleTap, { timeout: 300 });

  const handleBubbleClick = (e: React.MouseEvent) => {
    if (Math.abs(translateX) > 20) { e.preventDefault(); return; }
    if (longPressHandlers.isLongPressing()) { e.preventDefault(); return; }
    if (isSelectionMode) { onToggleMessageSelection(message.id); return; }
  };

  let formattedTime = "";
  try {
    if (message.created_at) {
        formattedTime = format(parseISO(message.created_at), 'p');
    }
  } catch(e) { console.warn("Could not parse message timestamp:", message.created_at) }

  if (message.message_subtype === 'history_cleared_marker') return null;
  
  const repliedToMessage = message.reply_to_message_id ? messages.find(m => m.id === message.reply_to_message_id) : null;
  const repliedToSender = repliedToMessage ? allUsers[repliedToMessage.user_id] : null;

  const renderBubbleContent = () => {
    if (isMediaMessage) {
      const isUploading = message.status === 'uploading' || message.uploadStatus === 'pending' || message.uploadStatus === 'compressing' || message.uploadStatus === 'pending_processing';
      const isFailed = message.status === 'failed' || message.uploadStatus === 'failed';
      const showOverlay = isUploading || isFailed;
      return (
        <div className="relative max-w-[320px] w-[80vw] aspect-auto">
          <div className={cn('rounded-lg overflow-hidden', showOverlay && "filter blur-sm brightness-75")}>
            {message.message_subtype === 'image' && <SecureMediaImage message={message} onShowMedia={onShowMedia} alt={`Image from ${sender.display_name}`} />}
            {message.message_subtype === 'clip' && <VideoPlayer message={message} />}
          </div>
          {showOverlay && <UploadProgressIndicator message={message} onRetry={() => handleRetry(message)} />}
        </div>
      );
    }
    if (isJumboEmoji) {
        return <p className="text-5xl animate-pop">{message.text}</p>;
    }
    if (isTextMessage) {
        return message.text ? (
            <p className="text-sm whitespace-pre-wrap break-words"
               dangerouslySetInnerHTML={{ __html: parseMarkdown(message.text) }}/>
        ) : <p className="text-sm italic text-muted-foreground">Message empty</p>;
    }
    if (isAudioMessage) return <AudioPlayer message={message} isCurrentUser={isCurrentUser} />;
    if (isStickerMessage && message.sticker_image_url) {
      return <Image src={message.sticker_image_url} alt="Sticker" width={128} height={128} unoptimized />;
    }
    if(isDocumentMessage) {
        return (
             <button onClick={() => onShowDocumentPreview(message)} className="flex items-center gap-3 p-2">
                <FileText size={24} className="flex-shrink-0" />
                <div className="flex-grow min-w-0 text-left">
                    <p className="font-medium truncate">{message.document_name}</p>
                    <p className="text-xs opacity-80">{message.file_size_bytes ? `${(message.file_size_bytes / 1024 / 1024).toFixed(2)} MB` : ''}</p>
                </div>
            </button>
        )
    }
    
    return <p className="text-sm italic">Unsupported message type</p>;
  }

  const hasStandardBubble = isTextMessage || isAudioMessage || isDocumentMessage;
  const hasNoBubble = isStickerMessage || isMediaMessage || isJumboEmoji;
  
  return (
    <div className={cn('w-full flex items-start', isCurrentUser ? 'justify-end' : 'justify-start')}>
        <div className={cn("flex items-end gap-2 max-w-[85vw] sm:max-w-md", isCurrentUser ? 'flex-row-reverse' : 'flex-row')}>
            {!isCurrentUser && <Avatar className="w-8 h-8 self-end mb-2"><AvatarImage src={sender.avatar_url || undefined} alt={sender.display_name} /><AvatarFallback>{sender.display_name.charAt(0)}</AvatarFallback></Avatar>}
            <div className="flex flex-col w-full">
                <div className={cn('relative overflow-hidden w-full', isShaking && 'animate-shake')} {...longPressHandlers}>
                    <div className={cn('absolute inset-y-0 flex items-center transition-opacity', { 'bg-destructive': (isCurrentUser && translateX < 0) || (!isCurrentUser && translateX > 0) }, { 'bg-secondary': (isCurrentUser && translateX > 0) || (!isCurrentUser && translateX < 0) }, translateX > 0 ? 'left-0' : 'right-0')} style={{ width: `${Math.abs(translateX)}px`, opacity: Math.min(Math.abs(translateX) / 60, 1) }}>
                        {((isCurrentUser && translateX > 0) || (!isCurrentUser && translateX < 0)) && <Reply className="absolute left-4 text-secondary-foreground" size={20} />}
                        {((isCurrentUser && translateX < 0) || (!isCurrentUser && translateX > 0)) && <Trash2 className="absolute right-4 text-destructive-foreground" size={20} />}
                    </div>
                    <div className={cn('relative transition-transform w-full', !isDragging && 'duration-300 ease-out')} style={{ transform: `translateX(${translateX}px)` }} {...swipeEvents} {...doubleTapEvents} onClick={handleBubbleClick}>
                        <div className={cn(
                          'transition-all flex flex-col', 
                          !hasNoBubble && 'rounded-xl shadow-md',
                          isCurrentUser ? 'items-end' : 'items-start',
                          !hasNoBubble && (isCurrentUser ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-secondary text-secondary-foreground rounded-bl-none'),
                          isInfoOpen && "ring-2 ring-primary ring-offset-2 ring-offset-card",
                          isSelected && "ring-2 ring-blue-500 ring-offset-2 ring-offset-card"
                        )}>
                            {repliedToMessage && repliedToSender && <RepliedMessagePreview message={repliedToMessage} senderName={repliedToSender.display_name}/>}
                            <div className={cn(hasStandardBubble && 'p-3', isAudioMessage && 'p-1')}>
                                {renderBubbleContent()}
                            </div>
                        </div>
                    </div>
                </div>
                {hasStandardBubble && (
                    <div className={cn("flex items-center gap-2 pt-1 px-2", isCurrentUser ? "justify-end" : "justify-start")}>
                        <span className="text-xs text-muted-foreground">{formattedTime}</span>
                        {isCurrentUser && <StatusDots status={message.status} />}
                        {isCurrentUser && message.status !== 'sending' && message.status !== 'failed' && <button onClick={() => onShowInfo(message)} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"><Info size={14}/></button>}
                    </div>
                )}
                 {!hasStandardBubble && !isMediaMessage && (
                     <div className={cn("flex items-center gap-2 pt-1 px-2", isCurrentUser ? "justify-end" : "justify-start")}>
                        {isCurrentUser && <StatusDots status={message.status} />}
                    </div>
                 )}
                 {isMediaMessage && (
                     <div className="absolute bottom-1.5 right-1.5 z-10 flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm px-2 py-1 text-white shadow-lg">
                        <span className="text-xs font-medium" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{formattedTime}</span>
                        {isCurrentUser && <StatusDots status={message.status} />}
                    </div>
                 )}
            </div>
        </div>
    </div>
  );
}

export default memo(MessageBubble);
