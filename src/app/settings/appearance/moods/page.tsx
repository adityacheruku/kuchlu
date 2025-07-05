
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Circle } from 'lucide-react';
import SettingsHeader from '@/components/settings/SettingsHeader';
import FullPageLoader from '@/components/common/FullPageLoader';
import { useToast } from '@/hooks/use-toast';
import { MOOD_OPTIONS, DEFAULT_QUICK_MOODS, type MoodOption } from '@/config/moods';
import { cn } from '@/lib/utils';

const QUICK_MOODS_STORAGE_KEY = 'kuchlu_quickMoods';
const MAX_QUICK_MOODS = 4;

export default function MoodCustomizationPage() {
    const { currentUser, isLoading: isAuthLoading } = useAuth();
    const { toast } = useToast();

    const [selectedMoods, setSelectedMoods] = useState<Set<string>>(new Set(DEFAULT_QUICK_MOODS));
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const storedMoods = localStorage.getItem(QUICK_MOODS_STORAGE_KEY);
        if (storedMoods) {
            setSelectedMoods(new Set(JSON.parse(storedMoods)));
        }
    }, []);

    const handleMoodToggle = (moodId: string) => {
        setSelectedMoods(prev => {
            const newSet = new Set(prev);
            if (newSet.has(moodId)) {
                newSet.delete(moodId);
            } else {
                if (newSet.size < MAX_QUICK_MOODS) {
                    newSet.add(moodId);
                } else {
                    toast({
                        variant: 'destructive',
                        title: `You can only select ${MAX_QUICK_MOODS} quick moods.`,
                        duration: 2000,
                    });
                }
            }
            return newSet;
        });
    };
    
    const handleSaveChanges = () => {
        setIsSaving(true);
        localStorage.setItem(QUICK_MOODS_STORAGE_KEY, JSON.stringify(Array.from(selectedMoods)));
        setTimeout(() => {
             toast({ title: 'Preferences Saved', description: 'Your quick moods have been updated.' });
             setIsSaving(false);
        }, 500);
    }

    if (isAuthLoading || !currentUser) {
        return <FullPageLoader />;
    }

    return (
        <div className="min-h-screen bg-muted/40 pb-24">
            <SettingsHeader title="Customize Quick Moods" />
            <main className="max-w-3xl mx-auto space-y-6 p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Select Your Favorites</CardTitle>
                        <CardDescription>
                            Choose up to {MAX_QUICK_MOODS} moods that you use most often. These will appear as quick picks in your chat.
                            You have selected {selectedMoods.size} / {MAX_QUICK_MOODS}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {MOOD_OPTIONS.map((mood: MoodOption) => {
                                const isSelected = selectedMoods.has(mood.id);
                                return (
                                    <button
                                        key={mood.id}
                                        onClick={() => handleMoodToggle(mood.id)}
                                        className={cn(
                                            "p-4 rounded-lg border-2 text-center transition-all flex flex-col items-center justify-center gap-2 h-24",
                                            isSelected
                                                ? 'border-primary bg-primary/10'
                                                : 'bg-card hover:bg-muted/50'
                                        )}
                                        aria-pressed={isSelected}
                                    >
                                        <span className="text-3xl">{mood.emoji}</span>
                                        <span className="font-medium text-sm text-foreground">{mood.id}</span>
                                        {isSelected && <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-primary" />}
                                    </button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
                 <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t md:static md:bg-transparent md:border-none md:p-0">
                    <Button onClick={handleSaveChanges} disabled={isSaving} className="w-full md:w-auto">
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </main>
        </div>
    );
}
