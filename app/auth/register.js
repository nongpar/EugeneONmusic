import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';

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
        />
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
});
