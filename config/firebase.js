import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBabPhKxQCS5t5UlhcaRtMjHPE4BhdjlWQ',
  authDomain: 'eugeneonmusic.firebaseapp.com',
  projectId: 'eugeneonmusic',
  storageBucket: 'eugeneonmusic.firebasestorage.app',
  messagingSenderId: '1065464707619',
  appId: '1:1065464707619:web:aab804e35075963c114f96',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
