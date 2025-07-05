
# Native Plugin Implementation Guide for ChirpChat

**To the Native Plugin Developer:**

This document provides the complete technical specification for building the native Capacitor plugin required for the ChirpChat application. The web-side of the application is **finished**. Your task is to build the native Android and iOS components that the web app will call.

## 1. High-Level Architecture

The application uses a hybrid model:
- **Web Core**: A Next.js Progressive Web App (PWA) handles the entire user interface and business logic.
- **Native Bridge (Capacitor)**: This allows the web app to communicate with native device features.
- **Native Plugin (Your Task)**: A custom Capacitor plugin named `AssistiveTouch` that you will build. This plugin will expose specific methods to the web app and manage the native UI components and services.

![Architecture Diagram](https://placehold.co/800x300.png?text=WebApp%20%3C-%3E%20Capacitor%20%3C-%3E%20Native%20Plugin)
<br/>
*Data AI Hint: architecture diagram*

## 2. Core Task: Create the `AssistiveTouch` Plugin

Your primary responsibility is to create the Capacitor plugin.

**Command to Generate Plugin:**
```bash
npx @capacitor/cli plugin:generate
```
When prompted, use the name `AssistiveTouch`.

### Required Plugin API

The web app's `capacitorService.ts` will call the following methods. Your plugin must implement them.

**Methods to Expose:**

1.  **`requestOverlayPermission()`: Promise<void>**
    *   **Purpose**: To request the "draw over other apps" permission on Android.

2.  **`show(options)`: Promise<void>**
    *   **Purpose**: Creates and displays the floating button.
    *   **Web Call**: `Capacitor.Plugins.AssistiveTouch.show({ opacity: 0.8 })`
    *   **`options`**: An object containing `{ opacity: number }` (from 0.2 to 1.0).

3.  **`hide()`: Promise<void>**
    *   **Purpose**: Removes the floating button from the screen.

4.  **`getStatus()`: Promise<{ isEnabled: boolean }>`**
    *   **Purpose**: Checks if the floating button is currently visible and active. This state **must be persisted** in SharedPreferences.

5.  **`updateMenu(options)`: Promise<void>**
    *   **Purpose**: Sends the customized list of moods/actions from the web view to the native menu.
    *   **Web Call**: `Capacitor.Plugins.AssistiveTouch.updateMenu({ moods: [...] })`
    *   **`moods`**: An array of objects, e.g., `[{ id: "happy", label: "Happy", emoji: "😊" }]`.

**Events to Emit:**

Your native plugin must also emit events back to the web view.

1.  **`singleTap`**: Emitted on a single tap. **The native plugin should show the Mood Menu UI.**
2.  **`doubleTap`**: Emitted on a double tap.
3.  **`longPress`**: Emitted on a long press.
4.  **`moodSelected`**: Emitted when a user selects a mood from the native menu. The payload should be `{ moodId: string }`.

---

## 3. Floating Button & Menu: Visuals and Behavior

### 3.1 Core Design Principles (The Bubble)
*   **Size**: A standard **56dp** touch target.
*   **Background**: Use a **translucent blur** effect (`Window.setBlurBehind`). Fallback to a semi-transparent solid color on older Android versions.
*   **Border**: A soft, 1dp border with 20% white opacity (`#33FFFFFF`).
*   **Shadow**: A soft, ambient shadow to lift the button off the screen.

### 3.2 States & Visual Feedback
| State           | Visual Cue / Behavior                                                               | Haptic Feedback       |
| --------------- | ----------------------------------------------------------------------------------- | --------------------- |
| **Idle**        | Opacity set by web view (e.g., 0.8), Scale: 1.0. Content shows a subtle gradient.   | None                  |
| **Active/Press**| Opacity: 1.0, Scale: 1.05. Content has a gentle pulse animation.                    | `HapticFeedbackConstants.KEYBOARD_TAP` |
| **Connected**   | A subtle green glow appears around the border.                                      | None                  |
| **Partner Online** | The button content has a gentle, continuous pulse animation.                     | None                  |
| **Mood Received**| The button's gradient briefly shifts to the color associated with the partner's mood. | `HapticFeedbackConstants.CONFIRM` |

### 3.3 The Native Mood Menu
*   **Trigger**: Opens on a `singleTap`.
*   **Animation**: The main bubble should perform an **elastic expansion** animation. The mood indicators should animate into position around the bubble.
*   **Content**: The menu items are provided dynamically by the web view via the `updateMenu` method. Initially, they may just be text. Later, they will include emojis. The native UI must be ableto render either.
*   **Action**: When a user taps a mood, the native plugin must emit the `moodSelected` event with the `moodId` back to the web view.

---

## 4. Step-by-Step Native Implementation Plan

### Phase 1: Android Implementation

#### **Step 4.1: State Persistence & Permissions**
*   In `android/app/src/main/AndroidManifest.xml`, add `SYSTEM_ALERT_WINDOW` and `FOREGROUND_SERVICE` permissions.
*   Use `SharedPreferences` to store the enabled/disabled state of the floating button. The `getStatus()` method must read from this.

#### **Step 4.2: Implement the `AssistiveTouchService`**
*   This will be a `ForegroundService`.
*   The `show()` plugin method should start this service, passing in the opacity. It should also save the `isEnabled: true` state to SharedPreferences.
*   The `hide()` method should stop the service and save `isEnabled: false`.

#### **Step 4.3: Implement Gesture Detection & Actions**
*   Use Android's `GestureDetector`.
*   **`onSingleTapConfirmed`**: Open the native mood selection UI.
*   **`onDoubleTap`**: Emit the `doubleTap` event.
*   **`onLongPress`**: Emit the `longPress` event.
*   Implement distinct haptic feedback (`HapticFeedbackConstants`) for each gesture.

#### **Step 4.4: Implement the Dynamic Mood Menu**
*   Create a native layout for the menu (e.g., using a custom `ViewGroup`).
*   The `updateMenu` plugin method will receive the list of moods. Store this list in a variable in your plugin.
*   When the menu is shown (on single tap), dynamically create and populate the mood item views (e.g., `TextView` or a custom view with an `ImageView` for the emoji) from the stored list.
*   Set an `OnClickListener` on each mood item. When clicked, it should emit the `moodSelected` event with the corresponding `moodId`.

### Phase 2: iOS Implementation (In-App Only)
*   **Reminder:** iOS does not allow drawing over other apps. The primary alternative is to use home screen Quick Actions and Widgets.
*   Implement the `getstatus()` method to always return `{ isEnabled: false }`.
*   The `show()`, `hide()`, and `updateMenu()` methods can be implemented as no-ops.

---

This plan provides a complete roadmap. The web infrastructure is ready and waiting for this native plugin to be completed.
