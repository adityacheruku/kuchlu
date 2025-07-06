
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Sparkles } from 'lucide-react';
import SettingsHeader from '@/components/settings/SettingsHeader';
import FullPageLoader from '@/components/common/FullPageLoader';
import Spinner from '@/components/common/Spinner';
import { useToast } from '@/hooks/use-toast';
import { MOOD_OPTIONS, DEFAULT_QUICK_MOODS, type MoodOption } from '@/config/moods';
import { cn } from '@/lib/utils';
import { capacitorService } from '@/services/capacitorService';
import { api } from '@/services/api';


const QUICK_MOODS_STORAGE_KEY = 'kuchlu_quickMoods';
const MAX_QUICK_MOODS = 8;

export default function MoodCustomizationPage() {
    const { currentUser, isLoading: isAuthLoading } = useAuth();
    const { toast } = useToast();

    const [selectedMoods, setSelectedMoods] = useState<Set<string>>(new Set(DEFAULT_QUICK_MOODS));
    const [isSaving, setIsSaving] = useState(false);
    
    const [suggestedMoods, setSuggestedMoods] = useState<MoodOption[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);

    useEffect(() => {
        const storedMoods = localStorage.getItem(QUICK_MOODS_STORAGE_KEY);
        if (storedMoods) {
            setSelectedMoods(new Set(JSON.parse(storedMoods)));
        }

        const fetchSuggestions = async () => {
            setIsLoadingSuggestions(true);
            try {
                const response = await api.getSuggestedMoods();
                setSuggestedMoods(response.suggestions);
            } catch (error) {
                console.error("Failed to fetch suggested moods", error);
            } finally {
                setIsLoadingSuggestions(false);
            }
        };
        fetchSuggestions();
    }, []);

    const handleMoodToggle = useCallback((moodId: string) => {
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
                        title: `You can only select up to ${MAX_QUICK_MOODS} quick actions.`,
                        duration: 2000,
                    });
                }
            }
            return newSet;
        });
    }, [toast]);
    
    const handleAddSuggestion = (mood: MoodOption) => {
        if (selectedMoods.has(mood.id)) {
            toast({ title: 'Already Added', description: `${mood.label} is already in your quick actions.` });
            return;
        }
        handleMoodToggle(mood.id);
    }

    const handleSaveChanges = async () => {
        setIsSaving(true);
        const selectedMoodsArray = Array.from(selectedMoods);
        localStorage.setItem(QUICK_MOODS_STORAGE_KEY, JSON.stringify(selectedMoodsArray));

        const moodsToUpdate = MOOD_OPTIONS.filter(m => selectedMoodsArray.includes(m.id));
        
        try {
            await capacitorService.updateAssistiveTouchMenu(moodsToUpdate);
            toast({ title: 'Preferences Saved', description: 'Your AssistiveTouch menu has been updated.' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not update the native menu.' });
        } finally {
             setIsSaving(false);
        }
    }

    if (isAuthLoading || !currentUser) {
        return <FullPageLoader />;
    }

    return (
        <div className="min-h-screen bg-muted/40 pb-24">
            <SettingsHeader title="Customize AssistiveTouch Menu" />
            <main className="max-w-3xl mx-auto space-y-6 p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Select Quick Actions</CardTitle>
                        <CardDescription>
                            Choose up to {MAX_QUICK_MOODS} moods to display in your AssistiveTouch menu for quick access.
                            You have selected {selectedMoods.size} / {MAX_QUICK_MOODS}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingSuggestions ? (
                             <div className="h-24 flex items-center justify-center"><Spinner /></div>
                        ) : suggestedMoods.length > 0 && (
                            <div className="mb-6 pb-6 border-b">
                                <h4 className="text-md font-semibold mb-3 flex items-center gap-2 text-muted-foreground"><Sparkles className="text-yellow-400 h-5 w-5"/> Suggested For You</h4>
                                <div className="flex flex-wrap gap-2">
                                    {suggestedMoods.map(mood => (
                                        <Button key={`sugg-${mood.id}`} variant="secondary" size="sm" onClick={() => handleAddSuggestion(mood)}>
                                           <span className="mr-2 text-lg">{mood.emoji}</span> {mood.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <h4 className="text-md font-semibold mb-3 flex items-center gap-2 text-muted-foreground">All Moods</h4>
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
                        {isSaving ? <Spinner className="mr-2 h-4 w-4" /> : 'Save Changes'}
                    </Button>
                </div>
            </main>
        </div>
    );
}
