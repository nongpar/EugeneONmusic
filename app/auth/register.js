import { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';

function BackIcon({ size = 22, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function RegisterScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const { loginWithToken } = useAuth();
  const [signing, setSigning] = useState(false);
  // 동일 메시지 중복 처리 방지 (페이지 새로고침 등으로 같은 토큰이 두 번 와도 1회만 사용)
  const handledRef = useRef(false);

  const handleMessage = async (event) => {
    if (handledRef.current) return;
    let payload = null;
    try {
      payload = JSON.parse(event.nativeEvent.data);
    } catch {
      return; // 우리 메시지가 아닌 임의 postMessage는 무시
    }
    if (!payload || payload.type !== 'EON_SIGNUP_SUCCESS' || !payload.token) return;

    handledRef.current = true;
    setSigning(true);
    try {
      await loginWithToken(payload.token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/my');
    } catch (err) {
      handledRef.current = false; // 실패 시 다음 메시지에 다시 기회
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        '자동 로그인 실패',
        '회원가입은 완료되었습니다. 직접 로그인해 주세요.',
        [{ text: '로그인 화면으로', onPress: () => router.replace('/auth/login') }]
      );
    } finally {
      setSigning(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <BackIcon color={colors.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>회원가입</Text>
        <View style={{ width: 22 }} />
      </View>

      {Platform.OS === 'web' ? (
        <View style={styles.webFallback}>
          <Text style={styles.webFallbackText}>
            웹에서는 직접 eon-music.com에서 회원가입해주세요.
          </Text>
        </View>
      ) : (
        <WebView
          source={{ uri: 'https://eon-music.com/user-registration/' }}
          style={styles.webview}
          startInLoadingState={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          // WP 측 signup-postmessage.php 가 이 마커로 RN WebView를 식별한다.
          applicationNameForUserAgent="EonMusicApp/1.0"
          onMessage={handleMessage}
        />
      )}

      {signing && (
        <View style={styles.overlay} pointerEvents="auto">
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.overlayText}>가입 정보로 자동 로그인 중...</Text>
        </View>
      )}
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: c.text,
    letterSpacing: 0.3,
  },
  webview: {
    flex: 1,
    backgroundColor: c.bg,
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  webFallbackText: {
    color: c.textMuted,
    fontSize: 15,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  overlayText: {
    color: '#fff',
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
