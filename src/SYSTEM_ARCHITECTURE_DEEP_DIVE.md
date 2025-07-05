
# ChirpChat: System Architecture Deep Dive

This document provides a detailed technical overview of the ChirpChat application's backend, real-time systems, and media pipeline. It addresses current limitations and outlines strategies for scaling to a production-grade service.

---

## 1. Backend Scalability & Media Management

### 1.1. How does the backend handle media processing after the initial upload?

**Current Implementation:**
The current flow is direct and synchronous. The `uploads.py` endpoint in the FastAPI backend receives the file, uploads it directly to Cloudinary, and immediately returns the URL provided by Cloudinary's SDK. This URL is then used by the client to send the `new_message` WebSocket event. This is robust for simple use cases but doesn't leverage Cloudinary's advanced processing capabilities efficiently.

**Scaling Strategy (Webhook Integration):**
For a top-notch application, a webhook-based, asynchronous flow is superior.
1.  **Initial Upload:** The client uploads the file to a temporary, secure location in Cloudinary. This upload can even be done directly from the client to Cloudinary to offload bandwidth from our backend.
2.  **Processing Job:** Our backend, upon receiving the temporary URL, makes an API call to Cloudinary to start a processing job (e.g., transcoding, thumbnail generation) with a `notification_url` pointing to a new webhook endpoint on our FastAPI backend (e.g., `/webhooks/cloudinary/media-processed`).
3.  **Webhook Notification:** Once Cloudinary finishes processing, it sends a POST request to our webhook with all the generated media URLs (e.g., video URL, HLS manifest, thumbnails).
4.  **Database Update:** The webhook handler on our backend then updates the corresponding `messages` table record with the final, permanent URLs.
5.  **Real-time Update:** Finally, the backend sends a WebSocket event (e.g., `message_media_processed`) to the clients, telling them to update the message UI from "uploading" to its final state with the correct media.

### 1.2. How is the relationship between a Message and its media managed?

**Current Implementation:**
The `messages` table in the database has columns like `image_url`, `clip_url`, and `document_url`. This is functional but not very flexible.

**Scaling Strategy (JSONB Metadata):**
A more scalable approach, which is partially implemented in the schemas, is to use a single `media_metadata` JSONB column in the `messages` table. This provides much more flexibility.

```sql
-- Example schema for the messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    -- ... other columns
    media_type TEXT, -- 'image', 'video', 'audio'
    media_metadata JSONB
);

-- Example JSONB content for a video
{
  "resource_type": "video",
  "format": "mp4",
  "bytes": 5242880,
  "duration": 15.5,
  "urls": {
    "original": "https://res.cloudinary.com/.../video.mp4",
    "hls_manifest": "https://res.cloudinary.com/.../video.m3u8",
    "thumbnail_static": "https://res.cloudinary.com/.../video.jpg",
    "thumbnail_animated": "https://res.cloudinary.com/.../video.gif"
  }
}
```

### 1.3. What is the strategy for media deletion and retention?

**Current Implementation:**
There is no automated deletion from Cloudinary when a message is deleted from the database. This is a common starting point but leads to orphaned files and unnecessary storage costs.

**Scaling Strategy (Background Job on Deletion):**
1.  **Deletion Event:** When a user deletes a message "for everyone," the backend API endpoint should not only delete the record from the database but also publish an event to a background job queue (e.g., using Redis or Celery).
2.  **Background Worker:** A separate worker process consumes events from this queue. For a `media_deletion` event, it would get the media's `public_id` from the message's metadata.
3.  **Cloudinary API Call:** The worker makes an authenticated API call to Cloudinary's Admin API to permanently delete the asset. This prevents the deletion process from blocking the user's API request and handles retries gracefully if the Cloudinary API is temporarily unavailable.

---

## 2. Video Specifics and Streaming

### 2.1. What output formats are targeted for video compression?

The `videoCompressor.ts` service uses `ffmpeg.wasm` to target **MP4 containers with H.264 video and AAC audio**. This combination offers the best compatibility across all modern web browsers and mobile devices.

### 2.2. Do you plan to support adaptive bitrate streaming (HLS/DASH)?

**Current Implementation:** No, the app currently links directly to the compressed MP4 file. This is fine for short clips but inefficient for longer videos, especially on variable networks.

**Scaling Strategy (Leveraging Cloudinary):**
Yes, and Cloudinary is the ideal tool for this. Instead of building a complex segmentation pipeline, we would configure our Cloudinary upload process to automatically generate HLS and/or DASH manifests.
*   The backend would request this during the processing job (as described in 1.1).
*   The webhook notification from Cloudinary would include the URL to the `.m3u8` (HLS) or `.mpd` (DASH) manifest file.
*   The frontend would then use a player like **HLS.js** or **Shaka Player** to handle the adaptive streaming, providing a smooth playback experience for the user.

### 2.3. How are video previews handled?

**Current Implementation:** A static thumbnail is generated. `videoCompressor.ts` can be configured to have `ffmpeg.wasm` extract a single frame (e.g., at the 1-second mark) to use as a preview image.

**Scaling Strategy (Animated Previews):**
For a "top-notch" experience, a short, looping, animated preview is better. Cloudinary can be configured to generate this automatically (e.g., a 5-second animated GIF or a short MP4 clip without audio). The `media_metadata` in the database would be updated to store the URL for this `thumbnail_animated` asset.

---

## 3. Real-time Communication & Notifications

### 3.1. How is the WebSocket server integrated?

The WebSocket server is integrated directly within the **FastAPI** application, as seen in `app/routers/ws.py`. It is not a separate service. To handle scaling across multiple server instances, the backend uses a **Redis Pub/Sub** channel (`chirpchat:broadcast`). When one instance needs to send a message, it publishes the event to Redis, and all other subscribed instances receive it and forward it to their connected clients. This is a standard and scalable architecture.

### 3.2. How are delivery receipts and typing indicators handled?

These are handled exclusively via WebSocket events.
*   **Typing Indicators:** The client sends `start_typing` and `stop_typing` events. The server broadcasts these to the other user in the chat.
*   **Delivery Receipts:** The system currently supports a `sent` status (when the server receives the message). A full "delivered" and "read" implementation would involve:
    1.  **Delivered:** When a client receives a `new_message` event, it sends a `message_delivered` event back to the server for that message ID.
    2.  **Read:** When the user opens the chat and the message becomes visible in the viewport, the client sends a `message_read` event.
    3.  The server then broadcasts these status updates to the original sender.

### 3.3. How do push notifications for new media messages work?

This is already planned and integrated via PWA standards. The flow is detailed in `PWA_FEATURES.md`.
1.  **Subscription:** The user grants notification permission in the browser. The browser's Push API provides a unique subscription object.
2.  **Backend Storage:** The client sends this subscription object to the backend (`/notifications/subscribe`), where it's stored securely.
3.  **Trigger:** When a user receives a new message (text or media) and is not currently connected via WebSocket, the backend service (`notification_service.py`) retrieves their stored push subscription.
4.  **Web Push:** The backend sends a request to the browser vendor's push service (using the VAPID protocol), which then delivers the push notification to the user's device. The service worker on the client-side (`public/push-worker.js`) handles displaying the notification.

---

## 4. Error Handling and User Feedback

### 4.1. What specific error states are handled?

The `uploadManager.ts` and `types/uploadErrors.ts` files define a clear error handling strategy.
*   **Validation Failure:** `validateFile` checks for `FILE_TOO_LARGE` and `INVALID_FILE_TYPE` before any upload begins.
*   **Network/Server Errors:** The `uploadManager` catches network failures or non-2xx server responses, classifying them as `NETWORK_ERROR` or `SERVER_ERROR`. These are marked as retryable.
*   **Cancellation:** The user can cancel an in-progress upload, which is marked with `CANCELLED`.

### 4.2. How are these errors communicated to the user?

The `MessageBubble` component listens to the `message.status` and `message.uploadStatus` fields.
*   If `status` is `"uploading"`, it shows a progress indicator.
*   If `status` is `"failed"`, it displays a "Failed to send" message and a "Retry" button, which calls the `onRetrySend` handler. This provides clear and actionable feedback to the user.

---

## 5. Scaling Considerations

### 5.1. Is a custom CDN layer needed?

No. Cloudinary is a digital asset management (DAM) platform that includes a high-performance, multi-region CDN by default. All URLs served from `res.cloudinary.com` are already delivered via their global CDN. Adding another CDN in front would be redundant and add complexity.

### 5.2. How is media access authorized?

**Current Implementation:** Media URLs are public but unguessable (long, random IDs). This is "security by obscurity" and is acceptable for early stages.

**Scaling Strategy (Signed URLs):**
For a "top-notch" application with strong privacy requirements, **Cloudinary Signed URLs** are the best practice.
1.  **Private Media:** All assets in Cloudinary would be marked as `type: "private"`.
2.  **Backend Authorization:** When a client needs to display an image or video, it requests the URL from our backend API.
3.  **URL Signing:** The FastAPI backend verifies that the user is authenticated and is a participant in the chat associated with the media.
4.  **Short-Lived URL:** The backend then uses the Cloudinary SDK and its secret key to generate a unique, **signed URL** for that specific asset with a short expiration time (e.g., 5-10 minutes).
5.  **Client Access:** The client receives this temporary, signed URL and uses it to render the media. Any attempt to access the URL after it expires, or without the correct signature, will fail. This ensures that only authenticated chat participants can view the media.
