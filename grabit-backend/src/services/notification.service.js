const { Expo } = require('expo-server-sdk');

const expo = new Expo();

/**
 * Send an Expo push notification.
 *
 * @param {string} pushToken - Expo push token (ExponentPushToken[...])
 * @param {object} notification
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {object} [notification.data] - Additional data payload
 * @returns {Promise<boolean>} Success indicator
 */
const sendPushNotification = async (pushToken, { title, body, data = {} }) => {
  try {
    if (!pushToken || typeof pushToken !== 'string') {
      return false;
    }

    // In test / development mock mode, permit mock tokens
    const isMockToken =
      pushToken.startsWith('mock-') ||
      pushToken.startsWith('test-') ||
      process.env.NODE_ENV === 'test';

    if (!Expo.isExpoPushToken(pushToken) && !isMockToken) {
      console.warn(`[Notification Service] Invalid Expo push token: ${pushToken}`);
      return false;
    }

    // In pure mock/test environment without outbound network, skip real API call
    if (isMockToken && !Expo.isExpoPushToken(pushToken)) {
      return true;
    }

    const messages = [
      {
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
      },
    ];

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }

    return true;
  } catch (error) {
    console.warn('[Notification Service] Failed to send push notification:', error.message);
    return false;
  }
};

module.exports = {
  sendPushNotification,
  expo,
};
