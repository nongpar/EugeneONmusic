/**
 * 관리자 — AI 예술 경험 신청서 목록
 *
 * Firestore `experiencePlans` 컬렉션을 실시간 구독.
 * teacher 역할만 접근 가능.
 */
import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../hooks/useTheme';

let Haptics = null;
if (Platform.OS !== 'web') {
  try { Haptics = require('expo-haptics'); } catch {}
}

const STATUS_META = {
  pending_review: { label: '미검토', color: '#C9A96E' },
  in_progress:    { label: '처리중', color: '#6EA3C9' },
  completed:      { label: '완료',   color: '#8FB97A' },
  rejected:       { label: '반려',   color: '#C98A6E' },
};

const TYPE_LABEL = {
  concert: '공연 감상',
  education: '교육/레슨',
  rental: '행사/대관',
  other: '기타',
};

function BackIcon({ size = 24, color = '#F5F0E8' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// 통계 화면 진입 — 막대 그래프 모티프
function ChartIcon({ size = 22, color = '#F5F0E8' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 21V11M12 21V3M19 21v-7" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M3 21h18" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}

function formatTime(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default function InquiriesListScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // 권한 가드 — teacher만
  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'teacher') {
      router.replace('/');
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!user || user.role !== 'teacher') return;
    const q = query(collection(db, 'experiencePlans'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user?.uid]);

  const counts = {
    all: items.length,
    pending_review: items.filter((i) => (i.status || 'pending_review') === 'pending_review').length,
    in_progress: items.filter((i) => i.status === 'in_progress').length,
    completed: items.filter((i) => i.status === 'completed').length,
  };

  const filtered = filter === 'all'
    ? items
    : items.filter((i) => (i.status || 'pending_review') === filter);

  const FILTERS = [
    { key: 'all', label: '전체' },
    { key: 'pending_review', label: '미검토' },
    { key: 'in_progress', label: '처리중' },
    { key: 'completed', label: '완료' },
  ];

  const renderItem = ({ item }) => {
    const status = item.status || 'pending_review';
    const statusMeta = STATUS_META[status] || STATUS_META.pending_review;
    const form = item.form || {};
    const contact = form.contactInfo || {};
    const practical = form.practicalInfo || {};
    const typeLabel = TYPE_LABEL[form.type] || '상담';
    const summary = item.aiSummary || form.aiSummary || '';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() => {
          Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/admin/inquiries/${item.id}`);
        }}
      >
        <View style={styles.cardTopRow}>
          {/* 접수번호 — 사용자 접수증(티켓)과 매칭하기 위해 표시 */}
          <Text style={styles.cardTicketNo}>#{item.id.slice(-6).toUpperCase()}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{typeLabel}</Text>
          </View>
          <View style={[styles.statusBadge, { borderColor: statusMeta.color }]}>
            <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>
              {statusMeta.label}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <Text style={styles.cardTime}>{formatTime(item.createdAt)}</Text>
        </View>

        {!!summary && (
          <Text style={styles.cardSummary} numberOfLines={2}>{summary}</Text>
        )}

        <View style={styles.cardMetaRow}>
          {!!contact.name && <Text style={styles.cardMeta}>{contact.name}</Text>}
          {!!contact.phone && <Text style={styles.cardMeta}>· {contact.phone}</Text>}
          {!!practical.preferredDate && <Text style={styles.cardMeta}>· {practical.preferredDate}</Text>}
          {!!practical.partySize && <Text style={styles.cardMeta}>· {practical.partySize}명</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <BackIcon color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>예술 상담 신청서</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            Haptics?.selectionAsync();
            router.push('/admin/consultation-stats');
          }}
          accessibilityLabel="가온 상담 통계"
        >
          <ChartIcon color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => {
              Haptics?.selectionAsync();
              setFilter(f.key);
            }}
          >
            <Text style={[styles.filterLabel, filter === f.key && styles.filterLabelActive]}>
              {f.label}
            </Text>
            {counts[f.key] > 0 && (
              <Text style={[styles.filterCount, filter === f.key && styles.filterCountActive]}>
                {counts[f.key]}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                {filter === 'all' ? '신청서가 없습니다' : '해당 상태의 신청서가 없습니다'}
              </Text>
              <Text style={styles.emptySubtitle}>새 AI 상담이 완료되면 여기 표시됩니다</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: c.surfaceStrong,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '300', color: c.text, letterSpacing: 1 },

  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8,
    borderBottomWidth: 0.5, borderBottomColor: c.surface,
  },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 4,
    backgroundColor: c.surface,
    borderWidth: 0.5, borderColor: c.border,
  },
  filterBtnActive: { backgroundColor: 'transparent', borderColor: c.accent },
  filterLabel: { fontSize: 13, color: c.textMuted, letterSpacing: 0.3 },
  filterLabelActive: { color: c.accent },
  filterCount: {
    fontSize: 11, color: c.textMuted, fontWeight: '500',
    backgroundColor: 'rgba(201,169,110,0.12)',
    paddingHorizontal: 5, borderRadius: 2,
  },
  filterCountActive: { color: c.bg, backgroundColor: c.accent },

  listContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: {
    backgroundColor: 'rgba(245,240,225,0.04)',
    borderRadius: 4, borderWidth: 0.5, borderColor: 'rgba(180,150,100,0.18)',
    borderLeftWidth: 2, borderLeftColor: c.accent,
    padding: 14, marginBottom: 10, gap: 8,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTicketNo: {
    fontSize: 11,
    color: c.accent,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginRight: 2,
  },
  typeBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 2,
    backgroundColor: c.surfaceStrong,
  },
  typeBadgeText: { fontSize: 10, color: c.accent, letterSpacing: 1, fontWeight: '500' },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 2,
    borderWidth: 0.5,
  },
  statusBadgeText: { fontSize: 10, letterSpacing: 1, fontWeight: '500' },
  cardTime: { fontSize: 11, color: c.textMuted },
  cardSummary: { fontSize: 14, color: c.text, lineHeight: 20 },
  cardMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  cardMeta: { fontSize: 12, color: c.textMuted },

  emptyContainer: { alignItems: 'center', paddingVertical: 80, gap: 8 },
  emptyTitle: { fontSize: 16, color: c.textMuted, fontWeight: '300' },
  emptySubtitle: { fontSize: 13, color: c.accentMuted },
});
