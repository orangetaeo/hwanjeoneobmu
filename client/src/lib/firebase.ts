import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDo3werljLZm8-QT2Dl18ZerJJTblxwif0",
  authDomain: "money-bd714.firebaseapp.com",
  projectId: "money-bd714",
  storageBucket: "money-bd714.firebasestorage.app",
  messagingSenderId: "493286374794",
  appId: "1:493286374794:web:44c5b035a8de67752c5c73"
};

// Initialize Firebase only if no apps exist
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
