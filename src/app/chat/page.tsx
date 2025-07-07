"use client";

import { useAuth } from '@/contexts/AuthContext';
import ChatView from '@/components/chat/ChatView';
import FullPageLoader from '@/components/common/FullPageLoader';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ChatPage() {
  const { currentUser, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // This effect handles redirection based on auth state
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !currentUser) {
    return <FullPageLoader />;
  }

  // If authenticated and user data is available, render the chat view
  return <ChatView initialCurrentUser={currentUser} />;
}
