"use client";

import { useAuth } from '@/contexts/AuthContext';
import ChatView from '@/components/chat/ChatView';
import FullPageLoader from '@/components/common/FullPageLoader';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ChatPage() {
    const { currentUser, isLoading, isAuthenticated } = useAuth();
    const router = useRouter();
    
    // The useAuth hook already handles redirection logic.
    // This page primarily acts as a secure entry point to the ChatView.
    
    // Add an extra layer of check, although useAuth should handle it.
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace('/');
        }
    }, [isLoading, isAuthenticated, router]);
    
    if (isLoading || !currentUser) {
        return <FullPageLoader />;
    }

    return <ChatView initialCurrentUser={currentUser} />;
}
