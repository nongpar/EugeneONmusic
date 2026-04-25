import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// ── 방어적 초기화 ──
// EAS Build에서 .env가 업로드되지 않거나(.gitignore 제외) 환경변수 누락으로
// firebaseConfig가 undefined 값이면 initializeApp/getAuth가 throw 가능.
// 이 파일이 app/_layout.js 최상단에서 import되므로 throw 시 런치 직후 JS fatal →
// RCTExceptionsManager reportFatal → SIGABRT로 앱 전체가 강제 종료됨.
// try-catch로 감싸서 Firebase 관련 기능만 비활성되고 앱은 정상 뜨도록 함.
let app = null;
let auth = null;
let db = null;
let storage = null;
let functions = null;

try {
  if (!firebaseConfig.apiKey) {
    console.warn('[firebase] EXPO_PUBLIC_FIREBASE_* 환경변수 누락 — Firebase 기능 비활성 상태로 앱 시작');
  } else {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    // Cloud Functions 리전은 Seoul(asia-northeast3) — 백엔드 배포 위치와 일치 필수
    functions = getFunctions(app, 'asia-northeast3');
  }
} catch (err) {
  console.warn('[firebase] initialize failed:', err?.message || err);
  // 모든 export는 null로 유지 — downstream에서 null 체크 혹은 자체 try/catch로 가드
}

export { auth, db, storage, functions };
export default app;
