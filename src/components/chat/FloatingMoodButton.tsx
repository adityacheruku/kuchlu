
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLongPress } from '@/hooks/useLongPress';
import { cn } from '@/lib/utils';
import type { Mood } from '@/types';
import { InfinityIcon } from 'lucide-react';

interface FloatingMoodButtonProps {
  currentMood: Mood;
  onClick: () => void;
}

const Ripple = ({ onAnimationEnd }: { onAnimationEnd: () => void }) => (
    <span
        className="absolute inset-0 block rounded-full bg-primary/50 animate-[ripple_0.6s_ease-out]"
        onAnimationEnd={onAnimationEnd}
    />
);

export default function FloatingMoodButton({ currentMood, onClick }: FloatingMoodButtonProps) {
  const [isRippling, setIsRippling] = useState(false);

  const longPressEvents = useLongPress(() => {}, { threshold: 200 });
  const { isLongPressing, ...handlers } = longPressEvents;

  const handleClick = () => {
    setIsRippling(true);
    onClick();
  };

  return (
    <div className="absolute bottom-[80px] left-4 z-20 transition-transform hover:scale-110 active:scale-105">
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              {...handlers}
              onClick={handleClick}
              className="relative h-14 w-14 rounded-full bg-background/50 p-0 text-3xl shadow-lg backdrop-blur-sm transition-opacity hover:opacity-100 dark:bg-zinc-900/50"
              aria-label={`Change mood. Current mood: ${currentMood}`}
            >
              {isRippling && <Ripple onAnimationEnd={() => setIsRippling(false)} />}
              <span className="relative z-10 transition-transform group-hover:scale-110">
                <InfinityIcon className="h-7 w-7 text-foreground/80" />
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="ml-2">
            <p>You're feeling: <strong>{currentMood}</strong></p>
            <p className="text-xs text-muted-foreground">(Tap to change)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
