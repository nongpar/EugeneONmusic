/**
 * 관리자 — 가온 상담 통계
 *
 * 메세나 사업공모 등 외부 자료 작성 시 활용:
 *  - 모드별 누적 상담 / 정식 신청서
 *  - 월별 추이 (6개월)
 *  - 사회 기여 성격 상담 (마음의 음악 모드 + 키워드 매칭)
 *
 * teacher 역할만 접근 가능.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, RefreshControl,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import { functions, auth } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

let Haptics = null;
if (Platform.OS !== 'web') {
  try { Haptics = require('expo-haptics'); } catch {}
}

function BackIcon({ size = 22, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const MODE_META = {
  concierge: { label: '둘러보기', color: '#B8C9D4' },
  curation:  { label: '공연 큐레이션', color: '#C9A96E' },
  mind:      { label: '마음의 음악', color: '#D4B5C0' },
  none:      { label: '자유 진입', color: 'rgba(158,146,130,0.5)' },
};

function MonthKey(s) {
  // '2026-04' → '4월' (간결한 라벨)
  const [, m] = s.split('-');
  return `${parseInt(m, 10)}월`;
}

export default function ConsultationStatsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, loading: authLoading, getToken } = useAuth();

  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // 권한 가드 — teacher만
  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'teacher') {
      router.replace('/');
    }
  }, [user, authLoading]);

  const ensureFirebaseSession = useCallback(async () => {
    if (auth?.currentUser) return true;
    if (!user?.uid) return false;
    try {
      const wpToken = getToken?.();
      if (!wpToken) return false;
      const exchange = httpsCallable(functions, 'exchangeWpToken');
      const res = await exchange({ wpToken });
      if (res.data?.customToken) {
        await signInWithCustomToken(auth, res.data.customToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [user?.uid, getToken]);

  const fetchStats = useCallback(async () => {
    setError(null);
    try {
      const ready = await ensureFirebaseSession();
      if (!ready) {
        setError('관리자 세션 연결에 실패했어요.');
        return;
      }
      const fn = httpsCallable(functions, 'getConsultationStats');
      const res = await fn();
      setStats(res.data || null);
    } catch (err) {
      console.warn('getConsultationStats error:', err);
      setError(err?.message || '통계를 불러올 수 없습니다.');
    }
  }, [ensureFirebaseSession]);

  useEffect(() => {
    if (user?.role === 'teacher') fetchStats();
  }, [user?.role, fetchStats]);

  const onRefresh = async () => {
    Haptics?.selectionAsync();
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  if (!stats && !error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header onBack={() => router.back()} colors={colors} styles={styles} />
        <View style={styles.centerWrap}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header onBack={() => router.back()} colors={colors} styles={styles} />
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchStats}>
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { total, byMode, byMonth, socialContribution, submitted } = stats;
  const monthMax = Math.max(1, ...byMonth.map((m) => m.total));
  const topKeywords = Object.entries(socialContribution.byKeyword || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header onBack={() => router.back()} colors={colors} styles={styles} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* 1. 누적 총계 */}
        <View style={styles.totalWrap}>
          <Text style={styles.totalLabel}>누적 가온 상담</Text>
          <Text style={styles.totalNumber}>{total.toLocaleString()}</Text>
          <Text style={styles.totalSub}>건</Text>
        </View>

        {/* 2. 모드별 분포 */}
        <Section title="모드별 분포" styles={styles}>
          {['concierge', 'curation', 'mind', 'none'].map((key) => {
            const count = byMode[key] || 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <ModeBar
                key={key}
                label={MODE_META[key].label}
                color={MODE_META[key].color}
                count={count}
                pct={pct}
                styles={styles}
              />
            );
          })}
        </Section>

        {/* 3. 월별 추이 (최근 6개월) */}
        <Section title="월별 추이 (최근 6개월)" styles={styles}>
          <View style={styles.monthChartRow}>
            {byMonth.map((m) => {
              const heightPct = (m.total / monthMax) * 100;
              return (
                <View key={m.month} style={styles.monthBarWrap}>
                  <View style={styles.monthBarTrack}>
                    <View
                      style={[
                        styles.monthBarFill,
                        { height: `${heightPct}%`, backgroundColor: colors.accent },
                      ]}
                    />
                  </View>
                  <Text style={styles.monthCount}>{m.total}</Text>
                  <Text style={styles.monthLabel}>{MonthKey(m.month)}</Text>
                </View>
              );
            })}
          </View>
        </Section>

        {/* 4. 사회 기여 — 메세나 어필 핵심 자료 */}
        <Section
          title="사회 기여 성격 상담"
          subtitle="마음의 음악 모드 + 사회 키워드 매칭"
          styles={styles}
        >
          <View style={styles.socialTopRow}>
            <Text style={styles.socialNumber}>{socialContribution.total}</Text>
            <Text style={styles.socialUnit}>건</Text>
            <Text style={styles.socialOf}>
              / {byMode.mind || 0}건 (마음의 음악 전체)
            </Text>
          </View>
          {topKeywords.length > 0 ? (
            <View style={styles.keywordWrap}>
              {topKeywords.map(([kw, count]) => (
                <View key={kw} style={styles.keywordChip}>
                  <Text style={styles.keywordText}>{kw}</Text>
                  <Text style={styles.keywordCount}>{count}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyHint}>
              아직 매칭된 키워드가 없습니다.
            </Text>
          )}
        </Section>

        {/* 5. 정식 신청서(experiencePlans) 제출 */}
        <Section
          title="정식 신청서 제출"
          subtitle="가온 대화 → 신청서 도구 호출 완료 건"
          styles={styles}
        >
          <View style={styles.submittedRow}>
            <Text style={styles.submittedTotal}>{submitted.total}</Text>
            <Text style={styles.submittedUnit}>건</Text>
          </View>
          {['concierge', 'curation', 'mind', 'none'].map((key) => {
            const count = submitted.byMode[key] || 0;
            if (count === 0) return null;
            return (
              <View key={key} style={styles.submittedItemRow}>
                <View style={[styles.submittedDot, { backgroundColor: MODE_META[key].color }]} />
                <Text style={styles.submittedLabel}>{MODE_META[key].label}</Text>
                <Text style={styles.submittedCount}>{count}</Text>
              </View>
            );
          })}
        </Section>

        <Text style={styles.footnote}>
          데이터 기준: 가온 도입 이후 누적. 사회 기여 키워드는 사용자가 자발적으로 언급한 텍스트 기반.
        </Text>
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function Header({ onBack, colors, styles }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <BackIcon color={colors.text} />
      </TouchableOpacity>
      <View style={styles.headerTitleWrap}>
        <Text style={styles.headerTitle}>가온 상담 통계</Text>
        <Text style={styles.headerSub}>관리자 · 메세나 자료용</Text>
      </View>
      <View style={{ width: 22 }} />
    </View>
  );
}

function Section({ title, subtitle, children, styles }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderWrap}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionTitleBar} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function ModeBar({ label, color, count, pct, styles }) {
  return (
    <View style={styles.modeBarRow}>
      <View style={styles.modeBarLabelRow}>
        <View style={[styles.modeBarDot, { backgroundColor: color }]} />
        <Text style={styles.modeBarLabel}>{label}</Text>
        <Text style={styles.modeBarCount}>{count}</Text>
      </View>
      <View style={styles.modeBarTrack}>
        <View style={[styles.modeBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.modeBarPct}>{pct.toFixed(1)}%</Text>
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: c.surfaceStrong,
  },
  backBtn: { padding: 4 },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: { fontSize: 15, color: c.text, letterSpacing: 0.5 },
  headerSub: { fontSize: 10, color: c.textMuted, letterSpacing: 1, marginTop: 2 },

  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  errorText: { fontSize: 14, color: c.danger, textAlign: 'center', lineHeight: 20 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderWidth: 0.5, borderColor: c.accent, borderRadius: 4 },
  retryText: { fontSize: 12, color: c.accent, letterSpacing: 1.5 },

  scrollContent: { padding: 20, gap: 24 },

  // 누적 총계
  totalWrap: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: c.inputBg,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(201,169,110,0.3)',
  },
  totalLabel: { fontSize: 11, color: c.accent, letterSpacing: 2.5, textTransform: 'uppercase' },
  totalNumber: { fontSize: 48, fontWeight: '300', color: c.text, letterSpacing: 1, marginTop: 8 },
  totalSub: { fontSize: 12, color: c.textMuted, letterSpacing: 1.5, marginTop: 2 },

  // 섹션 공통
  section: {
    backgroundColor: c.inputBg,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: c.border,
    padding: 18,
    gap: 14,
  },
  sectionHeaderWrap: { gap: 4 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitleBar: { width: 2, height: 14, backgroundColor: c.accent },
  sectionTitle: { fontSize: 13, color: c.text, letterSpacing: 1, fontWeight: '500' },
  sectionSub: { fontSize: 10, color: c.textMuted, letterSpacing: 0.5, marginLeft: 12 },

  // 모드 분포
  modeBarRow: { gap: 5 },
  modeBarLabelRow: { flexDirection: 'row', alignItems: 'center' },
  modeBarDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  modeBarLabel: { flex: 1, fontSize: 12, color: c.text, letterSpacing: 0.3 },
  modeBarCount: { fontSize: 13, color: c.text, fontWeight: '500', letterSpacing: 0.5 },
  modeBarTrack: {
    height: 4,
    backgroundColor: c.surface,
    borderRadius: 2,
    overflow: 'hidden',
    marginLeft: 14,
  },
  modeBarFill: { height: '100%', borderRadius: 2 },
  modeBarPct: { fontSize: 10, color: c.textMuted, letterSpacing: 0.5, alignSelf: 'flex-end' },

  // 월별 추이 — 간단한 막대 차트
  monthChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 130,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  monthBarWrap: { flex: 1, alignItems: 'center', height: '100%' },
  monthBarTrack: {
    flex: 1,
    width: '60%',
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  monthBarFill: {
    width: '100%',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    minHeight: 2,
    opacity: 0.8,
  },
  monthCount: { fontSize: 10, color: c.text, marginTop: 4, letterSpacing: 0.3 },
  monthLabel: { fontSize: 9, color: c.textMuted, marginTop: 1, letterSpacing: 0.5 },

  // 사회 기여
  socialTopRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  socialNumber: { fontSize: 32, color: c.accent, fontWeight: '300', letterSpacing: 0.5 },
  socialUnit: { fontSize: 13, color: c.textMuted, letterSpacing: 0.5 },
  socialOf: { fontSize: 11, color: c.textMuted, marginLeft: 8, letterSpacing: 0.3 },
  keywordWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  keywordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(201,169,110,0.4)',
    borderRadius: 12,
    backgroundColor: c.surface,
  },
  keywordText: { fontSize: 11, color: c.text, letterSpacing: 0.3 },
  keywordCount: { fontSize: 11, color: c.accent, fontWeight: '500', letterSpacing: 0.3 },
  emptyHint: { fontSize: 11, color: c.textMuted, fontStyle: 'italic', letterSpacing: 0.3 },

  // 정식 신청서
  submittedRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 4 },
  submittedTotal: { fontSize: 26, color: c.text, fontWeight: '300', letterSpacing: 0.5 },
  submittedUnit: { fontSize: 12, color: c.textMuted, letterSpacing: 0.5 },
  submittedItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  submittedDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 10 },
  submittedLabel: { flex: 1, fontSize: 12, color: c.textSoft, letterSpacing: 0.3 },
  submittedCount: { fontSize: 12, color: c.text, fontWeight: '500' },

  footnote: {
    fontSize: 10,
    color: c.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 16,
  },
});
