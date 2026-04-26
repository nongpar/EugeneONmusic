import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import WebView from 'react-native-webview';
import { useTheme } from '../../hooks/useTheme';

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
  const { colors } = useTheme();
  const styles = makeStyles(colors);
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
          <BackIcon color={colors.textMuted} />
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
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.loadingText}>악보 로딩 중...</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: c.surfaceStrong, gap: 12,
  },
  headerBtn: { width: 36, height: 36, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '300', color: c.text, letterSpacing: 0.5 },
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.bg,
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadingText: { fontSize: 13, color: c.textMuted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  webText: { fontSize: 14, color: c.textMuted },
  openBtn: {
    paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 4, borderWidth: 1, borderColor: c.accentMuted,
    backgroundColor: c.surface,
  },
  openBtnText: { fontSize: 14, color: c.accent },
});
