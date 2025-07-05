
# ChirpChat: Media Handling Implementation Guide

This document provides a detailed technical overview of how image and audio/voice messages are handled in the ChirpChat application. It is intended for developers to understand the end-to-end flow from user interaction to final delivery.

## 1. High-Level Architecture

The media handling pipeline is designed to be robust, efficient, and user-friendly. It prioritizes a good user experience through optimistic UI updates and background processing.

The core flow is as follows:
1.  **User Action**: The user selects a file or records media via the `InputBar`.
2.  **Optimistic UI**: An immediate message bubble appears in the `MessageArea` with an "uploading" status.
3.  **Client-Side Validation & Processing**: The file is validated. Images and videos/audio are compressed *on the client's device* before uploading to save bandwidth and time.
4.  **Queued Upload**: The processed file is added to a persistent queue managed by `uploadManager.ts`, which handles concurrent uploads and retries.
5.  **API Upload**: The manager sends the file to the FastAPI backend.
6.  **Cloud Storage**: The backend uploads the file to Cloudinary.
7.  **Real-time Message Delivery**: Once the upload is complete, a WebSocket event containing the final media URL is sent, and the message bubble updates for all participants.

## 2. Key Services and Components

-   **`src/app/chat/page.tsx`**: The main page component that orchestrates all chat functionality and state management.
-   **`src/components/chat/InputBar.tsx`**: The UI component for user input, including the attachment picker and voice recorder.
-   **`src/services/uploadManager.ts`**: A robust queue system for managing all file uploads in the background.
-   **`src/services/imageProcessor.ts`**: Uses the browser's Canvas API to resize and compress images.
-   **`src/services/videoCompressor.ts`**: Uses **FFmpeg.wasm** to compress videos and audio files directly in the browser.
-   **`src/services/api.ts`**: Handles all HTTP communication with the backend.
-   **`src/services/storageService.ts`**: A Dexie (IndexedDB) wrapper for client-side persistence of messages, chats, and the upload queue.
-   **`chirpchat-backend/app/routers/uploads.py`**: The FastAPI endpoint that receives file uploads and sends them to Cloudinary.

---

## 3. Image Sending Flow (Step-by-Step)

1.  **Initiation (`InputBar.tsx`)**:
    *   A user clicks the "Gallery" button in the attachment sheet.
    *   This triggers a hidden `<input type="file" accept="image/*,video/*">`.
    *   The `onChange` event calls `handleFileSelect`.

2.  **File Handling (`chat/page.tsx`)**:
    *   The `handleFileUpload` function receives the `File` object.
    *   `validateFile()` is called to ensure the file is a valid image and within size limits.
    *   A temporary `client_temp_id` (UUID) is generated for the message.
    *   An "optimistic" `Message` object is created with `status: 'uploading'`. A temporary object URL is created for the image preview (`thumbnailDataUrl`).
    *   This message is immediately saved to the local database via `storageService.addMessage()`, making it appear instantly in the UI.

3.  **Queuing (`uploadManager.ts`)**:
    *   The `uploadManager.addToQueue()` method is called with the `File` object and message details.
    *   The upload item is saved to the `uploadQueue` table in IndexedDB, ensuring it will be processed even if the user closes the app.

4.  **Processing (`uploadManager.ts` & `imageProcessor.ts`)**:
    *   The `uploadManager` picks the item from the queue.
    *   It identifies the subtype as `image` and calls `imageProcessor.processImage(file)`.
    *   The `imageProcessor` uses a `<canvas>` element to:
        *   Create a compressed version of the original image.
        *   Create a smaller thumbnail for previews.
    *   Progress events are emitted and consumed by `chat/page.tsx` to update the UI.

5.  **Uploading & Delivery**:
    *   `uploadManager` calls `api.uploadFile`, which sends the *compressed* image `Blob` to the backend.
    *   The backend uploads it to Cloudinary.
    *   When the API call succeeds, the `uploadManager` emits a `completed` event with the Cloudinary URL.
    *   `chat/page.tsx` receives this event and updates the local message with the final `image_url`.
    *   Finally, a `send_message` WebSocket event is sent to the backend with the message details, which then broadcasts it to the partner.

## 4. Voice Message & Audio Flow

1.  **Recording (`InputBar.tsx`)**:
    *   The user presses and holds the `Mic` button.
    *   `handleStartRecording` is triggered, using the browser's `MediaRecorder` API to capture audio. The UI shows a recording timer.
    *   When the user releases the button, `handleStopAndSendRecording` compiles the audio chunks into a single `Blob`.

2.  **File Handling (`chat/page.tsx`)**:
    *   `handleSendVoiceMessage` is called with the new audio `File`.
    *   The flow from here is nearly identical to the image flow: an optimistic message is created and the item is queued in the `uploadManager`.

3.  **Processing (`uploadManager.ts` & `videoCompressor.ts`)**:
    *   The `uploadManager` picks the audio item from the queue.
    *   It calls `videoCompressor.compressAudio(file)`.
    *   **Crucially, this uses FFmpeg (compiled to WebAssembly) to transcode the audio into a standard, compressed AAC format within an MP4 container.** This ensures cross-browser compatibility and smaller file sizes.
    *   Progress events for the compression are emitted and displayed.

4.  **Uploading & Delivery**: The final steps are identical to the image flow.

## 5. Camera Flow

1.  **Initiation (`InputBar.tsx`)**:
    *   The user clicks the "Camera" button.
    *   This triggers a hidden `<input type="file" accept="image/*,video/*" capture="environment">`.
    *   The `capture` attribute is key—it signals to mobile operating systems to open the camera app directly instead of a file picker.

2.  **File Handling**:
    *   After the user takes a photo or video, the camera app returns a `File` object to the browser.
    *   From this point, the flow merges with the standard **Image Sending Flow** or **Video Sending Flow**. The app validates the file and processes it accordingly.
