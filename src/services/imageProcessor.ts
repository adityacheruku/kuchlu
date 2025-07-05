
"use client";

import imageCompression from 'browser-image-compression';

export interface ProcessedImage {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
}

const IMAGE_COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  initialQuality: 0.85,
};

const THUMBNAIL_COMPRESSION_OPTIONS = {
  maxSizeMB: 0.2, // 200KB for thumbnail
  maxWidthOrHeight: 250,
  useWebWorker: true,
};

class ImageProcessor {

  public async processImageForUpload(file: File): Promise<File> {
    try {
      const compressedFile = await imageCompression(file, IMAGE_COMPRESSION_OPTIONS);
      return compressedFile;
    } catch (error) {
      console.error("Image compression for upload failed:", error);
      // Fallback: if compression fails, return the original file to attempt upload anyway.
      return file;
    }
  }

  public async createThumbnail(file: File): Promise<string> {
    try {
      const thumbnailFile = await imageCompression(file, THUMBNAIL_COMPRESSION_OPTIONS);
      const dataUrl = await imageCompression.getDataUrlFromFile(thumbnailFile);
      return dataUrl;
    } catch (error) {
        console.error("Thumbnail generation failed:", error);
        // Fallback to creating an object URL from the original file
        return URL.createObjectURL(file);
    }
  }
}

// Export a singleton instance
export const imageProcessor = new ImageProcessor();
