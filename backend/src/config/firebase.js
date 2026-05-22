const admin = require('firebase-admin');
const path = require('path');

let db = null;
let auth = null;

const initializeFirebase = () => {
  try {
    // Use service account key from environment
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    let serviceAccount;
    if (serviceAccountPath) {
      serviceAccount = require(path.resolve(serviceAccountPath));
    } else {
      // Fallback to environment variables
      serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs'
      };
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });
    
    db = admin.firestore();
    auth = admin.auth();
    
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    process.exit(1);
  }
};

const getFirestore = () => db;
const getAuth = () => auth;

module.exports = {
  initializeFirebase,
  getFirestore,
  getAuth,
  admin
};
