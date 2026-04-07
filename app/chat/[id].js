import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, Modal,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp,
  doc, getDoc, updateDoc, increment, setDoc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { sendPushNotification } from '../../hooks/useNotifications';
import ChatBubble from '../../components/ChatBubble';

// ── SVG 아이콘 ──
function BackIcon({ size = 22, color = '#8a9bae' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SendIcon({ size = 18, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PlusIcon({ size = 22, color = '#6b7b8d' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.8} />
      <Path d="M12 8v8M8 12h8" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function MoreIcon({ size = 20, color = '#8a9bae' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5" r="1.5" fill={color} />
      <Circle cx="12" cy="12" r="1.5" fill={color} />
      <Circle cx="12" cy="19" r="1.5" fill={color} />
    </Svg>
  );
}

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [roomName, setRoomName] = useState('채팅');
  const [otherRole, setOtherRole] = useState('');
  const [sending, setSending] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [otherUserId, setOtherUserId] = useState('');
  const listRef = useRef(null);

  const showAlert = (title, message, buttons) => {
    if (Platform.OS === 'web') {
      if (buttons) {
        const confirmed = window.confirm(`${title}\n${message}`);
        if (confirmed && buttons[1]?.onPress) buttons[1].onPress();
      } else {
        window.alert(`${title}\n${message}`);
      }
    } else {
      Alert.alert(title, message, buttons);
    }
  };

  useEffect(() => {
    if (!id || !user) return;

    // 실시간 메시지 구독
    const msgQ = query(
      collection(db, 'chatRooms', id, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsubMsg = onSnapshot(msgQ, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // 방 정보 가져오기 + 읽음 처리
    getDoc(doc(db, 'chatRooms', id)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const other = data.participants?.find((p) => p.uid !== user.uid);
        if (other) {
          const roleLabel = other.role === 'teacher' ? ' 선생님' : '';
          setRoomName((other.name || '알 수 없음') + roleLabel);
          setOtherRole(other.role || 'student');
          setOtherUserId(other.uid || '');
        }
        // 내 읽지 않은 메시지 카운트 리셋
        if (data.unread?.[user.uid] > 0) {
          updateDoc(doc(db, 'chatRooms', id), {
            [`unread.${user.uid}`]: 0,
          }).catch(() => {});
        }
      }
    });

    return unsubMsg;
  }, [id, user]);

  const handleSend = async () => {
    if (!inputText.trim() || !user || !id) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      // 메시지 추가
      await addDoc(collection(db, 'chatRooms', id, 'messages'), {
        text,
        senderId: user.uid,
        senderName: user.displayName || user.email?.split('@')[0] || '나',
        senderRole: user.role || 'student',
        createdAt: serverTimestamp(),
        read: false,
      });

      // 채팅방 마지막 메시지 업데이트 + 상대방 unread 증가
      const roomSnap = await getDoc(doc(db, 'chatRooms', id));
      if (roomSnap.exists()) {
        const data = roomSnap.data();
        const otherId = data.memberIds?.find((uid) => uid !== user.uid);
        const updates = {
          lastMessage: text,
          lastMessageAt: serverTimestamp(),
        };
        if (otherId) {
          updates[`unread.${otherId}`] = increment(1);
        }
        await updateDoc(doc(db, 'chatRooms', id), updates);

        // 상대방에게 푸시 알림 전송
        if (otherId) {
          try {
            const tokenSnap = await getDoc(doc(db, 'pushTokens', otherId));
            if (tokenSnap.exists()) {
              const pushToken = tokenSnap.data().token;
              const senderName = user.displayName || user.email?.split('@')[0] || '알 수 없음';
              sendPushNotification(
                pushToken,
                `${senderName}님의 메시지`,
                text.length > 50 ? text.substring(0, 50) + '...' : text,
                { chatRoomId: id, senderId: user.uid }
              );
            }
          } catch (pushErr) {
            console.warn('푸시 알림 전송 실패:', pushErr);
          }
        }
      }
    } catch (err) {
      console.warn('메시지 전송 실패:', err);
    }
    setSending(false);
  };

  // 메시지 신고 처리
  const handleReportMessage = async (message) => {
    try {
      await addDoc(collection(db, 'reports'), {
        type: 'message',
        chatRoomId: id,
        messageId: message.id,
        messageText: message.text,
        reportedUserId: message.senderId,
        reportedUserName: message.senderName,
        reporterUserId: user.uid,
        reporterName: user.displayName || user.email,
        createdAt: serverTimestamp(),
        status: 'pending',
      });
    } catch (err) {
      console.warn('신고 저장 실패:', err);
    }
  };

  // 사용자 차단
  const handleBlockUser = () => {
    showAlert(
      '사용자 차단',
      `${roomName}님을 차단하시겠습니까?\n차단하면 이 사용자의 메시지를 더 이상 받지 않습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '차단',
          style: 'destructive',
          onPress: async () => {
            try {
              await setDoc(doc(db, 'blockedUsers', `${user.uid}_${otherUserId}`), {
                blockerUid: user.uid,
                blockedUid: otherUserId,
                blockedName: roomName,
                createdAt: serverTimestamp(),
              });
              showAlert('차단 완료', '사용자가 차단되었습니다.');
              setShowMoreMenu(false);
            } catch (err) {
              console.warn('차단 실패:', err);
            }
          },
        },
      ]
    );
  };

  // 사용자 신고
  const handleReportUser = () => {
    showAlert(
      '사용자 신고',
      `${roomName}님을 부적절한 행위로 신고하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '신고',
          style: 'destructive',
          onPress: async () => {
            try {
              await addDoc(collection(db, 'reports'), {
                type: 'user',
                reportedUserId: otherUserId,
                reportedUserName: roomName,
                reporterUserId: user.uid,
                reporterName: user.displayName || user.email,
                chatRoomId: id,
                createdAt: serverTimestamp(),
                status: 'pending',
              });
              showAlert('신고 완료', '신고가 접수되었습니다. 검토 후 조치하겠습니다.');
              setShowMoreMenu(false);
            } catch (err) {
              console.warn('신고 저장 실패:', err);
            }
          },
        },
      ]
    );
  };

  const currentUid = user?.uid || '';
  const roleColor = otherRole === 'teacher' ? '#C9A96E' : '#2C5F8A';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <BackIcon />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{roomName}</Text>
          {otherRole && (
            <View style={[styles.headerRoleBadge, { backgroundColor: roleColor + '20' }]}>
              <View style={[styles.headerRoleDot, { backgroundColor: roleColor }]} />
              <Text style={[styles.headerRoleText, { color: roleColor }]}>
                {otherRole === 'teacher' ? '담당 선생님' : '담당 학생'}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={() => setShowMoreMenu(true)}>
          <MoreIcon />
        </TouchableOpacity>
      </View>

      {/* 더보기 메뉴 모달 */}
      <Modal visible={showMoreMenu} transparent animationType="fade" onRequestClose={() => setShowMoreMenu(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMoreMenu(false)}>
          <View style={[styles.menuBox, { top: insets.top + 50 }]}>
            <TouchableOpacity style={styles.menuOptionItem} onPress={handleReportUser}>
              <Text style={styles.menuOptionText}>사용자 신고</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuOptionItem} onPress={handleBlockUser}>
              <Text style={[styles.menuOptionText, { color: '#e74c3c' }]}>사용자 차단</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 메시지 목록 */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatBubble message={item} isMine={item.senderId === currentUid} onReport={handleReportMessage} />
        )}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={() => (
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>대화를 시작해보세요!</Text>
          </View>
        )}
      />

      {/* 입력 바 */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TouchableOpacity style={styles.attachBtn}>
          <PlusIcon />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="메시지를 입력하세요"
          placeholderTextColor="#4a5a6a"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          <SendIcon />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1923' },

  /* 헤더 */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1a2530',
    gap: 8,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center', gap: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  headerRoleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  headerRoleDot: { width: 5, height: 5, borderRadius: 2.5 },
  headerRoleText: { fontSize: 10, fontWeight: '600' },

  /* 메시지 */
  messageList: { paddingVertical: 12, flexGrow: 1 },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
  emptyChatText: { fontSize: 14, color: '#4a5a6a' },

  /* 입력 바 */
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingTop: 8,
    backgroundColor: '#1a2530', borderTopWidth: 1, borderTopColor: '#2a3a4a',
  },
  attachBtn: { padding: 4 },
  input: {
    flex: 1, backgroundColor: '#0f1923', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#ffffff',
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#C9A96E',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },

  /* 더보기 메뉴 */
  menuOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
  },
  menuBox: {
    position: 'absolute', right: 16,
    backgroundColor: '#1a2530', borderRadius: 12,
    paddingVertical: 4, minWidth: 150,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
    borderWidth: 1, borderColor: '#2a3a4a',
  },
  menuOptionItem: {
    paddingHorizontal: 16, paddingVertical: 14,
  },
  menuOptionText: {
    fontSize: 14, fontWeight: '600', color: '#c0cdd8',
  },
  menuDivider: {
    height: 1, backgroundColor: '#2a3a4a',
  },
});
