
"use client";

import { MessageCircle, ShieldAlert, EyeOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { MessageMode } from '@/types';
import { cn } from '@/lib/utils';

interface ChatModeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: MessageMode) => void;
  currentMode: MessageMode;
}

const modeDetails = {
  normal: { icon: MessageCircle, title: "Normal Mode", description: "Standard chat. Messages are saved to history." },
  fight: { icon: ShieldAlert, title: "Fight Mode", description: "For arguments. Distinct look, saved to history." },
  incognito: { icon: EyeOff, title: "Incognito Mode", description: "Messages disappear after 30s. Not saved." },
};

export default function ChatModeSelector({ isOpen, onClose, onSelectMode, currentMode }: ChatModeSelectorProps) {
  if (!isOpen) {
    return null;
  }

  const handleSelect = (mode: MessageMode) => {
    onSelectMode(mode);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 animate-in fade-in-0"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-5">
          <CardHeader>
            <CardTitle>Change Chat Mode</CardTitle>
            <CardDescription>Select a mode for your conversation.</CardDescription>
            <Button variant="ghost" size="icon" className="absolute top-3 right-3" onClick={onClose}>
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(modeDetails).map(([mode, details]) => (
              <button
                key={mode}
                onClick={() => handleSelect(mode as MessageMode)}
                className={cn(
                  "flex w-full items-center rounded-lg border p-4 text-left transition-colors",
                  "hover:bg-muted/50",
                  currentMode === mode ? "border-primary bg-primary/10" : "bg-card"
                )}
              >
                <details.icon
                  className={cn(
                    "mr-4 h-6 w-6 flex-shrink-0",
                    mode === 'fight' && 'text-destructive',
                    mode === 'incognito' && 'text-muted-foreground',
                    currentMode === mode ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                <div>
                  <p className="font-semibold">{details.title}</p>
                  <p className="text-xs text-muted-foreground">{details.description}</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
