"use client";

import * as React from 'react';
import type { User, Chat, Message } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MoreVertical, Paperclip } from 'lucide-react';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { SmartReply } from './smart-reply';

interface ChatViewProps {
  chat: Chat;
  currentUser: User;
  users: User[];
}

export function ChatView({ chat, currentUser, users }: ChatViewProps) {
  const [messages, setMessages] = React.useState<Message[]>(chat.messages);
  const [chatHistoryForAI, setChatHistoryForAI] = React.useState('');
  const [input, setInput] = React.useState('');

  const otherUser = React.useMemo(() => {
    const otherUserId = chat.userIds.find((id) => id !== currentUser.id);
    return users.find((u) => u.id === otherUserId) ?? users[1];
  }, [chat.userIds, currentUser.id, users]);

  const updateChatHistory = (currentMessages: Message[]) => {
    const history = currentMessages
      .map((m) => {
        const senderName = m.senderId === currentUser.id ? 'You' : otherUser.name;
        return `${senderName}: ${m.text}`;
      })
      .join('\n');
    setChatHistoryForAI(history);
  };
  
  React.useEffect(() => {
    setMessages(chat.messages);
    updateChatHistory(chat.messages);
  }, [chat.id, chat.messages]);

  const handleSend = () => {
    if (input.trim() === '') return;
    const newMessage: Message = {
      id: `msg${Date.now()}`,
      text: input,
      senderId: currentUser.id,
      timestamp: Date.now(),
    };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInput('');
    updateChatHistory(updatedMessages);

    // Simulate a reply to trigger smart replies
    setTimeout(() => {
      const replyMessage: Message = {
        id: `msg${Date.now() + 1}`,
        text: 'That sounds interesting!',
        senderId: otherUser.id,
        timestamp: Date.now(),
      };
      const messagesWithReply = [...updatedMessages, replyMessage];
      setMessages(messagesWithReply);
      updateChatHistory(messagesWithReply);
    }, 1500);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherUser.avatar} alt={otherUser.name} data-ai-hint="person portrait"/>
              <AvatarFallback>
                {otherUser.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {otherUser.online && (
              <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-card" />
            )}
          </div>
          <div>
            <p className="font-semibold">{otherUser.name}</p>
            <p className="text-xs text-muted-foreground">
              {otherUser.online ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Paperclip className="h-5 w-5" />
            <span className="sr-only">Attach file</span>
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
            <span className="sr-only">More options</span>
          </Button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        <MessageList messages={messages} currentUser={currentUser} otherUser={otherUser} />
      </div>
      <footer className="shrink-0 border-t bg-card p-4">
        <SmartReply chatHistory={chatHistoryForAI} onSuggestionClick={handleSuggestionClick} />
        <MessageInput
          input={input}
          setInput={setInput}
          onSend={handleSend}
        />
      </footer>
    </div>
  );
}
