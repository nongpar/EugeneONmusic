import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking, Platform } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { usePracticeStats } from '../../hooks/usePracticeStats';

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

// ── SVG 아이콘 ──
function PersonIcon({ size = 48, color = '#4a5a6a' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

function ChevronIcon({ size = 18, color = '#4a5a6a' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LogoutIcon({ size = 20, color = '#e74c3c' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// 메뉴 아이콘들
function makeIcon(pathData, size = 22, color = '#8a9bae') {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {pathData.map((d, i) => <Path key={i} d={d} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />)}
    </Svg>
  );
}

const MENU_ICONS = {
  profile: ['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 3a4 4 0 100 8 4 4 0 000-8z'],
  bell: ['M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 01-3.46 0'],
  music: ['M9 18V5l12-2v13', 'M6 21a3 3 0 100-6 3 3 0 000 6z', 'M18 19a3 3 0 100-6 3 3 0 000 6z'],
  chart: ['M18 20V10', 'M12 20V4', 'M6 20v-6'],
  help: ['M12 22a10 10 0 100-20 10 10 0 000 20z', 'M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3', 'M12 17h.01'],
  info: ['M12 22a10 10 0 100-20 10 10 0 000 20z', 'M12 16v-4', 'M12 8h.01'],
  globe: ['M12 22a10 10 0 100-20 10 10 0 000 20z', 'M2 12h20', 'M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z'],
};

function MenuItem({ iconKey, label, onPress, subtitle }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuLeft}>
        {makeIcon(MENU_ICONS[iconKey])}
        <View>
          <Text style={styles.menuLabel}>{label}</Text>
          {subtitle && <Text style={styles.menuSub}>{subtitle}</Text>}
        </View>
      </View>
      <ChevronIcon />
    </TouchableOpacity>
  );
}

function LoggedOutView() {
  return (
    <View style={styles.loggedOutContainer}>
      <View style={styles.avatarPlaceholder}>
        <PersonIcon />
      </View>
      <Text style={styles.loggedOutTitle}>로그인이 필요합니다</Text>
      <Text style={styles.loggedOutSubtitle}>
        eon-music.com 계정으로 로그인하여{'\n'}강좌 수강과 다양한 기능을 이용하세요
      </Text>
      <TouchableOpacity
        style={styles.loginBtn}
        onPress={() => router.push('/auth/login')}
      >
        <Text style={styles.loginBtnText}>로그인</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.signUpBtn}
        onPress={() => Linking.openURL('https://eon-music.com/user-registration/')}
      >
        <Text style={styles.signUpBtnText}>회원가입</Text>
      </TouchableOpacity>
    </View>
  );
}

function LoggedInView({ user, onLogout }) {
  const displayName = user.displayName || user.email?.split('@')[0] || '사용자';
  const initial = displayName.charAt(0).toUpperCase();
  const { totalDays, totalHours, streakDays, loading: statsLoading } = usePracticeStats(user?.uid);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* 프로필 */}
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.userName}>{displayName}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <View style={styles.accountBadge}>
          <View style={styles.accountDot} />
          <Text style={styles.accountText}>eon-music.com 연동</Text>
        </View>
      </View>

      {/* 통계 */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {statsLoading ? '...' : totalDays > 0 ? totalDays : '-'}
          </Text>
          <Text style={styles.statLabel}>총 연습일</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {statsLoading ? '...' : totalHours > 0 ? `${totalHours}h` : '-'}
          </Text>
          <Text style={styles.statLabel}>총 연습시간</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {statsLoading ? '...' : streakDays > 0 ? streakDays : '-'}
          </Text>
          <Text style={styles.statLabel}>연속일</Text>
        </View>
      </View>

      {/* 메뉴 */}
      <View style={styles.menuSection}>
        <MenuItem iconKey="profile" label="프로필 편집" onPress={() => router.push('/settings/profile')} />
        <MenuItem iconKey="bell" label="알림 설정" onPress={() => router.push('/settings/notifications')} />
        <MenuItem iconKey="music" label="연습 목표 설정" onPress={() => router.push('/settings/practice-goal')} />
        <MenuItem iconKey="chart" label="연습 통계" onPress={() => router.push('/settings/practice-stats')} />
      </View>

      <View style={[styles.menuSection, { marginTop: 12 }]}>
        <MenuItem
          iconKey="globe"
          label="나의 강의실"
          subtitle="eon-music.com"
          onPress={() => {
            router.push({
              pathname: '/course/[id]',
              params: { id: 'my-courses', title: '나의 강의실', url: 'https://eon-music.com/my-courses/' },
            });
          }}
        />
        <MenuItem iconKey="help" label="고객센터" onPress={() => router.push('/settings/help')} />
        <MenuItem iconKey="info" label="앱 정보" onPress={() => router.push('/settings/app-info')} />
      </View>

      {/* 로그아웃 */}
      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <LogoutIcon />
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

export default function MyScreen() {
  const { user, loading, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      showAlert('오류', '로그아웃에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.screenTitle}>MY</Text>
      {user ? <LoggedInView user={user} onLogout={handleLogout} /> : <LoggedOutView />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1923' },
  center: { alignItems: 'center', justifyContent: 'center' },
  screenTitle: {
    fontSize: 20, fontWeight: 'bold', color: '#ffffff',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  loadingText: { color: '#6b7b8d', fontSize: 16 },

  // Logged Out
  loggedOutContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 12,
  },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#1a2530', alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  loggedOutTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  loggedOutSubtitle: { fontSize: 14, color: '#6b7b8d', textAlign: 'center', lineHeight: 22 },
  loginBtn: {
    backgroundColor: '#C9A96E', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 48, marginTop: 12,
  },
  loginBtnText: { fontSize: 16, fontWeight: 'bold', color: '#0f1923' },
  signUpBtn: {
    borderWidth: 1, borderColor: '#C9A96E30', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 40,
  },
  signUpBtnText: { fontSize: 14, fontWeight: '600', color: '#C9A96E' },

  // Logged In
  profileSection: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#C9A96E', alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: '#0f1923' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#ffffff' },
  userEmail: { fontSize: 14, color: '#6b7b8d' },
  accountBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1a2530', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 12, marginTop: 8,
  },
  accountDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
  accountText: { fontSize: 11, color: '#6b7b8d' },

  statsRow: {
    flexDirection: 'row', marginHorizontal: 20,
    backgroundColor: '#1a2530', borderRadius: 16, padding: 16,
    justifyContent: 'space-around', marginBottom: 20,
    borderWidth: 1, borderColor: '#222f3a',
  },
  statBox: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#C9A96E' },
  statLabel: { fontSize: 12, color: '#6b7b8d' },

  menuSection: {
    marginHorizontal: 20, backgroundColor: '#1a2530',
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#222f3a',
  },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#0f1923',
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuLabel: { fontSize: 15, color: '#ffffff' },
  menuSub: { fontSize: 11, color: '#5a6a7a', marginTop: 1 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginHorizontal: 20, marginTop: 20,
    paddingVertical: 14, backgroundColor: '#1a2530', borderRadius: 12,
    borderWidth: 1, borderColor: '#222f3a',
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#e74c3c' },
});
