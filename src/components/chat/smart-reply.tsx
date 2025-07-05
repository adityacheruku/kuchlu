"use client";

import * as React from 'react';
import { generateSmartReplies } from '@/ai/flows/smart-reply';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

interface SmartReplyProps {
  chatHistory: string;
  onSuggestionClick: (suggestion: string) => void;
}

export function SmartReply({ chatHistory, onSuggestionClick }: SmartReplyProps) {
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (chatHistory) {
      const fetchSuggestions = async () => {
        setLoading(true);
        try {
          const result = await generateSmartReplies({ chatHistory });
          setSuggestions(result.suggestions);
        } catch (error) {
          console.error('Error generating smart replies:', error);
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      };
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [chatHistory]);

  if (loading) {
    return (
        <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 animate-pulse text-primary" />
            <div className="flex gap-2">
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
            </div>
        </div>
    )
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-2">
      <Sparkles className="h-4 w-4 shrink-0 text-primary" />
      <div className="flex gap-2">
        {suggestions.map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => onSuggestionClick(suggestion)}
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}
