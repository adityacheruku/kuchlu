# ChirpChat: UI/UX & Interaction Design Guide

This document provides a comprehensive guide to the ChirpChat user interface (UI), user experience (UX) flows, and visual design principles. It serves as the single source of truth for the app's look, feel, and behavior.

---

## 1. Core Design Philosophy

ChirpChat is designed to be an intimate, emotionally resonant space for two people. The UI/UX choices reflect this goal:

-   **Calm & Inviting**: The color palette uses soft, muted tones to create a tranquil atmosphere, avoiding harsh or overly stimulating colors.
-   **Fluid & Responsive**: Interactions are designed to be smooth and jank-free, with subtle animations providing feedback without being distracting. The app should feel alive and responsive to touch.
-   **Intuitive & Accessible**: The interface is kept simple and predictable, ensuring that all features are easy to discover and use, including for users with disabilities (WCAG AA compliance).
-   **Dynamic & Expressive**: The chat's appearance dynamically changes based on the combined mood of the partners, making the interface a living reflection of their emotional state.

---

## 2. Visual Style Guide

The visual style is well-defined and consistently applied throughout the application.

*   **Color Palette**: A custom, calming palette is defined in `src/app/globals.css` using HSL CSS variables.
    *   Primary: `#90AFC5` (Soft Blue)
    *   Background: `#F0F4F7` (Light Gray)
    *   Accent: `#A991B5` (Pale Violet)
*   **Typography**: The primary font is **'PT Sans'** from Google Fonts, providing a warm and modern feel.
*   **Iconography**: **Lucide React** is used for a consistent, lightweight, and modern icon set.

---

## 3. Application Flow Wireframes

This section outlines the primary user flows from initial launch to the core chat experience.

### 3.1. Onboarding & Authentication

The onboarding flow is designed to be quick and secure, getting the user into the app with minimal friction.

![Onboarding Flow](https://placehold.co/800x250.png?text=1.%20Welcome/Phone%20->%202.%20OTP%20Verify%20->%203.%20User%20Details)
<br/>*Data AI Hint: user flow diagram*

1.  **Welcome / Phone Entry**: The user is greeted and prompted to enter their phone number. The UI is clean, with a single input field and a "Continue" button.
2.  **OTP Verification**: A 6-digit code is sent to the user's phone. They enter it on a dedicated screen. Error states for incorrect or expired OTPs are handled gracefully.
3.  **User Details**: The user provides their display name and a password. A password strength indicator provides real-time feedback.

### 3.2. Partner Pairing

After onboarding, the user is guided to find their partner. This is a one-time setup step.

![Partner Pairing Flow](https://placehold.co/800x250.png?text=1.%20Search/Suggest%20->%202.%20Send%20Request%20->%203.%20Wait/Accept)
<br/>*Data AI Hint: user flow diagram*

1.  **Suggestions & Search**: The user sees a list of suggested contacts already on the app. A search bar allows them to find a specific person.
2.  **Requests**: The user can send a single partner request. Sent requests are shown in a "Pending" state. Incoming requests are highlighted at the top, with clear "Accept" and "Reject" buttons.
3.  **Connection**: Once a request is accepted, both users are permanently linked, and the app transitions to the main chat interface.

---

## 4. The Chat Interface: A Deep Dive

The chat interface is the heart of the app. It's composed of three main areas: the Header, the Message Area, and the Input Bar.

![Chat Interface Layout](https://placehold.co/400x600.png?text=Header%0A%0AMessage%20Area%0A%0AInput%20Bar)
<br/>*Data AI Hint: app interface layout*

### 4.1. Header

-   **Left**: Displays the partner's avatar with a real-time presence indicator (green for online, gray for offline). Tapping the avatar opens a full-screen profile view with more details.
-   **Center**: Shows the partner's name and their current mood via a small icon and text (e.g., "😊 Happy"). This area also displays a "typing..." indicator when the partner is active.
-   **Right**: A "More" icon (three dots) opens a menu with actions like "Call," "Send 'Thinking of You' Ping," and "Clear Chat History."

### 4.2. Message Area

-   **Layout**: A standard two-column chat layout. The current user's messages are on the right, and the partner's messages are on the left.
-   **Bubbles**: Messages are enclosed in rounded bubbles with a small "tail." The user's bubbles use the primary theme color, while the partner's use a secondary color.
-   **Dynamic Backgrounds**: The chat area background subtly changes based on the combined mood of the two users. This can be disabled in Settings.
-   **Infinite Scroll**: As the user scrolls to the top, a "Load Older Messages" button appears, allowing them to fetch more of the conversation history without loading everything at once.

### 4.3. Input Bar

-   **Text Input**: A multi-line textarea that expands vertically as the user types.
-   **Attachment Picker**: A paperclip icon opens a bottom sheet with options to send from Camera, Gallery, or Document.
-   **Emoji/Sticker Picker**: A smiley icon opens another bottom sheet with tabs for Emojis, Stickers, and GIFs.
-   **Send/Record Button**: This button is context-aware. It shows a "Send" icon when there is text, and a "Mic" icon for voice recording when the input is empty.

### 4.4. User Actions & System Feedback Table

This table details every interaction within the chat interface.

| Action                    | User Interaction                                                                                                 | System Feedback & UI Updates                                                                                                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Send Text**             | Type in the input bar and press the "Send" button.                                                               | The "Send" button appears with a pop animation when text is entered. Upon sending, the message optimistically appears in the chat area with a "sending" status (clock icon). The input field clears.                     |
| **Send Attachments**      | Tap the paperclip icon to open a bottom sheet. Select camera, gallery, or document.                              | Selected files appear in a "staging area" above the input bar. Upon sending, the message appears with an upload progress indicator before transitioning to the "sending" status. |
| **Record Voice Note**     | Press and hold the microphone icon.                                                                              | A timer and a pulsing red mic icon appear during recording. Releasing sends the note. The optimistic message bubble shows an audio player UI.                                     |
| **React to Message**      | Long-press a message bubble and select an emoji from the quick-reaction menu. Or, double-tap to ❤️.                | The selected emoji appears on the message bubble with a counter. The user's own reaction is highlighted. Others in the chat see the reaction appear in real-time. Tapping the reaction shows who reacted.         |
| **Copy Message Text**     | Long-press a message bubble and select "Copy" from the context menu.                                             | A toast notification confirms that the text has been copied to the clipboard.                                                                                                                                           |
| **View Media**            | Tap on an image or video thumbnail in the chat.                                                                  | A full-screen, immersive modal opens, displaying the media. Users can pinch-to-zoom on images and use standard video controls. A download button is provided.                                                          |
| **Swipe to Reply**        | Swipe a message bubble to the right.                                                                             | The message being replied to appears in a preview area above the input bar. Sending the next message will link it as a reply.                                                                                             |
| **Delete Message**        | Swipe a message bubble to the left, or use the long-press context menu.                                          | A confirmation dialog appears, offering to "Delete for Me" or "Delete for Everyone" (if the user is the sender).                                                                                                        |

---

## 5. Message States & Appearance

Message bubbles change their appearance based on their content and delivery status.

### 5.1. Delivery Status (User's own messages)

-   **Sending (Clock icon)**: The message is on its way to the server.
-   **Sent (Single check)**: The server has received the message.
-   **Delivered (Double check)**: The message has been delivered to the recipient's device.
-   **Read (Blue double check)**: The recipient has opened the chat and seen the message.
-   **Failed (Red alert triangle)**: The message failed to send. A "Retry" button appears.

### 5.2. Media Message Appearance

-   **Image**: Displays a thumbnail. Tapping opens a full-screen viewer. During upload, shows a progress overlay on the blurred thumbnail.
-   **Video**: Displays a thumbnail with a play icon. Tapping plays the video in-line or full-screen.
-   **Voice Note**: Displays a custom audio player UI with a play/pause button and a waveform.
-   **Document**: Displays an icon, the document name, and file size. Tapping opens a preview.
-   **Sticker**: Displays the sticker image directly, with no surrounding bubble.

---

## 6. Special Chat Modes

-   **Fight Mode**: The background shifts to a reddish hue, and bubbles have a sharper appearance to visually distinguish the conversation.
-   **Incognito Mode**: The background becomes a dark gray. Messages sent in this mode have a dashed border and disappear after 30 seconds. They are not saved to history.

## 7. Accessibility

-   **Screen Reader Support**: All interactive elements have `aria-label` attributes for clear screen reader announcements.
-   **Keyboard Navigation**: The entire interface is navigable via the keyboard.
-   **Contrast & Theming**: The color palette meets WCAG AA contrast ratios. A dark mode is also available.
-   **Font Scaling**: The UI respects the user's system-level font size settings.

---

This guide provides a comprehensive overview of the intended user experience. All new features should adhere to these principles to maintain a cohesive and high-quality application.