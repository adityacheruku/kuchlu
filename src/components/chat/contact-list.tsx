"use client";

import type { User, Chat } from '@/lib/types';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ContactListProps {
  users: User[];
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  currentUser: User;
}

export function ContactList({
  users,
  chats,
  selectedChatId,
  onSelectChat,
  currentUser,
}: ContactListProps) {
  return (
    <SidebarMenu>
      {chats.map((chat) => {
        const otherUserId = chat.userIds.find((id) => id !== currentUser.id);
        const otherUser = users.find((u) => u.id === otherUserId);
        if (!otherUser) return null;

        const lastMessage = chat.messages[chat.messages.length - 1];

        return (
          <SidebarMenuItem key={chat.id}>
            <SidebarMenuButton
              className="h-auto p-2"
              isActive={selectedChatId === chat.id}
              onClick={() => onSelectChat(chat.id)}
              tooltip={otherUser.name}
            >
              <div className="flex w-full items-center gap-3">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={otherUser.avatar} alt={otherUser.name} data-ai-hint="person talking"/>
                    <AvatarFallback>
                      {otherUser.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {otherUser.online && (
                    <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-sidebar-background" />
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate font-medium">{otherUser.name}</p>
                  <p
                    className={cn(
                      'truncate text-xs',
                      selectedChatId === chat.id
                        ? 'text-sidebar-accent-foreground/80'
                        : 'text-muted-foreground'
                    )}
                  >
                    {lastMessage ? lastMessage.text : 'No messages yet'}
                  </p>
                </div>
                {chat.messages.length > 0 && (
                   <Badge variant="secondary" className="shrink-0">
                     {chat.messages.length}
                   </Badge>
                )}
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
