"use client";

import * as React from 'react';
import type { User, Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MessageListProps {
  messages: Message[];
  currentUser: User;
  otherUser: User;
}

export function MessageList({ messages, currentUser, otherUser }: MessageListProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        const isCurrentUser = message.senderId === currentUser.id;
        const sender = isCurrentUser ? currentUser : otherUser;

        return (
          <div
            key={message.id}
            className={cn(
              'flex items-end gap-2',
              isCurrentUser ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={sender.avatar} alt={sender.name} data-ai-hint="user avatar"/>
              <AvatarFallback>
                {sender.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div
              className={cn(
                'max-w-xs rounded-lg p-3 text-sm lg:max-w-md',
                isCurrentUser
                  ? 'rounded-br-none bg-primary text-primary-foreground'
                  : 'rounded-bl-none bg-card shadow-sm'
              )}
            >
              <p>{message.text}</p>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
