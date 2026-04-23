/**
 * AI 음악 상담 화면
 *
 * "가온" — EON 음악 큐레이터 AI와의 대화 인터페이스.
 * aiConsult (Firebase callable function) 호출해서 Claude API 응답 수신.
 *
 * 상태:
 *  - idle: 대화 시작 전 (초대 화면)
 *  - active: 대화 중
 *  - completed: 신청서 제출됨
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Keyboard,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { httpsCallable } from 'firebase/functions';
import { signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import Svg, { Path } from 'react-native-svg';
import ChopinAvatar, { ChopinAvatarSmall } from '../components/ChopinAvatar';
import { functions, auth } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';

let Haptics = null;
if (Platform.OS !== 'web') {
  try { Haptics = require('expo-haptics'); } catch {}
}

// SVG 아이콘
function CloseIcon({ size = 22, color = '#F5F0E8' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function QuillIcon({ size = 20, color = '#110E0B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 3l-9 9m9-9l-6 17-3-6-6-3 15-8z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SparkIcon({ size = 14, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3v4m0 10v4m9-9h-4m-10 0H3m13.5-6.5l-3 3m-7 7l-3 3m13 0l-3-3m-7-7l-3-3"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function AIConsultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, getToken } = useAuth();
  const [messages, setMessages] = useState([]); // { role: 'user'|'assistant', text }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [consultationId, setConsultationId] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [started, setStarted] = useState(false);
  // Firebase Auth 세션 상태: null=확인중, true=준비완료, false=실패(서비스 준비 중)
  const [fbAuthReady, setFbAuthReady] = useState(auth.currentUser ? true : null);
  // 키보드 높이 — iOS modal에서 KeyboardAvoidingView가 부정확해서 직접 관리
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef(null);

  const aiConsult = httpsCallable(functions, 'aiConsult');

  // Firebase Auth 상태를 구독 — 나중에 세션이 붙으면 자동 반영
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) setFbAuthReady(true);
    });
    return unsub;
  }, []);

  // 키보드 리스너 — iOS에선 Will 이벤트로 애니메이션과 자연스럽게 맞춤
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => {
      setKeyboardHeight(e?.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // 화면 진입 시: WP 로그인돼있는데 Firebase 세션이 없으면 한 번 더 교환 시도
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (auth.currentUser) {
        setFbAuthReady(true);
        return;
      }
      if (!user?.uid) return; // WP 미로그인 — 기존 로그인 필요 플로우
      try {
        const wpToken = getToken?.();
        if (!wpToken) throw new Error('wp token missing');
        const exchange = httpsCallable(functions, 'exchangeWpToken');
        const res = await exchange({ wpToken });
        if (cancelled) return;
        if (res.data?.customToken) {
          await signInWithCustomToken(auth, res.data.customToken);
          setFbAuthReady(true);
        } else {
          setFbAuthReady(false);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn('[ai-consult] Firebase 세션 연결 실패:', err?.code || err?.message || err);
        setFbAuthReady(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid]);

  // 메시지/로딩/키보드 변화 시 맨 아래로. 렌더 전일 수 있어 짧은 backoff로 두 번 호출
  const scrollToBottom = (animated = true) => {
    scrollRef.current?.scrollToEnd({ animated });
  };
  useEffect(() => {
    if (messages.length === 0) return;
    const t1 = setTimeout(() => scrollToBottom(true), 50);
    const t2 = setTimeout(() => scrollToBottom(true), 250); // 이미지·긴 텍스트 레이아웃 대비 재시도
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [messages, loading]);
  useEffect(() => {
    if (keyboardHeight > 0 && messages.length > 0) {
      setTimeout(() => scrollToBottom(true), 50);
    }
  }, [keyboardHeight]);

  const startConversation = async () => {
    // 시작 순간 강한 햅틱 — 의식적인 진입 느낌 부여
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // 초기 인사 메시지 삽입 (프론트 전용, 백엔드 호출 없음)
    setStarted(true);
    setMessages([
      {
        role: 'assistant',
        text:
          '안녕하세요.\n저는 당신의 오늘에 어울리는 예술 경험을 함께 찾아드리는 음악 큐레이터입니다.\n\n공연 감상, 레슨, 행사 대관 등 — 편안하게 원하시는 경험을 말씀해주세요.',
      },
    ]);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // 1) WP 세션 자체가 없으면 로그인 요구
    if (!user?.uid) {
      Alert.alert(
        '로그인 필요',
        'AI 상담은 로그인 후 이용 가능합니다.',
        [
          { text: '취소', style: 'cancel' },
          { text: '로그인', onPress: () => router.push('/auth/login') },
        ]
      );
      return;
    }

    // 2) Firebase 세션이 아직 준비 안 됐으면 안내 (백엔드 미배포 또는 연결 대기)
    if (!auth.currentUser) {
      Alert.alert(
        'AI 서비스 연결 중',
        fbAuthReady === false
          ? 'AI 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.'
          : '세션을 준비 중입니다. 잠시만 기다려주세요.'
      );
      return;
    }

    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const result = await aiConsult({
        userMessage: text,
        ...(consultationId && { consultationId }),
      });
      const data = result.data;

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: data.assistantMessage || '...' },
      ]);
      if (data.consultationId) setConsultationId(data.consultationId);
      if (data.status === 'completed' || data.formSubmitted) {
        setCompleted(true);
        Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.warn('aiConsult error:', err);
      let userMsg = '잠시 연결이 원활하지 않아요. 잠시 후 다시 시도해주세요.';
      const code = err?.code || '';
      const msg = err?.message || err?.details || '';

      if (code === 'functions/resource-exhausted' || msg.includes('오늘 AI 상담')) {
        userMsg = msg || '오늘 AI 상담 사용량을 모두 이용하셨어요. 내일 다시 이용해주세요.';
      } else if (code === 'functions/unauthenticated') {
        userMsg = '로그인이 필요합니다. 다시 로그인 후 시도해주세요.';
      } else if (code === 'functions/invalid-argument') {
        userMsg = msg || '메시지 내용이 올바르지 않습니다.';
      }

      setMessages((prev) => [
        ...prev,
        { role: 'system', text: userMsg },
      ]);
      Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    if (messages.length > 1 && !completed) {
      // 경고창 띄울 때 강한 햅틱으로 주의 환기
      Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Alert.alert('대화 종료', '지금 나가면 대화 내용은 저장되지만 관리자에게 전달되지는 않습니다. 나가시겠어요?', [
        { text: '계속 대화', style: 'cancel' },
        { text: '나가기', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  // 키보드 열렸을 때 하단 여백 — home indicator 공간은 키보드가 가리므로 최소값만 유지
  const bottomPad = keyboardHeight > 0 ? 8 : Math.max(insets.bottom, 10);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ChopinAvatar size={36} />
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>가온</Text>
            <Text style={styles.headerSub}>EON 음악 큐레이터</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <CloseIcon />
        </TouchableOpacity>
      </View>

      {/* 대화 영역 — 키보드 높이만큼 marginBottom을 입력행에 부여해서 위로 올림 */}
      <View style={{ flex: 1, marginBottom: keyboardHeight }}>
        {!started ? (
          // 초대 화면 (대화 시작 전)
          <View style={styles.introWrap}>
            <ChopinAvatar size={120} />
            <Text style={styles.introTitle}>오늘의 예술을 함께 찾아볼까요?</Text>
            <View style={styles.ornament}>
              <View style={styles.goldLine} />
              <View style={styles.goldDiamond} />
              <View style={styles.goldLine} />
            </View>
            <Text style={styles.introDesc}>
              공연 감상, 레슨, 행사 대관까지.{'\n'}
              원하시는 경험을 대화로 편안하게 말씀해주시면{'\n'}
              당신에게 어울리는 기획을 준비해드립니다.
            </Text>

            <TouchableOpacity style={styles.startBtn} onPress={startConversation} activeOpacity={0.85}>
              <SparkIcon size={14} color="#110E0B" />
              <Text style={styles.startBtnText}>상담 시작하기</Text>
            </TouchableOpacity>

            <Text style={styles.introHint}>
              하루 최대 5회까지 이용하실 수 있어요
            </Text>
            <Text style={styles.introDisclaimer}>
              본 대화는 AI가 자동 응답하며, 내용은 서비스 개선 및 신청 처리 목적으로 이용됩니다.
              자세한 사항은 개인정보처리방침을 참고해주세요.
            </Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.chatScroll}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollToBottom(true)}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))}
            {loading && (
              <View style={styles.typingWrap}>
                <View style={styles.typingAvatar}>
                  <ChopinAvatarSmall size={24} />
                </View>
                <View style={styles.typingBubble}>
                  <ActivityIndicator size="small" color="#C9A96E" />
                </View>
              </View>
            )}
            {completed && (
              <View style={styles.completedBanner}>
                <Text style={styles.completedText}>✓ 신청서가 관리자에게 전달되었습니다</Text>
                <TouchableOpacity onPress={() => router.back()}>
                  <Text style={styles.completedAction}>닫기</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}

        {/* 입력 영역 (대화 시작 후에만) */}
        {started && !completed && (
          <View style={[styles.inputRow, { paddingBottom: bottomPad }]}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="편안하게 말씀해주세요..."
              placeholderTextColor="rgba(201,169,110,0.35)"
              multiline
              maxLength={1000}
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!input.trim() || loading}
              activeOpacity={0.8}
            >
              <QuillIcon size={18} color={!input.trim() || loading ? 'rgba(17,14,11,0.4)' : '#110E0B'} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ────────────── 말풍선 컴포넌트 ──────────────
function MessageBubble({ message }) {
  if (message.role === 'system') {
    return (
      <View style={styles.systemBubble}>
        <Text style={styles.systemText}>{message.text}</Text>
      </View>
    );
  }

  if (message.role === 'user') {
    return (
      <View style={styles.userWrap}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.text}</Text>
        </View>
      </View>
    );
  }

  // assistant
  return (
    <View style={styles.assistantWrap}>
      <View style={styles.assistantAvatar}>
        <ChopinAvatarSmall size={28} />
      </View>
      <View style={styles.assistantBubble}>
        <Text style={styles.assistantText}>{message.text}</Text>
      </View>
    </View>
  );
}

// ────────────── 스타일 ──────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#110E0B',
  },

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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitles: { gap: 2 },
  headerTitle: {
    fontSize: 15,
    color: '#F5F0E8',
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 11,
    color: '#9e9282',
    letterSpacing: 0.8,
  },
  closeBtn: { padding: 4 },

  // 초대 화면
  introWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  introTitle: {
    fontSize: 20,
    color: '#F5F0E8',
    fontWeight: '300',
    letterSpacing: 0.5,
    marginTop: 20,
    textAlign: 'center',
  },
  ornament: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  goldLine: {
    height: 0.5,
    width: 32,
    backgroundColor: 'rgba(201,169,110,0.55)',
  },
  goldDiamond: {
    width: 5,
    height: 5,
    backgroundColor: '#C9A96E',
    transform: [{ rotate: '45deg' }],
  },
  introDesc: {
    fontSize: 14,
    color: '#C9BEAC',
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 4,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#C9A96E',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 4,
    marginTop: 24,
  },
  startBtnText: {
    fontSize: 14,
    color: '#110E0B',
    fontWeight: '500',
    letterSpacing: 1,
  },
  introHint: {
    fontSize: 11,
    color: 'rgba(201,169,110,0.5)',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  introDisclaimer: {
    fontSize: 10,
    color: 'rgba(158,146,130,0.7)',
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 8,
    letterSpacing: 0.2,
  },

  // 채팅 영역
  chatScroll: { flex: 1 },
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 16,
  },

  // AI 말풍선
  assistantWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    maxWidth: '92%',
  },
  assistantAvatar: {
    marginTop: 4,
  },
  assistantBubble: {
    flex: 1,
    backgroundColor: 'rgba(201,169,110,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(201,169,110,0.2)',
    borderRadius: 4,
    padding: 14,
  },
  assistantText: {
    fontSize: 15,
    color: '#F5F0E8',
    lineHeight: 24,
    letterSpacing: 0.2,
  },

  // 유저 말풍선
  userWrap: {
    alignItems: 'flex-end',
  },
  userBubble: {
    maxWidth: '85%',
    backgroundColor: 'rgba(201,169,110,0.15)',
    borderWidth: 0.5,
    borderColor: '#C9A96E',
    borderRadius: 4,
    padding: 12,
  },
  userText: {
    fontSize: 15,
    color: '#F5F0E8',
    lineHeight: 22,
  },

  // 시스템 메시지 (에러 등)
  systemBubble: {
    alignSelf: 'center',
    backgroundColor: 'rgba(220,140,140,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(220,140,140,0.3)',
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '90%',
  },
  systemText: {
    fontSize: 13,
    color: 'rgba(220,140,140,0.9)',
    lineHeight: 19,
    textAlign: 'center',
  },

  // 타이핑 인디케이터
  typingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingAvatar: { marginTop: 2 },
  typingBubble: {
    backgroundColor: 'rgba(201,169,110,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(201,169,110,0.2)',
    borderRadius: 4,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  // 완료 배너
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(160,200,140,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(160,200,140,0.35)',
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 10,
  },
  completedText: {
    fontSize: 13,
    color: 'rgba(160,200,140,0.95)',
  },
  completedAction: {
    fontSize: 13,
    color: '#C9A96E',
    fontWeight: '500',
  },

  // 입력 영역
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(201,169,110,0.15)',
    backgroundColor: '#110E0B',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 140,
    backgroundColor: 'rgba(201,169,110,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(201,169,110,0.25)',
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#F5F0E8',
    lineHeight: 20,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 4,
    backgroundColor: '#C9A96E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(201,169,110,0.3)',
  },
});
