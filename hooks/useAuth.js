import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WP_BASE = 'https://www.eon-music.com/wp-json';
const AUTH_STORAGE_KEY = '@eon_auth';
const CRED_STORAGE_KEY = '@eon_cred';

const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
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

    // WebView 자동 로그인용 자격증명 저장
    await AsyncStorage.setItem(
      CRED_STORAGE_KEY,
      JSON.stringify({ username, password })
    );

    return wpUser;
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    await AsyncStorage.removeItem(CRED_STORAGE_KEY);
  }, []);

  const getToken = useCallback(() => token, [token]);

  const getCredentials = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(CRED_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getToken, getCredentials }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
