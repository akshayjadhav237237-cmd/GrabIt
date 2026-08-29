const https = require('https');

/**
 * Validates if string matches Expo push token format.
 */
const isExpoPushToken = (token) => {
  return (
    typeof token === 'string' &&
    (token.startsWith('ExponentPushToken[') ||
      token.startsWith('ExpoPushToken[') ||
      /^[a-zA-Z0-9_-]{22}$/.test(token))
  );
};

/**
 * Send an Expo push notification via direct HTTPS POST to Expo Push API.
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

    if (!isExpoPushToken(pushToken) && !isMockToken) {
      console.warn(`[Notification Service] Invalid Expo push token: ${pushToken}`);
      return false;
    }

    // In pure mock/test environment without outbound network, return success
    if (isMockToken && !isExpoPushToken(pushToken)) {
      return true;
    }

    const payload = JSON.stringify({
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
    });

    return new Promise((resolve) => {
      const req = https.request(
        'https://exp.host/--/api/v2/push/send',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          let resData = '';
          res.on('data', (chunk) => (resData += chunk));
          res.on('end', () => {
            resolve(res.statusCode >= 200 && res.statusCode < 300);
          });
        }
      );

      req.on('error', (err) => {
        console.warn('[Notification Service] Push notice:', err.message);
        resolve(false);
      });

      req.write(payload);
      req.end();
    });
  } catch (error) {
    console.warn('[Notification Service] Failed to send push notification:', error.message);
    return false;
  }
};

module.exports = {
  sendPushNotification,
  isExpoPushToken,
};
