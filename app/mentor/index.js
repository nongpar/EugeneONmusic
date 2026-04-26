import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
  ActivityIndicator, Platform,
} from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  collection, query, where, orderBy, onSnapshot,
  doc, updateDoc, addDoc, serverTimestamp, getDocs, getDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { sendPushNotification } from '../../hooks/useNotifications';

// ── SVG 아이콘 ──
function BackIcon({ size = 22, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function UserPlusIcon({ size = 22, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="8.5" cy="7" r="4" stroke={color} strokeWidth={2} />
      <Line x1="20" y1="8" x2="20" y2="14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="23" y1="11" x2="17" y2="11" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function CheckIcon({ size = 18, color = '#4ade80' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function XIcon({ size = 18, color = '#f87171' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ClockIcon({ size = 14, color = '#fbbf24' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path d="M12 6v6l4 2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ActiveIcon({ size = 14, color = '#4ade80' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path d="M8 12l3 3 5-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── 대기 중 멘토 신청 카드 ──
function PendingRequestCard({ mentorship, onAccept, onReject, accepting }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const createdAt = mentorship.createdAt?.toDate?.();
  const dateStr = createdAt
    ? `${createdAt.getFullYear()}.${createdAt.getMonth() + 1}.${createdAt.getDate()}`
    : '';

  return (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={[styles.avatar, { backgroundColor: '#2C5F8A' }]}>
          <Text style={styles.avatarText}>
            {(mentorship.studentName || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.requestInfo}>
          <Text style={styles.requestName}>{mentorship.studentName || '알 수 없음'}</Text>
          <View style={styles.requestMeta}>
            <ClockIcon />
            <Text style={styles.requestDate}>{dateStr} 신청</Text>
          </View>
        </View>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingBadgeText}>대기중</Text>
        </View>
      </View>

      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn]}
          onPress={() => onReject(mentorship)}
          disabled={accepting}
        >
          <XIcon />
          <Text style={styles.rejectBtnText}>거절</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.acceptBtn]}
          onPress={() => onAccept(mentorship)}
          disabled={accepting}
        >
          {accepting ? (
            <ActivityIndicator size="small" color={colors.bg} />
          ) : (
            <>
              <CheckIcon color={colors.bg} />
              <Text style={styles.acceptBtnText}>수락</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── 활성 멘토십 카드 ──
function ActiveMentorshipCard({ mentorship, onDisconnect }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const handleChat = () => {
    if (mentorship.chatRoomId) {
      router.push(`/chat/${mentorship.chatRoomId}`);
    }
  };

  return (
    <TouchableOpacity style={styles.activeCard} onPress={handleChat} activeOpacity={0.7}>
      <View style={[styles.avatar, { backgroundColor: '#2C5F8A' }]}>
        <Text style={styles.avatarText}>
          {(mentorship.studentName || '?').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.activeInfo}>
        <Text style={styles.activeName}>{mentorship.studentName || '알 수 없음'}</Text>
        <View style={styles.activeMetaRow}>
          <ActiveIcon />
          <Text style={styles.activeStatus}>멘토링 진행 중</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.disconnectBtn}
        onPress={(e) => { e.stopPropagation(); onDisconnect(mentorship); }}
        activeOpacity={0.7}
      >
        <Text style={styles.disconnectBtnText}>해제</Text>
      </TouchableOpacity>
      <View style={styles.chatBtnSmall}>
        <Text style={styles.chatBtnSmallText}>채팅</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── 메인 화면 ──
export default function MentorManageScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [pendingList, setPendingList] = useState([]);
  const [activeList, setActiveList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // 대기 중 멘토 신청 (복합 인덱스 불필요하도록 클라이언트 정렬)
    const pendingQ = query(
      collection(db, 'mentorships'),
      where('status', '==', 'pending')
    );
    const unsubPending = onSnapshot(pendingQ, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || 0;
        const tb = b.createdAt?.toMillis?.() || 0;
        return ta - tb;
      });
      setPendingList(list);
      setLoading(false);
    }, (err) => {
      console.error('[Mentor] pending query error:', err.message || err);
      setLoading(false);
    });

    // 내가 담당하는 활성 멘토십
    const activeQ = query(
      collection(db, 'mentorships'),
      where('teacherId', '==', user.uid),
      where('status', '==', 'active')
    );
    const unsubActive = onSnapshot(activeQ, (snap) => {
      setActiveList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubPending();
      unsubActive();
    };
  }, [user]);

  // 웹/네이티브 호환 confirm 함수
  const confirmAction = (title, message) => {
    return new Promise((resolve) => {
      if (Platform.OS === 'web') {
        resolve(window.confirm(`${title}\n\n${message}`));
      } else {
        Alert.alert(title, message, [
          { text: '취소', style: 'cancel', onPress: () => resolve(false) },
          { text: '확인', onPress: () => resolve(true) },
        ]);
      }
    });
  };

  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleAccept = async (mentorship) => {
    if (!user) return;

    const confirmed = await confirmAction(
      '멘토 수락',
      `${mentorship.studentName} 학생의 멘토 신청을 수락하시겠습니까?\n수락하면 1:1 채팅방이 생성됩니다.`
    );
    if (!confirmed) return;

    setAcceptingId(mentorship.id);
    try {
      // 1. 채팅방 생성
      const chatRoomRef = await addDoc(collection(db, 'chatRooms'), {
        memberIds: [user.uid, mentorship.studentId],
        participants: [
          {
            uid: user.uid,
            name: user.displayName || user.email,
            role: 'teacher',
          },
          {
            uid: mentorship.studentId,
            name: mentorship.studentName || '학생',
            role: 'student',
          },
        ],
        lastMessage: '멘토링이 시작되었습니다',
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        unread: {
          [user.uid]: 0,
          [mentorship.studentId]: 1,
        },
      });

      // 2. 환영 메시지 추가
      await addDoc(collection(db, 'chatRooms', chatRoomRef.id, 'messages'), {
        text: `안녕하세요! ${user.displayName || '선생님'}입니다. 멘토링을 시작합니다. 편하게 질문해주세요!`,
        senderId: user.uid,
        senderName: user.displayName || user.email,
        senderRole: 'teacher',
        createdAt: serverTimestamp(),
        read: false,
        isSystem: false,
      });

      // 3. 멘토십 상태 업데이트
      await updateDoc(doc(db, 'mentorships', mentorship.id), {
        teacherId: user.uid,
        teacherName: user.displayName || user.email,
        status: 'active',
        chatRoomId: chatRoomRef.id,
        acceptedAt: serverTimestamp(),
      });

      // 학생에게 푸시 알림 전송
      try {
        const tokenSnap = await getDoc(doc(db, 'pushTokens', mentorship.studentId));
        if (tokenSnap.exists()) {
          sendPushNotification(
            tokenSnap.data().token,
            '멘토 배정 완료!',
            `${user.displayName || '선생님'}이 멘토로 배정되었습니다. 채팅을 시작해보세요!`,
            { type: 'mentor', chatRoomId: chatRoomRef.id, screen: `/chat/${chatRoomRef.id}` }
          );
        }
      } catch {}

      showAlert('완료', `${mentorship.studentName} 학생과의 멘토링이 시작되었습니다!`);
    } catch (err) {
      console.warn('멘토 수락 실패:', err);
      showAlert('오류', '멘토 수락에 실패했습니다. 다시 시도해주세요.');
    }
    setAcceptingId(null);
  };

  const handleDisconnect = async (mentorship) => {
    const confirmed = await confirmAction(
      '멘토십 해제',
      `${mentorship.studentName} 학생과의 멘토십을 해제하시겠습니까?\n해제하면 채팅방도 비활성화됩니다.`
    );
    if (!confirmed) return;

    try {
      await updateDoc(doc(db, 'mentorships', mentorship.id), {
        status: 'ended',
        endedAt: serverTimestamp(),
      });

      if (mentorship.chatRoomId) {
        await deleteDoc(doc(db, 'chatRooms', mentorship.chatRoomId));
      }

      showAlert('완료', '멘토십이 해제되었습니다.');
    } catch (err) {
      console.warn('멘토십 해제 실패:', err);
      showAlert('오류', '멘토십 해제에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleReject = async (mentorship) => {
    const confirmed = await confirmAction(
      '멘토 거절',
      `${mentorship.studentName} 학생의 멘토 신청을 거절하시겠습니까?`
    );
    if (!confirmed) return;

    try {
      await updateDoc(doc(db, 'mentorships', mentorship.id), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
      });
    } catch (err) {
      showAlert('오류', '처리에 실패했습니다.');
    }
  };

  if (!user || user.role !== 'teacher') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <BackIcon color={colors.accent} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>멘토 관리</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>접근 권한이 없습니다</Text>
          <Text style={styles.emptySub}>선생님 계정으로 로그인해주세요</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <BackIcon color={colors.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>멘토 관리</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>불러오는 중...</Text>
        </View>
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={() => (
            <>
              {/* 대기 중 신청 */}
              <View style={styles.sectionHeader}>
                <UserPlusIcon size={18} />
                <Text style={styles.sectionTitle}>대기 중인 신청</Text>
                {pendingList.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{pendingList.length}</Text>
                  </View>
                )}
              </View>

              {pendingList.length === 0 ? (
                <View style={styles.emptySection}>
                  <Text style={styles.emptySectionText}>대기 중인 멘토 신청이 없습니다</Text>
                </View>
              ) : (
                pendingList.map((item) => (
                  <PendingRequestCard
                    key={item.id}
                    mentorship={item}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    accepting={acceptingId === item.id}
                  />
                ))
              )}

              {/* 활성 멘토십 */}
              <View style={[styles.sectionHeader, { marginTop: 28 }]}>
                <ActiveIcon size={18} />
                <Text style={styles.sectionTitle}>진행 중인 멘토링</Text>
                {activeList.length > 0 && (
                  <View style={[styles.countBadge, { backgroundColor: '#4ade8025' }]}>
                    <Text style={[styles.countText, { color: '#4ade80' }]}>{activeList.length}</Text>
                  </View>
                )}
              </View>

              {activeList.length === 0 ? (
                <View style={styles.emptySection}>
                  <Text style={styles.emptySectionText}>진행 중인 멘토링이 없습니다</Text>
                </View>
              ) : (
                activeList.map((item) => (
                  <ActiveMentorshipCard key={item.id} mentorship={item} onDisconnect={handleDisconnect} />
                ))
              )}

              <View style={{ height: 40 }} />
            </>
          )}
        />
      )}
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },

  /* 헤더 */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: c.surfaceStrong,
    gap: 8,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 17, fontWeight: '400', color: c.text, letterSpacing: 0.5,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: c.textMuted },

  listContent: { paddingHorizontal: 20, paddingBottom: 20 },

  /* 섹션 */
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 20, marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15, fontWeight: '400', color: c.text, flex: 1, letterSpacing: 0.3,
  },
  countBadge: {
    backgroundColor: '#C9A96E25', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 4,
  },
  countText: { fontSize: 12, fontWeight: '400', color: c.accent },

  /* 대기 중 카드 */
  requestCard: {
    backgroundColor: c.surface, borderRadius: 4, padding: 16,
    marginBottom: 10, borderWidth: 0.5, borderColor: c.border,
  },
  requestHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '400', color: '#fff' },
  requestInfo: { flex: 1, gap: 4 },
  requestName: { fontSize: 15, fontWeight: '400', color: c.text, letterSpacing: 0.3 },
  requestMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  requestDate: { fontSize: 11, color: c.textMuted },
  pendingBadge: {
    backgroundColor: '#fbbf2420', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 4,
  },
  pendingBadgeText: { fontSize: 11, fontWeight: '400', color: '#fbbf24' },

  requestActions: {
    flexDirection: 'row', gap: 10, marginTop: 14,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 4,
  },
  rejectBtn: {
    backgroundColor: '#f8717115', borderWidth: 0.5, borderColor: '#f8717130',
  },
  rejectBtnText: { fontSize: 14, fontWeight: '400', color: '#f87171' },
  acceptBtn: {
    backgroundColor: '#4ade80', borderWidth: 0.5, borderColor: '#4ade80',
  },
  acceptBtnText: { fontSize: 14, fontWeight: '400', color: c.bg },

  /* 활성 카드 */
  activeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: c.surface, borderRadius: 4, padding: 16,
    marginBottom: 8, borderWidth: 0.5, borderColor: c.border,
  },
  activeInfo: { flex: 1, gap: 4 },
  activeName: { fontSize: 15, fontWeight: '400', color: c.text, letterSpacing: 0.3 },
  activeMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  activeStatus: { fontSize: 12, color: '#4ade80' },
  chatBtnSmall: {
    backgroundColor: c.accent, paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 4,
  },
  chatBtnSmallText: { fontSize: 13, fontWeight: '400', color: c.bg, letterSpacing: 0.3 },
  disconnectBtn: {
    backgroundColor: '#e74c3c20', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 4, borderWidth: 0.5, borderColor: '#e74c3c40',
  },
  disconnectBtnText: { fontSize: 13, fontWeight: '400', color: c.danger, letterSpacing: 0.3 },

  /* 빈 상태 */
  emptySection: {
    backgroundColor: 'rgba(201,169,110,0.04)', borderRadius: 4, padding: 24,
    alignItems: 'center', borderWidth: 0.5, borderColor: c.border,
  },
  emptySectionText: { fontSize: 13, color: c.textMuted },

  emptyContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '300', color: c.text, letterSpacing: 0.5 },
  emptySub: { fontSize: 14, color: c.textMuted },
});
