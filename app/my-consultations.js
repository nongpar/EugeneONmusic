/**
 * 내 음악 큐레이션 내역 (사용자 공간)
 *
 * MY 탭 → "음악 큐레이션 내역"에서 진입.
 * experiencePlans에서 본인이 제출한 상담 신청서 요약 리스트를 보여준다.
 * 관리자 상세 페이지가 아닌 간략한 요약만 — 접수일, 주제, AI 요약, 상태, 접수번호.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import Svg, { Path } from 'react-native-svg';
import { functions, auth } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';

let Haptics = null;
if (Platform.OS !== 'web') {
  try { Haptics = require('expo-haptics'); } catch {}
}

// ── 아이콘 ──
function BackIcon({ size = 22, color = '#F5F0E8' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function NoteIcon({ size = 40, color = 'rgba(201,169,110,0.35)' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18V5l12-2v13" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M6 21a3 3 0 100-6 3 3 0 000 6z" stroke={color} strokeWidth={1.4} />
      <Path d="M18 19a3 3 0 100-6 3 3 0 000 6z" stroke={color} strokeWidth={1.4} />
    </Svg>
  );
}

// ── 상태 라벨 매핑 ──
const STATUS_LABELS = {
  pending_review: { text: '검토 대기', color: '#C9A96E' },
  in_progress: { text: '담당자 배정', color: '#80c4ff' },
  contacted: { text: '연락 완료', color: '#a0e0a0' },
  completed: { text: '완료', color: '#a0e0a0' },
  closed: { text: '종료', color: 'rgba(201,169,110,0.5)' },
};

// ── 카테고리 라벨 (systemPrompt.js SUBMIT_FORM_TOOL enum과 일치) ──
const CATEGORY_LABELS = {
  concert: '공연 감상',
  education: '음악 교육',
  rental: 'EON HALL 행사·대관',
  other: '기타 음악 기획',
};

// 시각 포맷터 (간결하게: 2026.04.24)
function formatDate(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

// 접수번호 (doc id 마지막 6자리)
function ticketNoFromId(id) {
  if (!id) return '------';
  return id.slice(-6).toUpperCase();
}

export default function MyConsultationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, getToken } = useAuth();

  const [items, setItems] = useState(null); // null = 로딩중, [] = 비었음
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Firebase 세션이 없으면 WP 토큰으로 교환 후 목록 조회
  const ensureFirebaseSession = useCallback(async () => {
    if (auth.currentUser) return true;
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
    } catch (err) {
      console.warn('[my-consultations] session exchange failed:', err?.code || err?.message);
      return false;
    }
  }, [user?.uid, getToken]);

  const fetchList = useCallback(async () => {
    setError(null);
    try {
      const ready = await ensureFirebaseSession();
      if (!ready) {
        setError('로그인이 필요합니다.');
        setItems([]);
        return;
      }
      const listFn = httpsCallable(functions, 'listMyConsultations');
      const res = await listFn();
      setItems(res.data?.items || []);
    } catch (err) {
      console.warn('listMyConsultations error:', err);
      setError(err?.message || '내역을 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
      setItems([]);
    }
  }, [ensureFirebaseSession]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const onRefresh = async () => {
    Haptics?.selectionAsync();
    setRefreshing(true);
    await fetchList();
    setRefreshing(false);
  };

  // 한 번에 하나의 Swipeable만 열리게 — 스와이프 시 이전에 열린 것 닫기
  const openedSwipeableRef = useRef(null);

  // 상담 취소·숨기기 — 상태에 따라 문구·동작 구분
  const handleCancel = (item, swipeableRef) => {
    const isFinal = item.status === 'completed' || item.status === 'closed' || item.status === 'cancelled_by_user';
    const title = isFinal ? '목록에서 숨길까요?' : '신청을 취소할까요?';
    const message = isFinal
      ? '기록은 보관되지만 이 목록에서는 더 이상 보이지 않아요.'
      : '담당 큐레이터에게 취소 알림이 전달됩니다.';
    const destructiveLabel = isFinal ? '숨기기' : '취소하기';

    Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(title, message, [
      {
        text: '돌아가기',
        style: 'cancel',
        onPress: () => swipeableRef?.current?.close(),
      },
      {
        text: destructiveLabel,
        style: 'destructive',
        onPress: async () => {
          try {
            const fn = httpsCallable(functions, 'cancelMyConsultation');
            await fn({ inquiryId: item.id });
            // 목록에서 즉시 제거 (서버 응답 기다리지 않고 UI 반응성 우선)
            setItems((prev) => prev.filter((x) => x.id !== item.id));
            Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType.Success);
          } catch (err) {
            console.warn('cancel failed:', err);
            swipeableRef?.current?.close();
            Alert.alert('처리 실패', err?.message || '잠시 후 다시 시도해주세요.');
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <BackIcon />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>음악 큐레이션 내역</Text>
          <Text style={styles.headerSub}>가온과의 상담 기록</Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      {/* 본문 */}
      {items === null ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="small" color="#C9A96E" />
        </View>
      ) : items.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyWrap}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C9A96E" />
          }
        >
          <NoteIcon size={48} />
          <Text style={styles.emptyTitle}>
            {error ? error : '아직 큐레이션 내역이 없어요'}
          </Text>
          {!error && (
            <Text style={styles.emptyDesc}>
              가온과 대화를 마치면{'\n'}이곳에 접수증이 차곡히 쌓여요.
            </Text>
          )}
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => {
              Haptics?.selectionAsync();
              router.push('/ai-consult');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.startBtnText}>가온과 상담하기</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listWrap}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C9A96E" />
          }
          showsVerticalScrollIndicator={false}
        >
          {items.map((item) => {
            const statusInfo = STATUS_LABELS[item.status] || STATUS_LABELS.pending_review;
            const categoryLabel = CATEGORY_LABELS[item.type] || '음악 큐레이션';
            const isFinal = item.status === 'completed' || item.status === 'closed' || item.status === 'cancelled_by_user';
            const actionLabel = isFinal ? '숨기기' : '취소';

            return (
              <ConsultationCard
                key={item.id}
                item={item}
                statusInfo={statusInfo}
                categoryLabel={categoryLabel}
                actionLabel={actionLabel}
                openedRef={openedSwipeableRef}
                onCancel={handleCancel}
              />
            );
          })}
          <Text style={styles.listFooter}>최근 20건까지 보여져요</Text>
        </ScrollView>
      )}
    </View>
  );
}

// 스와이프 제스처로 취소·숨기기 가능한 카드 컴포넌트
function ConsultationCard({ item, statusInfo, categoryLabel, actionLabel, openedRef, onCancel }) {
  const swipeRef = useRef(null);

  const renderRightAction = () => (
    <TouchableOpacity
      style={styles.swipeAction}
      activeOpacity={0.8}
      onPress={() => onCancel(item, swipeRef)}
    >
      <Text style={styles.swipeActionText}>{actionLabel}</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightAction}
      overshootRight={false}
      rightThreshold={40}
      friction={2}
      onSwipeableWillOpen={() => {
        // 다른 카드가 열려있으면 닫기 (한 번에 하나만)
        if (openedRef.current && openedRef.current !== swipeRef.current) {
          openedRef.current.close();
        }
        openedRef.current = swipeRef.current;
      }}
    >
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
          <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
          <Text style={[styles.cardStatus, { color: statusInfo.color }]}>
            {statusInfo.text}
          </Text>
        </View>
        <Text style={styles.cardCategory}>
          {categoryLabel}
          {item.subCategory ? `  ·  ${item.subCategory}` : ''}
        </Text>
        {item.aiSummary ? (
          <Text style={styles.cardSummary} numberOfLines={3}>
            {item.aiSummary}
          </Text>
        ) : null}
        <View style={styles.cardDivider} />
        <View style={styles.cardBottom}>
          <Text style={styles.cardNoLabel}>접수번호</Text>
          <Text style={styles.cardNo}>#{ticketNoFromId(item.id)}</Text>
        </View>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#110E0B' },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(201,169,110,0.15)',
  },
  backBtn: { padding: 4 },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: {
    fontSize: 15,
    color: '#F5F0E8',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 10,
    color: '#9e9282',
    letterSpacing: 1,
    marginTop: 2,
  },

  // 로딩·에러·비어있음
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 14,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 15,
    color: '#C9BEAC',
    marginTop: 10,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    color: 'rgba(201,169,110,0.55)',
    lineHeight: 22,
    textAlign: 'center',
  },
  startBtn: {
    marginTop: 20,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderWidth: 0.5,
    borderColor: '#C9A96E',
    borderRadius: 4,
  },
  startBtnText: {
    fontSize: 13,
    color: '#C9A96E',
    letterSpacing: 2,
  },

  // 리스트
  listWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: 'rgba(201,169,110,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(201,169,110,0.28)',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardDate: {
    flex: 1,
    fontSize: 11,
    color: 'rgba(201,169,110,0.7)',
    letterSpacing: 1.2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  cardStatus: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  cardCategory: {
    fontSize: 15,
    color: '#F5F0E8',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  cardSummary: {
    fontSize: 13,
    color: '#C9BEAC',
    lineHeight: 21,
  },
  cardDivider: {
    marginTop: 14,
    marginBottom: 10,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(201,169,110,0.18)',
    borderStyle: 'dashed',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardNoLabel: {
    fontSize: 10,
    color: 'rgba(201,169,110,0.55)',
    letterSpacing: 1.5,
  },
  cardNo: {
    fontSize: 13,
    color: '#C9A96E',
    letterSpacing: 2,
  },
  listFooter: {
    fontSize: 10,
    color: 'rgba(158,146,130,0.55)',
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: 12,
  },
  // 스와이프 시 오른쪽에 나타나는 취소·숨기기 버튼
  swipeAction: {
    backgroundColor: 'rgba(180,70,70,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    width: 84,
    borderRadius: 6,
    marginLeft: 6,
  },
  swipeActionText: {
    fontSize: 12,
    color: '#F5F0E8',
    letterSpacing: 2,
  },
});
