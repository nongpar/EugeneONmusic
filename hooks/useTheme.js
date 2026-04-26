/**
 * 테마 컨텍스트 — 다크/라이트/시스템 따라가기
 *
 * 사용:
 *   const { colors, mode, setMode } = useTheme();
 *   <View style={{ backgroundColor: colors.bg }}>
 *
 * 동작:
 *  - mode: 'dark' | 'light' | 'system'
 *  - 'system'이면 OS의 Appearance.getColorScheme()을 따라가고, OS 변경 시 자동 갱신
 *  - 사용자 선택은 AsyncStorage에 저장되어 앱 재시작 후에도 유지
 *  - 첫 로드(저장값 읽기 전)에는 다크로 시작 — 깜빡임 방지
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { palettes, THEME_STORAGE_KEY } from '../constants/theme';

const ThemeContext = createContext({
  mode: 'dark',
  resolvedScheme: 'dark',
  colors: palettes.dark,
  setMode: () => {},
});

function resolveScheme(mode, systemScheme) {
  if (mode === 'system') return systemScheme === 'light' ? 'light' : 'dark';
  return mode === 'light' ? 'light' : 'dark';
}

export function ThemeProvider({ children }) {
  // 사용자 명시 선택 ('dark' | 'light' | 'system'). 저장된 값 로드 전엔 기본 'dark'
  const [mode, setModeState] = useState('dark');
  // OS 시스템 색상 — Appearance가 환경에 따라 null일 수 있어 안전하게 fallback
  const [systemScheme, setSystemScheme] = useState(() => {
    try { return Appearance.getColorScheme() || 'dark'; } catch { return 'dark'; }
  });

  // 저장된 모드 로드 (한 번)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (cancelled) return;
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // OS 색상 변경 구독 (system 모드일 때만 실제 영향)
  useEffect(() => {
    let sub;
    try {
      sub = Appearance.addChangeListener(({ colorScheme }) => {
        setSystemScheme(colorScheme === 'light' ? 'light' : 'dark');
      });
    } catch {}
    return () => { try { sub?.remove?.(); } catch {} };
  }, []);

  const setMode = (next) => {
    if (next !== 'dark' && next !== 'light' && next !== 'system') return;
    setModeState(next);
    AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});
  };

  const resolvedScheme = resolveScheme(mode, systemScheme);
  const colors = palettes[resolvedScheme];

  const value = useMemo(
    () => ({ mode, resolvedScheme, colors, setMode }),
    [mode, resolvedScheme, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * 테마 토큰을 받아 동적 스타일을 생성하는 헬퍼.
 * StyleSheet.create와 달리 매 렌더 객체가 새로 만들어지지만,
 * useMemo와 함께 쓰면 의존성 배열로 재생성을 제어할 수 있다.
 *
 * 예:
 *   const styles = useThemedStyles((c) => ({
 *     container: { backgroundColor: c.bg },
 *     text: { color: c.text },
 *   }));
 */
export function useThemedStyles(factory) {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
