import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Svg, { Path, Rect, Line } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { usePracticeStats } from '../../hooks/usePracticeStats';

// ── SVG Icons ──
function BackIcon({ size = 24, color = '#ffffff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function formatTime(seconds) {
  if (!seconds || seconds === 0) return '0분';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  return `${m}분`;
}

// ── Weekly Bar Chart ──
function WeeklyBarChart({ weeklyData }) {
  const maxMinutes = Math.max(...weeklyData.map((d) => d.minutes), 1);
  const barMaxHeight = 120;

  return (
    <View style={styles.chartContainer}>
      {weeklyData.map((item, index) => {
        const barHeight = Math.max((item.minutes / maxMinutes) * barMaxHeight, 2);
        const isToday = index === new Date().getDay() - 1 || (new Date().getDay() === 0 && index === 6);
        return (
          <View key={item.day} style={styles.chartBar}>
            <Text style={styles.chartMinutes}>
              {item.minutes > 0 ? `${item.minutes}` : '-'}
            </Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    height: barHeight,
                    backgroundColor: isToday ? '#C9A96E' : item.minutes > 0 ? '#2C5F8A' : '#222f3a',
                  },
                ]}
              />
            </View>
            <Text style={[styles.chartDay, isToday && styles.chartDayToday]}>
              {item.day}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Stat Card ──
function StatCard({ label, value, unit, color = '#C9A96E' }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function PracticeStatsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { todaySeconds, streakDays, totalDays, totalHours, weeklyData, loading } = usePracticeStats(user?.uid);

  const weekTotal = weeklyData.reduce((sum, d) => sum + d.minutes, 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>연습 통계</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!user ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>로그인하면 연습 통계를 확인할 수 있어요</Text>
          </View>
        ) : loading ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>불러오는 중...</Text>
          </View>
        ) : (
          <>
            {/* 오늘 연습 */}
            <View style={styles.todayCard}>
              <Text style={styles.todayLabel}>오늘의 연습</Text>
              <Text style={styles.todayValue}>{formatTime(todaySeconds)}</Text>
            </View>

            {/* 주간 통계 */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>이번 주 연습</Text>
                <Text style={styles.sectionSub}>총 {weekTotal}분</Text>
              </View>
              <View style={styles.chartCard}>
                <WeeklyBarChart weeklyData={weeklyData} />
              </View>
            </View>

            {/* 전체 통계 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>전체 기록</Text>
              <View style={styles.statsGrid}>
                <StatCard label="총 연습일" value={totalDays} unit="일" color="#4ade80" />
                <StatCard label="총 연습시간" value={totalHours} unit="시간" color="#60a5fa" />
                <StatCard label="연속 연습" value={streakDays} unit="일" color="#C9A96E" />
                <StatCard label="이번 주" value={weekTotal} unit="분" color="#f472b6" />
              </View>
            </View>

            {/* 동기부여 메시지 */}
            <View style={styles.motivationCard}>
              <Text style={styles.motivationEmoji}>
                {streakDays >= 7 ? '🔥' : streakDays >= 3 ? '💪' : streakDays >= 1 ? '🎵' : '🎹'}
              </Text>
              <Text style={styles.motivationText}>
                {streakDays >= 7
                  ? `${streakDays}일 연속 연습 중! 대단해요!`
                  : streakDays >= 3
                  ? `${streakDays}일째 연습 중이에요. 계속 파이팅!`
                  : streakDays >= 1
                  ? '오늘도 연습했군요! 잘하고 있어요.'
                  : '오늘 연습을 시작해보세요!'}
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1923',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222f3a',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 15,
    color: '#6b7b8d',
  },

  // 오늘 카드
  todayCard: {
    backgroundColor: '#1a2530',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C9A96E30',
    marginBottom: 24,
  },
  todayLabel: {
    fontSize: 13,
    color: '#8a9bae',
    marginBottom: 8,
  },
  todayValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#C9A96E',
    letterSpacing: -1,
  },

  // 섹션
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  sectionSub: {
    fontSize: 13,
    color: '#C9A96E',
    fontWeight: '600',
    marginBottom: 12,
  },

  // 차트
  chartCard: {
    backgroundColor: '#1a2530',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#222f3a',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  chartMinutes: {
    fontSize: 11,
    color: '#6b7b8d',
    marginBottom: 6,
    fontWeight: '600',
  },
  barTrack: {
    width: 28,
    height: 120,
    backgroundColor: '#0f1923',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  chartDay: {
    fontSize: 12,
    color: '#6b7b8d',
    marginTop: 8,
    fontWeight: '500',
  },
  chartDayToday: {
    color: '#C9A96E',
    fontWeight: '700',
  },

  // 통계 그리드
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a2530',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222f3a',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  statUnit: {
    fontSize: 12,
    color: '#6b7b8d',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#8a9bae',
    marginTop: 8,
    fontWeight: '600',
  },

  // 동기부여
  motivationCard: {
    backgroundColor: '#1a2530',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222f3a',
    gap: 8,
  },
  motivationEmoji: {
    fontSize: 32,
  },
  motivationText: {
    fontSize: 14,
    color: '#8a9bae',
    textAlign: 'center',
    lineHeight: 22,
  },
});
