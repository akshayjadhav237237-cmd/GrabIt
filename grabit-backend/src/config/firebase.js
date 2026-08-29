const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

let isMockMode = false;
let auth = null;

// Ensure admin.credential compatibility across firebase-admin versions
if (!admin.credential && admin.cert) {
  admin.credential = { cert: admin.cert };
}

const hasValidCredentials = Boolean(
  projectId &&
  clientEmail &&
  privateKey &&
  projectId !== 'your-firebase-project-id' &&
  !projectId.includes('placeholder')
);

if (hasValidCredentials) {
  try {
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
    verifyIdToken: async () => {
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
