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
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Keyboard,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { httpsCallable } from 'firebase/functions';
import { signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer } from 'expo-audio';
import Svg, { Path, Circle } from 'react-native-svg';
import ChopinAvatar, { ChopinAvatarSmall } from '../components/ChopinAvatar';
import { functions, auth } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

let Haptics = null;
if (Platform.OS !== 'web') {
  try { Haptics = require('expo-haptics'); } catch {}
}

// 시간대별 동적 인사말 — 방문한 시각에 맞는 톤으로 첫 메시지 구성
function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  let period;
  if (hour >= 5 && hour < 12) {
    period = '오늘 아침의 하루에 어울릴';
  } else if (hour >= 12 && hour < 17) {
    period = '오늘 한낮의 시간 속에 어울릴';
  } else if (hour >= 17 && hour < 22) {
    period = '하루의 끝에 닿을';
  } else {
    period = '밤의 녹턴처럼 잔잔한 시간에 어울릴';
  }
  return `안녕하세요, 유진온뮤직 음악 큐레이터 가온입니다.\n${period} 음악을 함께 가늠해보려 합니다.\n\n어떤 마음으로 오셨는지, 편히 들려주세요.`;
}

// 대화 가이드 칩 — 사용자가 어떤 주제로 상담할 수 있는지 보여줌
// 탭하면 상담이 시작되면서 해당 문구가 입력창에 자동 채워짐 (사용자가 수정 후 전송)
const GUIDE_CHIPS = [
  { iconKey: 'moon', label: '오늘의 마음에 어울리는 공연', prefill: '오늘 마음이 조금 지쳐 있어요. 저에게 어울릴 만한 공연을 추천해주시겠어요?' },
  { iconKey: 'piano', label: '처음 시작하는 피아노 레슨', prefill: '피아노를 처음 배워보고 싶어요. 성인 취미반에 대해 알고 싶습니다.' },
  { iconKey: 'spark', label: '특별한 날을 위한 음악 기획', prefill: '특별한 날을 기념할 음악 경험을 찾고 있어요. 어떤 기획이 가능한지 궁금합니다.' },
  { iconKey: 'hall', label: 'EON HALL 발표회·행사 문의', prefill: 'EON HALL에서 발표회(또는 행사)를 열어보고 싶어요. 대관 가능한지 궁금합니다.' },
];

// SVG 아이콘
function SpeakerOnIcon({ size = 20, color = '#F5F0E8' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M11 5L6 9H2v6h4l5 4V5z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function SpeakerOffIcon({ size = 20, color = '#F5F0E8' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M11 5L6 9H2v6h4l5 4V5z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M22 9l-6 6M16 9l6 6" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function CloseIcon({ size = 22, color = '#F5F0E8' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

// 가이드 칩용 아이콘 — 이모지 대신 골드 라인 아트로 통일감 확보
function MoonIcon({ size = 18, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
    </Svg>
  );
}

function PianoIcon({ size = 18, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7h16v10H4z" stroke={color} strokeWidth={1.3} />
      <Path d="M9 7v5M15 7v5" stroke={color} strokeWidth={1.3} />
      <Path d="M7 13v4M11 13v4M13 13v4M17 13v4" stroke={color} strokeWidth={0.9} />
    </Svg>
  );
}

function HallIcon({ size = 18, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9L12 4l9 5" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 9v10M9 9v10M15 9v10M19 9v10" stroke={color} strokeWidth={1.2} />
      <Path d="M3 19h18" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}

// 입력창 지우기 버튼 아이콘 — 반투명 원형 배경 위 X
function ClearIcon({ size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} fill="rgba(201,169,110,0.35)" />
      <Path d="M9 9l6 6M15 9l-6 6" stroke="#110E0B" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ChipIcon({ name, color: chipColor = '#C9A96E' }) {
  switch (name) {
    case 'moon': return <MoonIcon color={chipColor} />;
    case 'piano': return <PianoIcon color={chipColor} />;
    case 'spark': return <SparkIcon size={16} color={chipColor} />;
    case 'hall': return <HallIcon color={chipColor} />;
    default: return null;
  }
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

function AIConsultScreenInner() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, getToken } = useAuth();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  // Serif 명조체 — 클래식·프리미엄 느낌을 위해 Noto Serif KR 3가지 weight 로드
  // Noto Serif KR 폰트는 production 크래시 원인으로 의심되어 일시 제거.
  // 시스템 기본 폰트 사용. 안정화 후 expo-font 로컬 번들 방식으로 재도입 예정.
  const [messages, setMessages] = useState([]); // { role: 'user'|'assistant', text }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [consultationId, setConsultationId] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [started, setStarted] = useState(false);
  // Firebase Auth 세션 상태: null=확인중, true=준비완료, false=실패(서비스 준비 중)
  // auth가 null인 경우(env 누락/초기화 실패)도 안전하게 처리
  const [fbAuthReady, setFbAuthReady] = useState(auth?.currentUser ? true : null);
  // 키보드 높이 — iOS modal에서 KeyboardAvoidingView가 부정확해서 직접 관리
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  // 배경음악 음소거 상태 (기본: 재생)
  const [muted, setMuted] = useState(false);
  const scrollRef = useRef(null);
  // 배경 이미지 페이드인 — 모달 진입 시 이미지 로딩 지연으로 깜빡이는 것 방지
  const bgOpacity = useRef(new Animated.Value(0)).current;

  // functions가 null이면 호출 시도 시 가드. httpsCallable은 functions가 null이면 throw함.
  const aiConsult = functions ? httpsCallable(functions, 'aiConsult') : null;

  // 배경음악은 대화 시작(started=true) 후에만 BackgroundMusic 컴포넌트로 마운트.
  // 이유: useAudioPlayer가 native 에러를 던지면 hook 단계에서 앱이 크래시할 수 있어
  //       진입 즉시 호출하지 않고 사용자가 상담을 시작한 시점에만 로드.

  // Firebase Auth 상태를 구독 — 나중에 세션이 붙으면 자동 반영
  useEffect(() => {
    if (!auth) { setFbAuthReady(false); return; }
    try {
      const unsub = onAuthStateChanged(auth, (fbUser) => {
        if (fbUser) setFbAuthReady(true);
      });
      return unsub;
    } catch (err) {
      console.warn('[ai-consult] onAuthStateChanged failed:', err?.message || err);
      setFbAuthReady(false);
    }
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
      try {
        // Firebase 초기화 실패 시(auth/functions null) AI 기능만 비활성 상태로 진행
        if (!auth || !functions) { setFbAuthReady(false); return; }
        if (auth.currentUser) {
          setFbAuthReady(true);
          return;
        }
        if (!user?.uid) return; // WP 미로그인 — 기존 로그인 필요 플로우
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

  const startConversation = async (prefillText = '') => {
    // 시작 순간 강한 햅틱 — 의식적인 진입 느낌 부여
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // 초기 인사 메시지 삽입 (프론트 전용, 백엔드 호출 없음)
    setStarted(true);
    setMessages([
      {
        role: 'assistant',
        text: getTimeBasedGreeting(),
      },
    ]);
    // 가이드 칩에서 시작한 경우 입력창에 문구 자동 채움
    if (prefillText) {
      setInput(prefillText);
    }
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
    // auth/aiConsult가 null인 경우(Firebase 초기화 실패)도 안전하게 처리
    if (!auth || !aiConsult || !auth.currentUser) {
      Alert.alert(
        'AI 서비스 연결 중',
        fbAuthReady === false || !auth || !aiConsult
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
      {/* 배경 이미지 — EON HALL 공연장 실루엣이 분위기로만 남도록 블러·저투명 처리
          Animated.Image 대신 일반 Image를 Animated.View로 감싸서 new arch 호환성 향상 */}
      <Animated.View
        style={[styles.bgImage, { opacity: bgOpacity }]}
        pointerEvents="none"
      >
        <Image
          source={require('../assets/images/eon-hall-bg.jpg')}
          style={StyleSheet.absoluteFillObject}
          blurRadius={4}
          resizeMode="cover"
          onLoad={() => {
            Animated.timing(bgOpacity, {
              toValue: 0.55,
              duration: 500,
              useNativeDriver: true,
            }).start();
          }}
        />
      </Animated.View>
      {/* 어두운 오버레이 — 이미지를 배경으로 물러나게 하고 말풍선 글씨에 집중.
          colors.overlayDark는 다크/라이트 모드별로 다른 톤을 제공 (다크: 어두운 갈색, 라이트: 크림 베일) */}
      <LinearGradient
        colors={colors.overlayDark}
        locations={[0, 0.3, 0.65, 1]}
        style={styles.bgOverlay}
        pointerEvents="none"
      />

      {/* 배경음악 — 대화 시작 후에만 마운트 + ErrorBoundary로 격리
          오디오 초기화 실패가 앱 전체를 크래시시키지 않도록 에러를 차단 */}
      {started && !completed && (
        <AudioErrorBoundary>
          <BackgroundMusic muted={muted} />
        </AudioErrorBoundary>
      )}

      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ChopinAvatar size={36} />
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>가온</Text>
            <Text style={styles.headerSub}>EON 음악 큐레이터</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          {/* 배경음악 음소거 토글 — 대화 시작 후에만 노출 */}
          {started && !completed && (
            <TouchableOpacity
              style={styles.muteBtn}
              onPress={() => {
                Haptics?.selectionAsync();
                setMuted((v) => !v);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel={muted ? '배경음악 켜기' : '배경음악 끄기'}
            >
              {muted ? <SpeakerOffIcon color={colors.text} /> : <SpeakerOnIcon color={colors.text} />}
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <CloseIcon color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 대화 영역 — 키보드 높이만큼 marginBottom 부여해서 위로 올림.
          iOS: modal 환경에서 KeyboardAvoidingView가 부정확해 직접 marginBottom 관리.
          Android: edgeToEdgeEnabled=true에서는 adjustResize가 자동으로 밀어주지 않고,
                   keyboardDidShow.endCoordinates.height가 제스처바(insets.bottom) 영역을
                   포함하지 않으므로 그만큼 추가 보정. */}
      <View
        style={{
          flex: 1,
          marginBottom:
            keyboardHeight > 0 && Platform.OS === 'android'
              ? keyboardHeight + insets.bottom
              : keyboardHeight,
        }}
      >
        {!started ? (
          // 초대 화면 (대화 시작 전)
          <ScrollView
            contentContainerStyle={styles.introWrap}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
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

            {/* 대화 가이드 칩 — 예시 주제 선택 */}
            <Text style={styles.chipsHeading}>이런 대화를 나눌 수 있어요</Text>
            <View style={styles.chipsWrap}>
              {GUIDE_CHIPS.map((chip, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.chip}
                  activeOpacity={0.75}
                  onPress={() => startConversation(chip.prefill)}
                >
                  <View style={styles.chipIconWrap}>
                    <ChipIcon name={chip.iconKey} color={colors.accent} />
                  </View>
                  <Text style={styles.chipLabel}>{chip.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.startBtn} onPress={() => startConversation()} activeOpacity={0.85}>
              <SparkIcon size={14} color={colors.accentText} />
              <Text style={styles.startBtnText}>상담 시작하기</Text>
            </TouchableOpacity>

            <Text style={styles.introHint}>
              하루 최대 5회까지 이용하실 수 있어요
            </Text>
            <Text style={styles.introDisclaimer}>
              본 대화는 AI가 자동 응답하며, 내용은 서비스 개선 및 신청 처리 목적으로 이용됩니다.
              자세한 사항은 개인정보처리방침을 참고해주세요.
            </Text>
          </ScrollView>
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
                  <ActivityIndicator size="small" color={colors.accent} />
                </View>
              </View>
            )}
            {completed && (
              <TicketReceipt consultationId={consultationId} onClose={() => router.back()} />
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
              placeholderTextColor={colors.placeholder}
              multiline
              maxLength={1000}
              editable={!loading}
            />
            {/* 지우기 버튼 — 입력이 있을 때만 표시, 가이드 칩으로 채워진 문구도 한 번에 비움 */}
            {input.length > 0 && !loading && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => {
                  setInput('');
                  Haptics?.selectionAsync();
                }}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                accessibilityLabel="입력 지우기"
              >
                <ClearIcon />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!input.trim() || loading}
              activeOpacity={0.8}
            >
              <QuillIcon size={18} color={!input.trim() || loading ? colors.accentMuted : colors.accentText} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ────────────── 배경음악 에러 바운더리 ──────────────
// BackgroundMusic의 렌더·마운트 오류를 앱 전체로 전파하지 않고 격리
class AudioErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.warn('[BackgroundMusic] error:', error?.message || error);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// ────────────── 배경음악 컴포넌트 ──────────────
// React 규칙을 지키며 hook을 조건 없이 호출. 실제 player 접근은 try/catch로 가드.
function BackgroundMusic({ muted }) {
  const bgPlayer = useAudioPlayer(require('../assets/audio/ai_consult_bg.mp3'));

  useEffect(() => {
    try {
      if (bgPlayer) {
        bgPlayer.loop = true;
        bgPlayer.volume = 0.15;
      }
    } catch {}
    return () => {
      try { bgPlayer && bgPlayer.pause(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      if (!bgPlayer) return;
      if (muted) bgPlayer.pause();
      else bgPlayer.play();
    } catch {}
  }, [muted, bgPlayer]);

  return null;
}

// ────────────── 접수증(티켓) 컴포넌트 ──────────────
// 상담 완료 후 표시되는 음악회 티켓 형태의 receipt — 제출의 무게감과 기념품 느낌
// (저장·공유 기능은 native 모듈 호환성 문제로 일시 제거 — 추후 안정화 후 복원 예정)
function TicketReceipt({ consultationId, onClose }) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  // consultationId가 있으면 뒤 6자리, 없으면 현재 시각 기반으로 6자리 생성
  const ticketNo = consultationId
    ? String(consultationId).slice(-6).toUpperCase()
    : Date.now().toString(36).toUpperCase().slice(-6);

  return (
    <View>
      <View style={styles.ticketWrap}>
        <Text style={styles.ticketLabel}>RECEIPT · 음악 큐레이션 접수증</Text>
        <View style={styles.ticketOrnament}>
          <View style={styles.goldLine} />
          <View style={styles.goldDiamond} />
          <View style={styles.goldLine} />
        </View>
        <Text style={styles.ticketCurator}>가온 · EON HALL</Text>
        <Text style={styles.ticketDateTime}>{dateStr}  ·  {timeStr}</Text>
        <View style={styles.ticketDashedLine} />
        <Text style={styles.ticketNoLabel}>접수번호</Text>
        <Text style={styles.ticketNoValue}>#{ticketNo}</Text>
        <View style={styles.ticketDashedLine} />
        <Text style={styles.ticketMessage}>
          담당 큐레이터가 1~2일 안에{'\n'}연락드릴 예정입니다.
        </Text>
      </View>
      {/* 닫기 버튼만 */}
      <View style={styles.ticketActions}>
        <TouchableOpacity style={[styles.ticketActionBtn, styles.ticketActionPrimary]} onPress={onClose} activeOpacity={0.85}>
          <Text style={[styles.ticketActionText, styles.ticketActionPrimaryText]}>닫기</Text>
        </TouchableOpacity>
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
const makeStyles = (c) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.bgElevated,
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: c.borderSoft,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitles: { gap: 2 },
  headerTitle: {
    fontSize: 16,
    color: c.text,
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 11,
    color: c.textMuted,
    letterSpacing: 0.8,
  },
  closeBtn: { padding: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  muteBtn: { padding: 4 },

  // 초대 화면 (ScrollView contentContainer)
  introWrap: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
    gap: 16,
  },
  chipsHeading: {
    fontSize: 11,
    color: c.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 2,
  },
  chipsWrap: {
    width: '100%',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 4,
    backgroundColor: c.inputBg,
    borderWidth: 0.5,
    borderColor: c.accentMuted,
  },
  chipIconWrap: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    flex: 1,
    fontSize: 13,
    color: c.text,
    letterSpacing: 0.3,
    lineHeight: 20,
  },
  introTitle: {
    fontSize: 22,
    color: c.text,
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
    backgroundColor: c.textHint,
  },
  goldDiamond: {
    width: 5,
    height: 5,
    backgroundColor: c.accent,
    transform: [{ rotate: '45deg' }],
  },
  introDesc: {
    fontSize: 14,
    color: c.textSoft,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 4,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.accent,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 4,
    marginTop: 24,
  },
  startBtnText: {
    fontSize: 14,
    color: c.accentText,
    letterSpacing: 1,
  },
  introHint: {
    fontSize: 11,
    color: c.textHint,
    marginTop: 12,
    letterSpacing: 0.5,
  },
  introDisclaimer: {
    fontSize: 10,
    color: c.textMuted,
    lineHeight: 16,
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
    backgroundColor: c.surface,
    borderWidth: 0.5,
    borderColor: c.border,
    borderRadius: 4,
    padding: 14,
  },
  assistantText: {
    fontSize: 15,
    color: c.text,
    lineHeight: 26,
    letterSpacing: 0.2,
  },

  // 유저 말풍선
  userWrap: {
    alignItems: 'flex-end',
  },
  userBubble: {
    maxWidth: '85%',
    backgroundColor: c.surfaceStrong,
    borderWidth: 0.5,
    borderColor: c.accent,
    borderRadius: 4,
    padding: 12,
  },
  userText: {
    fontSize: 15,
    color: c.text,
    lineHeight: 24,
  },

  // 시스템 메시지 (에러 등) — 빨간 톤은 양쪽 모드에서 동일하게 유지
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
    lineHeight: 20,
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
    backgroundColor: c.surface,
    borderWidth: 0.5,
    borderColor: c.border,
    borderRadius: 4,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  // 접수증(티켓) — 상담 완료 후 기념품 느낌의 카드
  ticketWrap: {
    backgroundColor: c.bgElevated,
    borderWidth: 0.5,
    borderColor: c.border,
    borderRadius: 6,
    paddingHorizontal: 24,
    paddingVertical: 28,
    marginVertical: 16,
    alignItems: 'center',
  },
  ticketLabel: {
    fontSize: 10,
    color: c.accent,
    letterSpacing: 3,
    marginBottom: 14,
  },
  ticketOrnament: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  ticketCurator: {
    fontSize: 17,
    color: c.text,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  ticketDateTime: {
    fontSize: 12,
    color: c.textSoft,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  ticketDashedLine: {
    width: '80%',
    borderBottomWidth: 0.7,
    borderBottomColor: c.border,
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  ticketNoLabel: {
    fontSize: 9,
    color: c.textHint,
    letterSpacing: 2,
    marginBottom: 6,
  },
  ticketNoValue: {
    fontSize: 20,
    color: c.accent,
    letterSpacing: 3,
  },
  ticketMessage: {
    fontSize: 13,
    color: c.textSoft,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  ticketActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 14,
    marginBottom: 16,
  },
  ticketActionBtn: {
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderWidth: 0.5,
    borderColor: c.accent,
    borderRadius: 4,
    minWidth: 120,
    alignItems: 'center',
  },
  ticketActionPrimary: {
    backgroundColor: c.accent,
  },
  ticketActionText: {
    fontSize: 12,
    color: c.accent,
    letterSpacing: 2.5,
  },
  ticketActionPrimaryText: {
    color: c.accentText,
  },

  // 입력 영역
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 8,
    borderTopWidth: 0.5,
    borderTopColor: c.borderSoft,
    backgroundColor: c.bg,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 140,
    backgroundColor: c.inputBg,
    borderWidth: 0.5,
    borderColor: c.border,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: c.text,
    lineHeight: 22,
  },
  clearBtn: {
    height: 42,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 4,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: c.accentMuted,
  },
});

// ────────────── 화면 레벨 ErrorBoundary ──────────────
// ai-consult.js 내부 어디선가 throw되는 경우 앱 전체 SIGABRT를 막고
// 폴백 UI에 실제 에러 메시지를 노출 — 사용자가 캡처해서 전달하면 근본 원인 확정 가능
class AIConsultErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '', errorStack: '' };
  }
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || String(error) || 'Unknown error',
      errorStack: error?.stack || '',
    };
  }
  componentDidCatch(err, info) {
    console.warn('[ai-consult] crash:', err?.message || err);
    console.warn('[ai-consult] componentStack:', info?.componentStack || '');
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#110E0B', padding: 24, paddingTop: 80 }}>
          <Text style={{ color: '#C9A96E', fontSize: 20, fontWeight: '300', letterSpacing: 2, marginBottom: 20 }}>
            AI 상담 준비 중
          </Text>
          <Text style={{ color: '#9e9282', fontSize: 14, marginBottom: 28, lineHeight: 22 }}>
            잠시 후 다시 시도해주세요.{'\n'}
            문제가 계속되면 아래 메시지를 캡처해서 개발자에게 전달해주세요.
          </Text>
          <ScrollView style={{ maxHeight: 320, backgroundColor: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 6, marginBottom: 24 }}>
            <Text selectable style={{ color: '#d4c9b3', fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', lineHeight: 18 }}>
              {this.state.errorMessage}
              {this.state.errorStack ? '\n\n' + this.state.errorStack : ''}
            </Text>
          </ScrollView>
          <TouchableOpacity
            onPress={() => { try { require('expo-router').router.back(); } catch {} }}
            style={{ paddingVertical: 12, paddingHorizontal: 28, borderWidth: 1, borderColor: '#C9A96E', alignSelf: 'flex-start', borderRadius: 4 }}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#C9A96E', fontSize: 14, letterSpacing: 1 }}>← 돌아가기</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function AIConsultScreen() {
  return (
    <AIConsultErrorBoundary>
      <AIConsultScreenInner />
    </AIConsultErrorBoundary>
  );
}
