
"use client";

import type { Mood } from '@/types';
import { Smile, Frown, Meh, PartyPopper, Brain, Glasses, Angry, HelpCircle, Heart, Bed } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { MOOD_OPTIONS } from '@/config/moods';

interface MoodIndicatorProps {
  mood: Mood;
  size?: number;
}

const moodTooltips: Record<string, string> = {
  Happy: "Feels great and chatty today!",
  Sad: "Feeling a bit down.",
  Neutral: "Just a regular day.",
  Excited: "Full of energy and excitement!",
  Thoughtful: "In a pensive or reflective mood.",
  Chilling: "Relaxing and taking it easy.",
  Angry: "Feeling upset or frustrated.",
  Anxious: "A little worried or uneasy.",
  Content: "Feeling peaceful and satisfied.",
  Love: "Feeling affectionate and loving.",
  Miss: "Missing you.",
  Tired: "Feeling sleepy or drained."
};

export default function MoodIndicator({ mood, size = 14 }: MoodIndicatorProps) {
  const moodDetails = MOOD_OPTIONS.find(m => m.id === mood) || MOOD_OPTIONS.find(m => m.id === 'Neutral');
  const IconComponent = moodDetails?.emoji || '😐';
  const tooltipText = moodTooltips[mood] || "Their current mood.";

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
           <div className="flex cursor-default items-center space-x-1.5 text-sm text-muted-foreground">
              <span style={{ fontSize: `${size}px` }}>{IconComponent}</span>
              <span className="font-normal">{mood}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
