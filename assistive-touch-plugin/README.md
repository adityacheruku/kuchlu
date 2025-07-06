# AssistiveTouch Plugin

A Capacitor plugin that provides a floating assistive touch button with gesture support and haptic feedback.

## Features

- **Floating Button**: Draggable floating button that stays on top of other apps
- **Gesture Support**: Single tap, double tap, and long press gestures
- **Haptic Feedback**: Distinct vibration patterns for different gestures
- **State Persistence**: Remembers enabled state across app restarts
- **Boot Auto-start**: Automatically restarts service on device boot if previously enabled
- **Cross-platform**: Works on Android, iOS, and Web

## Installation

```bash
npm install assistive-touch-plugin
```

## Usage

### Basic Setup

```typescript
import { AssistiveTouchPlugin } from 'assistive-touch-plugin';

// Request overlay permission (Android only)
const { granted } = await AssistiveTouchPlugin.requestOverlayPermission();
if (!granted) {
  console.log('Overlay permission not granted');
  return;
}

// Show the floating button
await AssistiveTouchPlugin.show({
  label: 'Assistive Touch',
  authToken: 'your-auth-token' // optional
});

// Check if button is currently active
const { isEnabled } = await AssistiveTouchPlugin.getStatus();
console.log('Button is enabled:', isEnabled);

// Hide the floating button
await AssistiveTouchPlugin.hide();
```

### Event Listeners

```typescript
// Listen for gesture events
AssistiveTouchPlugin.addListener('singleTap', (data) => {
  console.log('Single tap detected');
  // Handle single tap
});

AssistiveTouchPlugin.addListener('doubleTap', (data) => {
  console.log('Double tap detected');
  // Handle double tap
});

AssistiveTouchPlugin.addListener('longPress', (data) => {
  console.log('Long press detected');
  // Handle long press
});
```

### Complete Example

```typescript
import { AssistiveTouchPlugin } from 'assistive-touch-plugin';

class AssistiveTouchManager {
  private isEnabled = false;

  async initialize() {
    // Check current status
    const { isEnabled } = await AssistiveTouchPlugin.getStatus();
    this.isEnabled = isEnabled;

    // Set up event listeners
    this.setupEventListeners();

    // Request permission if needed
    if (!this.isEnabled) {
      await this.requestPermission();
    }
  }

  private async requestPermission() {
    const { granted } = await AssistiveTouchPlugin.requestOverlayPermission();
    if (granted) {
      await this.enable();
    } else {
      console.log('Permission denied');
    }
  }

  async enable() {
    await AssistiveTouchPlugin.show({
      label: 'Assistive Touch',
      authToken: 'your-auth-token'
    });
    this.isEnabled = true;
  }

  async disable() {
    await AssistiveTouchPlugin.hide();
    this.isEnabled = false;
  }

  async toggle() {
    if (this.isEnabled) {
      await this.disable();
    } else {
      await this.enable();
    }
  }

  private setupEventListeners() {
    AssistiveTouchPlugin.addListener('singleTap', () => {
      console.log('Single tap - Quick action');
      // Implement quick action
    });

    AssistiveTouchPlugin.addListener('doubleTap', () => {
      console.log('Double tap - Secondary action');
      // Implement secondary action
    });

    AssistiveTouchPlugin.addListener('longPress', () => {
      console.log('Long press - Menu or settings');
      // Show menu or settings
    });
  }
}

// Usage
const manager = new AssistiveTouchManager();
await manager.initialize();
```

## API Reference

### Methods

#### `requestOverlayPermission(): Promise<{ granted: boolean }>`
Requests permission to draw over other apps (Android only). On iOS and Web, always returns `{ granted: true }`.

#### `show(options: { label: string; authToken?: string }): Promise<void>`
Shows the floating button.
- `label`: Accessibility label for the button
- `authToken`: Optional authentication token

#### `hide(): Promise<void>`
Hides the floating button.

#### `getStatus(): Promise<{ isEnabled: boolean }>`
Returns the current status of the assistive touch button.

### Events

#### `singleTap`
Fired when the button is tapped once.

#### `doubleTap`
Fired when the button is tapped twice quickly.

#### `longPress`
Fired when the button is pressed and held.

## Platform Support

### Android
- Requires `SYSTEM_ALERT_WINDOW` permission
- Uses foreground service for reliability
- Supports haptic feedback
- Auto-restarts on boot if previously enabled
- Persists state in SharedPreferences

### iOS
- Uses native UIButton with gesture recognizers
- Supports haptic feedback via UIImpactFeedbackGenerator
- No overlay permission required

### Web
- Uses DOM elements and event listeners
- Supports vibration API for haptic feedback
- Draggable within viewport bounds

## Permissions

### Android
Add these permissions to your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.INTERNET" />
```

## Troubleshooting

### Button not showing on Android
1. Check if overlay permission is granted
2. Ensure the app is not in battery optimization mode
3. Verify the service is running in the notification panel

### Haptic feedback not working
1. Check device vibration settings
2. Ensure the app has vibration permission
3. On web, verify the device supports the Vibration API

### Service not restarting on boot
1. Check if the app has `RECEIVE_BOOT_COMPLETED` permission
2. Verify the BootReceiver is properly registered in AndroidManifest.xml
3. Some devices may have additional battery optimization settings

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

## License

MIT
