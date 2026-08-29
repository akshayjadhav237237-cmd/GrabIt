/**
 * Grabit Push Notifications Service
 * Integrates with Expo Notifications with safe handling for web, emulators,
 * and devices without Google Play Services.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';
import theme from '../theme';

/**
 * Configure default foreground notification behavior
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Registers device for push notifications via expo-notifications
 * and synchronizes the push token with the backend.
 * Handles emulators, simulators, and web environments safely without throwing.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  try {
    if (Platform.OS === 'web') {
      console.log('[Notifications] Push notifications are not supported on web.');
      return null;
    }

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: theme.colors.primary,
      });
    }

    // Check existing notification permissions
    const existingPerm = (await Notifications.getPermissionsAsync()) as any;
    let finalStatus = existingPerm?.status;

    if (finalStatus !== 'granted') {
      const requestPerm = (await Notifications.requestPermissionsAsync()) as any;
      finalStatus = requestPerm?.status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission not granted for push notifications.');
      return null;
    }

    // Retrieve Expo push token safely
    try {
      const pushTokenData = await Notifications.getExpoPushTokenAsync();
      token = pushTokenData?.data || null;
    } catch (tokenErr: any) {
      console.log(
        '[Notifications] Note: Could not retrieve push token (expected on simulator/emulator):',
        tokenErr?.message
      );
    }

    // Synchronize push token with Grabit backend if token was obtained
    if (token) {
      try {
        await api.updatePushToken(token);
        console.log('[Notifications] Push token registered with backend:', token);
      } catch (apiErr: any) {
        console.log('[Notifications] Could not update push token on backend:', apiErr?.message);
      }
    }
  } catch (err: any) {
    console.log('[Notifications] Registration encountered note:', err?.message);
  }

  return token;
}

export default {
  registerForPushNotificationsAsync,
};
