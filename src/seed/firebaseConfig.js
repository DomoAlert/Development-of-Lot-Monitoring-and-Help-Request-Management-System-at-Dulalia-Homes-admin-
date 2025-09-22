import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";


// src/seed/firebaseConfig.js
export const firebaseConfig = {
  apiKey: 'AIzaSyDbkipGwNvBRB9lFZZwV0ef1RHNXtZp86c',
  authDomain: 'dulalia-fb.firebaseapp.com',
  projectId: 'dulalia-fb',
  storageBucket: 'dulalia-fb.firebasestorage.app',
  messagingSenderId: '317007260701',
  appId: '1:317007260701:web:acbe6f3bfb1e10f4ed2af4',
};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);