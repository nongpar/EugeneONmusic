import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Platform, Alert,
} from 'react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import {
  collection, query, where, orderBy, onSnapshot, updateDoc, doc, arrayUnion,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';

let Haptics = null;
if (Platform.OS !== 'web') {
  try { Haptics = require('expo-haptics'); } catch {}
}

// ── SVG Icons ──

function BackIcon({ size = 24, color = '#F5F0E8' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChatIcon({ size = 20, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CalendarIcon({ size = 20, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MegaphoneIcon({ size = 20, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.73 21a2 2 0 01-3.46 0" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function UserPlusIcon({ size = 20, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <SvgCircle cx="8.5" cy="7" r="4" stroke={color} strokeWidth={1.5} />
      <Path d="M20 8v6M23 11h-6" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CurationIcon({ size = 20, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18V5l12-2v13" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <SvgCircle cx="6" cy="18" r="3" stroke={color} strokeWidth={1.5} />
      <SvgCircle cx="18" cy="16" r="3" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

function TrashIcon({ size = 14, color = 'rgba(201,169,110,0.7)' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function EmptyBellIcon({ size = 56, color = 'rgba(201,169,110,0.2)' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.73 21a2 2 0 01-3.46 0" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}

// ── Manuscript Decorations ──

function StaffLines() {
  return (
    <View style={styles.staffLines} pointerEvents="none">
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} style={styles.staffLine} />
      ))}
    </View>
  );
}

// ── Helpers ──

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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

const NOTIF_ICONS = {
  chat: ChatIcon,
  schedule: CalendarIcon,
  announcement: MegaphoneIcon,
  mentor: UserPlusIcon,
  experienceInquiry: CurationIcon,
};

const NOTIF_TYPE_LABELS = {
  chat: '채팅',
  schedule: '레슨',
  announcement: '공지',
  mentor: '멘토십',
  experienceInquiry: 'AI 상담',
};


// ── Notification Card ──

function NotificationCard({ item, onPress, onDelete }) {
  const IconComp = NOTIF_ICONS[item.type] || MegaphoneIcon;
  const typeLabel = NOTIF_TYPE_LABELS[item.type] || '알림';

  const renderRightActions = () => (
    <TouchableOpacity
      style={styles.swipeDeleteAction}
      activeOpacity={0.8}
      onPress={() => onDelete(item)}
    >
      <TrashIcon size={20} color="#F5F0E8" />
      <Text style={styles.swipeDeleteText}>삭제</Text>
    </TouchableOpacity>
  );

  const cardInner = (
    <TouchableOpacity
      style={[styles.card, !item.read && styles.cardUnread]}
      activeOpacity={0.7}
      onPress={() => onPress(item)}
    >
      <StaffLines />
      {!item.read && <View style={styles.unreadDot} />}

      <View style={styles.cardIconWrap}>
        <IconComp size={20} />
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{typeLabel}</Text>
          </View>
          <Text style={styles.cardTime}>
            {item.createdAt ? formatTime(item.createdAt) : ''}
          </Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>
      </View>
    </TouchableOpacity>
  );

  // 읽은 알림만 스와이프 삭제 가능
  if (!item.read) return cardInner;

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
      onSwipeableWillOpen={() => {
        Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
    >
      {cardInner}
    </Swipeable>
  );
}

// ── Main Screen ──

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  const unreadCount = notifications.filter(n => !n.read).length;

  // Firestore에서 알림 실시간 로드
  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreNotifs = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          type: data.type || 'announcement',
          title: data.title || '',
          body: data.body || '',
          read: data.readBy?.includes(user.uid) || false,
          readBy: data.readBy || [],
          deletedBy: data.deletedBy || [],
          createdAt: data.createdAt,
          data: data.data || {},
          audience: data.audience || 'all',
        };
      });

      // 대상 필터: audience + 삭제한 본인 제외
      const filtered = firestoreNotifs.filter((n) => {
        if (n.deletedBy?.includes(user.uid)) return false;
        if (!n.audience || n.audience === 'all') return true;
        return n.audience === user.role;
      });

      setNotifications(filtered);
      setLoading(false);
    }, () => {
      setNotifications([]);
      setLoading(false);
    });

    return unsubscribe;
  }, [user?.uid]);

  const handlePress = async (item) => {
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // 읽음 처리 (로컬)
    setNotifications(prev =>
      prev.map(n => n.id === item.id ? { ...n, read: true } : n)
    );

    // Firestore 읽음 처리 (arrayUnion으로 안전하게)
    if (user?.uid) {
      try {
        await updateDoc(doc(db, 'notifications', item.id), {
          readBy: arrayUnion(user.uid),
        });
      } catch {}
    }

    // 네비게이션
    if (item.data?.chatRoomId) {
      router.push(`/chat/${item.data.chatRoomId}`);
    } else if (item.data?.screen) {
      router.push(item.data.screen);
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      '알림 삭제',
      '이 알림을 삭제할까요? 내 목록에서만 제거됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setNotifications(prev => prev.filter(n => n.id !== item.id));
            if (user?.uid) {
              try {
                await updateDoc(doc(db, 'notifications', item.id), {
                  deletedBy: arrayUnion(user.uid),
                });
              } catch {}
            }
          },
        },
      ]
    );
  };

  const handleDeleteAllRead = () => {
    const readItems = notifications.filter(n => n.read);
    if (readItems.length === 0) return;
    Alert.alert(
      '읽은 알림 모두 삭제',
      `읽은 알림 ${readItems.length}개를 삭제할까요? 내 목록에서만 제거됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const ids = new Set(readItems.map(n => n.id));
            setNotifications(prev => prev.filter(n => !ids.has(n.id)));
            if (user?.uid) {
              await Promise.all(
                readItems.map((item) =>
                  updateDoc(doc(db, 'notifications', item.id), {
                    deletedBy: arrayUnion(user.uid),
                  }).catch(() => {})
                )
              );
            }
          },
        },
      ]
    );
  };

  const handleMarkAllRead = async () => {
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    // Firestore 읽음 처리
    if (user?.uid) {
      const unreadItems = notifications.filter(n => !n.read);
      const promises = unreadItems.map((item) =>
        updateDoc(doc(db, 'notifications', item.id), {
          readBy: arrayUnion(user.uid),
        }).catch(() => {})
      );
      await Promise.all(promises);
    }
  };

  const isTeacher = user?.role === 'teacher';
  const FILTERS = [
    { key: 'all', label: '전체' },
    { key: 'chat', label: '채팅' },
    { key: 'schedule', label: '레슨' },
    { key: 'announcement', label: '공지' },
    { key: 'mentor', label: '멘토십' },
    ...(isTeacher ? [{ key: 'experienceInquiry', label: 'AI 상담' }] : []),
  ];

  const filtered = activeFilter === 'all'
    ? notifications
    : notifications.filter(n => n.type === activeFilter);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <BackIcon />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>알림</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.markReadBtn}>
              <Text style={styles.markReadText}>모두 읽음</Text>
            </TouchableOpacity>
          )}
          {notifications.some(n => n.read) && (
            <TouchableOpacity onPress={handleDeleteAllRead} style={styles.markReadBtn}>
              <Text style={styles.deleteAllText}>모두 삭제</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, activeFilter === f.key && styles.filterBtnActive]}
            onPress={() => {
              Haptics?.selectionAsync();
              setActiveFilter(f.key);
            }}
          >
            <Text style={[styles.filterLabel, activeFilter === f.key && styles.filterLabelActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 관리자용 — AI 상담 필터 활성 시 전체 신청서 관리 화면으로 */}
      {isTeacher && activeFilter === 'experienceInquiry' && (
        <TouchableOpacity
          style={styles.inquiriesBanner}
          activeOpacity={0.7}
          onPress={() => {
            Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/admin/inquiries');
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.inquiriesBannerTitle}>신청서 관리 전체 보기</Text>
            <Text style={styles.inquiriesBannerSub}>상태별 필터 · 대화 이력 · 상태 변경</Text>
          </View>
          <Text style={styles.inquiriesBannerArrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* Notification list */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <NotificationCard item={item} onPress={handlePress} onDelete={handleDelete} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <EmptyBellIcon />
              <Text style={styles.emptyTitle}>알림이 없습니다</Text>
              <Text style={styles.emptySubtitle}>새로운 소식이 오면 여기에 표시됩니다</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#110E0B',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(201,169,110,0.15)',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '300',
    color: '#F5F0E8',
    letterSpacing: 1,
  },
  headerBadge: {
    backgroundColor: '#C9A96E',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#110E0B',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markReadBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  markReadText: {
    fontSize: 13,
    color: '#C9A96E',
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  deleteAllText: {
    fontSize: 13,
    color: 'rgba(220,140,140,0.9)',
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  swipeDeleteAction: {
    backgroundColor: 'rgba(180,60,60,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 10,
    borderRadius: 4,
    gap: 4,
  },
  swipeDeleteText: {
    color: '#F5F0E8',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  // Filters
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(201,169,110,0.1)',
  },
  inquiriesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(201,169,110,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(201,169,110,0.35)',
    borderRadius: 4,
    gap: 10,
  },
  inquiriesBannerTitle: {
    fontSize: 14,
    color: '#F5F0E8',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  inquiriesBannerSub: {
    fontSize: 11,
    color: '#9e9282',
    marginTop: 2,
  },
  inquiriesBannerArrow: {
    fontSize: 18,
    color: '#C9A96E',
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(201,169,110,0.07)',
    borderWidth: 0.5,
    borderColor: 'rgba(201,169,110,0.18)',
  },
  filterBtnActive: {
    backgroundColor: 'transparent',
    borderColor: '#C9A96E',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: '#9e9282',
    letterSpacing: 0.3,
  },
  filterLabelActive: {
    color: '#C9A96E',
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245,240,225,0.04)',
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(180,150,100,0.15)',
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(201,169,110,0.15)',
    padding: 14,
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  cardUnread: {
    backgroundColor: 'rgba(245,240,225,0.07)',
    borderLeftColor: '#C9A96E',
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C9A96E',
  },
  staffLines: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 6,
    height: 24,
    justifyContent: 'space-between',
  },
  staffLine: {
    height: 0.5,
    backgroundColor: 'rgba(180,150,100,0.07)',
  },

  // Card icon
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: 'rgba(201,169,110,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(201,169,110,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  // Card content
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(201,169,110,0.1)',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#C9A96E',
    letterSpacing: 1,
  },
  cardTime: {
    fontSize: 11,
    color: '#9e9282',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#F5F0E8',
    marginTop: 2,
  },
  cardBody: {
    fontSize: 13,
    color: '#9e9282',
    lineHeight: 18,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '300',
    color: '#9e9282',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(201,169,110,0.4)',
    textAlign: 'center',
  },
});
