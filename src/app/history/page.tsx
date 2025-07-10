
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import type { ActivityHistoryEvent, User } from '@/types';
import FullPageLoader from '@/components/common/FullPageLoader';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Heart, Smile, User as UserIcon } from 'lucide-react';
import { MOOD_OPTIONS } from '@/config/moods';

const EventIcon = ({ event, currentUser }: { event: ActivityHistoryEvent, currentUser: User }) => {
  if (event.type === 'mood_update') {
    const moodEmoji = MOOD_OPTIONS.find(m => m.id === event.mood)?.emoji;
    return <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-500"><span className="text-xl">{moodEmoji || '😊'}</span></div>;
  }
  if (event.type === 'ping_sent' || event.type === 'ping_received') {
    return <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-full text-pink-500"><Heart className="h-6 w-6" /></div>;
  }
  return <div className="p-3 bg-gray-100 dark:bg-gray-900/30 rounded-full text-gray-500"><UserIcon className="h-6 w-6" /></div>;
};

const EventDescription = ({ event, currentUser, partner }: { event: ActivityHistoryEvent, currentUser: User, partner: User | null }) => {
  const you = <strong>You</strong>;
  const partnerName = <strong>{partner?.display_name || 'your partner'}</strong>;

  switch (event.type) {
    case 'mood_update':
      return <p>{you} changed your mood to <strong>{event.mood}</strong>.</p>;
    case 'ping_sent':
      return <p>{you} sent a 'Thinking of you' ping to {partnerName}.</p>;
    case 'ping_received':
      return <p>{partnerName} sent {you} a 'Thinking of you' ping.</p>;
    default:
      return <p>An unknown activity occurred.</p>;
  }
};

export default function HistoryPage() {
    const { currentUser, isLoading: isAuthLoading } = useAuth();
    const [history, setHistory] = useState<ActivityHistoryEvent[]>([]);
    const [partner, setPartner] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [historyData, partnerData] = await Promise.all([
                    api.getActivityHistory(),
                    currentUser.partner_id ? api.getUserProfile(currentUser.partner_id) : Promise.resolve(null)
                ]);
                setHistory(historyData);
                setPartner(partnerData);
            } catch (error) {
                console.error("Failed to fetch history data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [currentUser]);

    if (isAuthLoading || isLoading) {
        return <FullPageLoader />;
    }

    return (
        <div className="h-screen bg-muted/40 flex flex-col">
            <SettingsHeader title="Activity History" />
            <ScrollArea className="flex-grow">
                <main className="max-w-3xl mx-auto p-4">
                    <Card>
                        <CardContent className="p-4">
                            {history.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <p>No recent activity.</p>
                                    <p className="text-sm">Mood changes and 'Thinking of you' pings will appear here.</p>
                                </div>
                            ) : (
                                <ul className="space-y-4">
                                    {history.map((event) => (
                                        <li key={event.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50">
                                            <EventIcon event={event} currentUser={currentUser!} />
                                            <div className="flex-grow">
                                                <EventDescription event={event} currentUser={currentUser!} partner={partner} />
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDistanceToNow(parseISO(event.timestamp), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </main>
            </ScrollArea>
        </div>
    );
}
