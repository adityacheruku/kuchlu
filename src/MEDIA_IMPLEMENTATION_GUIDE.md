
# ChirpChat: Media Handling Implementation Guide

This document provides a detailed technical overview of how image and audio/voice messages are handled in the ChirpChat application. It is intended for developers to understand the end-to-end flow from user interaction to final delivery.

## 1. High-Level Architecture: The "Instant Send" Illusion

The media handling pipeline is designed to be robust, efficient, and user-friendly. It prioritizes a good user experience through optimistic UI updates and background processing, creating the illusion of an instant send.

The core flow is as follows:
1.  **User Action**: The user selects a file or records media via the `InputBar`.
2.  **Client-Side Pre-processing**: The file is immediately processed **on the user's device**.
    *   **Images**: Resized and compressed using `browser-image-compression`. A small thumbnail is generated.
    *   **Videos/Audio**: Compressed using `ffmpeg.wasm`. A static thumbnail is extracted from videos.
3.  **Optimistic UI Update**: An immediate message bubble appears in the `MessageArea`. It displays the locally generated thumbnail with a "Compressing..." or "Uploading..." status overlay.
4.  **Direct Upload to Cloudinary**: The `uploadManager` takes the **compressed file** and uploads it directly to a secure, signed Cloudinary URL, bypassing our backend.
5.  **Webhook Notification**: Cloudinary processes the file (e.g., generates different formats, HLS manifests) and sends a webhook notification to our backend when complete.
6.  **Real-time Finalization**: The backend receives the webhook, updates the message in the database with the final media URLs, and broadcasts a `media_processed` WebSocket event to all chat participants. The UI then seamlessly replaces the local thumbnail with the final, high-quality media.

## 2. Key Services and Components

-   **`src/app/chat/page.tsx`**: The main page component that orchestrates all chat functionality and state management. It initiates the media upload process.
-   **`src/components/chat/InputBar.tsx`**: The UI component for user input, including the attachment picker and voice recorder.
-   **`src/services/uploadManager.ts`**: A robust queue system that orchestrates the entire client-side flow: pre-processing, direct-to-Cloudinary upload, and status updates.
-   **`src/services/imageProcessor.ts`**: Uses `browser-image-compression` to resize and compress images efficiently.
-   **`src/services/videoCompressor.ts`**: Uses **FFmpeg.wasm** to compress videos/audio and extract video thumbnails directly in the browser.
-   **`src/services/api.ts`**: Handles HTTP communication, primarily to get the signed URL signature from the backend.
-   **`src/services/storageService.ts`**: A Dexie (IndexedDB) wrapper for client-side persistence of messages, chats, and the upload queue.
-   **`chirpchat-backend/app/routers/uploads.py`**: The FastAPI endpoint that provides a secure signature for the direct-to-Cloudinary upload.
-   **`chirpchat-backend/app/routers/webhooks.py`**: The FastAPI endpoint that listens for "processing complete" notifications from Cloudinary.

---

## 3. Image Sending Flow (Step-by-Step)

1.  **Initiation (`InputBar.tsx`)**:
    *   A user clicks the "Gallery" button or drags an image file.
    *   This triggers `handleFileUpload` in `chat/page.tsx`.

2.  **Optimistic Message Creation (`chat/page.tsx`)**:
    *   `handleFileUpload` creates a temporary `client_temp_id` (UUID) for the message.
    *   It creates an "optimistic" `Message` object with `status: 'uploading'` and `uploadStatus: 'pending'`. **Crucially, it does not yet have a local preview URL.**
    *   This message is immediately saved to the local database via `storageService.addMessage()`, making a placeholder bubble appear instantly.
    *   It then calls `uploadManager.addToQueue()` with the raw `File` object and message details.

3.  **Processing & Upload (`uploadManager.ts`)**:
    *   The `uploadManager` picks the item from the queue and marks its status as `'processing'`.
    *   It calls `imageProcessor.createThumbnail()` to generate a fast, low-res preview. It emits a progress event with this `thumbnailDataUrl`. The UI updates to show this preview inside the `UploadProgressIndicator`.
    *   It then calls `imageProcessor.processImageForUpload()` to create the main compressed image. This happens in the background.
    *   Once the image is compressed, the `uploadManager` gets a signed signature from your backend via `api.getCloudinaryUploadSignature`.
    *   It updates the status to `'uploading'` and sends the **compressed** image `Blob` directly to Cloudinary via XHR, emitting progress events along the way.
    *   Upon successful upload, it updates the status to `'pending_processing'`. The manager's job for this item is now done.

4.  **Finalization (Webhook & WebSocket)**:
    *   Cloudinary finishes its processing and sends a webhook to your backend.
    *   Your backend updates the message in the database with the final `media_metadata` (containing all the different URLs).
    *   Your backend broadcasts a `media_processed` event via WebSocket.
    *   The client's `realtimeService` receives this event and updates the local message in IndexedDB.
    *   The `MessageBubble` reactively re-renders, replacing the `UploadProgressIndicator` with the final `SecureMediaImage` component, which loads the high-quality, signed image URL.

## 4. Voice Message & Video Flow

This flow is nearly identical to the image flow, with the primary difference being the pre-processing step.

1.  **Initiation**: The user records audio or selects a video file.
2.  **Optimistic Creation**: Same as the image flow. An optimistic message is created and `uploadManager.addToQueue` is called.
3.  **Processing & Upload (`uploadManager.ts`)**:
    *   The `uploadManager` picks the item from the queue.
    *   For videos, it first calls `videoCompressor.extractVideoThumbnail()`. It emits a progress update with this thumbnail URL so the UI can show a relevant preview.
    *   It then calls `videoCompressor.compressVideo()` or `compressAudio()`. This uses FFmpeg.wasm and emits `'compressing'` progress events.
    *   The rest of the flow (getting a signature, uploading the compressed file directly to Cloudinary) is identical to the image flow.
4.  **Finalization**: The webhook/WebSocket flow is the same. The `MessageBubble` will render the `VideoPlayer` component instead of an image component.

## 5. Camera Flow

1.  **Initiation (`InputBar.tsx`)**:
    *   The user clicks the "Camera" button.
    *   This triggers a hidden `<input type="file" accept="image/*,video/*" capture="environment">`.
    *   The `capture` attribute signals to mobile OSes to open the camera app.

2.  **File Handling**:
    *   After the user takes a photo or video, the camera app returns a `File` object.
    *   From this point, the flow merges with the standard **Image Sending Flow** or **Video/Audio Flow**.
