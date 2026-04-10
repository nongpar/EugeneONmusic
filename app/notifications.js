import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Platform,
} from 'react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
};

const NOTIF_TYPE_LABELS = {
  chat: '채팅',
  schedule: '레슨',
  announcement: '공지',
  mentor: '멘토십',
};


// ── Notification Card ──

function NotificationCard({ item, onPress }) {
  const IconComp = NOTIF_ICONS[item.type] || MegaphoneIcon;
  const typeLabel = NOTIF_TYPE_LABELS[item.type] || '알림';

  return (
    <TouchableOpacity
      style={[styles.card, !item.read && styles.cardUnread]}
      activeOpacity={0.7}
      onPress={() => onPress(item)}
    >
      <StaffLines />
      {/* 읽지 않은 알림 표시 */}
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
          createdAt: data.createdAt,
          data: data.data || {},
          audience: data.audience || 'all',
        };
      });

      // 대상 필터: audience가 있으면 해당 역할만
      const filtered = firestoreNotifs.filter((n) => {
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

  const FILTERS = [
    { key: 'all', label: '전체' },
    { key: 'chat', label: '채팅' },
    { key: 'schedule', label: '레슨' },
    { key: 'announcement', label: '공지' },
    { key: 'mentor', label: '멘토십' },
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
        <TouchableOpacity onPress={handleMarkAllRead} style={styles.markReadBtn}>
          <Text style={styles.markReadText}>모두 읽음</Text>
        </TouchableOpacity>
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
            <NotificationCard item={item} onPress={handlePress} />
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
  markReadBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  markReadText: {
    fontSize: 13,
    color: '#C9A96E',
    fontWeight: '400',
    letterSpacing: 0.3,
  },

  // Filters
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(201,169,110,0.1)',
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
