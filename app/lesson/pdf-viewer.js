import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import WebView from 'react-native-webview';

let ScreenOrientation = null;
if (Platform.OS !== 'web') {
  try { ScreenOrientation = require('expo-screen-orientation'); } catch {}
}

function BackIcon({ size = 22, color = '#9e9282' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function PDFViewerScreen() {
  const insets = useSafeAreaInsets();
  const { url, title } = useLocalSearchParams();

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

  const displayTitle = title
    ? decodeURIComponent(title).replace(/&#8211;/g, '-').replace(/&amp;/g, '&')
    : '악보';

  // Google Docs Viewer로 PDF 렌더링
  const viewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <BackIcon />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{displayTitle}</Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      {Platform.OS === 'web' ? (
        <View style={styles.center}>
          <Text style={styles.webText}>웹에서는 직접 열기만 지원됩니다.</Text>
          <TouchableOpacity
            style={styles.openBtn}
            onPress={() => window.open(url, '_blank')}
          >
            <Text style={styles.openBtnText}>새 탭에서 열기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          source={{ uri: viewerUrl }}
          style={styles.webview}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#C9A96E" />
              <Text style={styles.loadingText}>악보 로딩 중...</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#110E0B' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(201,169,110,0.15)', gap: 12,
  },
  headerBtn: { width: 36, height: 36, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '300', color: '#F5F0E8', letterSpacing: 0.5 },
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#110E0B',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadingText: { fontSize: 13, color: '#9e9282' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  webText: { fontSize: 14, color: '#9e9282' },
  openBtn: {
    paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 4, borderWidth: 1, borderColor: 'rgba(201,169,110,0.3)',
    backgroundColor: 'rgba(201,169,110,0.07)',
  },
  openBtnText: { fontSize: 14, color: '#C9A96E' },
});
