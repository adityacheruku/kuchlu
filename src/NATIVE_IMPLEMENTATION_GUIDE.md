
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
    *   **Web Call**: `Capacitor.Plugins.AssistiveTouch.requestOverlayPermission()`

2.  **`show(options)`: Promise<void>**
    *   **Purpose**: Creates and displays the floating button.
    *   **Web Call**: `Capacitor.Plugins.AssistiveTouch.show({ size: 56, opacity: 0.8 })`

3.  **`hide()`: Promise<void>**
    *   **Purpose**: Removes the floating button from the screen.
    *   **Web Call**: `Capacitor.Plugins.AssistiveTouch.hide()`
    
4.  **`getStatus()`: Promise<{ isEnabled: boolean }>**
    *   **Purpose**: Checks if the floating button is currently visible and active.
    *   **Web Call**: `Capacitor.Plugins.AssistiveTouch.getStatus()`

**Events to Emit:**

Your native plugin must also emit events back to the web view when the user interacts with the floating button.

1.  **`singleTap`**: Emitted on a single tap.
    *   **Native Code**: `notifyListeners("singleTap", new JSObject());`
2.  **`doubleTap`**: Emitted on a double tap.
    *   **Native Code**: `notifyListeners("doubleTap", new JSObject());`
3.  **`longPress`**: Emitted on a long press.
    *   **Native Code**: `notifyListeners("longPress", new JSObject());`

---

## 3. Floating Button Visual Design & Behavior

This section details the required design and behavior for the floating button, as specified in the project plan.

### 3.1 Core Design Principles
*   **Size**: The touch target should be a standard **56dp**.
*   **Background**: Use a **translucent blur** effect if possible on the target OS version. Fallback to a semi-transparent solid color.
*   **Border**: A soft, 1dp border with 20% white opacity (`#33FFFFFF`).
*   **Shadow**: A soft, ambient shadow to lift the button off the screen.

### 3.2 States
The button must visually respond to user interaction and connection status.

| State           | Visual Cue / Behavior                                                               | Haptic Feedback       |
| --------------- | ----------------------------------------------------------------------------------- | --------------------- |
| **Idle**        | Opacity: 70%, Scale: 1.0. Content shows a subtle gradient.                          | None                  |
| **Active/Press**| Opacity: 100%, Scale: 1.05. Content has a gentle pulse animation.                   | Light impact          |
| **Connected**   | A subtle green glow appears around the border.                                      | None                  |
| **Partner Online** | The button content has a gentle, continuous pulse animation.                     | None                  |
| **Message Sent** | A ripple effect emanates from the button center.                                    | Light vibration       |
| **Mood Received**| The button's gradient briefly shifts to the color associated with the partner's mood. | Confirmation vibration|

### 3.3 Mood Selection Animation
*   When the button is tapped to open the mood selection menu, it should perform an **elastic expansion** animation over approximately 300ms.
*   The mood indicators should animate into position around the bubble.

---

## 4. Step-by-Step Native Implementation Plan

### Phase 1: Android Implementation

The goal on Android is a true floating button that persists via a Foreground Service.

#### **Step 4.1: Configure Permissions & State**
-   In `android/app/src/main/AndroidManifest.xml`, add the `SYSTEM_ALERT_WINDOW` and `FOREGROUND_SERVICE` permissions.
-   **IMPORTANT**: Use `SharedPreferences` to store the enabled/disabled state of the floating button. The `getStatus()` method should read from this.

#### **Step 4.2: Implement `requestOverlayPermission`**
-   Check `Settings.canDrawOverlays(getContext())`.
-   If permission is not granted, create an `Intent` to `Settings.ACTION_MANAGE_OVERLAY_PERMISSION`.

#### **Step 4.3: Create the `AssistiveTouchService`**
-   This will be a `ForegroundService`.
-   **On `onCreate()`**: Inflate the button layout and add it to the `WindowManager` using `TYPE_APPLICATION_OVERLAY`.
-   **On `onStartCommand()`**: Create the required persistent notification (e.g., "ChirpChat is running to stay connected") and start the service in the foreground.
-   **On `onDestroy()`**: Remove the button view from the `WindowManager`.

#### **Step 4.4: Implement Drag-and-Snap Logic**
-   Attach an `OnTouchListener` to the button.
-   On `ACTION_UP`, calculate the closest screen edge (left or right) and use a `ValueAnimator` to smoothly animate the button.
-   Save the final position to `SharedPreferences`.

#### **Step 4.5: Implement Gesture Detection & Actions**
-   Use Android's `GestureDetector`.
-   **`onSingleTapConfirmed`**: Open the native mood selection UI (see section 3.3). Do **not** emit the `singleTap` event directly, as the web app does not handle this UI.
-   **`onDoubleTap`**: Emit the `doubleTap` event.
-   **`onLongPress`**: Emit the `longPress` event.
-   **IMPORTANT**: Implement distinct haptic feedback (`HapticFeedbackConstants`) for each gesture.

### Phase 2: iOS Implementation (In-App Only)

**Reminder:** iOS does not allow drawing over other apps. This implementation will only work while the app is active.

#### **Step 5.1: Implement the Floating Button View**
-   Create a custom `UIView` for the button. Add it to the main `UIWindow` to float above the web view.

#### **Step 5.2: Implement Drag-and-Snap Logic**
-   Use a `UIPanGestureRecognizer` to update the view's `center` property and `UIView.animate` to snap it to the edge.

#### **Step 5.3: Implement Gesture Detection**
-   Add `UITapGestureRecognizer` (single/double) and `UILongPressGestureRecognizer` instances.
-   In the handlers, call `notifyListeners(...)` to send the corresponding events to the web view.

---

This plan provides a complete roadmap. The web infrastructure is ready and waiting for this native plugin to be completed.
