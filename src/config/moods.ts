
import type { Mood } from '@/types';

export interface MoodOption {
  id: Mood;
  label: string;
  emoji: string;
  color: string;
}

// Centralized mood definitions based on pseudocode and existing moods.
export const MOOD_OPTIONS: MoodOption[] = [
  { id: "Happy", label: "Happy", emoji: "😊", color: "#FFD93D" },
  { id: "Love", label: "Love", emoji: "💕", color: "#FF6B9D" },
  { id: "Excited", label: "Excited", emoji: "🤩", color: "#FF8C42" },
  { id: "Sad", label: "Sad", emoji: "🥺", color: "#A8E6CF" },
  { id: "Angry", label: "Angry", emoji: "😠", color: "#FF6B6B" },
  { id: "Tired", label: "Tired", emoji: "😴", color: "#B8B8D6" },
  { id: "Chilling", label: "Chilling", emoji: "😎", color: "#82C0CC" },
  { id: "Thoughtful", label: "Thoughtful", emoji: "🤔", color: "#D8A7E8" },
  { id: "Anxious", label: "Anxious", emoji: "😟", color: "#A3A3A3" },
  { id: "Miss", label: "Miss", emoji: "😢", color: "#A8E6CF" },
  { id: "Neutral", label: "Neutral", emoji: "😐", color: "#C9C9C9" },
  { id: "Content", label: "Content", emoji: "😌", color: "#B4E5A1" },
];

export const ALL_MOODS: Mood[] = MOOD_OPTIONS.map(m => m.id);

export const DEFAULT_QUICK_MOODS: Mood[] = ["Happy", "Love", "Sad", "Excited"];
