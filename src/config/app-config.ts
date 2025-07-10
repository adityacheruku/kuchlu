

export const THINKING_OF_YOU_DURATION = 30 * 1000; // 30 seconds for testing, original 10 * 60 * 1000 for 10 mins
export const MAX_AVATAR_SIZE_KB = 500;

/**
 * The interval in milliseconds to re-prompt the user for their mood after a session gap.
 * Default is 10 minutes.
 */
export const MOOD_PROMPT_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Controls whether the AI-powered mood suggestion feature is active.
 * If true, the app will call a Genkit flow to analyze user messages and suggest mood changes.
 * If false, this feature is disabled.
 * Defaults to false.
 */
export const ENABLE_AI_MOOD_SUGGESTION = false;
