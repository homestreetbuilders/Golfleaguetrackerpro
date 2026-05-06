import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCC2RYPLKeUHy05o99sJDVmIvfQWul3-Vc",
  authDomain: "fairway-command.firebaseapp.com",
  projectId: "fairway-command",
  storageBucket: "fairway-command.firebasestorage.app",
  messagingSenderId: "469465900105",
  appId: "1:469465900105:web:dfa977a3dc936dd3f1cb98"
}

const app = initializeApp(firebaseConfig)

export { app, initializeApp, getAuth, getFirestore }
