import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Platform, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 네이티브에서만 WebView 로드
let WebView = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').default;
}

function BackIcon({ size = 22, color = '#F5F0E8' }) {
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

function RefreshIcon({ size = 18, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M1 4v6h6M23 20v-6h-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function BlogViewerScreen() {
  const { id, title, url } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);

  const blogUrl = url || '';
  const blogTitle = title || '블로그';

  const handleOpenExternal = () => {
    Linking.openURL(blogUrl);
  };

  const handleRefresh = () => {
    if (Platform.OS === 'web') {
      setLoading(true);
      const iframe = document.querySelector('#blog-webview');
      if (iframe) iframe.src = iframe.src;
      setTimeout(() => setLoading(false), 1500);
    } else if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const handleBack = () => {
    if (canGoBack && webViewRef.current && Platform.OS !== 'web') {
      webViewRef.current.goBack();
    } else if (router.canGoBack()) {
      router.back();
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
          <Text style={styles.headerTitle} numberOfLines={1}>{blogTitle}</Text>
          <Text style={styles.headerSub}>blog.naver.com</Text>
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

      {/* 컨텐츠 */}
      <View style={styles.webviewWrap}>
        {Platform.OS === 'web' ? (
          // 웹: iframe으로 블로그 보기
          <>
            <iframe
              id="blog-webview"
              src={blogUrl}
              style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#fff' }}
              onLoad={() => setLoading(false)}
              title={blogTitle}
            />
          </>
        ) : (
          // 네이티브: WebView
          WebView && (
            <WebView
              ref={webViewRef}
              source={{ uri: blogUrl }}
              style={styles.webview}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onNavigationStateChange={(navState) => {
                setCanGoBack(navState.canGoBack);
              }}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              allowsInlineMediaPlayback
              renderLoading={() => (
                <View style={styles.webviewLoading}>
                  <ActivityIndicator size="large" color="#C9A96E" />
                  <Text style={styles.webviewLoadingText}>블로그를 불러오는 중...</Text>
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
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '400', color: '#F5F0E8' },
  headerSub: { fontSize: 10, color: '#9e9282', marginTop: 1 },
  headerRight: { flexDirection: 'row', gap: 4 },

  loadingBar: {
    height: 2, backgroundColor: 'rgba(201,169,110,0.07)',
  },
  loadingProgress: {
    height: 2, width: '60%', backgroundColor: '#C9A96E',
  },

  webviewWrap: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#F5F0E8' },

  webviewLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#110E0B', gap: 12,
  },
  webviewLoadingText: { fontSize: 14, color: '#9e9282' },
});
