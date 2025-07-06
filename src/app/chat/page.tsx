
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import FullPageLoader from '@/components/common/FullPageLoader';
import ChatView from '@/components/chat/ChatView';

export default function ChatPageContainer() {
  const { currentUser, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  if (isAuthLoading) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    router.replace('/');
    return <FullPageLoader />;
  }

  if (!currentUser) {
     return <FullPageLoader />;
  }

  return (
    <div className="flex h-[100svh] flex-col overflow-hidden">
       <ErrorBoundary fallbackMessage="The chat couldn't be displayed.">
            <ChatView initialCurrentUser={currentUser} />
       </ErrorBoundary>
    </div>
  );
}
