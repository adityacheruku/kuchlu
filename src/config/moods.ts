
import type { Mood } from '@/types';

export interface MoodOption {
  id: Mood;
  emoji: string;
  color: string;
}

// Centralized mood definitions based on pseudocode and existing moods.
export const MOOD_OPTIONS: MoodOption[] = [
  { id: "Happy", emoji: "😊", color: "#FFD93D" },
  { id: "Love", emoji: "💕", color: "#FF6B9D" },
  { id: "Excited", emoji: "🤩", color: "#FF8C42" },
  { id: "Sad", emoji: "🥺", color: "#A8E6CF" },
  { id: "Angry", emoji: "😠", color: "#FF6B6B" },
  { id: "Tired", emoji: "😴", color: "#B8B8D6" },
  { id: "Chilling", emoji: "😎", color: "#82C0CC" },
  { id: "Thoughtful", emoji: "🤔", color: "#D8A7E8" },
  { id: "Anxious", emoji: "😟", color: "#A3A3A3" },
  { id: "Miss", emoji: "😢", color: "#A8E6CF" },
  { id: "Neutral", emoji: "😐", color: "#C9C9C9" },
  { id: "Content", emoji: "😌", color: "#B4E5A1" },
];

export const ALL_MOODS: Mood[] = MOOD_OPTIONS.map(m => m.id);

export const DEFAULT_QUICK_MOODS: Mood[] = ["Happy", "Love", "Sad", "Excited"];
