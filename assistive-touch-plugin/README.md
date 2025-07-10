# AssistiveTouch Plugin for Capacitor

A comprehensive Capacitor plugin that provides a floating assistive touch button with mood sharing capabilities, designed for enhanced user interaction and communication with production-ready security and error handling.

## Features

### 🎯 Core Functionality
- **Floating Button**: Draggable overlay button that stays on top of other apps
- **Gesture Support**: Single-tap for mood selection, double-tap for "Thought of you" messages
- **Cross-Platform**: Full support for Android, iOS, and Web platforms
- **Secure Authentication**: Enterprise-grade JWT token storage and management
- **Dynamic UI**: Configurable opacity and mood menu options

### 🔒 Security Features
- **Android**: EncryptedSharedPreferences with AES-256 encryption for token storage
- **iOS**: Keychain Services for secure token storage
- **Fallback Protection**: Graceful degradation if encryption fails
- **Token Management**: Secure storage, retrieval, and cleanup

### 📱 Platform-Specific Features
- **Android**: App shortcuts, overlay permissions, enhanced haptic feedback patterns
- **iOS**: Native floating button, haptic feedback, secure keychain storage
- **Web**: Touch and mouse gesture support, responsive design

### 🔧 Advanced Features
- **Mood Sharing**: Send mood updates to backend API with comprehensive error handling
- **Thought Messages**: Quick "Thought of you" notifications
- **Dynamic Menus**: Update mood options at runtime
- **Opacity Control**: Adjust button transparency
- **App Shortcuts**: Quick access via app icon long-press (Android)
- **Enhanced Haptics**: Different vibration patterns for success, error, and warning states

## Installation

### 1. Install the Plugin

```bash
npm install assistivetouch
```

### 2. Add to Your Capacitor Project

```bash
npx cap add assistivetouch
```

### 3. Platform-Specific Setup

#### Android
Add the following permissions to your `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.INTERNET" />
```

The plugin automatically includes the necessary security dependencies:
- `androidx.security:security-crypto:1.1.0-alpha06` for EncryptedSharedPreferences
- `com.squareup.okhttp3:okhttp:4.12.0` for secure network requests

#### iOS
No additional setup required. The plugin handles all necessary permissions and security features automatically.

## Usage

### Basic Setup

```typescript
import { AssistiveTouchPlugin } from 'assistivetouch';

// Request overlay permission (Android)
const { granted } = await AssistiveTouchPlugin.requestOverlayPermission();
if (!granted) {
  console.log('Overlay permission denied');
  return;
}

// Set authentication token (securely stored)
await AssistiveTouchPlugin.setAuthToken({
  token: 'your-jwt-token-here'
});

// Show the floating button
await AssistiveTouchPlugin.show({
  label: 'Assistive Touch',
  authToken: 'your-jwt-token-here',
  opacity: 0.8
});
```

### Gesture Interactions

#### Single Tap
Opens the mood selection menu with available mood options.

#### Double Tap
Sends a "Thought of you" message to the backend.

#### Drag
Move the floating button around the screen. On mobile, it will snap to the nearest edge.

### API Reference

#### `requestOverlayPermission()`
Request permission to draw over other apps (Android only).

**Returns:** `Promise<{ granted: boolean }>`

#### `show(options)`
Show the floating assistive touch button.

**Parameters:**
- `options.label` (string): Accessibility label for the button
- `options.authToken` (string, optional): JWT token for API calls
- `options.opacity` (number, optional): Button opacity (0.0 to 1.0, default: 1.0)

#### `hide()`
Hide the floating button.

#### `getStatus()`
Get the current status of the assistive touch button.

**Returns:** `Promise<{ isEnabled: boolean }>`

#### `setAuthToken(options)`
Securely store the authentication token using platform-specific encryption.

**Parameters:**
- `options.token` (string): JWT token for API authentication

**Security Notes:**
- **Android**: Uses EncryptedSharedPreferences with AES-256 encryption
- **iOS**: Uses Keychain Services for secure storage
- **Web**: Uses localStorage (not recommended for production tokens)

#### `sendMood(options)`
Send a mood to the backend API with comprehensive error handling.

**Parameters:**
- `options.mood_name` (string): Name of the mood
- `options.mood_emoji` (string): Emoji representation of the mood

**Returns:** `Promise<void>`

**Error Handling:**
- Network timeouts and connection issues
- Authentication failures (401)
- Do Not Disturb mode (403)
- Rate limiting (429)
- Server errors (5xx)

#### `sendThoughtOfYou()`
Send a "Thought of you" message to the backend.

**Returns:** `Promise<void>`

**Error Handling:** Same as `sendMood()`

#### `setOpacity(options)`
Set the opacity of the floating button.

**Parameters:**
- `options.opacity` (number): Opacity value (0.0 to 1.0)

#### `updateMenu(options)`
Update the mood selection menu with new options.

**Parameters:**
- `options.moodOptions` (MoodOption[]): Array of mood options

### MoodOption Interface

```typescript
interface MoodOption {
  name: string;      // Mood name (e.g., "happy", "sad")
  emoji: string;     // Emoji representation (e.g., "😊", "😢")
  custom?: boolean;  // Whether this is a custom mood (optional)
}
```

## Gesture Interaction Details

### Touch/Mouse Events
- **Single Tap/Click**: Opens mood selector (threshold: 200ms)
- **Double Tap**: Sends "Thought of you" (threshold: 300ms between taps)
- **Drag**: Moves the button around the screen
- **Enhanced Haptic Feedback**: Provides meaningful tactile feedback for different actions

### Haptic Feedback Patterns
- **Success**: Two light vibrations (mood/thought sent successfully)
- **Error**: Three medium vibrations (network/auth errors)
- **Warning**: One heavy vibration (rate limiting, DND mode)
- **Light**: Single light tap (general interactions)

### App Shortcuts (Android)
Long-press the app icon to access the "Thought of you" shortcut.

## Backend API Integration

The plugin expects the following API endpoints with proper error responses:

### Send Mood
```
POST /api/v1/actions/send-mood
Authorization: Bearer <token>
Content-Type: application/json

{
  "mood_name": "happy",
  "mood_emoji": "😊"
}
```

**Expected Responses:**
- `200/201`: Success
- `401`: Unauthorized (invalid/expired token)
- `403`: Forbidden (partner in DND mode)
- `429`: Rate limited
- `5xx`: Server errors

### Send Thought
```
POST /api/v1/actions/send-thought
Authorization: Bearer <token>
```

**Expected Responses:** Same as Send Mood

## Security Considerations

### Token Storage
- **Android**: EncryptedSharedPreferences with AES-256-GCM encryption
- **iOS**: Keychain Services with biometric protection (if available)
- **Web**: localStorage (not secure for production - consider HTTP-only cookies)

### Network Security
- All API calls use HTTPS
- 30-second timeout for network requests
- Comprehensive error handling for network failures

### Fallback Protection
- If encryption fails on Android, falls back to regular SharedPreferences
- Graceful error handling for all security operations

## Error Handling & User Feedback

### Frontend Integration
When calling `sendMood` or `sendThoughtOfYou`, handle the responses appropriately:

```typescript
try {
  await AssistiveTouchPlugin.sendMood({
    mood_name: 'happy',
    mood_emoji: '😊'
  });
  // Show success toast: "Mood sent!"
} catch (error) {
  // Show error toast based on error message
  if (error.message.includes('Do Not Disturb')) {
    showToast('Partner is in Do Not Disturb mode. Try again later.');
  } else if (error.message.includes('Authentication failed')) {
    showToast('Please log in again.');
  } else {
    showToast('Failed to send mood. Please try again.');
  }
}
```

### Error Types
- **Network Errors**: Timeout, no connection, server unreachable
- **Authentication Errors**: Invalid/expired tokens
- **Permission Errors**: Do Not Disturb mode, rate limiting
- **Server Errors**: 5xx responses with user-friendly messages

## Configuration

### Default Mood Options
```typescript
const defaultMoods = [
  { name: 'happy', emoji: '😊', custom: false },
  { name: 'sad', emoji: '😢', custom: false },
  { name: 'excited', emoji: '🤩', custom: false },
  { name: 'love', emoji: '🥰', custom: false },
  { name: 'think', emoji: '🤔', custom: false },
  { name: 'laugh', emoji: '😂', custom: false }
];
```

### Custom Mood Options
```typescript
const customMoods = [
  { name: 'workout', emoji: '💪', custom: true },
  { name: 'coffee', emoji: '☕', custom: true },
  { name: 'music', emoji: '🎵', custom: true }
];

await AssistiveTouchPlugin.updateMenu({
  moodOptions: [...defaultMoods, ...customMoods]
});
```

## Production Deployment

### Security Checklist
- [ ] Use HTTPS for all API endpoints
- [ ] Implement proper JWT token expiration and refresh
- [ ] Set up rate limiting on backend
- [ ] Configure proper CORS headers
- [ ] Use environment-specific backend URLs

### Performance Considerations
- Network requests have 30-second timeouts
- Haptic feedback is optimized for battery life
- Floating button uses efficient rendering

### Testing
- Test on various Android API levels (21+)
- Test on iOS 12+ devices
- Verify secure storage on device restarts
- Test network error scenarios

## Troubleshooting

### Common Issues

**Android:**
- "Failed to create encrypted preferences": Device doesn't support encryption, falls back to regular storage
- "Overlay permission denied": User needs to manually enable in Settings > Apps > Your App > Display over other apps

**iOS:**
- "Keychain access denied": Check app entitlements and provisioning profile
- "Floating button not visible": Check if app has proper window access

**General:**
- "Network error": Check internet connection and backend availability
- "Authentication failed": Token may be expired, prompt user to re-login

### Debug Mode
Enable debug logging by setting the appropriate log level in your app configuration.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Development Setup
```bash
git clone <repository>
cd assistive-touch-plugin
npm install
npm run build
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the API documentation

---

**Note**: This plugin is designed for production use with enterprise-grade security features. Always test thoroughly in your specific environment before deployment.
