import { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';

let ScreenOrientation = null;
if (Platform.OS !== 'web') {
  try { ScreenOrientation = require('expo-screen-orientation'); } catch {}
}

// 웹에서는 iframe, 네이티브에서는 WebView 사용
let WebView = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').default;
}

// ── SVG 아이콘 ──
function BackIcon({ size = 22, color = '#F5F0E8' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CloseIcon({ size = 22, color = '#F5F0E8' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function RefreshIcon({ size = 18, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M1 4v6h6M23 20v-6h-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function CourseDetailScreen() {
  const { id, title, url } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, getCredentials } = useAuth();
  const webViewRef = useRef(null);
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [webViewSource, setWebViewSource] = useState(null);

  // 이 화면에서만 가로 회전 허용
  useEffect(() => {
    if (ScreenOrientation) {
      ScreenOrientation.unlockAsync();
    }
    return () => {
      if (ScreenOrientation) {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      }
    };
  }, []);

  const rawUrl = url || 'https://www.eon-music.com';
  const courseTitle = title || '강좌';
  // www 통일
  const coursePageUrl = rawUrl.replace('https://eon-music.com', 'https://www.eon-music.com');

  // 네이티브: 2단계 로그인 → 강좌 페이지
  const [phase, setPhase] = useState('login');
  const [loginCred, setLoginCred] = useState(null);
  const [hasReachedCourse, setHasReachedCourse] = useState(false);
  const [loginTimedOut, setLoginTimedOut] = useState(false);

  // 오버레이 안전장치: 15초 후 자동 해제 (무한 로딩 방지)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (hasReachedCourse) return;
    const timer = setTimeout(() => setLoginTimedOut(true), 15000);
    return () => clearTimeout(timer);
  }, [hasReachedCourse]);

  // 강좌 페이지 도달 여부 판단 (WP 로그인 페이지 아닌 실제 강좌 URL)
  const isCoursePage = (url) => {
    if (!url) return false;
    if (url.includes('wp-login.php')) return false;
    if (url.includes('wp-admin')) return false;
    if (url.includes('lostpassword')) return false;
    return (
      url.includes('/product/') ||
      url.includes('/courses/') ||
      url.includes('/course/') ||
      url.includes('/lessons/') ||
      url.includes('/topic/') ||
      url.includes('/quizzes/') ||
      url.includes('%ec%88%98%ea%b0%95%ec%8b%a0%ec%b2%ad') || // 수강신청
      url.includes('%ea%b0%95%ec%a2%8c')                        // 강좌
    );
  };

  // 오버레이 표시 조건: 네이티브 + 강좌 페이지 미도달 + 타임아웃 안 됨
  const showLoginOverlay = Platform.OS !== 'web' && !hasReachedCourse && !loginTimedOut;

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

  const handleRefresh = () => {
    if (Platform.OS === 'web') {
      setLoading(true);
      if (iframeRef.current) {
        iframeRef.current.src = iframeRef.current.src;
      }
    } else if (webViewRef.current) {
      // 새로고침 시 로그인 페이지 노출 방지를 위해 오버레이 다시 표시
      setHasReachedCourse(false);
      setLoginTimedOut(false);
      webViewRef.current.reload();
    }
  };

  // 웹뷰 이전 페이지로 이동 (웹뷰 내에서만)
  const handleWebBack = () => {
    if (canGoBack && webViewRef.current && Platform.OS !== 'web') {
      webViewRef.current.goBack();
    }
  };

  // 한 번에 앱으로 돌아가기
  const handleCloseToApp = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/course');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        {/* 왼쪽: 앱으로 돌아가기 (한 번에 종료) */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={handleCloseToApp}
          accessibilityLabel="앱으로 돌아가기"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <CloseIcon size={20} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{courseTitle}</Text>
          <Text style={styles.headerSub}>eon-music.com</Text>
        </View>

        <View style={styles.headerRight}>
          {/* 웹 이전 페이지 (웹뷰 내부 탐색용) */}
          {canGoBack && Platform.OS !== 'web' && (
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={handleWebBack}
              accessibilityLabel="웹 이전 페이지"
            >
              <BackIcon />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerBtn} onPress={handleRefresh}>
            <RefreshIcon />
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
        {/* 로그인 단계에서 WebView 가리는 오버레이 */}
        {showLoginOverlay && (
          <View style={styles.loginOverlay}>
            <ActivityIndicator size="large" color="#C9A96E" />
            <Text style={styles.loginOverlayTitle}>강좌 연결 중...</Text>
            <Text style={styles.loginOverlayDesc}>자동 로그인 후 강좌로 이동합니다</Text>
          </View>
        )}
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
                backgroundColor: '#110E0B',
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
                // 강좌 페이지 도달 감지 → 오버레이 해제
                if (!hasReachedCourse && isCoursePage(navState.url)) {
                  setHasReachedCourse(true);
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
  container: { flex: 1, backgroundColor: '#110E0B' },

  /* 헤더 */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(201,169,110,0.15)',
    gap: 8,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(201,169,110,0.1)',
    borderWidth: 0.5, borderColor: 'rgba(201,169,110,0.22)',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '400', color: '#F5F0E8', letterSpacing: 0.3 },
  headerSub: { fontSize: 10, color: '#9e9282', marginTop: 1 },
  headerRight: { flexDirection: 'row', gap: 4 },

  /* 로딩 바 */
  loadingBar: {
    height: 2, backgroundColor: 'rgba(201,169,110,0.07)',
  },
  loadingProgress: {
    height: 2, width: '60%',
    backgroundColor: '#C9A96E',
  },

  /* 로그인 오버레이 */
  loginOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    backgroundColor: '#110E0B',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loginOverlayTitle: {
    fontSize: 16, fontWeight: '300', color: '#F5F0E8', letterSpacing: 0.5, marginTop: 4,
  },
  loginOverlayDesc: {
    fontSize: 13, color: '#9e9282',
  },

  /* WebView */
  webviewWrap: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#110E0B' },
  webviewLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#110E0B', gap: 12,
  },
  webviewLoadingText: { fontSize: 14, color: '#9e9282' },

});
