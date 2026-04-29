import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking, Platform } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { usePracticeStats } from '../../hooks/usePracticeStats';
import { useTheme } from '../../hooks/useTheme';
import { confirmStartPractice } from '../../components/practiceStart';
import * as Haptics from 'expo-haptics';

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

// ── SVG 아이콘 ──
function PersonIcon({ size = 48, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

function ChevronIcon({ size = 18, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LogoutIcon({ size = 20, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TrashIcon({ size = 18, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// 메뉴 아이콘들
function makeIcon(pathData, size = 22, color) {
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
  receipt: ['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', 'M14 2v6h6', 'M8 13h8', 'M8 17h8', 'M8 9h2'],
  palette: ['M12 22a10 10 0 100-20 10 10 0 000 20z', 'M12 12h.01', 'M7 9h.01', 'M9 5h.01', 'M15 5h.01', 'M17 9h.01'],
};

function MenuItem({ iconKey, label, onPress, subtitle }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuLeft}>
        {makeIcon(MENU_ICONS[iconKey], 22, colors.accent)}
        <View>
          <Text style={styles.menuLabel}>{label}</Text>
          {subtitle && <Text style={styles.menuSub}>{subtitle}</Text>}
        </View>
      </View>
      <ChevronIcon color={colors.accentMuted} />
    </TouchableOpacity>
  );
}

function LoggedOutView() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.loggedOutContainer}>
      <View style={styles.avatarPlaceholder}>
        <PersonIcon color={colors.accent} />
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
        onPress={() => router.push('/auth/register')}
      >
        <Text style={styles.signUpBtnText}>회원가입</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── 오늘의 연습 달성률 위젯 ──
const MINI_RADIUS = 32;
const MINI_STROKE = 5;
const MINI_CIRC = 2 * Math.PI * MINI_RADIUS;
const MINI_SIZE = (MINI_RADIUS + MINI_STROKE) * 2;

function TodayProgressWidget({ todaySeconds, goalMinutes, todayProgress, todayGoalMet, goalStreakDays }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const todayMins = Math.round(todaySeconds / 60);
  const percent = Math.round(todayProgress * 100);
  const progressColor = todayGoalMet ? '#4ade80' : colors.accent;
  const offset = MINI_CIRC * (1 - todayProgress);

  return (
    <TouchableOpacity
      style={styles.todayWidget}
      onPress={() => {
        if (todayGoalMet) {
          router.push('/settings/practice-stats');
          return;
        }
        // 연습 시작 — practice 탭과 동일하게 경고 알림 + 강한 햅틱 후 진입.
        // autoStart=1 로 넘기면 PracticeTimer는 알림 없이 바로 타이머 가동
        // (이 시점에 사용자는 이미 여기서 확정함).
        // router.replace 사용: push는 expo-router v6에서 이미 마운트된 다른 탭으로
        // 이동할 때 params 전파가 불안정해서 useLocalSearchParams가 autoStart를
        // 못 받는 경우가 있음. practice-goal.js와 동일한 검증된 패턴으로 통일.
        confirmStartPractice(() => {
          router.replace({ pathname: '/(tabs)/practice', params: { autoStart: '1' } });
        });
      }}
      activeOpacity={0.8}
    >
      <View style={styles.todayLeft}>
        {/* 미니 원형 프로그래스 */}
        <View style={{ width: MINI_SIZE, height: MINI_SIZE, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={MINI_SIZE} height={MINI_SIZE}>
            <Circle cx={MINI_SIZE / 2} cy={MINI_SIZE / 2} r={MINI_RADIUS}
              stroke={colors.borderSoft} strokeWidth={MINI_STROKE} fill="transparent" />
            <Circle cx={MINI_SIZE / 2} cy={MINI_SIZE / 2} r={MINI_RADIUS}
              stroke={progressColor} strokeWidth={MINI_STROKE} fill="transparent"
              strokeDasharray={MINI_CIRC} strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${MINI_SIZE / 2} ${MINI_SIZE / 2})`} />
          </Svg>
          <Text style={[styles.todayPercent, todayGoalMet && { color: '#4ade80' }]}>{percent}%</Text>
        </View>
        <View style={styles.todayInfo}>
          <Text style={styles.todayTitle}>
            {todayGoalMet ? '오늘 목표 달성!' : '오늘의 연습'}
          </Text>
          <Text style={styles.todayDetail}>
            {todayMins}분 / {goalMinutes}분
          </Text>
        </View>
      </View>
      <View style={styles.todayRight}>
        {goalStreakDays > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakBadgeText}>{goalStreakDays}일 연속 달성</Text>
          </View>
        )}
        {!todayGoalMet ? (
          <View style={styles.startBadge}>
            <Text style={styles.startBadgeText}>연습 시작</Text>
          </View>
        ) : (
          <ChevronIcon color={colors.accentMuted} />
        )}
      </View>
    </TouchableOpacity>
  );
}

function LoggedInView({ user, onLogout }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const displayName = user.displayName || user.email?.split('@')[0] || '사용자';
  const initial = displayName.charAt(0).toUpperCase();
  const {
    totalDays, totalHours, streakDays,
    todaySeconds, goalMinutes, todayProgress, todayGoalMet, goalStreakDays,
    loading: statsLoading,
  } = usePracticeStats(user?.uid);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
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

      {/* 오늘의 연습 달성률 위젯 */}
      {!statsLoading && (
        <TodayProgressWidget
          todaySeconds={todaySeconds}
          goalMinutes={goalMinutes}
          todayProgress={todayProgress}
          todayGoalMet={todayGoalMet}
          goalStreakDays={goalStreakDays}
        />
      )}

      {/* 메뉴 */}
      <View style={styles.menuSection}>
        <MenuItem iconKey="profile" label="프로필 편집" onPress={() => router.push('/settings/profile')} />
        <MenuItem iconKey="bell" label="알림 설정" onPress={() => router.push('/settings/notifications')} />
        <MenuItem iconKey="palette" label="화면 테마" subtitle="다크 / 밝은 모드 / 시스템 설정" onPress={() => router.push('/settings/theme')} />
        <MenuItem iconKey="music" label="연습 목표 설정" onPress={() => router.push('/settings/practice-goal')} />
        <MenuItem iconKey="chart" label="연습 통계" onPress={() => router.push('/settings/practice-stats')} />
        <MenuItem
          iconKey="receipt"
          label="음악 큐레이션 내역"
          subtitle="가온과의 상담 기록"
          onPress={() => router.push('/my-consultations')}
        />
      </View>

      {/* 관리자 메뉴 (선생님만) */}
      {user?.role === 'teacher' && (
        <View style={[styles.menuSection, { marginTop: 12 }]}>
          <MenuItem iconKey="bell" label="알림 전송" subtitle="공지 / 알림 보내기" onPress={() => router.push('/admin/send-notification')} />
          <MenuItem iconKey="music" label="AI 상담 신청서" subtitle="예술 경험 신청서 관리" onPress={() => router.push('/admin/inquiries')} />
        </View>
      )}

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
        <LogoutIcon color={colors.danger} />
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>

      {/* 계정 삭제 */}
      <TouchableOpacity
        style={styles.deleteAccountBtn}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          router.push('/settings/profile');
        }}
      >
        <TrashIcon color={colors.danger} />
        <Text style={styles.deleteAccountText}>계정 삭제</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

export default function MyScreen() {
  const { user, loading, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (Platform.OS === 'web') {
      if (window.confirm('로그아웃 하시겠습니까?')) {
        logout().catch(() => showAlert('오류', '로그아웃에 실패했습니다.'));
      }
    } else {
      Alert.alert(
        '로그아웃',
        '정말 로그아웃 하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '로그아웃',
            style: 'destructive',
            onPress: async () => {
              try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                await logout();
              } catch {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                showAlert('오류', '로그아웃에 실패했습니다.');
              }
            },
          },
        ]
      );
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

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  scrollContent: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 540,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  screenTitle: {
    fontSize: 22, fontWeight: '300', color: c.text,
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 14,
    letterSpacing: 1, borderBottomWidth: 0.5, borderBottomColor: c.borderSoft,
  },
  loadingText: { color: c.textMuted, fontSize: 16 },

  // Logged Out
  loggedOutContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 12,
  },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8, borderWidth: 0.5, borderColor: c.border,
  },
  loggedOutTitle: { fontSize: 20, fontWeight: '300', color: c.text, letterSpacing: 0.5 },
  loggedOutSubtitle: { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 22 },
  loginBtn: {
    backgroundColor: c.accent, borderRadius: 4,
    paddingVertical: 14, paddingHorizontal: 48, marginTop: 12,
  },
  loginBtnText: { fontSize: 16, fontWeight: '500', color: c.accentText, letterSpacing: 0.5 },
  signUpBtn: {
    borderWidth: 0.5, borderColor: c.border, borderRadius: 4,
    paddingVertical: 12, paddingHorizontal: 40,
  },
  signUpBtnText: { fontSize: 14, fontWeight: '400', color: c.accent, letterSpacing: 0.3 },

  // Logged In
  profileSection: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: { fontSize: 28, fontWeight: '300', color: c.accentText },
  userName: { fontSize: 22, fontWeight: '300', color: c.text, letterSpacing: 0.5 },
  userEmail: { fontSize: 14, color: c.textMuted },
  accountBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: c.surface, paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 4, marginTop: 8, borderWidth: 0.5, borderColor: c.border,
  },
  accountDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent },
  accountText: { fontSize: 11, color: c.textMuted },

  statsRow: {
    flexDirection: 'row', marginHorizontal: 20,
    backgroundColor: c.surface, borderRadius: 4, padding: 16,
    justifyContent: 'space-around', marginBottom: 20,
    borderWidth: 0.5, borderColor: c.border,
  },
  statBox: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '300', color: c.accent },
  statLabel: { fontSize: 12, color: c.textMuted },

  menuSection: {
    marginHorizontal: 20, backgroundColor: c.surface,
    borderRadius: 4, overflow: 'hidden',
    borderWidth: 0.5, borderColor: c.border,
  },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 16,
    borderBottomWidth: 0.5, borderBottomColor: c.borderSoft,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuLabel: { fontSize: 15, fontWeight: '400', color: c.text, letterSpacing: 0.3 },
  menuSub: { fontSize: 11, color: c.textMuted, marginTop: 1 },

  // 오늘의 연습 위젯
  todayWidget: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: c.surface, borderRadius: 4, padding: 16,
    borderWidth: 0.5, borderColor: c.border,
  },
  todayLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  todayPercent: {
    position: 'absolute', fontSize: 13, fontWeight: '500', color: c.accent,
  },
  todayInfo: { gap: 3 },
  todayTitle: { fontSize: 15, fontWeight: '400', color: c.text },
  todayDetail: { fontSize: 13, color: c.textMuted },
  todayRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakBadge: {
    backgroundColor: c.surfaceStrong, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 4, borderWidth: 0.5, borderColor: c.border,
  },
  streakBadgeText: { fontSize: 11, fontWeight: '500', color: c.accent },
  startBadge: {
    backgroundColor: c.accent, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 4,
  },
  startBadgeText: { fontSize: 12, fontWeight: '600', color: c.accentText, letterSpacing: 0.5 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginHorizontal: 20, marginTop: 20,
    paddingVertical: 14, backgroundColor: c.surface, borderRadius: 4,
    borderWidth: 0.5, borderColor: c.border,
  },
  logoutText: { fontSize: 15, fontWeight: '400', color: c.danger },

  deleteAccountBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginHorizontal: 20, marginTop: 12,
    paddingVertical: 14, backgroundColor: 'rgba(231,76,60,0.08)', borderRadius: 4,
    borderWidth: 0.5, borderColor: 'rgba(231,76,60,0.25)',
  },
  deleteAccountText: { fontSize: 14, fontWeight: '600', color: c.danger },
});
