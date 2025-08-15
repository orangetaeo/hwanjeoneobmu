import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase는 실시간 환율 전용으로 제한 사용
// 보안상 환경변수 사용 권장 (현재는 개발용 하드코딩)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDo3werljLZm8-QT2Dl18ZerJJTblxwif0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "money-bd714.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "money-bd714",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "money-bd714.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "493286374794",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:493286374794:web:44c5b035a8de67752c5c73"
};

// Firebase 초기화 (실시간 환율용)
let app: any = null;
let auth: any = null;
let db: any = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.warn('Firebase 초기화 실패 - 실시간 환율 기능이 제한됩니다:', error);
}

export { auth, db };
export default app;
