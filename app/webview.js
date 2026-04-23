import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../hooks/useAuth';

function BackIcon({ size = 22, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function WebViewScreen() {
  const insets = useSafeAreaInsets();
  const { url, title, autoLogin } = useLocalSearchParams();
  const { user, getCredentials } = useAuth();

  const shouldAutoLogin = autoLogin === 'true' || autoLogin === '1';
  const webViewRef = useRef(null);
  const [loginCred, setLoginCred] = useState(null);
  const [phase, setPhase] = useState('init'); // init | login | target
  const [webViewSource, setWebViewSource] = useState(null);
  const [reachedTarget, setReachedTarget] = useState(false);

  // 자동 로그인 플로우 준비
  useEffect(() => {
    if (Platform.OS === 'web' || !url) return;
    if (!shouldAutoLogin) {
      setPhase('target');
      setWebViewSource({ uri: url });
      setReachedTarget(true);
      return;
    }
    (async () => {
      const cred = user ? await getCredentials() : null;
      if (cred) {
        setLoginCred(cred);
        setPhase('login');
        setWebViewSource({ uri: 'https://www.eon-music.com/wp-login.php' });
      } else {
        // 자격증명 없음 → 바로 목표 URL (기존 WP 세션에 의존)
        setPhase('target');
        setWebViewSource({ uri: url });
        setReachedTarget(true);
      }
    })();
  }, [url, shouldAutoLogin, user]);

  const showLoginOverlay = shouldAutoLogin && Platform.OS !== 'web' && !reachedTarget;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title || ''}</Text>
        <View style={{ width: 22 }} />
      </View>

      {Platform.OS === 'web' ? (
        <View style={styles.webFallback}>
          <Text style={styles.webFallbackText}>
            웹에서는 직접 해당 페이지를 방문해주세요.
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {showLoginOverlay && (
            <View style={styles.loginOverlay}>
              <ActivityIndicator size="large" color="#C9A96E" />
              <Text style={styles.loginOverlayTitle}>연결 중...</Text>
              <Text style={styles.loginOverlayDesc}>자동 로그인 후 페이지로 이동합니다</Text>
            </View>
          )}
          {webViewSource && (
            <WebView
              ref={webViewRef}
              source={webViewSource}
              style={styles.webview}
              startInLoadingState={true}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              sharedCookiesEnabled={true}
              thirdPartyCookiesEnabled={true}
              onNavigationStateChange={(navState) => {
                // Phase 1: 로그인 완료 감지 → 목표 URL로 이동
                if (phase === 'login' && loginCred && !navState.url.includes('wp-login.php')) {
                  setPhase('target');
                  setWebViewSource({ uri: url });
                }
                // 목표 URL 도달 감지
                if (!reachedTarget && phase === 'target' && navState.url && !navState.url.includes('wp-login.php')) {
                  setReachedTarget(true);
                }
              }}
              injectedJavaScriptBeforeContentLoaded={
                phase === 'login' && loginCred ? `
                  (function() {
                    if (window.location.href.includes('wp-login.php')) {
                      document.addEventListener('DOMContentLoaded', function() {
                        var u = document.getElementById('user_login');
                        var p = document.getElementById('user_pass');
                        var f = document.getElementById('loginform');
                        if (u && p && f) {
                          u.value = ${JSON.stringify(loginCred?.username || '')};
                          p.value = ${JSON.stringify(loginCred?.password || '')};
                          f.submit();
                        }
                      });
                    }
                    true;
                  })();
                ` : 'true;'
              }
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#110E0B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(201,169,110,0.18)',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#F5F0E8',
    letterSpacing: 0.3,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  webview: {
    flex: 1,
    backgroundColor: '#110E0B',
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  webFallbackText: {
    color: '#9e9282',
    fontSize: 15,
  },
  loginOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#110E0B',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    zIndex: 10,
  },
  loginOverlayTitle: {
    fontSize: 15,
    color: '#F5F0E8',
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  loginOverlayDesc: {
    fontSize: 13,
    color: '#9e9282',
    letterSpacing: 0.3,
  },
});
