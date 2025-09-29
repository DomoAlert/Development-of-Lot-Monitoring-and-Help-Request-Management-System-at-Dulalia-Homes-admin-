// src/services/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDbkipGwNvBRB9lFZZwV0ef1RHNXtZp86c',
  authDomain: 'dulalia-fb.firebaseapp.com',
  projectId: 'dulalia-fb',
  storageBucket: 'dulalia-fb.appspot.com',
  messagingSenderId: '317007260701',
  appId: '1:317007260701:web:acbe6f3bfb1e10f4ed2af4',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
