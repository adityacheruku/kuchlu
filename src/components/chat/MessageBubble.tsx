
"use client";

import type { Message, User, SupportedEmoji, DeleteType, MessageStatus } from '@/types';
import { QUICK_REACTION_EMOJIS, EMOJI_ONLY_REGEX } from '@/types';
import { format, parseISO } from 'date-fns';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Play, FileText, AlertTriangle, RefreshCw, MoreHorizontal, Reply, Copy, Trash2, Heart, ImageOff, Eye, Mic, Info, Music, Film, Clock, Check, CheckCheck, Pause, PlayCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { useState, useRef, memo, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import DeleteMessageDialog from './DeleteMessageDialog';
import { useSwipe } from '@/hooks/useSwipe';
import { useLongPress } from '@/hooks/useLongPress';
import Spinner from '../common/Spinner';
import UploadProgressIndicator from './UploadProgressIndicator';
import { mediaCacheService } from '@/services/mediaCacheService';
import dynamic from 'next/dynamic';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import StatusDots from './StatusDots';

const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false, loading: () => <div className="w-full max-w-[320px] aspect-video bg-muted flex items-center justify-center rounded-lg"><Spinner /></div> });

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
  onDeleteMessage: (messageId: string, deleteType: DeleteType) => void;
  onSetReplyingTo: (message: Message | null) => void;
  onMarkAsRead: (messageId: string, chatId: string) => void;
  wrapperId?: string;
  isSelectionMode: boolean;
  selectedMessageIds: Set<string>;
  onEnterSelectionMode: (messageId: string) => void;
  onToggleMessageSelection: (messageId: string) => void;
  isSelected: boolean;
  isInfoOpen: boolean;
}

const useCachedMediaUrl = (message: Message, version: string) => {
    const [displayUrl, setDisplayUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
        let objectUrl: string | null = null;
        const loadMedia = async () => {
            if (!message.file_metadata || message.status === 'uploading' || message.uploadStatus === 'pending_processing') {
                return;
            }
            setIsLoading(true);
            const url = await mediaCacheService.getOrFetchMediaUrl(message, version);
            objectUrl = url;
            setDisplayUrl(url);
            setIsLoading(false);
        };
        loadMedia();
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [message, version]);

    return { displayUrl, isLoading };
};

const SecureMediaImage = ({ message, onShowMedia, alt }: { message: Message; onShowMedia: (message: Message) => void; alt: string; }) => {
    const version = message.file_metadata?.urls?.preview_800 ? 'preview_800' : 'original';
    const { displayUrl: imageUrl, isLoading } = useCachedMediaUrl(message, version);
    const { displayUrl: thumbnailUrl, isLoading: isLoadingThumb } = useCachedMediaUrl(message, 'thumbnail_250');

    if ((isLoadingThumb || isLoading) && !thumbnailUrl) return <div className="w-full max-w-[250px] aspect-[4/3] bg-muted flex items-center justify-center rounded-lg"><Spinner/></div>;
    
    if (!isLoading && !imageUrl && !thumbnailUrl) {
      return (
        <div className="w-full max-w-[250px] aspect-[4/3] bg-muted flex flex-col items-center justify-center rounded-lg text-destructive">
          <ImageOff size={24} />
          <p className="text-xs mt-1">Image unavailable</p>
        </div>
      )
    }

    return (
        <button onClick={() => imageUrl && onShowMedia(message)} className="block w-full h-full relative group/media rounded-lg overflow-hidden bg-muted transition-transform active:scale-95 md:hover:scale-105 shadow-md md:hover:shadow-lg" aria-label={alt}>
            <Image src={thumbnailUrl || imageUrl || "https://placehold.co/400x300.png"} alt={alt} fill sizes="(max-width: 640px) 85vw, 320px" className="object-cover" data-ai-hint="chat photo" loading="lazy"/>
        </button>
    );
};

const VideoPlayer = memo(({ message }: { message: Message }) => {
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
        <div className="w-full h-full relative rounded-lg overflow-hidden shadow-md bg-black">
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
});
VideoPlayer.displayName = "VideoPlayer";

const AudioPlayer = memo(({ message, sender, isCurrentUser }: { message: Message; sender: User; isCurrentUser: boolean; }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(message.duration_seconds || 0);
    const [currentTime, setCurrentTime] = useState(0);
    const [hasBeenPlayed, setHasBeenPlayed] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const { toast } = useToast();

    const version = message.file_metadata?.urls?.mp3_audio ? 'mp3_audio' : 'original';
    const { displayUrl: signedAudioUrl, isLoading } = useCachedMediaUrl(message, version);
    
    const handleTogglePlaybackRate = () => {
        const rates = [1, 1.5, 2];
        const currentIndex = rates.indexOf(playbackRate);
        const nextIndex = (currentIndex + 1) % rates.length;
        setPlaybackRate(rates[nextIndex]);
    };

    const handlePlayPause = () => {
        if (!audioRef.current || !signedAudioUrl) return;
        
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            const playEvent = new CustomEvent('audio-play', { detail: { player: audioRef.current } });
            document.dispatchEvent(playEvent);
            audioRef.current.play().catch(e => {
                console.error("Audio play failed:", e);
                setHasError(true);
                toast({ variant: 'destructive', title: 'Playback Error' });
            });
            if (!hasBeenPlayed) {
                setHasBeenPlayed(true);
            }
        }
        setIsPlaying(!isPlaying);
    };
    
    const handleSeek = (value: number[]) => {
      if (audioRef.current) {
        audioRef.current.currentTime = value[0];
        setCurrentTime(value[0]);
      }
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !signedAudioUrl) return;
        
        audio.src = signedAudioUrl;
        audio.playbackRate = playbackRate;

        const handleGlobalPlay = (event: Event) => {
            if ((event as CustomEvent).detail.player !== audio) {
                audio.pause();
                setIsPlaying(false);
            }
        };

        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => {
            if (!isNaN(audio.duration) && isFinite(audio.duration)) {
                setDuration(audio.duration);
            }
        }
        const handleEnd = () => setIsPlaying(false);
        const handleError = () => { setHasError(true); toast({ variant: "destructive", title: "Playback Error" }); };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('ended', handleEnd);
        audio.addEventListener('error', handleError);
        document.addEventListener('audio-play', handleGlobalPlay);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('ended', handleEnd);
            audio.removeEventListener('error', handleError);
            document.removeEventListener('audio-play', handleGlobalPlay);
        };
    }, [toast, signedAudioUrl, playbackRate]);
    
    const playerColorClass = isCurrentUser ? 'text-primary-foreground' : 'text-secondary-foreground';
    const sliderThumbClass = isCurrentUser ? '[&>span]:bg-primary-foreground' : '[&>span]:bg-primary';
    const sliderTrackClass = isCurrentUser ? 'bg-primary-foreground/30' : 'bg-secondary-foreground/30';
    const sliderRangeClass = isCurrentUser ? 'bg-primary-foreground' : 'bg-secondary-foreground';
    
    if (hasError) return <div className={cn("flex items-center gap-2 p-2", isCurrentUser ? "text-red-300" : "text-red-500")}><AlertTriangle size={18} /><span className="text-sm">Audio error</span></div>;

    return (
        <div className={cn("flex items-center gap-2 w-full max-w-[250px] sm:max-w-xs", playerColorClass)}>
            <audio ref={audioRef} preload="metadata" />
             {!isCurrentUser && !hasBeenPlayed && (
                <div className="relative flex-shrink-0">
                    <div className={cn("w-2.5 h-2.5 rounded-full bg-primary")} />
                </div>
             )}
            <Button variant="ghost" size="icon" onClick={handlePlayPause} className={cn("w-10 h-10 rounded-full flex-shrink-0", isCurrentUser ? 'hover:bg-white/20' : 'hover:bg-black/10')} aria-label={isPlaying ? "Pause audio" : "Play audio"} disabled={!signedAudioUrl || isLoading}>
                {(!signedAudioUrl || isLoading) ? <Spinner/> : isPlaying ? <Pause size={20} className={playerColorClass} /> : <Play size={20} className={cn("ml-0.5", playerColorClass)} />}
            </Button>
            
            <div className="flex-grow flex flex-col justify-center gap-1.5 w-full">
                 <Slider
                    value={[currentTime]}
                    max={duration || 1}
                    step={0.1}
                    onValueChange={handleSeek}
                    className="w-full h-1"
                    classNames={{
                      track: cn('h-1', sliderTrackClass),
                      range: cn('h-1', sliderRangeClass),
                      thumb: cn('h-3 w-3', sliderThumbClass)
                    }}
                    aria-label="Seek audio"
                 />
            </div>
            
            <Button variant="ghost" size="sm" onClick={handleTogglePlaybackRate} className={cn("w-12 h-8 rounded-full text-xs font-mono", isCurrentUser ? 'hover:bg-white/20' : 'hover:bg-black/10')}>
                {playbackRate.toFixed(1)}x
            </Button>
        </div>
    );
});
AudioPlayer.displayName = "AudioPlayer";

const parseMarkdown = (text: string = ''): string => {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  // Bold: *text*
  html = html.replace(/\*([^\*]+)\*/g, '<strong>$1</strong>');
  // Italic: _text_
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  // Strikethrough: ~text~
  html = html.replace(/~([^~]+)~/g, '<del>$1</del>');
  // Monospace: `text`
  html = html.replace(/`([^`]+)`/g, '<code class="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded-sm font-mono">$1</code>');
  return html;
};

function MessageBubble({ message, messages, sender, isCurrentUser, currentUserId, onToggleReaction, onShowReactions, onShowMedia, onShowDocumentPreview, onShowInfo, allUsers, onRetrySend, onDeleteMessage: onDelete, onSetReplyingTo, onMarkAsRead, wrapperId, isSelectionMode, onEnterSelectionMode, onToggleMessageSelection, isSelected, isInfoOpen }: MessageBubbleProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    if (message.text) {
        navigator.clipboard.writeText(message.text);
        toast({ title: "Copied!", description: "Message text copied to clipboard." });
    }
  };

  const handleDoubleTap = useCallback(() => {
    if (message.status !== 'failed' && message.status !== 'sending' && message.mode !== 'incognito' && !isSelectionMode) {
      onToggleReaction(message.id, '❤️');
    }
  }, [message.id, message.status, message.mode, onToggleReaction, isSelectionMode]);
  
  const handleConfirmDelete = (deleteType: DeleteType) => {
    onDelete(message.id, deleteType);
    setIsDeleteDialogOpen(false);
  }
  
  const handleRetry = (message: Message) => {
      setIsShaking(true);
      onRetrySend(message);
      setTimeout(() => setIsShaking(false), 600);
  };
  
  const isTextMessage = message.message_subtype === 'text' || message.message_subtype === 'emoji_only';
  const isMediaMessage = ['image', 'clip'].includes(message.message_subtype || '');
  const isStickerMessage = message.message_subtype === 'sticker';
  const isAudioMessage = message.message_subtype === 'voice_message' || message.message_subtype === 'audio';
  const isEmojiOnlyMessage = message.message_subtype === 'emoji_only';
  const swipeDisabled = isMediaMessage || isStickerMessage || isSelectionMode;
  const reactionsDisabled = message.mode === 'incognito' || isSelectionMode;
  
  const { translateX, isDragging, events: swipeEvents } = useSwipe({
    onSwipeLeft: () => {
      if (swipeDisabled) return;
      isCurrentUser ? setIsDeleteDialogOpen(true) : onSetReplyingTo(message);
    },
    onSwipeRight: () => {
      if (swipeDisabled) return;
      isCurrentUser ? onSetReplyingTo(message) : setIsDeleteDialogOpen(true);
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
    if (Math.abs(translateX) > 20) { // If swiping, don't trigger click
      e.preventDefault();
      return;
    }
    if (longPressHandlers.isLongPressing()) {
      e.preventDefault();
      return;
    }
    if (isSelectionMode) {
      onToggleMessageSelection(message.id);
      return;
    }
  };

  const bubbleColorClass = isCurrentUser ? 'bg-primary text-primary-foreground' : (isAudioMessage ? 'bg-card' : 'bg-card text-card-foreground');
  
  let formattedTime = "";
  try {
    if (message.created_at) {
        formattedTime = format(parseISO(message.created_at), 'p');
    }
  } catch(e) { console.warn("Could not parse message timestamp:", message.created_at) }

  if (message.message_subtype === 'history_cleared_marker') return null;
  
  const repliedToMessage = message.reply_to_message_id ? messages.find(m => m.id === message.reply_to_message_id) : null;
  const repliedToSender = repliedToMessage ? allUsers[repliedToMessage.user_id] : null;

  const renderContent = () => {
    const isUploadingOrFailed = message.status === 'uploading' || (message.status === 'failed' && message.file);
    if (isUploadingOrFailed) {
      return (
        <div className="w-full aspect-square rounded-lg overflow-hidden">
          <UploadProgressIndicator message={message} onRetry={() => handleRetry(message)} />
        </div>
      );
    }
    
    switch (message.message_subtype) {
      case 'image': return <SecureMediaImage message={message} onShowMedia={() => onShowMedia(message)} alt={`Image from ${sender.display_name}`} />;
      case 'clip': return <VideoPlayer message={message} />;
      default: return null;
    }
  };

  const renderBubbleContent = () => {
    if (isTextMessage) {
        return message.text ? (
            <p className={cn("text-sm whitespace-pre-wrap break-words", isEmojiOnlyMessage && "text-5xl animate-pop")}
               dangerouslySetInnerHTML={{ __html: isEmojiOnlyMessage ? message.text : parseMarkdown(message.text) }}/>
        ) : <p className="text-sm italic text-muted-foreground">Message empty</p>;
    }
    if (isAudioMessage) return <AudioPlayer message={message} sender={sender} isCurrentUser={isCurrentUser} />;
    
    return <p>Unsupported message</p>;
  }

  return (
    <div
      id={wrapperId}
      className={cn(
        'w-full flex items-start',
        isCurrentUser ? 'justify-end' : 'justify-start',
      )}
    >
      <div className={cn("flex items-end gap-2 max-w-[85vw] sm:max-w-md", isCurrentUser ? 'flex-row-reverse' : 'flex-row')}>
        {!isCurrentUser && !isAudioMessage && (
            <Avatar className="w-8 h-8 self-end mb-2">
                <AvatarImage src={sender.avatar_url || undefined} alt={sender.display_name} />
                <AvatarFallback>{sender.display_name.charAt(0)}</AvatarFallback>
            </Avatar>
        )}
        <div className="flex flex-col w-full">
            <div 
              className={cn(
                'relative overflow-hidden rounded-xl w-full',
                isShaking && 'animate-shake'
              )}
              {...longPressHandlers}
            >
              <div
                className={cn(
                  'absolute inset-y-0 flex items-center transition-opacity',
                  { 'bg-destructive': (isCurrentUser && translateX < 0) || (!isCurrentUser && translateX > 0) },
                  { 'bg-secondary': (isCurrentUser && translateX > 0) || (!isCurrentUser && translateX < 0) },
                  translateX > 0 ? 'left-0' : 'right-0',
                )}
                style={{
                    width: `${Math.abs(translateX)}px`,
                    opacity: Math.min(Math.abs(translateX) / 60, 1),
                }}
              >
                  {((isCurrentUser && translateX > 0) || (!isCurrentUser && translateX < 0)) && <Reply className="absolute left-4 text-secondary-foreground" size={20} />}
                  {((isCurrentUser && translateX < 0) || (!isCurrentUser && translateX > 0)) && <Trash2 className="absolute right-4 text-destructive-foreground" size={20} />}
              </div>

              <div
                className={cn(
                  'relative transition-transform',
                  !isDragging && 'duration-300 ease-out',
                  'w-full'
                )}
                style={{ transform: `translateX(${translateX}px)` }}
                {...swipeEvents}
                {...doubleTapEvents}
                onClick={handleBubbleClick}
              >
                  <div
                    className={cn(
                      'rounded-xl shadow-md transition-all flex flex-col',
                      isCurrentUser 
                        ? 'bg-primary text-primary-foreground rounded-br-none' 
                        : 'bg-card text-card-foreground rounded-bl-none',
                      isSelected && 'ring-2 ring-offset-2 ring-offset-card ring-primary',
                      (isAudioMessage && !isCurrentUser) && 'bg-card',
                      isEmojiOnlyMessage && 'bg-transparent shadow-none'
                    )}
                  >
                     {isMediaMessage ? (
                      <div className="relative rounded-t-lg overflow-hidden max-w-[320px] w-[80vw]">
                        {renderContent()}
                      </div>
                    ) : (
                        <div className={cn("p-3", isAudioMessage && "p-1", isEmojiOnlyMessage && 'p-0')}>
                            {renderBubbleContent()}
                        </div>
                    )}
                     {message.caption && isMediaMessage && <p className="text-sm px-3 py-2">{message.caption}</p>}
                  </div>
              </div>

            </div>
            <div className={cn("flex items-center gap-2 pt-1 px-2", isCurrentUser ? "justify-end" : "justify-start")}>
                <span className="text-xs text-muted-foreground">{formattedTime}</span>
                {isCurrentUser && <StatusDots status={message.status} />}
                {isCurrentUser && message.status !== 'sending' && message.status !== 'failed' && (
                    <button onClick={() => onShowInfo(message)} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                        <Info size={14}/>
                    </button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}

export default memo(MessageBubble);
