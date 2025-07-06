
"use client";

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User, Message as MessageType, Mood, SupportedEmoji, MessageMode, DeleteType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useChat } from '@/hooks/useChat';
import { cn } from '@/lib/utils';
import ChatHeader from '@/components/chat/ChatHeader';
import MessageArea from '@/components/chat/MessageArea';
import InputBar from '@/components/ui/../chat/InputBar';
import FullPageLoader from '@/components/common/FullPageLoader';
import Spinner from '@/components/common/Spinner';
import dynamic from 'next/dynamic';
import { api } from '@/services/api';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import ConnectionStatusBanner from './ConnectionStatusBanner';
import MessageInfoModal from './MessageInfoModal';
import ChatModeSelector from './ChatModeSelector';
import DeleteMessageDialog from './DeleteMessageDialog';
import { useAuth } from '@/contexts/AuthContext';


const FullScreenAvatarModal = dynamic(() => import('@/components/chat/FullScreenAvatarModal'), { ssr: false, loading: () => <FullPageLoader /> });
const FullScreenMediaModal = dynamic(() => import('@/components/chat/FullScreenMediaModal'), { ssr: false, loading: () => <FullPageLoader /> });
const MoodEntryModal = dynamic(() => import('@/components/chat/MoodEntryModal'), { ssr: false, loading: () => <FullPageLoader /> });
const ReactionSummaryModal = dynamic(() => import('@/components/chat/ReactionSummaryModal'), { ssr: false, loading: () => <FullPageLoader /> });
const DocumentPreviewModal = dynamic(() => import('@/components/chat/DocumentPreviewModal'), { ssr: false, loading: () => <FullPageLoader /> });


interface ChatViewProps {
    initialCurrentUser: User;
}

export default function ChatView({ initialCurrentUser }: ChatViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { isSubscribed, permissionStatus, subscribeToPush, isPushApiSupported } = usePushNotifications();
  const { fetchAndUpdateUser } = useAuth();
  
  const {
      currentUser,
      otherUser,
      messages,
      activeChatId,
      chatMode,
      dynamicBgClass,
      protocol,
      isBrowserOnline,
      isChatLoading,
      chatSetupErrorMessage,
      isLoadingMore,
      hasMoreMessages,
      typingUsers,
      activeThoughtNotificationFor,
      isSelectionMode,
      selectedMessageIds,
      replyingTo,
      pullY,
      isPulling,
      activationThreshold,
      viewportRef,
      
      // Modals State
      isMoodModalOpen,
      initialMoodOnLoad,
      reactionModalData,
      mediaModalData,
      documentPreview,
      messageInfo,
      isModeSelectorOpen,
      isDeleteDialogOpen,
      isClearChatDialogOpen,
      isFullScreenAvatarOpen,
      fullScreenUserData,

      // Modal Setters
      setIsMoodModalOpen,
      setReactionModalData,
      setMediaModalData,
      setDocumentPreview,
      setMessageInfo,
      setIsModeSelectorOpen,
      setIsDeleteDialogOpen,
      setIsClearChatDialogOpen,
      setIsFullScreenAvatarOpen,
      setFullScreenUserData,

      // Handlers
      loadMoreMessages,
      handleSendMessage,
      handleFileUpload,
      handleSendSticker,
      handleTyping,
      handleToggleReaction,
      handleRetrySend,
      handleDeleteSelected,
      handleClearChat,
      handleSetReplyingTo,
      handleEnterSelectionMode,
      handleToggleMessageSelection,
      handleExitSelectionMode,
      handleCopySelected,
      handleShareSelected,
      handleMarkAsRead,
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
      handleSelectMode,
      handleSendThoughtRef,
      handleProfileClick
  } = useChat({ initialCurrentUser });

  // Callbacks for components that are not directly managed by the hook
   const handleEnableNotifications = useCallback(() => {
    subscribeToPush();
  }, [subscribeToPush]);

  const handleDismissNotificationPrompt = useCallback(() => {
    // Logic to hide prompt can be managed here or passed to hook
  }, []);
  
  const handleOtherUserAvatarClick = useCallback(() => {
    if (otherUser) {
      setFullScreenUserData(otherUser);
      setIsFullScreenAvatarOpen(true);
    }
  }, [otherUser, setFullScreenUserData, setIsFullScreenAvatarOpen]);

  const handleContinueWithCurrentMood = useCallback(() => {
    if (typeof window !== 'undefined') localStorage.setItem('kuchlu_lastMoodPromptTimestamp', Date.now().toString());
    setIsMoodModalOpen(false);
  }, [setIsMoodModalOpen]);

  const handleSetMoodFromModal = useCallback(async (newMood: Mood) => {
    if (!currentUser) return;
    try {
      await api.updateUserProfile({ mood: newMood });
      await fetchAndUpdateUser();
      toast({ title: "Mood Updated!" });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed' });
    }
    handleContinueWithCurrentMood();
  }, [currentUser, fetchAndUpdateUser, toast, handleContinueWithCurrentMood]);

  if (isChatLoading || !currentUser) return <FullPageLoader />;
  if (!otherUser || !activeChatId || !messages) return <div className="flex min-h-screen items-center justify-center bg-background p-4 text-center"><div><FullPageLoader /><p className="text-lg text-foreground">Setting up your chat...</p>{chatSetupErrorMessage && <p className="text-destructive mt-2">{chatSetupErrorMessage}</p>}</div></div>;
  
  const allUsersForComponents = { [currentUser.id]: currentUser, [otherUser.id]: otherUser };
  const isInputDisabled = protocol === 'disconnected' || isSelectionMode;
  const isInfoOverlayVisible = !!messageInfo;

  return (
    <div className={cn("flex-grow w-full h-full flex items-center justify-center p-2 sm:p-4 overflow-hidden", dynamicBgClass, (protocol !== 'websocket' && protocol !== 'disconnected') && 'pt-10')}>
        <ConnectionStatusBanner protocol={protocol} isBrowserOnline={isBrowserOnline} />
        <div className="w-full max-w-2xl h-full flex flex-col bg-card shadow-2xl rounded-lg overflow-hidden relative">
            {isInfoOverlayVisible && (
                <div className="absolute inset-0 bg-black/60 z-30 animate-in fade-in-0" onClick={() => setMessageInfo(null)} />
            )}
            <ChatHeader
                currentUser={currentUser}
                otherUser={otherUser}
                onProfileClick={handleProfileClick}
                onSendThinkingOfYou={handleSendThoughtRef.current}
                isTargetUserBeingThoughtOf={!!activeThoughtNotificationFor && activeThoughtNotificationFor === otherUser.id}
                onOtherUserAvatarClick={handleOtherUserAvatarClick}
                isOtherUserTyping={!!typingUsers[otherUser.id]?.isTyping}
                isSelectionMode={isSelectionMode}
                selectedMessageCount={selectedMessageIds.size}
                onExitSelectionMode={handleExitSelectionMode}
                onCopySelected={handleCopySelected}
                onDeleteSelected={() => setIsDeleteDialogOpen(true)}
                onShareSelected={handleShareSelected}
                onClearChat={() => setIsClearChatDialogOpen(true)}
                onReplySelected={() => {
                    const msg = messages.find(m => m.id === Array.from(selectedMessageIds)[0]);
                    if (msg) handleSetReplyingTo(msg);
                    handleExitSelectionMode();
                }}
                onToggleStarSelected={() => toast({ title: "Coming Soon!" })}
            />
            <MessageArea
                messages={messages}
                currentUser={currentUser}
                allUsers={allUsersForComponents}
                onToggleReaction={handleToggleReaction}
                onShowReactions={(m, u) => setReactionModalData({ reactions: m.reactions!, allUsers: u })}
                onShowMedia={setMediaModalData}
                onShowDocumentPreview={setDocumentPreview}
                onShowInfo={setMessageInfo}
                onLoadMore={loadMoreMessages}
                hasMore={hasMoreMessages}
                isLoadingMore={isLoadingMore}
                onRetrySend={handleRetrySend}
                onDeleteMessage={() => setIsDeleteDialogOpen(true)}
                onSetReplyingTo={handleSetReplyingTo}
                isSelectionMode={isSelectionMode}
                selectedMessageIds={selectedMessageIds}
                onEnterSelectionMode={handleEnterSelectionMode}
                onToggleMessageSelection={handleToggleMessageSelection}
                onMarkAsRead={handleMarkAsRead}
                infoMessageId={messageInfo?.id || null}
                pullY={pullY}
                isPulling={isPulling}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                activationThreshold={activationThreshold}
                viewportRef={viewportRef}
            />
            <InputBar
                onSendMessage={handleSendMessage}
                onSendSticker={handleSendSticker}
                onSendVoiceMessage={(file, mode) => handleFileUpload(file, mode, 'voice_message')}
                onSendImage={(file, mode) => handleFileUpload(file, mode, 'image')}
                onSendVideo={(file, mode) => handleFileUpload(file, mode, 'clip')}
                onSendDocument={(file, mode) => handleFileUpload(file, mode, 'document')}
                onSendAudio={(file, mode) => handleFileUpload(file, mode, 'audio')}
                isSending={isLoadingMore}
                onTyping={handleTyping}
                disabled={isInputDisabled}
                chatMode={chatMode}
                onSelectMode={handleSelectMode}
                replyingTo={replyingTo}
                onCancelReply={() => handleSetReplyingTo(null)}
                allUsers={allUsersForComponents}
            />
        </div>

        {/* Modals */}
        {fullScreenUserData && <FullScreenAvatarModal isOpen={isFullScreenAvatarOpen} onClose={() => setIsFullScreenAvatarOpen(false)} user={fullScreenUserData} />}
        {mediaModalData && <FullScreenMediaModal isOpen={!!mediaModalData} onClose={() => setMediaModalData(null)} message={mediaModalData} />}
        {currentUser && initialMoodOnLoad && <MoodEntryModal isOpen={isMoodModalOpen} onClose={handleContinueWithCurrentMood} onSetMood={handleSetMoodFromModal} currentMood={initialMoodOnLoad} onContinueWithCurrent={handleContinueWithCurrentMood} />}
        {reactionModalData && <ReactionSummaryModal isOpen={!!reactionModalData} onClose={() => setReactionModalData(null)} reactions={reactionModalData.reactions} allUsers={reactionModalData.allUsers} />}
        {documentPreview && <DocumentPreviewModal isOpen={!!documentPreview} onClose={() => setDocumentPreview(null)} message={documentPreview} />}
        {messageInfo && <MessageInfoModal isOpen={!!messageInfo} onClose={() => setMessageInfo(null)} message={messageInfo} />}
        <DeleteMessageDialog isOpen={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} onConfirm={(type: DeleteType) => handleDeleteSelected(type)} messages={messages.filter(m => selectedMessageIds.has(m.id))} currentUserId={currentUser.id} />
        <AlertDialog open={isClearChatDialogOpen} onOpenChange={setIsClearChatDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will clear the entire chat history from your view. Your partner will still be able to see the messages. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearChat} className={buttonVariants({ variant: "destructive" })}><Trash2 className="mr-2 h-4 w-4" /> Clear Chat For Me</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <ChatModeSelector isOpen={isModeSelectorOpen} onClose={() => setIsModeSelectorOpen(false)} onSelectMode={handleSelectMode} currentMode={chatMode} />
    </div>
  );
}
