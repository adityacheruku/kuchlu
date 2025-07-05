
"use client";

import type { FormEvent } from 'react';
import { useState, useEffect } from 'react';
import type { Mood } from '@/types';
import { ALL_MOODS, MOOD_OPTIONS } from '@/config/moods';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MoodEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetMood: (mood: Mood) => void;
  currentMood: Mood;
  onContinueWithCurrent: () => void;
}

const moodConfig = MOOD_OPTIONS.reduce((acc, mood) => {
    acc[mood.id] = mood;
    return acc;
}, {} as Record<string, { emoji: string; color: string; }>);


export default function MoodEntryModal({
  isOpen,
  onClose,
  onSetMood,
  currentMood,
  onContinueWithCurrent,
}: MoodEntryModalProps) {
  const [selectedMood, setSelectedMood] = useState<Mood>(currentMood);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setSelectedMood(currentMood); // Reset to current mood when modal opens
    }
  }, [isOpen, currentMood]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (selectedMood.trim()) {
      if (selectedMood.length > 20) {
        toast({ variant: 'destructive', title: "Mood is too long", description: "Please keep custom moods under 20 characters." });
        return;
      }
      onSetMood(selectedMood);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onContinueWithCurrent(); }}>
      <DialogContent className="sm:max-w-md bg-card rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-primary">How are you feeling?</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Your current vibe is: <span className="font-semibold text-accent">{currentMood}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="h-64 pr-4">
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {ALL_MOODS.map((moodId) => {
                  const moodOption = moodConfig[moodId];
                  if (!moodOption) return null;
                  return (
                    <Button
                      key={moodId}
                      type="button"
                      variant={'outline'}
                      className={cn(
                          "w-full justify-center text-foreground hover:bg-muted active:bg-muted/80 h-16 flex-col gap-1",
                          selectedMood === moodId && 'bg-primary text-primary-foreground hover:bg-primary/90'
                      )}
                      onClick={() => setSelectedMood(moodId)}
                    >
                      <span className="text-2xl">{moodOption.emoji}</span>
                      <span className="text-xs">{moodId}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
           <div className="pt-4">
              <Label htmlFor="custom-mood-input" className="sr-only">Your Mood</Label>
              <Input
                  id="custom-mood-input"
                  placeholder="Or type a custom mood..."
                  value={selectedMood}
                  onChange={(e) => setSelectedMood(e.target.value)}
                  className="bg-card focus:ring-primary text-center text-lg font-semibold"
              />
          </div>
          <DialogFooter className="sm:justify-between gap-2 pt-6">
            <Button type="button" variant="ghost" onClick={onContinueWithCurrent} className="text-muted-foreground hover:text-foreground">
              Keep it {currentMood}
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={!selectedMood.trim()}>
              Set Mood
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
