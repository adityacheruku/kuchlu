
import type { Mood } from '@/types';
import { Smile, Frown, Meh, PartyPopper, Brain, Glasses, Angry, HelpCircle, Heart, Bed } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { MOOD_OPTIONS } from '@/config/moods';

interface MoodIndicatorProps {
  mood: Mood;
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

const getBackgroundColor = (moodStr: string) => {
    let hash = 0;
    for (let i = 0; i < moodStr.length; i++) {
        hash = moodStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue} 80% 92%)`;
};

const darkThemeBackgroundColor = (moodStr: string) => {
    let hash = 0;
    for (let i = 0; i < moodStr.length; i++) {
        hash = moodStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue} 20% 15%)`;
};


export default function MoodIndicator({ mood }: MoodIndicatorProps) {
  const moodDetails = MOOD_OPTIONS.find(m => m.id === mood) || MOOD_OPTIONS.find(m => m.id === 'Neutral');
  const IconComponent = moodDetails?.emoji || '😐';
  const tooltipText = moodTooltips[mood] || "Their current mood.";

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
           <div
            className="flex cursor-default items-center space-x-2 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ 
                // @ts-ignore
              '--mood-bg-light': getBackgroundColor(mood),
              '--mood-bg-dark': darkThemeBackgroundColor(mood),
              backgroundColor: 'var(--mood-bg-light)'
            } as React.CSSProperties}
            >
             <style jsx>{`
                .dark .mood-indicator-bg {
                    background-color: var(--mood-bg-dark) !important;
                }
             `}</style>
             <div className="mood-indicator-bg bg-[--mood-bg-light] dark:bg-[--mood-bg-dark] rounded-full p-0.5">
              <span className="text-base">{IconComponent}</span>
            </div>
            <span className="font-normal text-foreground/80">{mood}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
