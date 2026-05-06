// firebase-config.js — Firebase initialisation for server-side / bundled use.
// Credentials are read from environment variables (set in .env locally,
// and in the Netlify dashboard for production). Never hardcode credentials here.

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            process.env.FIREBASE_API_KEY,
  authDomain:        process.env.FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.FIREBASE_PROJECT_ID,
  storageBucket:     process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export { app, initializeApp, getAuth, getFirestore }
