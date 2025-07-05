
"use client";

import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModeActivationLoaderProps {
  pullDistance: number;
  activationThreshold: number;
  isActivated: boolean;
}

const ModeActivationLoader = ({
  pullDistance,
  activationThreshold,
  isActivated,
}: ModeActivationLoaderProps) => {
  const pullProgress = Math.min(pullDistance / activationThreshold, 1);

  return (
    <div
      className="flex h-20 items-center justify-center overflow-hidden transition-all duration-300"
      style={{ marginTop: `-${Math.max(0, 80 - pullDistance)}px`, opacity: pullProgress }}
      aria-hidden="true"
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-md transition-all duration-200",
          isActivated && "bg-primary"
        )}
        style={{ transform: `scale(${0.5 + pullProgress * 0.5})` }}
      >
        {isActivated ? (
          <Check className="h-6 w-6 text-primary-foreground animate-in fade-in zoom-in-50" />
        ) : (
          <Loader2
            className="h-6 w-6 text-muted-foreground animate-spin"
            style={{ animationDuration: `${Math.max(0.3, 1.5 - pullProgress)}s` }}
          />
        )}
      </div>
    </div>
  );
};

export default ModeActivationLoader;
