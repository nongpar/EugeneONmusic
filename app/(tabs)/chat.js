import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, serverTimestamp, getDocs, doc, getDoc, updateDoc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';

const ROLE_COLORS = { teacher: '#C9A96E', student: '#2C5F8A' };

// ── SVG 아이콘 ──
function ChatIcon({ size = 48, color = 'rgba(201,169,110,0.3)' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MentorIcon({ size = 20, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth={2} />
      <Path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function SendIcon({ size = 18, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SettingsIcon({ size = 20, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
      <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

// ── 채팅방 아이템 ──
function ChatRoomItem({ room, currentUid }) {
  const other = room.participants?.find((p) => p.uid !== currentUid) || {};
  const initial = (other.name || '?').charAt(0).toUpperCase();
  const role = other.role || 'student';
  const roleLabel = role === 'teacher' ? '선생님' : '학생';
  const lastMsg = room.lastMessage || '새로운 대화를 시작하세요';
  const time = room.lastMessageAt?.toDate?.();
  const timeStr = time
    ? `${time.getMonth() + 1}/${time.getDate()} ${time.getHours()}:${String(time.getMinutes()).padStart(2, '0')}`
    : '';
  const myUnread = room.unread?.[currentUid] || 0;

  return (
    <TouchableOpacity
      style={styles.roomCard}
      onPress={() => router.push(`/chat/${room.id}`)}
    >
      <View style={[styles.avatar, { backgroundColor: ROLE_COLORS[role] }]}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.roomInfo}>
        <View style={styles.roomTop}>
          <View style={styles.nameRow}>
            <Text style={styles.roomName}>{other.name || '알 수 없음'}</Text>
            <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[role] + '25' }]}>
              <Text style={[styles.roleText, { color: ROLE_COLORS[role] }]}>{roleLabel}</Text>
            </View>
          </View>
          <Text style={styles.timeText}>{timeStr}</Text>
        </View>
        <Text style={styles.lastMsg} numberOfLines={1}>{lastMsg}</Text>
      </View>
      {myUnread > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{myUnread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── 멘토 신청 버튼 (학생용) ──
function MentorRequestSection({ user }) {
  const [requesting, setRequesting] = useState(false);
  const [hasRequest, setHasRequest] = useState(false);

  useEffect(() => {
    if (!user) return;
    // 기존 활성 멘토 신청 확인 (ended/rejected 제외)
    const q = query(
      collection(db, 'mentorships'),
      where('studentId', '==', user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const activeRequest = snap.docs.some((d) => {
        const status = d.data().status;
        return status === 'pending' || status === 'active';
      });
      setHasRequest(activeRequest);
    });
    return unsub;
  }, [user]);

  const handleRequest = async () => {
    if (hasRequest) {
      Alert.alert('안내', '이미 멘토 신청이 되어있거나 진행 중입니다.');
      return;
    }
    setRequesting(true);
    try {
      await addDoc(collection(db, 'mentorships'), {
        studentId: user.uid,
        studentName: user.displayName || user.email,
        teacherId: null,
        teacherName: null,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      Alert.alert('신청 완료', '멘토 신청이 완료되었습니다.\n담당 선생님이 배정되면 채팅이 활성화됩니다.');
    } catch (err) {
      Alert.alert('오류', '멘토 신청에 실패했습니다.');
    }
    setRequesting(false);
  };

  if (hasRequest) return null;

  return (
    <TouchableOpacity style={styles.mentorBtn} onPress={handleRequest} disabled={requesting}>
      <MentorIcon />
      <View style={styles.mentorTextWrap}>
        <Text style={styles.mentorBtnTitle}>멘토 신청하기</Text>
        <Text style={styles.mentorBtnSub}>담당 선생님과 1:1 채팅을 시작합니다</Text>
      </View>
      <SendIcon />
    </TouchableOpacity>
  );
}

// ── 대기 중 표시 ──
function PendingSection() {
  return (
    <View style={styles.pendingCard}>
      <View style={styles.pendingDot} />
      <View>
        <Text style={styles.pendingTitle}>멘토 배정 대기 중</Text>
        <Text style={styles.pendingSub}>담당 선생님이 배정되면 알려드립니다</Text>
      </View>
    </View>
  );
}

// ── 비로그인 안내 ──
function NotLoggedInView() {
  return (
    <View style={styles.emptyContainer}>
      <ChatIcon />
      <Text style={styles.emptyTitle}>로그인이 필요합니다</Text>
      <Text style={styles.emptySub}>로그인 후 선생님과 1:1 채팅을 이용하세요</Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/auth/login')}>
        <Text style={styles.emptyBtnText}>로그인</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── 메인 화면 ──
export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [mentorships, setMentorships] = useState([]);
  const [loading, setLoading] = useState(true);

  const isTeacher = user?.role === 'teacher';

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // 채팅방 실시간 구독 (복합 인덱스 불필요하도록 클라이언트 정렬)
    const roomQ = query(
      collection(db, 'chatRooms'),
      where('memberIds', 'array-contains', user.uid)
    );
    const unsubRooms = onSnapshot(roomQ, (snap) => {
      const roomList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // 클라이언트에서 lastMessageAt 기준 정렬
      roomList.sort((a, b) => {
        const ta = a.lastMessageAt?.toMillis?.() || 0;
        const tb = b.lastMessageAt?.toMillis?.() || 0;
        return tb - ta;
      });
      setRooms(roomList);
      setLoading(false);
    }, (err) => {
      console.error('[Chat] rooms query error:', err.message || err);
      setLoading(false);
    });

    // 멘토십 상태 구독
    const mentorField = isTeacher ? 'teacherId' : 'studentId';
    const mentorQ = query(
      collection(db, 'mentorships'),
      where(mentorField, '==', user.uid)
    );
    const unsubMentor = onSnapshot(mentorQ, async (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMentorships(list);

      // 깨진 멘토십 자동 정리: active 상태인데 채팅방이 삭제된 경우
      for (const m of list) {
        if (m.status === 'active' && m.chatRoomId) {
          try {
            const roomSnap = await getDoc(doc(db, 'chatRooms', m.chatRoomId));
            if (!roomSnap.exists()) {
              // 채팅방이 삭제됨 → 멘토십을 ended로 변경
              await updateDoc(doc(db, 'mentorships', m.id), {
                status: 'ended',
                endedAt: serverTimestamp(),
                endReason: 'chatRoom_deleted',
              });
            }
          } catch {}
        }
      }
    });

    return () => {
      unsubRooms();
      unsubMentor();
    };
  }, [user, isTeacher]);

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>채팅</Text>
        </View>
        <NotLoggedInView />
      </View>
    );
  }

  const hasPending = mentorships.some((m) => m.status === 'pending');
  const hasActive = mentorships.some((m) => m.status === 'active');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>채팅</Text>
          <Text style={styles.screenSub}>
            {isTeacher ? '담당 학생 목록' : '선생님과의 대화'}
          </Text>
        </View>
        {isTeacher && (
          <TouchableOpacity
            style={styles.mentorManageBtn}
            onPress={() => router.push('/mentor')}
          >
            <SettingsIcon size={16} />
            <Text style={styles.mentorManageBtnText}>멘토 관리</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatRoomItem room={item} currentUid={user.uid} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <>
              {/* 학생: 멘토 신청 버튼 */}
              {!isTeacher && !hasActive && !hasPending && (
                <MentorRequestSection user={user} />
              )}
              {/* 학생: 대기 중 표시 */}
              {!isTeacher && hasPending && !hasActive && <PendingSection />}
            </>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyList}>
              <ChatIcon size={36} />
              <Text style={styles.emptyListText}>
                {isTeacher
                  ? '아직 배정된 학생이 없습니다'
                  : hasActive
                    ? '채팅방이 준비되고 있습니다'
                    : '멘토를 신청하면 선생님과 대화할 수 있습니다'}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#110E0B' },

  /* 헤더 */
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(201,169,110,0.15)',
  },
  screenTitle: { fontSize: 20, fontWeight: '300', color: '#F5F0E8', letterSpacing: 0.5 },
  screenSub: { fontSize: 12, color: '#9e9282', marginTop: 2 },
  mentorManageBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#C9A96E20', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 4, borderWidth: 0.5, borderColor: '#C9A96E30',
  },
  mentorManageBtnText: { fontSize: 12, fontWeight: '400', color: '#C9A96E', letterSpacing: 0.3 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#9e9282', fontSize: 16 },
  listContent: { paddingHorizontal: 20 },

  /* 멘토 신청 */
  mentorBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(201,169,110,0.07)', borderRadius: 4, padding: 16,
    marginVertical: 12, borderWidth: 0.5, borderColor: '#C9A96E30',
  },
  mentorTextWrap: { flex: 1 },
  mentorBtnTitle: { fontSize: 15, fontWeight: '400', color: '#C9A96E', letterSpacing: 0.3 },
  mentorBtnSub: { fontSize: 12, color: '#9e9282', marginTop: 2 },

  /* 대기 중 */
  pendingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(201,169,110,0.07)', borderRadius: 4, padding: 14,
    marginVertical: 12, borderWidth: 0.5, borderColor: 'rgba(201,169,110,0.18)',
  },
  pendingDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#fbbf24',
  },
  pendingTitle: { fontSize: 14, fontWeight: '400', color: '#fbbf24' },
  pendingSub: { fontSize: 12, color: '#9e9282' },

  /* 채팅방 아이템 */
  roomCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(201,169,110,0.15)',
    gap: 12,
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '300', color: '#fff' },
  roomInfo: { flex: 1, gap: 4 },
  roomTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roomName: { fontSize: 15, fontWeight: '400', color: '#F5F0E8' },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  roleText: { fontSize: 10, fontWeight: '400' },
  timeText: { fontSize: 11, color: '#9e9282' },
  lastMsg: { fontSize: 13, color: '#9e9282' },
  unreadBadge: {
    backgroundColor: '#e74c3c', borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: { fontSize: 11, fontWeight: '400', color: '#fff' },

  /* 빈 상태 */
  emptyContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: '300', color: '#F5F0E8', letterSpacing: 0.3 },
  emptySub: { fontSize: 14, color: '#9e9282', textAlign: 'center' },
  emptyBtn: {
    backgroundColor: '#C9A96E', borderRadius: 4,
    paddingVertical: 12, paddingHorizontal: 32, marginTop: 8,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '400', color: '#110E0B', letterSpacing: 0.3 },
  emptyList: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyListText: { fontSize: 14, color: '#9e9282', textAlign: 'center' },
});
