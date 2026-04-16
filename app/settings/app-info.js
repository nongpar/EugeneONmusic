import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Image } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── SVG Icons ──
function BackIcon({ size = 24, color = '#F5F0E8' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function GlobeIcon({ size = 20, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.8} />
      <Path d="M2 12h20" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

function ShieldIcon({ size = 20, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function FileIcon({ size = 20, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronIcon({ size = 18, color = '#9e9282' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LinkRow({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.linkRow} onPress={onPress}>
      <View style={styles.linkLeft}>
        {icon}
        <Text style={styles.linkLabel}>{label}</Text>
      </View>
      <ChevronIcon />
    </TouchableOpacity>
  );
}

export default function AppInfoScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>앱 정보</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* App Identity */}
        <View style={styles.appIdentity}>
          <View style={styles.logoWrap}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>유진온뮤직</Text>
          <Text style={styles.appNameEn}>EugeneON Music</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
        </View>

        {/* Developer */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>개발사</Text>
          <Text style={styles.cardValue}>EON International Music Academy</Text>
        </View>

        {/* Links */}
        <View style={styles.linksCard}>
          <LinkRow
            icon={<GlobeIcon />}
            label="공식 웹사이트"
            onPress={() => router.push({ pathname: '/webview', params: { url: 'https://www.eugeneonmusic.com', title: '공식 웹사이트' } })}
          />
          <LinkRow
            icon={<ShieldIcon />}
            label="개인정보처리방침"
            onPress={() => router.push('/settings/privacy')}
          />
          <LinkRow
            icon={<FileIcon />}
            label="이용약관"
            onPress={() => router.push('/settings/terms')}
          />
        </View>

        {/* Copyright */}
        <Text style={styles.copyright}>{'\u00A9'} 2025 EON International Music Academy</Text>
      </ScrollView>
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
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#F5F0E8',
    letterSpacing: 0.3,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  appIdentity: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 6,
  },
  logoWrap: {
    width: 100,
    height: 100,
    borderRadius: 4,
    backgroundColor: '#F5F0E8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 80,
    height: 80,
  },
  appName: {
    fontSize: 24,
    fontWeight: '300',
    color: '#F5F0E8',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  appNameEn: {
    fontSize: 14,
    color: '#9e9282',
  },
  versionBadge: {
    backgroundColor: 'rgba(201,169,110,0.07)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 4,
    marginTop: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(201,169,110,0.18)',
  },
  versionText: {
    fontSize: 12,
    color: '#C9A96E',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: 'rgba(201,169,110,0.07)',
    borderRadius: 4,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(201,169,110,0.18)',
  },
  cardTitle: {
    fontSize: 12,
    color: '#9e9282',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 15,
    color: '#F5F0E8',
    fontWeight: '500',
  },
  linksCard: {
    backgroundColor: 'rgba(201,169,110,0.07)',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(201,169,110,0.18)',
    marginBottom: 24,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#110E0B',
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkLabel: {
    fontSize: 15,
    color: '#F5F0E8',
  },
  copyright: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9e9282',
  },
});
