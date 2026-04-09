import { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Platform, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';

// 웹에서는 iframe, 네이티브에서는 WebView 사용
let WebView = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').default;
}

const WP_HOME = 'https://www.eon-music.com';

// ── SVG 아이콘 ──
function BackIcon({ size = 22, color = '#ffffff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ExternalIcon({ size = 18, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function RefreshIcon({ size = 18, color = '#8a9bae' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M1 4v6h6M23 20v-6h-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * JWT 토큰을 이용해 WordPress 자동 로그인 URL 생성
 * eon-music.com/?eon_autologin=TOKEN&redirect=TARGET_URL
 * → WordPress가 쿠키 설정 후 TARGET_URL로 리다이렉트
 */
function buildAutoLoginUrl(token, targetUrl) {
  if (!token) return targetUrl;
  // www 불일치 방지: eon-music.com → www.eon-music.com 으로 통일
  const normalizedUrl = targetUrl.replace('https://eon-music.com', 'https://www.eon-music.com');
  return `${WP_HOME}/?eon_autologin=${encodeURIComponent(token)}&redirect=${encodeURIComponent(normalizedUrl)}`;
}

export default function CourseDetailScreen() {
  const { id, title, url } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, getToken, getCredentials } = useAuth();
  const webViewRef = useRef(null);
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [webViewSource, setWebViewSource] = useState(null);

  const rawUrl = url || 'https://www.eon-music.com';
  const courseTitle = title || '강좌';
  // www 통일
  const coursePageUrl = rawUrl.replace('https://eon-music.com', 'https://www.eon-music.com');

  // 네이티브: 2단계 로그인 → 강좌 페이지
  const [phase, setPhase] = useState('login');
  const [loginCred, setLoginCred] = useState(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setWebViewSource(null);
      return;
    }
    (async () => {
      const cred = user ? await getCredentials() : null;
      if (cred) {
        setLoginCred(cred);
        setPhase('login');
        setWebViewSource({ uri: 'https://www.eon-music.com/wp-login.php' });
      } else {
        setPhase('course');
        setWebViewSource({ uri: coursePageUrl });
      }
    })();
  }, [user, rawUrl]);

  const handleOpenExternal = () => {
    Linking.openURL(rawUrl);
  };

  const handleRefresh = () => {
    if (Platform.OS === 'web') {
      setLoading(true);
      if (iframeRef.current) {
        iframeRef.current.src = iframeRef.current.src;
      }
    } else if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const handleBack = () => {
    if (canGoBack && webViewRef.current && Platform.OS !== 'web') {
      webViewRef.current.goBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/course');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={handleBack}>
          <BackIcon />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{courseTitle}</Text>
          <Text style={styles.headerSub}>eon-music.com</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn} onPress={handleRefresh}>
            <RefreshIcon />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={handleOpenExternal}>
            <ExternalIcon />
          </TouchableOpacity>
        </View>
      </View>

      {/* 로딩 표시 */}
      {loading && (
        <View style={styles.loadingBar}>
          <View style={styles.loadingProgress} />
        </View>
      )}

      {/* WebView / iframe */}
      <View style={styles.webviewWrap}>
        {Platform.OS === 'web' ? (
          // 웹 플랫폼: iframe으로 강좌 페이지 표시
          <View style={{ flex: 1 }}>
            <iframe
              ref={iframeRef}
              src={coursePageUrl}
              style={{
                flex: 1,
                width: '100%',
                height: '100%',
                border: 'none',
                backgroundColor: '#0f1923',
              }}
              title={courseTitle}
              onLoad={() => setLoading(false)}
            />
          </View>
        ) : (
          // 네이티브: Phase 1(로그인) → Phase 2(강좌 페이지)
          WebView && webViewSource && (
            <WebView
              ref={webViewRef}
              source={webViewSource}
              style={styles.webview}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onNavigationStateChange={(navState) => {
                setCanGoBack(navState.canGoBack);
                // Phase 1: 로그인 완료 감지 (wp-login.php에서 벗어남)
                if (phase === 'login' && loginCred && !navState.url.includes('wp-login.php')) {
                  setPhase('course');
                  setWebViewSource({ uri: coursePageUrl });
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
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              renderLoading={() => (
                <View style={styles.webviewLoading}>
                  <ActivityIndicator size="large" color="#C9A96E" />
                  <Text style={styles.webviewLoadingText}>로그인 연동 중...</Text>
                </View>
              )}
            />
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1923' },

  /* 헤더 */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1a2530',
    gap: 8,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#ffffff', letterSpacing: -0.3 },
  headerSub: { fontSize: 10, color: '#5a6a7a', marginTop: 1 },
  headerRight: { flexDirection: 'row', gap: 4 },

  /* 로딩 바 */
  loadingBar: {
    height: 2, backgroundColor: '#1a2530',
  },
  loadingProgress: {
    height: 2, width: '60%',
    backgroundColor: '#C9A96E',
  },

  /* WebView */
  webviewWrap: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#0f1923' },
  webviewLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0f1923', gap: 12,
  },
  webviewLoadingText: { fontSize: 14, color: '#5a6a7a' },

});
