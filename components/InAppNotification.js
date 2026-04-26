import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  Platform, Dimensions,
} from 'react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

// ── Icons ──

function ChatBubbleIcon({ size = 18, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function BellSmallIcon({ size = 18, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.73 21a2 2 0 01-3.46 0" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function CalendarSmallIcon({ size = 18, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function UserSmallIcon({ size = 18, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <SvgCircle cx="8.5" cy="7" r="4" stroke={color} strokeWidth={1.5} />
      <Path d="M20 8v6M23 11h-6" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const TYPE_ICONS = {
  chat: ChatBubbleIcon,
  announcement: BellSmallIcon,
  event: BellSmallIcon,
  schedule: CalendarSmallIcon,
  lesson: CalendarSmallIcon,
  mentor: UserSmallIcon,
};

const TYPE_LABELS = {
  chat: '채팅',
  announcement: '공지',
  event: '이벤트',
  schedule: '레슨',
  lesson: '레슨',
  mentor: '멘토십',
};

// ── Banner Component ──

function NotificationBanner({ notification, onDismiss, onPress, insets }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 슬라이드 다운
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // 4초 후 자동 닫기
    const timer = setTimeout(() => dismiss(), 4000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  };

  const IconComp = TYPE_ICONS[notification.type] || BellSmallIcon;
  const typeLabel = TYPE_LABELS[notification.type] || '알림';

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          paddingTop: (insets?.top || 0) + 8,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.bannerContent}
        activeOpacity={0.8}
        onPress={() => {
          dismiss();
          if (onPress) onPress(notification);
        }}
      >
        {/* 아이콘 */}
        <View style={styles.bannerIcon}>
          <IconComp color={colors.accent} />
        </View>

        {/* 텍스트 */}
        <View style={styles.bannerText}>
          <View style={styles.bannerTopRow}>
            <Text style={styles.bannerType}>{typeLabel}</Text>
            <Text style={styles.bannerTime}>방금</Text>
          </View>
          <Text style={styles.bannerTitle} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.bannerBody} numberOfLines={1}>
            {notification.body}
          </Text>
        </View>

        {/* 닫기 */}
        <TouchableOpacity onPress={dismiss} style={styles.bannerClose}>
          <Text style={styles.bannerCloseText}>x</Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {/* 하단 골드 라인 */}
      <View style={styles.bannerBottomLine} />
    </Animated.View>
  );
}

// ── Main Provider ──

export default function InAppNotification() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [bannerQueue, setBannerQueue] = useState([]);
  const lastNotifTime = useRef(null);
  const initialLoad = useRef(true);

  // Firestore notifications 컬렉션 감시 (새 알림 감지)
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // 최초 로드는 무시 (기존 알림에 배너를 띄우지 않음)
      if (initialLoad.current) {
        initialLoad.current = false;
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          lastNotifTime.current = data.createdAt?.toMillis?.() || 0;
        }
        return;
      }

      if (snapshot.empty) return;

      const docSnap = snapshot.docs[0];
      const data = docSnap.data();
      const createdAtMs = data.createdAt?.toMillis?.() || 0;

      // 이미 표시한 알림이면 무시
      if (lastNotifTime.current && createdAtMs <= lastNotifTime.current) return;
      lastNotifTime.current = createdAtMs;

      // 자기가 보낸 알림이면 무시
      if (data.senderId === user.uid) return;

      // 대상 필터
      if (data.audience && data.audience !== 'all' && data.audience !== user.role) return;

      const notif = {
        id: docSnap.id,
        type: data.type || 'announcement',
        title: data.title || '',
        body: data.body || '',
        data: data.data || {},
      };

      setBannerQueue(prev => [...prev, notif]);
    }, () => {});

    return unsubscribe;
  }, [user?.uid]);

  // 채팅 메시지 감시 (내가 참여한 채팅방의 새 메시지)
  useEffect(() => {
    if (!user?.uid) return;

    const roomsQ = query(
      collection(db, 'chatRooms'),
      where('memberIds', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(roomsQ, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const data = change.doc.data();
          const lastSender = data.lastMessageSenderId || data.lastSenderId;

          // 내가 보낸 메시지면 무시
          if (lastSender === user.uid) return;

          // unread가 증가했을 때만
          const myUnread = data.unread?.[user.uid] || 0;
          if (myUnread <= 0) return;

          const other = data.participants?.find(p => p.uid !== user.uid);
          const senderName = other?.name || '알 수 없음';

          const notif = {
            id: `chat-${change.doc.id}-${Date.now()}`,
            type: 'chat',
            title: `${senderName}${other?.role === 'teacher' ? ' 선생님' : ''}`,
            body: data.lastMessage || '새 메시지가 도착했습니다',
            data: { chatRoomId: change.doc.id },
          };

          setBannerQueue(prev => {
            // 같은 채팅방 알림이 이미 큐에 있으면 대체
            const filtered = prev.filter(n => !n.id.startsWith(`chat-${change.doc.id}`));
            return [...filtered, notif];
          });
        }
      });
    }, () => {});

    return unsubscribe;
  }, [user?.uid]);

  const handleDismiss = useCallback(() => {
    setBannerQueue(prev => prev.slice(1));
  }, []);

  const handlePress = useCallback((notification) => {
    if (notification.data?.chatRoomId) {
      router.push(`/chat/${notification.data.chatRoomId}`);
    } else if (notification.data?.screen) {
      router.push(notification.data.screen);
    } else {
      router.push('/notifications');
    }
  }, []);

  // 현재 보여줄 배너 (큐의 첫번째)
  const current = bannerQueue[0];

  if (!current) return null;

  return (
    <NotificationBanner
      key={current.id}
      notification={current}
      onDismiss={handleDismiss}
      onPress={handlePress}
      insets={insets}
    />
  );
}

// ── Styles ──

const makeStyles = (c) => StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: c.bgElevated,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 4,
    backgroundColor: 'rgba(201,169,110,0.12)',
    borderWidth: 0.5,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
  bannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerType: {
    fontSize: 10,
    fontWeight: '500',
    color: c.accent,
    letterSpacing: 1,
  },
  bannerTime: {
    fontSize: 10,
    color: c.textMuted,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: c.text,
  },
  bannerBody: {
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 16,
  },
  bannerClose: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerCloseText: {
    fontSize: 14,
    color: c.textMuted,
    fontWeight: '300',
  },
  bannerBottomLine: {
    height: 1.5,
    backgroundColor: c.border,
    marginHorizontal: 20,
    borderRadius: 1,
    marginBottom: 4,
  },
});
