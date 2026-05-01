import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Platform as RNPlatform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, deleteDoc } from 'firebase/firestore';
import { signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { db, auth, functions } from '../config/firebase';

// 네이티브에서만 SecureStore 사용 (웹에서는 AsyncStorage 폴백)
let SecureStore = null;
if (RNPlatform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

const WP_BASE = 'https://www.eon-music.com/wp-json';
const AUTH_STORAGE_KEY = '@eon_auth';
const CRED_STORAGE_KEY = 'eon_cred';

// SecureStore 키 안전 변환 (허용: 영숫자, '.', '-', '_')
const safeKey = (key) => key.replace(/[^a-zA-Z0-9._-]/g, '_');

// 보안 저장소 헬퍼 (네이티브: SecureStore, 웹: AsyncStorage)
const secureStorage = {
  async setItem(key, value) {
    if (SecureStore) {
      try {
        await SecureStore.setItemAsync(safeKey(key), value);
      } catch (e) {
        console.warn('SecureStore setItem fallback:', e);
        await AsyncStorage.setItem(key, value);
      }
    } else {
      await AsyncStorage.setItem(key, value);
    }
  },
  async getItem(key) {
    if (SecureStore) {
      try {
        let value = await SecureStore.getItemAsync(safeKey(key));
        // SecureStore에 없으면 AsyncStorage에서 마이그레이션 시도
        if (!value) {
          const legacyValue = await AsyncStorage.getItem(key).catch(() => null)
            || await AsyncStorage.getItem('@' + key.replace(/^@/, '')).catch(() => null);
          if (legacyValue) {
            try { await SecureStore.setItemAsync(safeKey(key), legacyValue); } catch {}
            try { await AsyncStorage.removeItem(key); } catch {}
            try { await AsyncStorage.removeItem('@' + key.replace(/^@/, '')); } catch {}
            value = legacyValue;
          }
        }
        return value;
      } catch (e) {
        console.warn('SecureStore getItem fallback:', e);
        return await AsyncStorage.getItem(key).catch(() => null);
      }
    }
    return await AsyncStorage.getItem(key);
  },
  async removeItem(key) {
    if (SecureStore) {
      try { await SecureStore.deleteItemAsync(safeKey(key)); } catch {}
    }
    try { await AsyncStorage.removeItem(key); } catch {}
    try { await AsyncStorage.removeItem('@' + key.replace(/^@/, '')); } catch {}
  },
};

const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  loginWithToken: async () => {},
  logout: async () => {},
  getToken: () => null,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // 앱 시작 시 저장된 인증 정보 복원
  useEffect(() => {
    restoreAuth();
  }, []);

  const restoreAuth = async () => {
    try {
      const saved = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const { token: savedToken, user: savedUser } = JSON.parse(saved);
        // 토큰 유효성 검증
        const isValid = await validateToken(savedToken);
        if (isValid) {
          setToken(savedToken);
          setUser(savedUser);
          // Firebase Auth 세션 복원 (AI 기능용)
          try {
            const exchange = httpsCallable(functions, 'exchangeWpToken');
            const result = await exchange({ wpToken: savedToken });
            if (result.data?.customToken) {
              await signInWithCustomToken(auth, result.data.customToken);
            }
          } catch (fbErr) {
            console.warn('Firebase Auth 복원 실패 (WP 세션은 정상):', fbErr?.message || fbErr);
          }
        } else {
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
    } catch (err) {
      console.warn('Auth restore failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateToken = async (tokenToValidate) => {
    try {
      const res = await fetch(`${WP_BASE}/jwt-auth/v1/token/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenToValidate}`,
          'Content-Type': 'application/json',
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const login = useCallback(async (username, password) => {
    const res = await fetch(`${WP_BASE}/jwt-auth/v1/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMsg = data?.message || '로그인에 실패했습니다.';
      // HTML 태그 제거
      const cleanMsg = errorMsg.replace(/<[^>]*>/g, '');
      throw new Error(cleanMsg);
    }

    const newToken = data.token;
    const wpUser = {
      uid: String(data.user_id || data.id || ''),
      email: data.user_email || username,
      displayName: data.user_display_name || data.user_nicename || username,
      nickname: data.user_nicename || '',
      role: 'student', // 기본값
    };

    // /wp/v2/users/me 로 유저 상세 정보 + 역할 가져오기
    try {
      const meRes = await fetch(`${WP_BASE}/wp/v2/users/me?context=edit`, {
        headers: { 'Authorization': `Bearer ${newToken}` },
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        wpUser.uid = String(meData.id);
        wpUser.displayName = meData.name || wpUser.displayName;
        // WordPress 역할 → 앱 역할 매핑
        const wpRoles = meData.roles || [];
        if (wpRoles.includes('administrator') || wpRoles.includes('editor') || wpRoles.includes('group_leader')) {
          wpUser.role = 'teacher';
        } else {
          wpUser.role = 'student';
        }
      }
    } catch {}

    setToken(newToken);
    setUser(wpUser);

    // 로컬 저장
    await AsyncStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: newToken, user: wpUser })
    );

    // Firebase Auth 세션도 연결 (AI 기능용 — WP JWT → Firebase Custom Token 교환)
    // 실패해도 WP 로그인은 성공 처리 (AI 기능만 일시적으로 비활성)
    try {
      const exchange = httpsCallable(functions, 'exchangeWpToken');
      const result = await exchange({ wpToken: newToken });
      if (result.data?.customToken) {
        await signInWithCustomToken(auth, result.data.customToken);
      }
    } catch (fbErr) {
      console.warn('Firebase Auth 연동 실패 (WP 로그인은 정상):', fbErr?.message || fbErr);
    }

    // WebView 자동 로그인용 자격증명 보안 저장 (실패해도 로그인은 유지)
    try {
      await secureStorage.setItem(
        CRED_STORAGE_KEY,
        JSON.stringify({ username, password })
      );
    } catch (credErr) {
      console.warn('자격증명 보안 저장 실패 (로그인은 정상):', credErr);
    }

    return wpUser;
  }, []);

  // 회원가입 WebView에서 발급받은 WP JWT 토큰으로 세션을 시작한다 (비밀번호 없이).
  // login()과 동일한 사후 처리: /users/me로 사용자 상세 가져오기 → 저장 → Firebase 교환.
  const loginWithToken = useCallback(async (newToken) => {
    if (!newToken) throw new Error('토큰이 없습니다.');

    const isValid = await validateToken(newToken);
    if (!isValid) throw new Error('유효하지 않은 토큰입니다.');

    const wpUser = {
      uid: '',
      email: '',
      displayName: '',
      nickname: '',
      role: 'student',
    };

    const meRes = await fetch(`${WP_BASE}/wp/v2/users/me?context=edit`, {
      headers: { 'Authorization': `Bearer ${newToken}` },
    });
    if (!meRes.ok) {
      throw new Error('사용자 정보를 불러오지 못했습니다.');
    }
    const meData = await meRes.json();
    wpUser.uid = String(meData.id);
    wpUser.email = meData.email || '';
    wpUser.displayName = meData.name || meData.slug || '';
    wpUser.nickname = meData.slug || '';
    const wpRoles = meData.roles || [];
    if (wpRoles.includes('administrator') || wpRoles.includes('editor') || wpRoles.includes('group_leader')) {
      wpUser.role = 'teacher';
    }

    setToken(newToken);
    setUser(wpUser);

    await AsyncStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: newToken, user: wpUser })
    );

    // Firebase Auth 세션 (AI 기능용) — 실패해도 WP 세션은 유지
    try {
      const exchange = httpsCallable(functions, 'exchangeWpToken');
      const result = await exchange({ wpToken: newToken });
      if (result.data?.customToken) {
        await signInWithCustomToken(auth, result.data.customToken);
      }
    } catch (fbErr) {
      console.warn('Firebase Auth 연동 실패 (WP 로그인은 정상):', fbErr?.message || fbErr);
    }

    // 가입 경로에는 평문 비밀번호가 없어서 자격증명은 저장하지 않음.
    // 다음 정식 로그인 시점에 secureStorage가 채워진다.

    return wpUser;
  }, []);

  const logout = useCallback(async () => {
    // 현재 사용자의 푸시 토큰을 Firestore에서 삭제 (이 기기로 더 이상 푸시 오지 않도록)
    // 같은 기기에서 다른 계정으로 로그인할 때 푸시가 이전 계정으로 가는 문제 방지
    try {
      const currentUid = user?.uid;
      if (currentUid) {
        await deleteDoc(doc(db, 'pushTokens', currentUid)).catch(() => {});
      }
    } catch {}

    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    await secureStorage.removeItem(CRED_STORAGE_KEY);
    // Firebase Auth 세션도 해제 (실패해도 WP 로그아웃은 진행)
    try { await firebaseSignOut(auth); } catch {}
  }, [user]);

  const getToken = useCallback(() => token, [token]);

  const getCredentials = useCallback(async () => {
    try {
      const saved = await secureStorage.getItem(CRED_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithToken, logout, getToken, getCredentials }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
