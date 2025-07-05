"use client";

import * as React from 'react';
import type { User, Chat } from '@/lib/types';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { ContactList } from './contact-list';
import { UserProfile } from './user-profile';
import { ChatView } from './chat-view';
import { Logo } from './logo';

interface ChatLayoutProps {
  defaultUser: User;
  users: User[];
  chats: Chat[];
}

export function ChatLayout({ defaultUser, users, chats }: ChatLayoutProps) {
  const [currentUser, setCurrentUser] = React.useState(defaultUser);
  const [selectedChatId, setSelectedChatId] = React.useState<string | null>(
    chats[0]?.id ?? null
  );

  const selectedChat = React.useMemo(() => {
    return chats.find((chat) => chat.id === selectedChatId);
  }, [chats, selectedChatId]);

  const handleUserUpdate = (newUser: Partial<User>) => {
    setCurrentUser((prev) => ({ ...prev, ...newUser }));
  };

  return (
    <SidebarProvider
      defaultOpen={true}
      onOpenChange={(open) => {
        // You can handle sidebar state change here
      }}
    >
      <Sidebar
        variant="sidebar"
        collapsible="icon"
        className="group-data-[collapsible=icon]:border-r"
      >
        <SidebarHeader className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap group-data-[collapsible=icon]:hidden">
            <Logo />
            <h1 className="text-lg font-semibold">EchoFlow</h1>
          </div>
          <SidebarTrigger className="group-data-[collapsible=icon]:-ml-1" />
        </SidebarHeader>
        <SidebarContent>
          <ContactList
            users={users}
            chats={chats}
            selectedChatId={selectedChatId}
            onSelectChat={setSelectedChatId}
            currentUser={currentUser}
          />
        </SidebarContent>
        <SidebarFooter>
          <UserProfile user={currentUser} onUpdateUser={handleUserUpdate} />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        {selectedChat ? (
          <ChatView
            chat={selectedChat}
            currentUser={currentUser}
            users={users}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-background">
            <p className="text-muted-foreground">
              Select a chat to start messaging
            </p>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
