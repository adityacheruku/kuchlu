
// ⚡️ Wrapped with React.memo to avoid re-renders when props don’t change
import { memo, type RefObject, useEffect } from 'react';
import type { Message, User, SupportedEmoji, DeleteType } from '@/types';
import MessageBubble from './MessageBubble';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { Button } from '../ui/button';
import Spinner from '../common/Spinner';
import { useInView } from 'react-intersection-observer';
import { mediaCacheService } from '@/services/mediaCacheService';


interface MessageAreaProps {
  viewportRef: RefObject<HTMLDivElement>;
  messages: Message[];
  currentUser: User;
  allUsers: Record<string, User>;
  onToggleReaction: (messageId: string, emoji: SupportedEmoji) => void;
  onShowReactions: (message: Message, allUsers: Record<string, User>) => void;
  onShowMedia: (message: Message) => void;
  onShowDocumentPreview: (message: Message) => void;
  onShowInfo: (message: Message) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onRetrySend: (message: Message) => void;
  onDeleteMessage: (messageId: string, deleteType: DeleteType) => void;
  onSetReplyingTo: (message: Message | null) => void;
  isSelectionMode: boolean;
  selectedMessageIds: Set<string>;
  onEnterSelectionMode: (messageId: string) => void;
  onToggleMessageSelection: (messageId: string) => void;
}

const MessageBubbleWithObserver = (props: { message: Message } & Omit<MessageBubbleProps, 'messages' | 'viewportRef' | 'onLoadMore' | 'hasMore' | 'isLoadingMore'>) => {
    const { message } = props;
    const { ref, inView } = useInView({
        rootMargin: '200px', // Start preloading when message is within 200px of viewport
        triggerOnce: false,  // Keep observing as user scrolls back and forth
    });

    useEffect(() => {
        // Preload logic only for sent messages with media that are in view margin
        if (inView && message.status === 'sent' && message.media_metadata?.urls) {
            const urls = message.media_metadata.urls;

            if (message.message_subtype === 'image') {
                if (urls.thumbnail_250) mediaCacheService.getOrFetchMediaUrl(message, 'thumbnail_250');
                if (urls.preview_800) mediaCacheService.getOrFetchMediaUrl(message, 'preview_800');
            } else if (message.message_subtype === 'clip') { // This covers video
                if (urls.static_thumbnail) mediaCacheService.getOrFetchMediaUrl(message, 'static_thumbnail');
                if (urls.hls_manifest) mediaCacheService.getOrFetchMediaUrl(message, 'hls_manifest');
            }
        }
    }, [inView, message]);

    // Find the sender for this specific message bubble
    const sender = props.allUsers[message.user_id] || (message.user_id === props.currentUser.id ? props.currentUser : null);
    if (!sender) {
        console.warn("Sender not found for message:", message.id, "senderId:", message.user_id);
        return null; // Don't render if sender can't be found
    }

    return (
        <div ref={ref}>
            <MessageBubble sender={sender} {...props} />
        </div>
    );
};


function MessageArea({ 
  messages, 
  currentUser, 
  allUsers, 
  onToggleReaction, 
  onShowReactions, 
  onShowMedia,
  onShowDocumentPreview,
  onShowInfo,
  viewportRef,
  onLoadMore,
  hasMore,
  isLoadingMore,
  onRetrySend,
  onDeleteMessage,
  onSetReplyingTo,
  isSelectionMode,
  selectedMessageIds,
  onEnterSelectionMode,
  onToggleMessageSelection,
}: MessageAreaProps) {
  const lastMessageId = messages[messages.length - 1]?.id;
  useAutoScroll(viewportRef, [lastMessageId]);
  
  return (
    <ScrollArea className="flex-grow p-4 bg-transparent" viewportRef={viewportRef}>
      <div className="flex flex-col space-y-4">
        {hasMore && (
            <div className="text-center">
                <Button variant="outline" size="sm" onClick={onLoadMore} disabled={isLoadingMore}>
                    {isLoadingMore && <Spinner className="mr-2 h-4 w-4" />}
                    Load Older Messages
                </Button>
            </div>
        )}
        {messages.map((msg) => (
            <MessageBubbleWithObserver
              key={msg.client_temp_id || msg.id}
              message={msg}
              currentUser={currentUser}
              allUsers={allUsers}
              onToggleReaction={onToggleReaction}
              onShowReactions={onShowReactions}
              onShowMedia={onShowMedia}
              onShowDocumentPreview={onShowDocumentPreview}
              onShowInfo={onShowInfo}
              onRetrySend={onRetrySend}
              onDeleteMessage={onDeleteMessage}
              onSetReplyingTo={onSetReplyingTo}
              isSelectionMode={isSelectionMode}
              selectedMessageIds={selectedMessageIds}
              onEnterSelectionMode={onEnterSelectionMode}
              onToggleMessageSelection={onToggleMessageSelection}
              isCurrentUser={msg.user_id === currentUser.id}
              currentUserId={currentUser.id}
              wrapperId={`message-${msg.id}`}
            />
        ))}
      </div>
    </ScrollArea>
  );
}

export default memo(MessageArea);
