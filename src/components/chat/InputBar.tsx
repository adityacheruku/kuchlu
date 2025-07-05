
"use client";

// ⚡️ Wrapped with React.memo to avoid re-renders when props don’t change
import React, { useState, type FormEvent, useRef, type ChangeEvent, useEffect, useMemo, useCallback, memo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Smile, Mic, Paperclip, X, Image as ImageIcon, Camera, FileText, StickyNote, Gift, ShieldAlert, EyeOff, MessageCircle, Trash2, Video, Music } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StickerPicker from './StickerPicker';
import { PICKER_EMOJIS, EMOJI_ONLY_REGEX, type MessageMode, type Message, type User, type MessageSubtype } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import Spinner from '../common/Spinner';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { validateFile } from '@/utils/fileValidation';

interface InputBarProps {
  onSendMessage: (text: string, mode: MessageMode, replyToId?: string) => void;
  onSendSticker: (stickerId: string, mode: MessageMode) => void;
  onSendVoiceMessage: (file: File, mode: MessageMode) => void;
  onSendImage: (file: File, mode: MessageMode) => void;
  onSendVideo: (file: File, mode: MessageMode) => void;
  onSendDocument: (file: File, mode: MessageMode) => void;
  onSendAudio: (file: File, mode: MessageMode) => void;
  isSending?: boolean;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
  chatMode: MessageMode;
  onSelectMode: (mode: MessageMode) => void;
  replyingTo: Message | null;
  onCancelReply: () => void;
  allUsers: Record<string, User>;
}

const MAX_RECORDING_SECONDS = 120;

const AttachmentPreview = ({ file, onRemove }: { file: File; onRemove: () => void }) => {
  const fileUrl = useMemo(() => URL.createObjectURL(file), [file]);

  return (
    <div className="relative w-16 h-16 rounded-md overflow-hidden border bg-muted flex-shrink-0">
      {file.type.startsWith('image/') ? (
        <Image src={fileUrl} alt={file.name} fill sizes="64px" className="object-cover" />
      ) : file.type.startsWith('audio/') ? (
         <div className="flex flex-col items-center justify-center h-full p-1 text-center bg-primary/20">
          <Mic className="w-6 h-6 text-primary" />
          <span className="text-xs truncate text-primary/80">Voice</span>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full p-1 text-center">
          <FileText className="w-6 h-6 text-muted-foreground" />
          <span className="text-xs truncate text-muted-foreground">{file.name}</span>
        </div>
      )}
      <Button size="icon" variant="destructive" className="absolute top-0 right-0 h-5 w-5 rounded-full" onClick={onRemove} aria-label={`Remove ${file.name} from attachments`}>
        <X className="h-3 w-3" />
        <span className="sr-only">Remove attachment</span>
      </Button>
    </div>
  );
};

const ReplyPreview = ({ message, onCancel, allUsers }: { message: Message, onCancel: () => void, allUsers: Record<string, User> }) => {
    const sender = allUsers[message.user_id];
    return (
        <div className="relative flex items-center gap-3 p-2 pr-8 mb-2 border-l-2 border-primary bg-primary/10 rounded-r-md">
            <div className="flex-grow min-w-0">
                <p className="font-semibold text-primary text-sm">{sender?.display_name || "Unknown User"}</p>
                <p className="text-sm text-foreground/80 truncate">{message.text || 'Attachment...'}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onCancel} className="absolute top-1/2 right-1 -translate-y-1/2 h-7 w-7 rounded-full text-muted-foreground hover:bg-black/10">
                <X className="h-4 w-4" />
                <span className="sr-only">Cancel reply</span>
            </Button>
        </div>
    );
};

const SoundWave = () => (
    <div className="flex items-center justify-center gap-0.5 h-full w-full">
        <div className="w-1 h-2 rounded-full bg-primary animate-[wave_1.2s_linear_infinite] [animation-delay:-0.8s]"></div>
        <div className="w-1 h-4 rounded-full bg-primary animate-[wave_1.2s_linear_infinite] [animation-delay:-1.2s]"></div>
        <div className="w-1 h-5 rounded-full bg-primary animate-[wave_1.2s_linear_infinite] [animation-delay:-0.4s]"></div>
        <div className="w-1 h-3 rounded-full bg-primary animate-[wave_1.2s_linear_infinite] [animation-delay:-1.0s]"></div>
        <div className="w-1 h-6 rounded-full bg-primary animate-[wave_1.2s_linear_infinite]"></div>
        <div className="w-1 h-4 rounded-full bg-primary animate-[wave_1.2s_linear_infinite] [animation-delay:-0.2s]"></div>
        <div className="w-1 h-2 rounded-full bg-primary animate-[wave_1.2s_linear_infinite] [animation-delay:-0.6s]"></div>
        <div className="w-1 h-5 rounded-full bg-primary animate-[wave_1.2s_linear_infinite] [animation-delay:-1.4s]"></div>
        <div className="w-1 h-3 rounded-full bg-primary animate-[wave_1.2s_linear_infinite] [animation-delay:-0.9s]"></div>
    </div>
)

function InputBar({
  onSendMessage, onSendSticker, onSendVoiceMessage, onSendImage, onSendVideo, onSendDocument, onSendAudio,
  isSending = false, onTyping, disabled = false, chatMode, onSelectMode,
  replyingTo, onCancelReply, allUsers
}: InputBarProps) {
  const [messageText, setMessageText] = useState('');
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [stagedAttachments, setStagedAttachments] = useState<{ file: File; subtype: MessageSubtype }[]>([]);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { toast } = useToast();

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;
        if (scrollHeight > 120) {
            textarea.style.height = `120px`;
        } else {
            textarea.style.height = `${scrollHeight}px`;
        }
    }
  }, [messageText, replyingTo]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmojis = localStorage.getItem('kuchlu_recentEmojis');
      if (savedEmojis) setRecentEmojis(JSON.parse(savedEmojis));
    }
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
        @keyframes wave {
            0% { height: 10px; }
            50% { height: 25px; }
            100% { height: 10px; }
        }
    `;
    document.head.appendChild(styleSheet);
    return () => {
        document.head.removeChild(styleSheet);
    };

  }, []);

  const addRecentEmoji = useCallback((emoji: string) => {
    setRecentEmojis(prev => {
      const newRecents = [emoji, ...prev.filter(e => e !== emoji)].slice(0, 20);
      if (typeof window !== 'undefined') {
        localStorage.setItem('kuchlu_recentEmojis', JSON.stringify(newRecents));
      }
      return newRecents;
    });
  }, []);

  const handleTypingChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    if (disabled) return;
    onTyping(e.target.value.trim() !== '');
  }, [disabled, onTyping]);

  const handleBlur = useCallback(() => {
    if (disabled) return;
    if (messageText.trim() === '') onTyping(false);
  }, [disabled, messageText, onTyping]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setMessageText(prev => prev + emoji);
    addRecentEmoji(emoji);
  }, [addRecentEmoji]);

  const handleStickerSelect = useCallback((stickerId: string) => {
    if (disabled) return;
    onSendSticker(stickerId, chatMode);
    setIsToolsOpen(false);
  }, [disabled, onSendSticker, chatMode]);
  
  const handleFilesSelected = useCallback((files: FileList | null) => {
    if (!files) return;
    const newAttachments = Array.from(files).map(file => {
        const validation = validateFile(file);
        let subtype: MessageSubtype = validation.fileType;
        if (validation.fileType === 'video') subtype = 'clip';
        return { file, subtype };
    });
    setStagedAttachments(prev => [...prev, ...newAttachments]);
    setIsAttachmentOpen(false);
  }, []);
  
  const handleRemoveAttachment = useCallback((indexToRemove: number) => {
    setStagedAttachments(prev => prev.filter((_, index) => index !== indexToRemove));
  }, []);
  
  const handleDragEvents = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragEnter = (e: React.DragEvent) => { handleDragEvents(e); if (e.dataTransfer.items && e.dataTransfer.items.length > 0) setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { handleDragEvents(e); const relatedTarget = e.relatedTarget as Node | null; if (!e.currentTarget.contains(relatedTarget)) setIsDragging(false); };
  const handleDrop = useCallback((e: React.DragEvent) => {
    handleDragEvents(e); setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  }, [handleFilesSelected]);

  const cleanupRecording = useCallback(() => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      mediaRecorderRef.current = null; audioChunksRef.current = [];
      setIsRecording(false); setRecordingSeconds(0);
  }, []);

  const handleStopAndSendRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  }, []);

  const handleStartRecording = useCallback(async () => {
    if (isRecording) return;
    if (Capacitor.isNativePlatform()) {
        try {
            const permStatus = await Capacitor.Plugins.Permissions.requestPermissions({ permissions: ['microphone'] });
            if (permStatus.microphone.state !== 'granted') {
                toast({ variant: 'destructive', title: 'Permission Denied', description: 'Microphone access is required to record audio. Please enable it in your device settings.' });
                return;
            }
        } catch (e) {
            console.error("Failed to check/request microphone permission", e);
            toast({ variant: 'destructive', title: 'Permission Error', description: 'Could not request microphone permission. Please check your app settings.' });
            return;
        }
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast({ variant: 'destructive', title: 'Unsupported Device', description: 'Your browser does not support voice recording.' }); return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        await Haptics.vibrate();
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = (event) => audioChunksRef.current.push(event.data);
        mediaRecorderRef.current.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            if (audioBlob.size > 0) {
              const audioFile = new File([audioBlob], `voice-message-${Date.now()}.webm`, { type: 'audio/webm' });
              onSendVoiceMessage(audioFile, chatMode);
            }
            stream.getTracks().forEach(track => track.stop());
        };
        mediaRecorderRef.current.start();
        setIsRecording(true);
        setRecordingSeconds(0);
        timerIntervalRef.current = setInterval(() => setRecordingSeconds(prev => prev + 1), 1000);
        setTimeout(() => {
            if (mediaRecorderRef.current?.state === "recording") {
              toast({ title: "Recording Limit Reached", description: `Maximum duration is ${MAX_RECORDING_SECONDS} seconds.`});
              handleStopAndSendRecording();
            }
        }, MAX_RECORDING_SECONDS * 1000);
    } catch (err) {
        toast({ variant: 'destructive', title: 'Microphone Access Denied', description: 'Please enable microphone permissions in your browser settings.' });
        cleanupRecording();
    }
  }, [isRecording, toast, cleanupRecording, onSendVoiceMessage, chatMode, handleStopAndSendRecording]);

  const handleCompositeSend = useCallback((e?: FormEvent) => {
    e?.preventDefault();
    if (disabled || isSending) return;
    Haptics.impact({ style: ImpactStyle.Light });
    
    if (messageText.trim()) {
        const isEmojiOnly = EMOJI_ONLY_REGEX.test(messageText.trim());
        const subtype: MessageSubtype = isEmojiOnly ? 'emoji_only' : 'text';
        onSendMessage(messageText.trim(), chatMode, replyingTo?.id);
    }
    
    stagedAttachments.forEach(({ file, subtype }) => {
        switch(subtype) {
            case 'image': onSendImage(file, chatMode); break;
            case 'clip': onSendVideo(file, chatMode); break;
            case 'document': onSendDocument(file, chatMode); break;
            case 'audio': onSendAudio(file, chatMode); break;
        }
    });

    setMessageText(''); setStagedAttachments([]); setEmojiSearch(''); onTyping(false);
  }, [disabled, isSending, messageText, stagedAttachments, onSendMessage, onSendImage, onSendVideo, onSendDocument, onSendAudio, onTyping, chatMode, replyingTo]);
  
  const showSendButton = useMemo(() => messageText.trim() !== '' || stagedAttachments.length > 0, [messageText, stagedAttachments]);
  const showSmileButton = useMemo(() => isInputFocused || showSendButton, [isInputFocused, showSendButton]);

  const handleMicOrSendClick = useCallback(() => {
    if (isRecording) {
      handleStopAndSendRecording();
    } else if (showSendButton) {
      handleCompositeSend();
    } else {
      handleStartRecording();
    }
  }, [isRecording, showSendButton, handleStopAndSendRecording, handleCompositeSend, handleStartRecording]);

  const filteredEmojis = useMemo(() => {
    if (!emojiSearch) return PICKER_EMOJIS;
    const lowerCaseSearch = emojiSearch.toLowerCase();
    const filtered: typeof PICKER_EMOJIS = {};
    for (const category in PICKER_EMOJIS) {
        const cat = category as keyof typeof PICKER_EMOJIS;
        const matchingEmojis = PICKER_EMOJIS[cat].emojis.filter(emoji => 
            PICKER_EMOJIS[cat].keywords.some(kw => kw.includes(lowerCaseSearch) || emoji.includes(lowerCaseSearch))
        );
        if (matchingEmojis.length > 0) filtered[cat] = { ...PICKER_EMOJIS[cat], emojis: matchingEmojis };
    }
    return filtered;
  }, [emojiSearch]);

  const modeDetails = useMemo(() => ({
    normal: { icon: MessageCircle, title: "Normal Mode", description: "Standard chat. Messages are saved to history." },
    fight: { icon: ShieldAlert, title: "Fight Mode", description: "For arguments. Distinct look, saved to history." },
    incognito: { icon: EyeOff, title: "Incognito Mode", description: "Messages disappear after 30s. Not saved." },
  }), []);

  const handleModeButtonClick = useCallback((mode: MessageMode) => {
    onSelectMode(mode);
    setIsAttachmentOpen(false);
  }, [onSelectMode]);

  const getPlaceholderText = () => {
    if (replyingTo) return "Type your reply...";
    switch(chatMode) {
      case 'fight': return "Type a message in Fight Mode...";
      case 'incognito': return "Type an incognito message...";
      default: return "Type a message...";
    }
  }

  const AttachmentPicker = useCallback(() => (
    <Tabs defaultValue="media" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="media">Media</TabsTrigger>
        <TabsTrigger value="mode">Chat Mode</TabsTrigger>
      </TabsList>
      <TabsContent value="media" className="p-4">
        <div className="grid grid-cols-3 gap-3">
            <Button variant="outline" size="lg" onClick={() => photoInputRef.current?.click()} className="flex animate-pop-in flex-col h-auto aspect-square items-center justify-center gap-2" style={{ animationDelay: '50ms' }}>
                <Camera size={24} className="text-red-500"/><span className="text-sm font-normal">Camera</span>
            </Button>
             <Button variant="outline" size="lg" onClick={() => videoInputRef.current?.click()} className="flex animate-pop-in flex-col h-auto aspect-square items-center justify-center gap-2" style={{ animationDelay: '100ms' }}>
                <Video size={24} className="text-blue-500"/><span className="text-sm font-normal">Record</span>
            </Button>
            <Button variant="outline" size="lg" onClick={() => galleryInputRef.current?.click()} className="flex animate-pop-in flex-col h-auto aspect-square items-center justify-center gap-2" style={{ animationDelay: '150ms' }}>
                <ImageIcon size={24} className="text-purple-500"/><span className="text-sm font-normal">Gallery</span>
            </Button>
            <Button variant="outline" size="lg" onClick={() => documentInputRef.current?.click()} className="flex animate-pop-in flex-col h-auto aspect-square items-center justify-center gap-2" style={{ animationDelay: '200ms' }}>
                <FileText size={24} className="text-green-500"/><span className="text-sm font-normal">Document</span>
            </Button>
            <Button variant="outline" size="lg" onClick={() => audioInputRef.current?.click()} className="flex animate-pop-in flex-col h-auto aspect-square items-center justify-center gap-2" style={{ animationDelay: '250ms' }}>
                <Music size={24} className="text-orange-500"/><span className="text-sm font-normal">Audio</span>
            </Button>
        </div>
      </TabsContent>
      <TabsContent value="mode" className="p-4">
        <div className="grid gap-4">
          {Object.entries(modeDetails).map(([mode, details]) => {
            const isSelected = mode === chatMode;
            return (
              <Button key={mode} variant={isSelected ? "default" : "outline"} className="h-auto p-4 w-full justify-start text-left" onClick={() => handleModeButtonClick(mode as MessageMode)}>
                <details.icon className={cn("mr-4 h-6 w-6 flex-shrink-0", mode === 'fight' && 'text-destructive', mode === 'incognito' && 'text-muted-foreground')} />
                <div className="flex flex-col">
                  <span className="font-semibold">{details.title}</span>
                  <span className="text-xs text-muted-foreground font-normal">{details.description}</span>
                </div>
              </Button>
            );
          })}
        </div>
      </TabsContent>
    </Tabs>
  ), [modeDetails, chatMode, handleModeButtonClick]);

  const ToolsPicker = useCallback(() => (
    <Tabs defaultValue="emoji" className="w-full flex flex-col h-full">
      <SheetHeader className="p-2 border-b">
          <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="emoji"><Smile size={18}/></TabsTrigger><TabsTrigger value="sticker"><StickyNote size={18}/></TabsTrigger><TabsTrigger value="gif" disabled><Gift size={18}/></TabsTrigger></TabsList>
      </SheetHeader>
      <TabsContent value="emoji" className="flex-grow overflow-hidden mt-0">
        <div className="p-2">
            <Input id="emoji-search" placeholder="Search emojis..." value={emojiSearch} onChange={(e) => setEmojiSearch(e.target.value)} className="w-full bg-muted border-none focus-visible:ring-ring" aria-label="Search emojis"/>
        </div>
        {!emojiSearch && recentEmojis.length > 0 && (
          <div className="px-2 pb-2 border-b">
              <h3 className="text-xs font-semibold text-muted-foreground mb-1">Recent</h3>
              <div className="flex gap-1">{recentEmojis.map(emoji => (<Button key={emoji} variant="ghost" className="text-xl p-0 h-9 w-9 rounded-md" onClick={() => handleEmojiSelect(emoji)} aria-label={`Select emoji ${emoji}`}>{emoji}</Button>))}</div>
          </div>
        )}
        <ScrollArea className="h-[calc(100%-110px)]">
          <div className="p-2">{Object.entries(filteredEmojis).map(([category, data]) => (<div key={category}><h3 className="text-sm font-medium text-muted-foreground py-1">{category}</h3><div className="grid grid-cols-7 sm:grid-cols-8 gap-1">{data.emojis.map(emoji => (<Button key={emoji} variant="ghost" className="text-xl p-0 h-9 w-9 rounded-md" onClick={() => handleEmojiSelect(emoji)} aria-label={`Select emoji ${emoji}`}>{emoji}</Button>))}</div></div>))}</div>
        </ScrollArea>
      </TabsContent>
      <TabsContent value="sticker" className="flex-grow overflow-hidden mt-0"><StickerPicker onStickerSelect={handleStickerSelect} /></TabsContent>
      <TabsContent value="gif" className="flex-grow mt-0 flex items-center justify-center"><p className="text-muted-foreground">GIFs are coming soon!</p></TabsContent>
    </Tabs>
  ), [emojiSearch, recentEmojis, filteredEmojis, handleEmojiSelect, handleStickerSelect]);

  return (
    <div className={cn("p-3 border-t border-border bg-card transition-colors duration-300", isDragging && "bg-primary/20 border-primary")}
        onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragEvents} onDrop={handleDrop}>
      
      {replyingTo && <ReplyPreview message={replyingTo} onCancel={onCancelReply} allUsers={allUsers} />}

      {stagedAttachments.length > 0 && (
          <div className="mb-2 p-2 border rounded-lg bg-muted/50">
              <ScrollArea className="h-24 whitespace-nowrap"><div className="flex items-center gap-2">{stagedAttachments.map((item, index) => (<AttachmentPreview key={index} file={item.file} onRemove={() => handleRemoveAttachment(index)} />))}</div></ScrollArea>
          </div>
      )}

      <div className="flex items-end space-x-2">
        {!isRecording && (
            <Sheet open={isAttachmentOpen} onOpenChange={setIsAttachmentOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" type="button" className="text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-full focus-visible:ring-ring flex-shrink-0" aria-label="Attach file or change mode" disabled={isSending || disabled}><Paperclip size={22} /></Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="p-0 border-t bg-card h-auto rounded-t-lg">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Attachments and Modes</SheetTitle>
                    <SheetDescription>Select a file to attach or change the chat mode.</SheetDescription>
                  </SheetHeader>
                  <AttachmentPicker />
              </SheetContent>
            </Sheet>
        )}
        
        <div className={cn(
          "flex-grow flex items-end min-h-[44px] bg-input rounded-2xl transition-all duration-300 ring-2 ring-transparent focus-within:ring-ring",
          chatMode === 'fight' && 'ring-destructive',
          chatMode === 'incognito' && 'ring-muted-foreground ring-offset-2 ring-offset-card',
          isRecording && 'p-1'
        )}>
            {isRecording ? (
                 <div className="flex items-center w-full px-2 h-full">
                     <Button type="button" variant="ghost" size="icon" onClick={cleanupRecording} className="text-destructive h-8 w-8"><Trash2 size={20} /></Button>
                     <div className="flex-grow flex items-center justify-center h-full"><SoundWave /></div>
                     <span className="font-mono text-sm text-muted-foreground w-12 text-center">{new Date(recordingSeconds * 1000).toISOString().substr(14, 5)}</span>
                 </div>
            ) : (
                <Textarea
                  ref={textareaRef}
                  placeholder={getPlaceholderText()}
                  value={messageText}
                  onChange={handleTypingChange}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => {
                    setIsInputFocused(false);
                    handleBlur();
                  }}
                  className="w-full bg-transparent border-none focus-visible:ring-0 resize-none min-h-[44px] max-h-[120px] py-2.5 px-3.5"
                  autoComplete="off"
                  disabled={isSending || disabled}
                  rows={1}
                  aria-label="Message input"
                />
            )}
        </div>
        
        {!isRecording && (
            <Sheet open={isToolsOpen} onOpenChange={setIsToolsOpen}>
                <SheetTrigger asChild>
                    <Button
                        variant="ghost" size="icon" type="button"
                        className={cn(
                            'rounded-full h-11 w-11 flex-shrink-0 text-muted-foreground hover:bg-accent/10 hover:text-accent transition-all duration-300 ease-in-out',
                            showSmileButton ? 'scale-100 opacity-100' : 'scale-0 opacity-0 w-0'
                        )}
                        disabled={!showSmileButton || disabled} aria-label="Open emoji and sticker panel"
                    >
                        <Smile size={22} />
                    </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="p-0 border-t bg-card h-[60%] rounded-t-lg flex flex-col">
                    <SheetHeader className="sr-only"><SheetTitle>Emoji and Sticker Picker</SheetTitle><SheetDescription>Select an emoji, sticker, or GIF to send.</SheetDescription></SheetHeader>
                    <ToolsPicker />
                </SheetContent>
            </Sheet>
        )}

        <Button 
          type="button" 
          onClick={handleMicOrSendClick}
          size="icon" 
          className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full w-11 h-11 flex-shrink-0" 
          disabled={isSending || disabled} 
          aria-label={isRecording ? "Stop and send voice message" : showSendButton ? "Send message" : "Press and hold to record voice message"}
        >
          {isSending ? (
            <Spinner />
          ) : isRecording || showSendButton ? (
            <Send size={22} className="animate-pop" key="send"/>
          ) : (
            <Mic size={22} className="animate-pop" key="mic"/>
          )}
        </Button>
      </div>
      
      <input type="file" ref={photoInputRef} accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFilesSelected(e.target.files)} />
      <input type="file" ref={videoInputRef} accept="video/*" capture="environment" className="hidden" onChange={(e) => handleFilesSelected(e.target.files)} />
      <input type="file" ref={galleryInputRef} accept="image/*,video/*" className="hidden" onChange={(e) => handleFilesSelected(e.target.files)} multiple />
      <input type="file" ref={documentInputRef} accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(e) => handleFilesSelected(e.target.files)} multiple />
      <input type="file" ref={audioInputRef} accept="audio/*" className="hidden" onChange={(e) => handleFilesSelected(e.target.files)} multiple />
    </div>
  );
}

export default memo(InputBar);
