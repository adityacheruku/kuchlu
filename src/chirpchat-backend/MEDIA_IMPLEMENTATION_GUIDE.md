# ChirpChat: Backend Media Implementation Guide

This document provides a detailed technical overview of the media handling pipeline for the ChirpChat backend, addressing questions about storage, processing, security, and scalability.

---

## 1. File Storage & Uploads

**1.1. Where are media files currently stored?**

All media files (images, videos, audio clips, documents) are stored directly in **Cloudinary**, a comprehensive cloud-based digital asset management service. We do not store any media files on the local disk of our FastAPI server.

**1.2. How are files uploaded from the client to the backend?**

We use a **direct-to-cloud upload** model to maximize efficiency and offload bandwidth from our server. The flow is as follows:

1.  The Next.js client makes a request to our FastAPI backend (`/uploads/get-cloudinary-upload-signature`).
2.  The backend generates a secure, time-sensitive **signed upload signature**. This signature pre-authorizes a specific upload to a designated private folder in our Cloudinary account.
3.  The client receives this signature and uses it to upload the file directly to Cloudinary's API endpoint, bypassing our server entirely for the data transfer.

**1.3. What's your strategy for handling large file uploads?**

The current implementation relies on the robustness of modern browsers and Cloudinary's API to handle large single-file uploads via XHR/Fetch. For a production-grade application handling very large files (e.g., >100MB videos), the ideal strategy would be to integrate **Cloudinary's Upload Widget** on the frontend, which has built-in support for chunking and resumable uploads.

---

## 2. Media Processing (Images & Videos)

**2.1. Are you performing server-side processing?**

Yes, but we **delegate all media processing to Cloudinary**. Our FastAPI server does not perform any direct media manipulation (like resizing or transcoding). This is a key part of our scaling strategy.

When the client requests an upload signature, our backend includes `eager` transformation instructions. After the direct upload is complete, Cloudinary automatically performs these transformations in the background.

**2.2. What libraries or tools are used?**

-   **Backend**: The `cloudinary` Python SDK is used to generate signatures and interact with the Cloudinary API.
-   **Frontend**: For a better user experience, we perform **client-side pre-processing** before uploading, using `browser-image-compression` for images and `ffmpeg.wasm` for compressing videos and audio clips.

**2.3. What are the image processing requirements?**

We generate two main variants for each uploaded image via eager transformations:
-   **Thumbnail (`thumbnail_250`)**: A 250x250px cropped JPEG for fast-loading previews.
-   **Preview (`preview_800`)**: An 800px wide, optimized WebP image for full-screen viewing.
-   The original image is preserved for high-quality downloads.

**2.4. What are the video processing requirements?**

For each video, we generate multiple variants:
-   **Web-Optimized MP4**: A standard, compressed MP4 for general compatibility.
-   **HLS/DASH Manifests**: For adaptive bitrate streaming, providing a smooth playback experience on variable networks.
-   **Static Thumbnail**: A single JPG frame extracted from the video to use as a poster image.
-   **Animated Preview**: A short, looping GIF preview.

**2.5. Where are processed media variants stored?**

Cloudinary stores all variants under the same `public_id` as the original asset. They are accessed by applying transformation parameters to the URL, which is handled automatically by the signed URL generation process.

---

## 3. Real-time Communication & WebSockets

**3.1. How are you handling real-time chat?**

The FastAPI backend uses **WebSockets** for real-time, bidirectional communication. To ensure scalability, the system employs a **Redis Pub/Sub** message broker. When one server instance receives an event, it publishes it to a Redis channel, and all other subscribed instances forward the message to their connected clients.

**3.2. How are clients notified about media processing status?**

We use a webhook-based workflow:
1.  **Optimistic UI**: The client immediately displays an "uploading" placeholder in the chat.
2.  **Notification URL**: The backend provides a `notification_url` (pointing to `/webhooks/cloudinary/media-processed`) when generating the upload signature.
3.  **Cloudinary Webhook**: After the upload and all eager transformations are complete, Cloudinary sends a webhook to our backend with the details and URLs of all generated media variants.
4.  **Backend Update**: The webhook handler updates the message in our database with the final media metadata.
5.  **WebSocket Broadcast**: The handler then broadcasts a `media_processed` WebSocket event to all chat participants. The clients receive this event and update the message UI from its placeholder state to the final, viewable state.

---

## 4. Scalability & Performance

**4.1. What are your expectations for concurrent users?**

The architecture is designed to be horizontally scalable. By using a stateless FastAPI application and offloading real-time broadcasting to Redis, we can add more server instances to handle an increasing number of concurrent users.

**4.2. How do you handle computationally intensive tasks like video encoding?**

All computationally expensive tasks are **offloaded to Cloudinary**. We do not run FFmpeg or other encoding software on our application servers. This prevents our API from being blocked by long-running jobs and leverages a dedicated, highly optimized service for media processing.

**4.3. Do you have a caching strategy?**

Yes, we employ a multi-layered caching strategy:
-   **CDN**: Cloudinary provides a world-class, multi-region CDN out of the box for all media assets.
-   **Client-Side Cache**: On the frontend, the `mediaCacheService` uses IndexedDB to cache media blobs. When a signed URL is fetched, the media is downloaded and stored locally. This prevents re-downloading the same asset if the signed URL expires and a new one is requested.

---

## 5. Security & Data Privacy

**5.1. How do you ensure secure access to media?**

All media is uploaded to Cloudinary with `type: "private"`. This means the files are not accessible via a public URL. Access is granted exclusively through **short-lived signed URLs**.

-   The frontend must request a URL from our backend's `/media/{message_id}` endpoint.
-   The backend first verifies that the authenticated user is a legitimate participant in the chat associated with that message.
-   Only if the user is authorized does the backend generate and return a signed URL with a short expiration time (e.g., 5-10 minutes).

**5.2. What are your considerations for data privacy?**

-   **Encryption**: All media is encrypted at rest by Cloudinary.
-   **Data Retention**: When a message containing media is deleted by a user, a background task is now queued to make a corresponding API call to Cloudinary to permanently delete the associated file from cloud storage. This prevents orphaned files and respects user deletion requests.
