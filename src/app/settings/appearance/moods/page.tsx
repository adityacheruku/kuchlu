
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Sparkles, PlusCircle, Trash2, Edit, X, Heart } from 'lucide-react';
import SettingsHeader from '@/components/settings/SettingsHeader';
import FullPageLoader from '@/components/common/FullPageLoader';
import Spinner from '@/components/common/Spinner';
import { useToast } from '@/hooks/use-toast';
import { MOOD_OPTIONS, type MoodOption } from '@/config/moods';
import { cn } from '@/lib/utils';
import { capacitorService } from '@/services/capacitorService';
import { api } from '@/services/api';
import type { NotificationSettings } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PICKER_EMOJIS } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';


const MAX_QUICK_MOODS = 8;

// --- Helper Components ---

const MoodEditDialog = ({
    isOpen,
    onOpenChange,
    onSave,
    moodToEdit,
  }: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (mood: MoodOption) => void;
    moodToEdit: MoodOption | null;
  }) => {
    const [moodName, setMoodName] = useState('');
    const [moodEmoji, setMoodEmoji] = useState('');
    const [emojiSearch, setEmojiSearch] = useState('');
  
    useEffect(() => {
      if (moodToEdit) {
        setMoodName(moodToEdit.label);
        setMoodEmoji(moodToEdit.emoji);
      } else {
        setMoodName('');
        setMoodEmoji('');
      }
    }, [moodToEdit]);
  
    const handleSave = () => {
      if (!moodName.trim() || !moodEmoji) {
        // Basic validation
        return;
      }
      onSave({
        id: moodToEdit ? moodToEdit.id : moodName.trim(),
        label: moodName.trim(),
        emoji: moodEmoji,
        color: moodToEdit?.color || '#cccccc' // Default color for new custom moods
      });
      onOpenChange(false);
    };

    const filteredEmojis = useCallback(() => {
        if (!emojiSearch) return PICKER_EMOJIS;
        const lowerCaseSearch = emojiSearch.toLowerCase();
        const filtered: typeof PICKER_EMOJIS = {};
        for (const category in PICKER_EMOJIS) {
            const cat = category as keyof typeof PICKER_EMOJIS;
            const matchingEmojis = PICKER_EMOJIS[cat].emojis.filter(emoji => 
                PICKER_EMOJIS[cat].keywords.some(kw => kw.includes(lowerCaseSearch) || emoji.includes(lowerCaseSearch))
            );
            if (matchingEmojis.length > 0) filtered[cat] = { ...PICKER_EMOJIS[cat], emojis: matchingEmojis };
        }
        return filtered;
    }, [emojiSearch])();
  
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{moodToEdit ? 'Edit Mood' : 'Add Custom Mood'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="mood-name">Mood Name</Label>
                <Input id="mood-name" value={moodName} onChange={(e) => setMoodName(e.target.value)} placeholder="e.g., Studying" />
            </div>
             <div className="space-y-2">
                <Label>Emoji</Label>
                <div className="p-3 border rounded-lg bg-muted flex items-center justify-between">
                     <div className="text-4xl">{moodEmoji || '❔'}</div>
                     <Input placeholder="Search emojis..." value={emojiSearch} onChange={e => setEmojiSearch(e.target.value)} className="w-48" />
                </div>
                <ScrollArea className="h-48 border rounded-md">
                     <div className="p-2">{Object.entries(filteredEmojis).map(([category, data]) => (<div key={category}><h3 className="text-sm font-medium text-muted-foreground py-1 px-1">{category}</h3><div className="grid grid-cols-7 sm:grid-cols-8 gap-1">{data.emojis.map(emoji => (<Button key={emoji} variant="ghost" className="text-xl p-0 h-9 w-9 rounded-md" onClick={() => setMoodEmoji(emoji)} aria-label={`Select emoji ${emoji}`}>{emoji}</Button>))}</div></div>))}</div>
                </ScrollArea>
             </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave}>Save Mood</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
};

// --- Main Page Component ---

export default function MoodCustomizationPage() {
    const { currentUser, isLoading: isAuthLoading } = useAuth();
    const { toast } = useToast();

    const [allSettings, setAllSettings] = useState<NotificationSettings | null>(null);
    const [customMoods, setCustomMoods] = useState<MoodOption[]>([]);
    const [quickMoods, setQuickMoods] = useState<Set<string>>(new Set());
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [suggestedMoods, setSuggestedMoods] = useState<MoodOption[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
    const [partnerSuggestions, setPartnerSuggestions] = useState<MoodOption[]>([]);
    const [isLoadingPartnerSuggestions, setIsLoadingPartnerSuggestions] = useState(true);

    const [editingMood, setEditingMood] = useState<MoodOption | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    // Fetch initial settings
    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoadingSettings(true);
            setIsLoadingSuggestions(true);
            setIsLoadingPartnerSuggestions(true);

            try {
                const settingsPromise = api.getNotificationSettings();
                const suggestionsPromise = api.getSuggestedMoods();
                const partnerSuggestionsPromise = currentUser?.partner_id ? api.getPartnerSuggestedMoods() : Promise.resolve({ suggestions: [] });

                const [settings, suggestionsResponse, partnerSuggestionsResponse] = await Promise.all([settingsPromise, suggestionsPromise, partnerSuggestionsPromise]);

                setAllSettings(settings);
                setCustomMoods(settings.custom_moods.map(m => ({ id: m.id, label: m.label, emoji: m.emoji, color: '#cccccc' })));
                setQuickMoods(new Set(settings.quick_moods));
                setSuggestedMoods(suggestionsResponse.suggestions.map(s => ({...s, label: s.label || s.id, color: '#cccccc'})));
                setPartnerSuggestions(partnerSuggestionsResponse.suggestions.map(s => ({...s, label: s.label || s.id, color: '#cccccc'})));

            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load your mood settings and suggestions.' });
            } finally {
                setIsLoadingSettings(false);
                setIsLoadingSuggestions(false);
                setIsLoadingPartnerSuggestions(false);
            }
        };
        
        if (currentUser) {
            fetchAllData();
        }
    }, [toast, currentUser]);
    
    const handleQuickMoodToggle = useCallback((moodId: string) => {
        setQuickMoods(prev => {
            const newSet = new Set(prev);
            if (newSet.has(moodId)) {
                newSet.delete(moodId);
            } else if (newSet.size < MAX_QUICK_MOODS) {
                newSet.add(moodId);
            } else {
                toast({ variant: 'destructive', title: `You can only select up to ${MAX_QUICK_MOODS} quick actions.`, duration: 2000 });
            }
            return newSet;
        });
    }, [toast]);

    const handleSaveCustomMood = (mood: MoodOption) => {
        setCustomMoods(prev => {
            const existingIndex = prev.findIndex(m => m.id === mood.id);
            if (existingIndex > -1) {
                const updated = [...prev];
                updated[existingIndex] = mood;
                return updated;
            }
            return [...prev, mood];
        });
    };

    const handleDeleteCustomMood = (moodId: string) => {
        setCustomMoods(prev => prev.filter(m => m.id !== moodId));
        setQuickMoods(prev => {
            const newSet = new Set(prev);
            newSet.delete(moodId);
            return newSet;
        });
    };

    const handleSaveChanges = async () => {
        if (!allSettings) return;
        setIsSaving(true);
        const quickMoodsArray = Array.from(quickMoods);
        const customMoodsToSave = customMoods.map(({ id, label, emoji }) => ({ id, label, emoji }));

        try {
            await api.updateNotificationSettings({ ...allSettings, custom_moods: customMoodsToSave, quick_moods: quickMoodsArray });
            
            const allAvailableMoods = [...MOOD_OPTIONS, ...customMoods];
            const menuOptions = quickMoodsArray.map(id => {
                const mood = allAvailableMoods.find(m => m.id === id);
                return mood ? { id: mood.id, label: mood.label, emoji: mood.emoji } : null;
            }).filter(Boolean) as { id: string, label: string, emoji: string }[];
            
            await capacitorService.updateAssistiveTouchMenu(menuOptions);
            toast({ title: 'Preferences Saved', description: 'Your AssistiveTouch menu has been updated.' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save your preferences.' });
        } finally {
            setIsSaving(false);
        }
    }

    if (isAuthLoading || isLoadingSettings || !currentUser) {
        return <FullPageLoader />;
    }

    const allAvailableMoodOptions = [...MOOD_OPTIONS, ...customMoods];
    const quickMoodsAsOptions: MoodOption[] = Array.from(quickMoods)
      .map(id => allAvailableMoodOptions.find(m => m.id === id))
      .filter((m): m is MoodOption => !!m);

    return (
        <div className="h-screen bg-muted/40 flex flex-col">
            <SettingsHeader title="Customize AssistiveTouch Menu" />
            <main className="flex-grow overflow-y-auto">
                <div className="max-w-3xl mx-auto space-y-6 p-4 pb-24">
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Quick Actions</CardTitle>
                            <CardDescription>
                                These {quickMoods.size} / {MAX_QUICK_MOODS} moods appear in your AssistiveTouch menu. Tap a mood below to remove it.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {quickMoods.size > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {quickMoodsAsOptions.map(mood => (
                                        <Button key={`quick-${mood.id}`} variant="default" className="flex items-center gap-2 pr-2" onClick={() => handleQuickMoodToggle(mood.id)}>
                                            <span className="text-lg">{mood.emoji}</span>
                                            {mood.label}
                                            <X className="w-3 h-3 ml-1 text-primary-foreground/70" />
                                        </Button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-center text-muted-foreground p-4 bg-muted/50 rounded-md">No quick actions selected. Tap moods from the lists below to add them.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Heart className="text-pink-500 h-5 w-5"/> Inspired by Your Partner</CardTitle>
                            <CardDescription>Based on moods your partner sends.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoadingPartnerSuggestions ? (
                                <div className="flex justify-center items-center h-20">
                                    <Spinner />
                                </div>
                            ) : partnerSuggestions.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {partnerSuggestions.map(mood => (
                                        <Button key={`partner-sugg-${mood.id}`} variant="secondary" size="sm" onClick={() => handleQuickMoodToggle(mood.id)} disabled={quickMoods.has(mood.id)}>
                                            {quickMoods.has(mood.id) ? <CheckCircle2 className="mr-2 text-lg h-4 w-4"/> : <span className="mr-2 text-lg">{mood.emoji}</span>}
                                            {mood.label}
                                        </Button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-sm text-muted-foreground p-4 bg-muted/50 rounded-md">
                                    <p>No recent moods from your partner to suggest.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {isLoadingSuggestions ? <Spinner/> : suggestedMoods.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Sparkles className="text-yellow-400 h-5 w-5"/> Suggested For You</CardTitle>
                                <CardDescription>Based on your recent activity.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {suggestedMoods.map(mood => (
                                        <Button key={`sugg-${mood.id}`} variant="secondary" size="sm" onClick={() => handleQuickMoodToggle(mood.id)} disabled={quickMoods.has(mood.id)}>
                                            {quickMoods.has(mood.id) ? <CheckCircle2 className="mr-2 text-lg h-4 w-4"/> : <span className="mr-2 text-lg">{mood.emoji}</span>}
                                            {mood.label}
                                        </Button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Mood Library</CardTitle>
                            <CardDescription>Tap any mood to add it to your Quick Actions list.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h4 className="text-md font-semibold mb-3 flex items-center gap-2 text-muted-foreground">Your Custom Moods</h4>
                                <div className="space-y-2">
                                    {customMoods.map(mood => (
                                        <div key={mood.id} className={cn("p-2 rounded-lg flex items-center justify-between", quickMoods.has(mood.id) ? 'bg-primary/10' : 'bg-muted/50')}>
                                            <button className="flex items-center gap-3 flex-grow" onClick={() => handleQuickMoodToggle(mood.id)}>
                                                <span className="text-2xl">{mood.emoji}</span>
                                                <span className="font-medium">{mood.label}</span>
                                            </button>
                                            <div className="flex items-center">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingMood(mood); setIsEditorOpen(true); }}><Edit className="h-4 w-4"/></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteCustomMood(mood.id)}><Trash2 className="h-4 w-4"/></Button>
                                            </div>
                                        </div>
                                    ))}
                                    <Button variant="outline" className="w-full border-dashed" onClick={() => { setEditingMood(null); setIsEditorOpen(true); }}>
                                        <PlusCircle className="mr-2 h-4 w-4"/> Add Custom Mood
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-md font-semibold mb-3 flex items-center gap-2 text-muted-foreground">Predefined Moods</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {MOOD_OPTIONS.map((mood) => {
                                        const isSelected = quickMoods.has(mood.id);
                                        return (
                                            <button key={mood.id} onClick={() => handleQuickMoodToggle(mood.id)} className={cn("p-4 rounded-lg border-2 text-center transition-all flex flex-col items-center justify-center gap-2 h-24", isSelected ? 'border-primary bg-primary/10' : 'bg-card hover:bg-muted/50')} aria-pressed={isSelected}>
                                                <span className="text-3xl">{mood.emoji}</span>
                                                <span className="font-medium text-sm text-foreground">{mood.label}</span>
                                                {isSelected && <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-primary" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t md:static md:bg-transparent md:border-none md:p-0 z-10">
                <div className="max-w-3xl mx-auto">
                    <Button onClick={handleSaveChanges} disabled={isSaving} className="w-full md:w-auto">
                        {isSaving ? <Spinner className="mr-2 h-4 w-4" /> : 'Save Changes'}
                    </Button>
                </div>
            </div>
            
            <MoodEditDialog isOpen={isEditorOpen} onOpenChange={setIsEditorOpen} onSave={handleSaveCustomMood} moodToEdit={editingMood} />
        </div>
    );
}
