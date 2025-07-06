
"use client";

// This service has been deprecated as of the migration to Cloudinary Upload Presets.
// Client-side video/audio compression using ffmpeg.wasm has been removed. All media
// transformations are now handled by Cloudinary's services, which improves client-side
// performance, reduces app bundle size, and increases upload reliability.

// Exporting an empty object to satisfy any imports.
export const videoCompressor = {};
export type { CompressionProgress } from '@/types'; // Exporting type for compatibility if needed elsewhere
