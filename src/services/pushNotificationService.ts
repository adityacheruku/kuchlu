import { PushNotifications } from '@capacitor/push-notifications';
import { api, API_BASE_URL, getApiHeaders } from './api';

export async function registerForPushNotifications(): Promise<void> {
  try {
    const permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive !== 'granted') {
      const requestStatus = await PushNotifications.requestPermissions();
      if (requestStatus.receive !== 'granted') {
        console.warn('Push notification permission not granted');
        return;
      }
    }

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token: { value: string }) => {
      console.log('Push registration success, token: ', token.value);
      // Send FCM token to backend (as plain text)
      try {
        const response = await fetch(
          API_BASE_URL + 'users/me/fcm-token',
          {
            method: 'POST',
            headers: getApiHeaders({ contentType: 'text/plain' }),
            body: token.value,
          }
        );
        if (!response.ok) {
          throw new Error(await response.text());
        }
        console.log('FCM token sent to backend successfully');
      } catch (error) {
        console.error('Failed to send FCM token to backend', error);
      }
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push registration error: ', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
      console.log('Push received: ', notification);
      // Handle incoming notification, e.g., show alert or update UI
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
      console.log('Push action performed: ', notification);
      // Handle notification tap action
    });
  } catch (error) {
    console.error('Error setting up push notifications: ', error);
  }
}
