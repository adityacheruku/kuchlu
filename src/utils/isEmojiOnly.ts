import emojiRegex from 'emoji-regex';

/**
 * Returns true if the input string contains only emojis and whitespace.
 */
export function isEmojiOnly(input: string): boolean {
    const trimmed = input.trim();
    if (!trimmed) return false;
    const regex = emojiRegex();
    // Remove all emoji matches
    const withoutEmojis = trimmed.replace(regex, '');
    // If nothing but whitespace remains, it's emoji-only
    return withoutEmojis.trim().length === 0;
} 