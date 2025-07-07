
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import type { User, Message as MessageType, Mood, MessageMode, DeleteType, ChatHistoryClearedEventData, MediaProcessedEventData, MessageAckEventData, MessageDeletedEventData, MessageReactionUpdateEventData, MessageStatusUpdateEventData, NewMessageEventData, ThinkingOfYouReceivedEventData, TypingIndicatorEventData, UserProfileUpdateEventData, MoodAnalyticsPayload, MoodAnalyticsContext, SupportedEmoji, UserPresenceUpdateEventData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useThoughtNotification } from '@/hooks/useThoughtNotification';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { THINKING_OF_YOU_DURATION, ENABLE_AI_MOOD_SUGGESTION } from '@/config/app-config';
import { api } from '@/services/api';
import { useRealtime } from '@/hooks/useRealtime';
import { uploadManager } from '@/services/uploadManager';
import { storageService } from '@/services/storageService';
import { capacitorService } from '@/services/capacitorService';
import { validateFile } from '@/utils/fileValidation';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { ToastAction } from '@/components/ui/toast';
import React from 'react';
import { isEmojiOnly } from '@/utils/isEmojiOnly';

const MOOD_PROMPT_INTERVAL_MS = 6 * 60 * 60 * 1000;
const FIRST_MESSAGE_SENT_KEY = 'kuchlu_firstMessageSent';
const MESSAGE_SEND_TIMEOUT_MS = 15000;
const ACTIVATION_THRESHOLD = 80;

interface UseChatProps {
    initialCurrentUser: User;
}

export function useChat({ initialCurrentUser }: UseChatProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { isSubscribed, permissionStatus } = usePushNotifications();

    const [currentUser, setCurrentUser] = useState<User>(initialCurrentUser);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [otherUser, setOtherUser] = useState<User | null>(null);
    const [isChatLoading, setIsChatLoading] = useState(true);
    const [chatSetupErrorMessage, setChatSetupErrorMessage] = useState<string | null>(null);
    const [typingUsers, setTypingUsers] = useState<Record<string, { userId: string; isTyping: boolean }>>({});
    const [chatMode, setChatMode] = useState<MessageMode>('normal');
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [replyingTo, setReplyingTo] = useState<MessageType | null>(null);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState(new Set<string>());
    const [pullY, setPullY] = useState(0);
    const [isPulling, setIsPulling] = useState(false);

    // Modal states
    const [isMoodModalOpen, setIsMoodModalOpen] = useState(false);
    const [initialMoodOnLoad, setInitialMoodOnLoad] = useState<Mood | null>(null);
    const [reactionModalData, setReactionModalData] = useState<{ reactions: MessageType['reactions'], allUsers: Record<string, User> } | null>(null);
    const [mediaModalData, setMediaModalData] = useState<MessageType | null>(null);
    const [documentPreview, setDocumentPreview] = useState<MessageType | null>(null);
    const [messageInfo, setMessageInfo] = useState<MessageType | null>(null);
    const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isClearChatDialogOpen, setIsClearChatDialogOpen] = useState(false);
    const [isFullScreenAvatarOpen, setIsFullScreenAvatarOpen] = useState(false);
    const [fullScreenUserData, setFullScreenUserData] = useState<User | null>(null);

    const messages = useLiveQuery(
        () => activeChatId ? storageService.messages.where('chat_id').equals(activeChatId).sortBy('created_at') : [],
        [activeChatId],
        []
    );

    const pendingMessageTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const startY = useRef(0);
    const viewportRef = useRef<HTMLDivElement>(null);

    const handleExitSelectionMode = useCallback(() => {
        setIsSelectionMode(false);
        setSelectedMessageIds(new Set());
    }, []);

    const setMessageAsFailed = useCallback((clientTempId: string) => {
        storageService.updateMessage(clientTempId, { status: 'failed' });
        delete pendingMessageTimeouts.current[clientTempId];
    }, []);

    const sendMessageWithTimeout = useCallback((messagePayload: any) => {
        sendMessage(messagePayload);
        pendingMessageTimeouts.current[messagePayload.client_temp_id] = setTimeout(() => setMessageAsFailed(messagePayload.client_temp_id), MESSAGE_SEND_TIMEOUT_MS);
    }, [setMessageAsFailed]);

    const handleMessageAck = useCallback(async (data: MessageAckEventData) => {
        if (pendingMessageTimeouts.current[data.client_temp_id]) {
            clearTimeout(pendingMessageTimeouts.current[data.client_temp_id]);
            delete pendingMessageTimeouts.current[data.client_temp_id];
        }
        await storageService.updateMessage(data.client_temp_id, { id: data.server_assigned_id, status: 'sent' });
    }, []);

    const handleNewMessage = useCallback(async (newMessageFromServer: MessageType) => {
        if (currentUser && newMessageFromServer.user_id !== currentUser.id) {
            await storageService.addMessage({ ...newMessageFromServer, status: 'delivered' });
        } else {
            await storageService.addMessage(newMessageFromServer);
        }
    }, [currentUser]);

    const handlePresenceUpdate = useCallback(async (data: UserPresenceUpdateEventData) => {
        setOtherUser(prev => {
            if (prev && data.user_id === prev.id) {
                const updatedUser = { ...prev, is_online: data.is_online, last_seen: data.last_seen, mood: data.mood };
                storageService.upsertUser(updatedUser);
                return updatedUser;
            }
            return prev;
        });
    }, []);

    const handleReciprocate = useCallback((senderId: string, senderName: string) => {
        if (!currentUser) return;
        sendMessage({ event_type: "ping_thinking_of_you", recipient_user_id: senderId });
        toast({ title: "Reciprocated!", description: `You reciprocated the thought to ${senderName}.` });
    }, [currentUser, toast]);

    const { protocol, sendMessage, isBrowserOnline } = useRealtime({
        onMessageReceived: handleNewMessage,
        onReactionUpdate: async (data) => await storageService.updateMessageByServerId(data.message_id, { reactions: data.reactions }),
        onPresenceUpdate: handlePresenceUpdate,
        onTypingUpdate: (data) => { if (activeChatId === data.chat_id) setTypingUsers(prev => ({ ...prev, [data.user_id]: { userId: data.user_id, isTyping: data.is_typing } })) },
        onThinkingOfYouReceived: (data) => {
            toast({
                title: "❤️ Thinking of You!",
                description: `You just passed through ${data.sender_name}'s mind.`,
                action: React.createElement(
                    ToastAction,
                    {
                        altText: "Reciprocate the same",
                        onClick: () => handleReciprocate(data.sender_id, data.sender_name)
                    },
                    "Reciprocate"
                ) as React.ReactElement,
            });
        },
        onUserProfileUpdate: (data) => { setOtherUser(prev => (prev && data.user_id === prev.id) ? { ...prev, ...data } : prev); if (otherUser && data.user_id === otherUser.id) storageService.upsertUser({ ...otherUser, ...data }) },
        onMessageAck: handleMessageAck,
        onChatModeChanged: (data) => { if (activeChatId === data.chat_id) setChatMode(data.mode); },
        onMessageDeleted: (data) => {
            storageService.updateMessageByServerId(data.message_id, {
                message_subtype: 'deleted',
                text: 'This message was deleted.',
                reactions: {},
                image_url: undefined,
                clip_url: undefined,
                document_url: undefined,
                sticker_id: undefined,
                caption: undefined,
            });
        },
        onChatHistoryCleared: (chatId: string) => { if (activeChatId === chatId) storageService.messages.where('chat_id').equals(chatId).delete(); },
        onMediaProcessed: (data) => storageService.updateMessage(data.message.client_temp_id!, data.message),
        onMessageStatusUpdate: (data) => storageService.updateMessageByServerId(data.message_id, { status: data.status, read_at: data.read_at }),
    });

    const performLoadChatData = useCallback(async () => {
        if (!currentUser) return;
        if (!currentUser.partner_id) { router.push('/onboarding/find-partner'); return; }

        setIsChatLoading(true); setChatSetupErrorMessage(null);
        try {
            let chat = await storageService.getChatWithParticipants(currentUser.partner_id);
            if (!chat) {
                const chatSession = await api.createOrGetChat(currentUser.partner_id);
                const partnerDetails = await api.getUserProfile(currentUser.partner_id);
                await storageService.upsertUser(partnerDetails);
                await storageService.addChat(chatSession);
                chat = chatSession;
            }
            setActiveChatId(chat.id);
            setOtherUser(chat.participants.find(p => p.id !== currentUser.id)!);
            const messagesData = await api.getMessages(chat.id, 50);
            await storageService.bulkAddMessages(messagesData.messages);
            setHasMoreMessages(messagesData.messages.length >= 50);
            
            const lastPromptTime = parseInt(localStorage.getItem('kuchlu_lastMoodPromptTimestamp') || '0', 10);
            if (Date.now() - lastPromptTime > MOOD_PROMPT_INTERVAL_MS) {
                setInitialMoodOnLoad(currentUser.mood);
                setIsMoodModalOpen(true);
            }

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'API Error', description: `Failed to load chat data: ${error.message}` });
            setChatSetupErrorMessage(error.message);
        } finally { setIsChatLoading(false); }
    }, [currentUser, router, toast]);

    useEffect(() => { performLoadChatData(); }, [performLoadChatData]);

    const loadMoreMessages = useCallback(async () => {
        if (isLoadingMore || !hasMoreMessages || !activeChatId || !messages || messages.length === 0) return;
        setIsLoadingMore(true);
        try {
            const oldestMessage = messages[0];
            const olderMessagesData = await api.getMessages(activeChatId, 50, oldestMessage.created_at);
            if (olderMessagesData.messages?.length > 0) {
                await storageService.bulkAddMessages(olderMessagesData.messages);
                setHasMoreMessages(olderMessagesData.messages.length >= 50);
            } else { setHasMoreMessages(false); }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load older messages.' })
        } finally { setIsLoadingMore(false); }
    }, [isLoadingMore, hasMoreMessages, activeChatId, messages, toast]);

    // User Action Handlers
    const handleTyping = useCallback((isTyping: boolean) => {
        if (!activeChatId) return;
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        sendMessage({ event_type: isTyping ? "start_typing" : "stop_typing", chat_id: activeChatId });
        if (isTyping) typingTimeoutRef.current = setTimeout(() => sendMessage({ event_type: "stop_typing", chat_id: activeChatId }), 3000);
    }, [activeChatId, sendMessage]);

    const handleSendMessage = useCallback(async (text: string, mode: MessageMode, replyToId?: string) => {
        if (!currentUser || !activeChatId || !text.trim()) return;
        handleTyping(false);
        const clientTempId = uuidv4();

        const messageSubtype = isEmojiOnly(text.trim()) ? 'emoji_only' : 'text';

        const optimisticMessage: MessageType = {
            id: clientTempId,
            user_id: currentUser.id,
            chat_id: activeChatId,
            text,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            reactions: {},
            client_temp_id: clientTempId,
            status: "sending",
            message_subtype: messageSubtype,
            mode: mode,
            reply_to_message_id: replyToId
        };

        await storageService.addMessage(optimisticMessage);
        sendMessageWithTimeout({
            event_type: "send_message",
            text,
            mode,
            client_temp_id: clientTempId,
            message_subtype: messageSubtype,
            reply_to_message_id: replyToId,
            chat_id: activeChatId
        });

        if (replyToId) setReplyingTo(null);
    }, [currentUser, activeChatId, handleTyping, sendMessageWithTimeout]);

    const handleFileUpload = useCallback(async (file: File, mode: MessageMode, intendedSubtype: MessageType['message_subtype']) => {
        if (!currentUser || !activeChatId) return;
        const optimisticMessage: MessageType = { id: uuidv4(), user_id: currentUser.id, chat_id: activeChatId, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), status: 'uploading', uploadStatus: 'pending', client_temp_id: uuidv4(), message_subtype: intendedSubtype, mode, file, document_name: file.name };
        await storageService.addMessage(optimisticMessage);
        await uploadManager.addToQueue({ id: optimisticMessage.id, file, messageId: optimisticMessage.client_temp_id!, chatId: activeChatId, priority: 5, subtype: intendedSubtype! });
    }, [currentUser, activeChatId]);

    const handleSendSticker = useCallback(async (stickerId: string, mode: MessageMode) => {
        if (!currentUser || !activeChatId) return;
        const clientTempId = uuidv4();
        const optimisticMessage: MessageType = { client_temp_id: clientTempId, user_id: currentUser.id, chat_id: activeChatId, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sticker_id: stickerId, mode, message_subtype: 'sticker', status: 'sending', reactions: {}, id: clientTempId };
        await storageService.addMessage(optimisticMessage);
        sendMessageWithTimeout({ event_type: "send_message", ...optimisticMessage, client_temp_id: clientTempId });
    }, [currentUser, activeChatId, sendMessageWithTimeout]);

    const handleToggleReaction = useCallback(async (messageId: string, emoji: SupportedEmoji) => {
        if (!currentUser || !activeChatId || !messages || messages.find(m => m.id === messageId)?.mode === 'incognito') return;
        const message = messages.find(m => m.id === messageId);
        if (message) {
            const r = { ...message.reactions }; if (!r[emoji]) r[emoji] = []; const i = r[emoji]!.indexOf(currentUser.id); if (i > -1) r[emoji]!.splice(i, 1); else r[emoji]!.push(currentUser.id); if (r[emoji]!.length === 0) delete r[emoji];
            await storageService.updateMessage(message.client_temp_id!, { reactions: r });
        }
        sendMessage({ event_type: "toggle_reaction", message_id: messageId, chat_id: activeChatId, emoji });
    }, [currentUser, activeChatId, sendMessage, messages]);

    const handleRetrySend = useCallback((message: MessageType) => {
        if (message.uploadStatus === 'failed' && message.file) uploadManager.retryUpload(message.client_temp_id!);
        else storageService.updateMessage(message.client_temp_id!, { status: 'sending' });
    }, []);

    const handleDeleteSelected = useCallback(async (deleteType: DeleteType) => {
        if (!activeChatId || !currentUser || !messages) return;
        const messagesToDelete = messages.filter(m => selectedMessageIds.has(m.id));

        if (deleteType === 'everyone') {
            for (const msg of messagesToDelete) {
                await api.deleteMessageForEveryone(msg.id, activeChatId);
            }
        } else { // 'me'
            for (const msg of messagesToDelete) {
                await storageService.updateMessage(msg.client_temp_id!, {
                    text: 'You deleted this message.',
                    message_subtype: 'deleted',
                    reactions: {},
                    image_url: undefined,
                    clip_url: undefined,
                    document_url: undefined,
                    sticker_id: undefined,
                    caption: undefined,
                });
            }
        }
        setIsDeleteDialogOpen(false);
        handleExitSelectionMode();
    }, [activeChatId, currentUser, messages, selectedMessageIds, handleExitSelectionMode]);

    const handleClearChat = useCallback(async () => {
        if (!activeChatId) return;
        try {
            await api.clearChatHistory(activeChatId);
            // Immediately clear messages from local storage/state
            await storageService.messages.where('chat_id').equals(activeChatId).delete();
            toast({ title: "Chat Cleared" });
        } catch (error: any) {
            toast({ variant: "destructive", title: 'Clear Failed', description: error.message });
        }
        setIsClearChatDialogOpen(false);
    }, [activeChatId, toast]);

    const handleMarkAsRead = useCallback((messageId: string, chatId: string) => { sendMessage({ event_type: 'mark_as_read', message_id: messageId, chat_id: chatId }); }, [sendMessage]);

    const handleSelectMode = useCallback((mode: MessageMode) => { if (activeChatId) { setChatMode(mode); sendMessage({ event_type: "change_chat_mode", chat_id: activeChatId, mode }); toast({ title: `Switched to ${mode} Mode` }); } }, [activeChatId, sendMessage, toast]);

    // Selection mode handlers
    const handleEnterSelectionMode = useCallback((messageId: string) => { setIsSelectionMode(true); setSelectedMessageIds(new Set([messageId])); }, []);
    const handleToggleMessageSelection = useCallback((messageId: string) => { setSelectedMessageIds(prev => { const newSet = new Set(prev); if (newSet.has(messageId)) newSet.delete(messageId); else newSet.add(messageId); if (newSet.size === 0) setIsSelectionMode(false); return newSet; }); }, [setIsSelectionMode]);
    const handleCopySelected = useCallback(() => { if (!messages) return; const text = messages.filter(m => selectedMessageIds.has(m.id)).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map(m => `[${new Date(m.created_at).toLocaleTimeString()}] ${otherUser?.display_name}: ${m.text || 'Attachment'}`).join('\n'); navigator.clipboard.writeText(text); toast({ title: "Copied!", description: `${selectedMessageIds.size} messages copied.` }); handleExitSelectionMode(); }, [messages, selectedMessageIds, toast, handleExitSelectionMode, otherUser]);
    const handleShareSelected = useCallback(async () => { /* ... sharing logic ... */ handleExitSelectionMode(); }, [handleExitSelectionMode]);

    // Gesture handlers
    const handlePointerDown = (e: React.PointerEvent) => { if (viewportRef.current?.scrollTop === 0) { startY.current = e.clientY; setIsPulling(true); } };
    const handlePointerMove = (e: React.PointerEvent) => { if (!isPulling) return; const diffY = e.clientY - startY.current; if (diffY > 0) { e.preventDefault(); setPullY(Math.min(diffY, 150)); } };
    const handlePointerUp = () => { if (!isPulling) return; if (pullY > ACTIVATION_THRESHOLD) { Haptics.impact({ style: ImpactStyle.Medium }); setIsModeSelectorOpen(true); } setIsPulling(false); setPullY(0); };

    // Other handlers
    const { activeTargetId: activeThoughtNotificationFor, initiateThoughtNotification } = useThoughtNotification({ duration: THINKING_OF_YOU_DURATION, toast });
    const handleSendThinkingOfYou = useCallback(() => {
        if (!currentUser || !otherUser) return;
        sendMessage({ event_type: "ping_thinking_of_you", recipient_user_id: otherUser.id });
        toast({ title: "Sent!", description: `You let ${otherUser.display_name} know you're thinking of them.` });
        initiateThoughtNotification(otherUser.id, otherUser.display_name, currentUser.display_name);
    }, [currentUser, otherUser, sendMessage, toast, initiateThoughtNotification]);
    
    const handleProfileClick = useCallback(() => router.push('/settings'), [router]);

    // Dynamic Background
    const dynamicBgClass = useMemo(() => {
        const getBg = (m1?: Mood, m2?: Mood) => !m1 || !m2 ? 'bg-mood-default-chat-area' : m1 === 'Happy' && m2 === 'Happy' ? 'bg-mood-happy-happy' : m1 === 'Excited' && m2 === 'Excited' ? 'bg-mood-excited-excited' : (['Chilling', 'Neutral', 'Thoughtful', 'Content'].includes(m1)) && (['Chilling', 'Neutral', 'Thoughtful', 'Content'].includes(m2)) ? 'bg-mood-calm-calm' : m1 === 'Sad' && m2 === 'Sad' ? 'bg-mood-sad-sad' : m1 === 'Angry' && m2 === 'Angry' ? 'bg-mood-angry-angry' : m1 === 'Anxious' && m2 === 'Anxious' ? 'bg-mood-anxious-anxious' : (((m1 === 'Happy' && (m2 === 'Sad' || m2 === 'Angry')) || ((m1 === 'Sad' || m1 === 'Angry') && m2 === 'Happy')) || (m1 === 'Excited' && (m2 === 'Sad' || m2 === 'Chilling' || m2 === 'Angry')) || (((m1 === 'Sad' || m1 === 'Chilling' || m1 === 'Angry') && m2 === 'Excited'))) ? 'bg-mood-thoughtful-thoughtful' : 'bg-mood-default-chat-area';
        return chatMode === 'fight' ? 'bg-mode-fight' : chatMode === 'incognito' ? 'bg-mode-incognito' : getBg(currentUser?.mood, otherUser?.mood);
    }, [chatMode, currentUser?.mood, otherUser?.mood]);

    // Cleanup timeouts on unmount
    useEffect(() => { const timeouts = pendingMessageTimeouts.current; return () => Object.values(timeouts).forEach(clearTimeout); }, []);

    return {
        currentUser, otherUser, messages: messages || [], activeChatId, chatMode, dynamicBgClass, protocol, isBrowserOnline, isChatLoading, chatSetupErrorMessage, isLoadingMore, hasMoreMessages, typingUsers, activeThoughtNotificationFor, isSelectionMode, selectedMessageIds, replyingTo, pullY, isPulling, activationThreshold: ACTIVATION_THRESHOLD,
        viewportRef,
        isMoodModalOpen, initialMoodOnLoad, reactionModalData, mediaModalData, documentPreview, messageInfo, isModeSelectorOpen, isDeleteDialogOpen, isClearChatDialogOpen, isFullScreenAvatarOpen, fullScreenUserData,
        setIsMoodModalOpen, setReactionModalData, setMediaModalData, setDocumentPreview, setMessageInfo, setIsModeSelectorOpen, setIsDeleteDialogOpen, setIsClearChatDialogOpen, setIsFullScreenAvatarOpen, setFullScreenUserData,
        loadMoreMessages, handleSendMessage, handleFileUpload, handleSendSticker, handleTyping, handleToggleReaction, handleRetrySend, handleDeleteSelected, handleClearChat,
        handleSetReplyingTo: setReplyingTo,
        handleEnterSelectionMode, handleToggleMessageSelection, handleExitSelectionMode, handleCopySelected, handleShareSelected, handleMarkAsRead,
        handlePointerDown, handlePointerMove, handlePointerUp,
        handleSelectMode, handleSendThinkingOfYou, handleProfileClick
    };
}
