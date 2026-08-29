const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

let isMockMode = false;
let auth = null;
let admin = {
  auth: () => auth,
};

const hasValidCredentials = Boolean(
  projectId &&
  clientEmail &&
  privateKey &&
  projectId !== 'your-firebase-project-id' &&
  !projectId.includes('placeholder')
);

if (hasValidCredentials) {
  try {
    const firebaseAdmin = require('firebase-admin');
    const { getAuth } = require('firebase-admin/auth');
    admin = firebaseAdmin;

    if (!admin.credential && admin.cert) {
      admin.credential = { cert: admin.cert };
    }

    privateKey = privateKey.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
    const apps = admin.getApps ? admin.getApps() : (admin.apps || []);
    let app;
    if (!apps.length) {
      const credential = admin.credential
        ? admin.credential.cert({ projectId, clientEmail, privateKey })
        : admin.cert({ projectId, clientEmail, privateKey });

      app = admin.initializeApp({ credential });
    } else {
      app = apps[0];
    }
    auth = getAuth(app);
    admin.auth = () => auth;
    isMockMode = false;
  } catch (error) {
    console.warn('[Firebase Admin] Failed to initialize Firebase Admin SDK:', error.message);
    console.warn('[Firebase Admin] Running in mock/development mode - real Firebase credentials not configured.');
    isMockMode = true;
  }
} else {
  console.warn('[Firebase Admin] Running in mock/development mode - real Firebase credentials not configured.');
  isMockMode = true;
}

if (isMockMode) {
  const mockAuth = {
    verifyIdToken: async (token) => {
      // Decode mock tokens
      if (token.startsWith('mock-token-') || token === 'test-token') {
        const uid = token.replace('mock-token-', '');
        return {
          uid: uid || 'test-user-uid',
          email: `${uid || 'test'}@grabit.com`,
          name: 'Demo User',
        };
      }
      throw new Error('Firebase Admin is running in mock mode. Real tokens cannot be verified.');
    },
  };
  auth = mockAuth;
  admin.auth = () => mockAuth;
}

module.exports = {
  admin,
  auth,
  isMockMode,
};
