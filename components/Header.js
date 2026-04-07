import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Animated, TouchableWithoutFeedback, Modal,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function BellIcon({ size = 22, color = '#8a9bae' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.73 21a2 2 0 01-3.46 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function ChevronRight({ size = 14, color = '#5a6a7a' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// 시간 포맷
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

// 알림 드롭다운 패널
function NotificationPanel({ visible, onClose, rooms, insets }) {
  const panelAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(panelAnim, {
          toValue: 1,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(panelAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const handleRoomPress = (room) => {
    handleClose();
    setTimeout(() => {
      router.push({ pathname: '/chat/[id]', params: { id: room.id } });
    }, 200);
  };

  const translateY = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 0],
  });

  const totalUnread = rooms.reduce((sum, r) => sum + r.unreadCount, 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* 배경 오버레이 */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
      </TouchableWithoutFeedback>

      {/* 드롭다운 패널 */}
      <Animated.View
        style={[
          styles.panel,
          { paddingTop: insets.top + 8, transform: [{ translateY }] },
        ]}
      >
        {/* 패널 헤더 */}
        <View style={styles.panelHeader}>
          <View style={styles.panelTitleRow}>
            <Text style={styles.panelTitle}>새 메시지</Text>
            {totalUnread > 0 && (
              <View style={styles.panelBadge}>
                <Text style={styles.panelBadgeText}>{totalUnread}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>닫기</Text>
          </TouchableOpacity>
        </View>

        {rooms.length === 0 ? (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyText}>새로운 메시지가 없습니다</Text>
          </View>
        ) : (
          rooms.slice(0, 5).map((room, index) => (
            <TouchableOpacity
              key={room.id}
              style={[
                styles.roomItem,
                index === Math.min(rooms.length, 5) - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => handleRoomPress(room)}
              activeOpacity={0.6}
            >
              {/* 아바타 */}
              <View style={[
                styles.roomAvatar,
                room.role === 'teacher' && styles.roomAvatarTeacher,
              ]}>
                <Text style={styles.roomAvatarText}>
                  {room.name.charAt(0).toUpperCase()}
                </Text>
              </View>

              {/* 메시지 정보 */}
              <View style={styles.roomInfo}>
                <View style={styles.roomNameRow}>
                  <Text style={styles.roomName} numberOfLines={1}>
                    {room.name}
                    {room.role === 'teacher' ? ' 선생님' : ''}
                  </Text>
                  <Text style={styles.roomTime}>
                    {formatTime(room.lastMessageTime)}
                  </Text>
                </View>
                <View style={styles.roomMsgRow}>
                  <Text style={styles.roomMessage} numberOfLines={1}>
                    {room.lastMessage}
                  </Text>
                  {room.unreadCount > 0 && (
                    <View style={styles.roomUnread}>
                      <Text style={styles.roomUnreadText}>
                        {room.unreadCount > 99 ? '99+' : room.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <ChevronRight />
            </TouchableOpacity>
          ))
        )}

        {/* 핸들 바 */}
        <View style={styles.handleBar}>
          <View style={styles.handle} />
        </View>
      </Animated.View>
    </Modal>
  );
}

export default function Header() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadRooms, setUnreadRooms] = useState([]);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setUnreadCount(0);
      setUnreadRooms([]);
      return;
    }

    const roomsQ = query(
      collection(db, 'chatRooms'),
      where('memberIds', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(roomsQ, (snapshot) => {
      let total = 0;
      const rooms = [];

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const myUnread = data.unread?.[user.uid] || 0;
        total += myUnread;

        if (myUnread > 0) {
          const other = data.participants?.find((p) => p.uid !== user.uid);
          rooms.push({
            id: docSnap.id,
            name: other?.name || '알 수 없음',
            role: other?.role || 'student',
            lastMessage: data.lastMessage || '',
            lastMessageTime: data.lastMessageTime,
            unreadCount: myUnread,
          });
        }
      });

      // 최신 메시지 순으로 정렬
      rooms.sort((a, b) => {
        const timeA = a.lastMessageTime?.toDate?.() || new Date(0);
        const timeB = b.lastMessageTime?.toDate?.() || new Date(0);
        return timeB - timeA;
      });

      setUnreadCount(total);
      setUnreadRooms(rooms);
    }, () => {
      setUnreadCount(0);
      setUnreadRooms([]);
    });

    return unsubscribe;
  }, [user?.uid]);

  return (
    <>
      <View style={styles.container}>
        <View style={styles.logoRow}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.logoText}>EON International</Text>
            <Text style={styles.logoAccent}>Music Academy</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.notificationBtn}
          onPress={() => setShowPanel(true)}
          activeOpacity={0.7}
        >
          <BellIcon />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <NotificationPanel
        visible={showPanel}
        onClose={() => setShowPanel(false)}
        rooms={unreadRooms}
        insets={insets}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#0f1923',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoImage: {
    width: 38,
    height: 38,
  },
  logoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  logoAccent: {
    fontSize: 11,
    fontWeight: '500',
    color: '#C9A96E',
    letterSpacing: 0.5,
  },
  notificationBtn: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // 오버레이
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },

  // 패널
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#141f2b',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: '#C9A96E40',
  },

  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e2d3d',
  },
  panelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  panelBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  panelBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  closeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  closeBtnText: {
    fontSize: 13,
    color: '#5a6a7a',
    fontWeight: '600',
  },

  // 빈 상태
  emptyPanel: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 28,
  },
  emptyText: {
    fontSize: 14,
    color: '#5a6a7a',
  },

  // 채팅방 아이템
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2a38',
  },
  roomAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2C5F8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomAvatarTeacher: {
    backgroundColor: '#C9A96E',
  },
  roomAvatarText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  roomInfo: {
    flex: 1,
    gap: 4,
  },
  roomNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    marginRight: 8,
  },
  roomTime: {
    fontSize: 11,
    color: '#5a6a7a',
  },
  roomMsgRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomMessage: {
    fontSize: 13,
    color: '#6b7b8d',
    flex: 1,
    marginRight: 8,
  },
  roomUnread: {
    backgroundColor: '#C9A96E',
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  roomUnreadText: {
    color: '#0f1923',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // 핸들 바
  handleBar: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2a3a4a',
  },
});
