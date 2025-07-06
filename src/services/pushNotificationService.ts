import { PushNotifications } from '@capacitor/push-notifications';
import { api } from './api'; // Assuming you have an api service to make backend calls

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

    PushNotifications.addListener('registration', (token: { value: string }) => {
      console.log('Push registration success, token: ', token.value);
      // Send device token to backend to store against user profile
      api.post('/api/v1/users/device-token', { token: token.value }).catch((error: any) => {
        console.error('Failed to send device token to backend', error);
      });
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
