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
import AnimatedFirstMessage from '../components/AnimatedFirstMessage';
import ThreePaths from '../components/ThreePaths';
import TypingIndicator from '../components/TypingIndicator';
import GlossaryText from '../components/GlossaryText';
import GlossaryModal from '../components/GlossaryModal';
import MoodLabel from '../components/MoodLabel';
import ClosingCard from '../components/ClosingCard';
import { detectMood } from '../constants/moodDetector';
import { functions, auth } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── 세션 저장(이어가기) ──
// 진행 중이던 대화를 30분 이내 재진입 시 복원할 수 있도록 AsyncStorage에 캐시.
// completed(신청서 제출됨) 시점에 자동 삭제.
const SESSION_KEY = '@eon_ai_consult_last_session';
const SESSION_MAX_AGE_MS = 30 * 60 * 1000; // 30분

async function saveSession(messages, consultationId) {
  if (!consultationId || !messages || messages.length === 0) return;
  // firstAnimated 같은 휘발성 플래그 제거 — 복원 시 재애니메이션 안 되도록
  const sanitized = messages.map((m) => ({ role: m.role, text: m.text }));
  try {
    await AsyncStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        consultationId,
        messages: sanitized,
        timestamp: Date.now(),
      })
    );
  } catch {}
}

async function loadSession() {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.timestamp || Date.now() - data.timestamp > SESSION_MAX_AGE_MS) {
      AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

async function clearSession() {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch {}
}

// "방금 전" / "23분 전" / "오후 4:42" 형식
function formatRelativeTime(ts) {
  const elapsed = Date.now() - ts;
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h < 12 ? '오전' : '오후';
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${displayHour}:${String(m).padStart(2, '0')}`;
}

function getSessionPreview(messages) {
  // 가장 마지막 user 또는 assistant 메시지 — 사용자가 어디서 멈췄는지 알 수 있게
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.text) return messages[i].text;
  }
  return '';
}

let Haptics = null;
if (Platform.OS !== 'web') {
  try { Haptics = require('expo-haptics'); } catch {}
}

// 첫 인사 — 모드와 시간대를 함께 반영해 톤이 즉시 모드와 맞도록 분기.
//
// concierge (둘러보기): 짧은 안내자 톤, 시간대 빼서 명료하게
// curation (공연 큐레이션): 큐레이터 톤, 시간대 빼서 본론으로 빠르게
// mind / free entry: 기존 시적 톤 + 시간대 변형 (가장 깊은 톤이라 시간대가 어울림)
function getModeAwareGreeting(mode) {
  if (mode === 'concierge') {
    return '안녕하세요, 유진온뮤직 가온입니다.\n무엇이 궁금하신지 편히 말씀해주세요. 함께 둘러볼게요.';
  }
  if (mode === 'curation') {
    return '안녕하세요, 유진온뮤직 가온입니다.\n어떤 자리를 위한 음악을 함께 그려보고 싶으신지 편히 들려주세요.';
  }
  // mind 또는 mode null(자유 진입) — 시간대 시적 톤
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

// 시간대별 welcome 타이틀 — 채팅 진입 화면 큰 제목.
// 채팅 시작 후 첫 인사(getModeAwareGreeting의 mind/free 분기)와 톤을 맞춤.
function getTimeBasedTitle() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return '오늘 아침에 닿을 음악을 함께 찾아볼까요?';
  if (hour >= 12 && hour < 17) return '한낮의 시간에 어울릴 음악을 함께 찾아볼까요?';
  if (hour >= 17 && hour < 22) return '하루 끝에 닿을 음악을 함께 찾아볼까요?';
  return '밤의 시간을 함께 가늠해볼까요?';
}

// 가온의 3가지 역할 모드 — 사용자가 어떤 도움이 필요한지 명확히 선택
// 탭하면 해당 모드로 상담이 시작되며, 백엔드는 mode 파라미터로 시스템 프롬프트를 분기.
//
// concierge — 유진온뮤직 둘러보기: 안내·문의·신청 (학원/공연/대관 정보)
// curation  — 공연 큐레이션: 기획·프로그램·맞춤 자문 (B2C·B2B 행사)
// mind      — 마음의 음악: 위로·선물·일상의 한 곡 (개인·복지·교육 누구나)
const MODES = [
  {
    id: 'concierge',
    iconKey: 'book',
    label: '유진온뮤직 둘러보기',
    sub: '안내·문의·신청',
    prefill: '유진온뮤직에서 어떤 활동들을 할 수 있는지 알고 싶어요.',
  },
  {
    id: 'curation',
    iconKey: 'spotlight',
    label: '공연 큐레이션',
    sub: '기획·프로그램·맞춤 자문',
    prefill: '특별한 자리에 어울릴 음악 기획을 함께 만들어보고 싶어요.',
  },
  {
    id: 'mind',
    iconKey: 'heart',
    label: '마음의 음악',
    sub: '위로·선물·일상의 한 곡',
    prefill: '오늘의 마음에 어울리는 음악을 함께 골라주실 수 있을까요?',
    // 마음의 음악 모드만 — 누구나 쓸 수 있다는 걸 즉시 보여주는 예시 3개.
    // 사람의 카테고리(연령·진단명·소속)가 아닌 마음의 결과 음악의 다가감을 묘사 —
    // "이런 분들에게 닿을 음악이 준비되어 있어요" 톤.
    examples: [
      '마음이 지친 친구에게',
      '어르신과 함께 듣는 한 곡',
      '다정하게 다가갈 한 곡',
    ],
  },
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
    case 'book': return <OpenBookIcon color={chipColor} />;
    case 'spotlight': return <SpotlightStageIcon color={chipColor} />;
    case 'heart': return <HeartIcon color={chipColor} />;
    default: return null;
  }
}

// ── 가온의 3개 모드용 라인 아이콘 ──
// 음표 결합을 빼고 각 모드 의미를 직관적으로 전달하는 단일 모티프로.
// 음악적 결은 가온 캐릭터 자체와 배경 떠다니는 음표가 충분히 담당.

// 둘러보기 모드 — 펼쳐진 책 (안내·가이드 의미 명확)
function OpenBookIcon({ size = 32, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* 펼쳐진 책 윤곽 — 가운데가 살짝 들어가고 양 끝이 떨어진 형태 */}
      <Path
        d="M4 8.5 L16 7 L28 8.5 L28 25 L16 23.5 L4 25 Z"
        stroke={color} strokeWidth={1.4} fill="none" strokeLinejoin="round"
      />
      {/* 책등 (가운데 세로선) */}
      <Path d="M16 7 L16 23.5" stroke={color} strokeWidth={1.2} />
      {/* 왼쪽 페이지 텍스트 라인 (3줄, 옅게) */}
      <Path
        d="M7 12.5 L13 12.7 M7 15.5 L13 15.7 M7 18.5 L11 18.7"
        stroke={color} strokeWidth={0.9} strokeLinecap="round" opacity={0.6}
      />
      {/* 오른쪽 페이지 텍스트 라인 (3줄, 옅게) */}
      <Path
        d="M19 12.7 L25 12.5 M19 15.7 L25 15.5 M19 18.7 L23 18.5"
        stroke={color} strokeWidth={0.9} strokeLinecap="round" opacity={0.6}
      />
    </Svg>
  );
}

// 공연 큐레이션 모드 — 위에서 내려오는 스포트라이트 + 무대 (공연 톤 명확)
function SpotlightStageIcon({ size = 32, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* 스포트라이트 빔 채움 — 무대 위 빛 영역을 면으로 표현 */}
      <Path
        d="M13 5 L7 24 L25 24 L19 5 Z"
        fill={color} opacity={0.13}
      />
      {/* 좌우 빔 라인 (V자 윤곽) */}
      <Path
        d="M13 5 L7 24 M19 5 L25 24"
        stroke={color} strokeWidth={1.3} strokeLinecap="round"
      />
      {/* 무대 바닥 라인 */}
      <Path d="M3 25 L29 25" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      {/* 무대 위 빛이 모이는 자국 */}
      <Circle cx={16} cy={25} r={2.5} fill={color} opacity={0.55} />
    </Svg>
  );
}

// 마음의 음악 모드 — 깔끔한 라인 하트 (음표 제거, 단일 모티프)
function HeartIcon({ size = 32, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M16 27 C 5.5 19.5, 4.5 11, 10.5 9 C 12.5 8.3, 14.8 9, 16 12 C 17.2 9, 19.5 8.3, 21.5 9 C 27.5 11, 26.5 19.5, 16 27 Z"
        stroke={color} strokeWidth={1.5} fill="none" strokeLinejoin="round"
      />
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
  // 가온 모드 — 'concierge' | 'curation' | 'mind'. 모드 카드 탭 시 세팅.
  // 백엔드는 이 값으로 시스템 프롬프트를 분기 (Phase B에서 처리, 현재는 pass-through).
  const [mode, setMode] = useState(null);
  // 이어가기: 30분 이내 미완료 대화가 있으면 idle 화면에 카드 노출
  const [resumableSession, setResumableSession] = useState(null);
  // 음악 용어 정의 모달 — 가온 답변에서 단어 탭 시 활성화
  const [activeTerm, setActiveTerm] = useState(null);
  // 결의 흐름 — 사용자 첫 메시지 분석 후 노출되는 분위기 라벨
  const [mood, setMood] = useState(null);
  // 마무리 카드 — "오늘의 한 음" 모달 표시 여부
  const [showClosingCard, setShowClosingCard] = useState(false);
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

  // 진입 시 이전 세션 로드 — 30분 이내 미완료 대화가 있으면 idle에 카드 노출
  useEffect(() => {
    let cancelled = false;
    loadSession().then((s) => {
      if (cancelled) return;
      if (s) setResumableSession(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 메시지·consultationId 갱신 시 세션 저장 (자동 동기화)
  // completed면 세션 삭제 — 신청 끝난 대화는 복원할 필요 없음
  useEffect(() => {
    if (!started) return;
    if (completed) {
      clearSession();
      return;
    }
    if (consultationId && messages.length > 0) {
      saveSession(messages, consultationId);
    }
  }, [messages, consultationId, completed, started]);

  // 결의 흐름 감지 — 첫 user 메시지가 있고 아직 mood 미설정이면 분류
  // (새 대화는 sendMessage 후, 이어가기는 복원 후 messages가 갱신될 때 자동)
  useEffect(() => {
    if (!started || mood) return;
    const firstUserMsg = messages.find((m) => m.role === 'user');
    if (firstUserMsg?.text) {
      const detected = detectMood(firstUserMsg.text);
      if (detected) setMood(detected);
    }
  }, [started, messages, mood]);

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

  // 이전 대화를 그대로 이어가기 — 메시지·consultationId 모두 복원
  const resumeConversation = () => {
    if (!resumableSession) return;
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMessages(resumableSession.messages || []);
    setConsultationId(resumableSession.consultationId || null);
    setStarted(true);
    setResumableSession(null);
  };

  // 새 대화 시작하므로 저장된 세션 폐기 — 카드만 사라지고 idle 유지
  const discardResumableSession = () => {
    Haptics?.selectionAsync();
    clearSession();
    setResumableSession(null);
  };

  const startConversation = async (selectedMode = null, prefillText = '') => {
    // 시작 순간 강한 햅틱 — 의식적인 진입 느낌 부여
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // 모드 세팅 (모드 카드에서 시작한 경우. 일반 시작 버튼은 null로 진입 — 백엔드가 기본 톤 사용)
    if (selectedMode) setMode(selectedMode);
    // 초기 인사 메시지 삽입 — 모드별로 톤이 즉시 다르게 (concierge/curation/mind)
    setStarted(true);
    setMessages([
      {
        role: 'assistant',
        text: getModeAwareGreeting(selectedMode),
        firstAnimated: true, // 호흡 애니메이션 (단어별 페이드 + 골드 마무리)
      },
    ]);
    // 모드 카드에서 시작한 경우 입력창에 문구 자동 채움
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
        ...(mode && { mode }), // Phase B에서 백엔드가 활용 — 그 전엔 무시되어 기존 동작 유지
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
          {/* "오늘의 한 음" 받기 — 대화가 충분히 진행됐을 때만 노출 */}
          {started && !completed && !loading && messages.length >= 4 && (
            <TouchableOpacity
              style={styles.summaryBtn}
              onPress={() => {
                Haptics?.selectionAsync();
                setShowClosingCard(true);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              accessibilityLabel="오늘의 한 음 받기"
            >
              <View style={styles.summaryDiamond} />
              <Text style={styles.summaryBtnText}>한 음</Text>
            </TouchableOpacity>
          )}
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
            contentContainerStyle={[styles.introWrap, { paddingBottom: 24 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <ChopinAvatar size={120} />
            {/* 시간대별 타이틀 — 첫 인사(getModeAwareGreeting의 mind/free 분기)와 톤 일치, 매번 다른 결의 환영 */}
            <Text style={styles.introTitle}>{getTimeBasedTitle()}</Text>
            <View style={styles.ornament}>
              <View style={styles.goldLine} />
              <View style={styles.goldDiamond} />
              <View style={styles.goldLine} />
            </View>
            {/* 설명 — 행정 카탈로그 톤(공연/레슨/대관 나열) 대신 음악 큐레이터 톤으로 */}
            <Text style={styles.introDesc}>
              들으러 가는 공연이든, 누군가에게 보내고 싶은 한 곡이든.{'\n'}
              어떤 음악과 만나고 싶은지 편히 들려주시면,{'\n'}
              가온이 그 결에 닿을 자리를 함께 찾아드릴게요.
            </Text>

            {/* 이어가기 카드 — 30분 이내 미완료 대화가 있을 때만 노출 */}
            {resumableSession && (
              <View style={styles.resumeCard}>
                <Text style={styles.resumeLabel}>방금 전 대화를 이어가시겠어요?</Text>
                <Text style={styles.resumePreview} numberOfLines={2}>
                  "{getSessionPreview(resumableSession.messages)}"
                </Text>
                <Text style={styles.resumeTime}>
                  {formatRelativeTime(resumableSession.timestamp)}
                </Text>
                <View style={styles.resumeActions}>
                  <TouchableOpacity
                    style={styles.resumeSecondary}
                    activeOpacity={0.75}
                    onPress={discardResumableSession}
                  >
                    <Text style={styles.resumeSecondaryText}>새 대화</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.resumePrimary}
                    activeOpacity={0.85}
                    onPress={resumeConversation}
                  >
                    <Text style={styles.resumePrimaryText}>이어가기 →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 가온의 3가지 모드 — 어떤 도움이 필요한지 명확히 선택 */}
            <Text style={styles.chipsHeading}>오늘 어떤 도움이 필요하신가요?</Text>
            <View style={styles.modesWrap}>
              {MODES.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={styles.modeCard}
                  activeOpacity={0.78}
                  onPress={() => startConversation(m.id, m.prefill)}
                >
                  <View style={styles.modeCardIconWrap}>
                    <ChipIcon name={m.iconKey} color={colors.accent} />
                  </View>
                  <View style={styles.modeCardText}>
                    <Text style={styles.modeCardLabel}>{m.label}</Text>
                    <Text style={styles.modeCardSub}>{m.sub}</Text>
                    {/* 마음의 음악 모드만 — "누구나 쓸 수 있어요" 예시 노출 */}
                    {m.examples && (
                      <View style={styles.modeCardExamplesWrap}>
                        {m.examples.map((ex, i) => (
                          <Text key={i} style={styles.modeCardExample}>· {ex}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.startBtn} onPress={() => startConversation()} activeOpacity={0.85}>
              <SparkIcon size={14} color={colors.accentText} />
              <Text style={styles.startBtnText}>그냥 자유롭게 대화하기</Text>
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
          <>
            {/* 결의 흐름 라벨 — 첫 user 메시지 분석 후 노출 */}
            {mood && (
              <MoodLabel mood={mood} onDismiss={() => setMood(null)} />
            )}
            <ScrollView
              ref={scrollRef}
              style={styles.chatScroll}
              contentContainerStyle={styles.chatContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollToBottom(true)}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((m, i) => (
                <MessageBubble key={i} message={m} onTermPress={setActiveTerm} />
              ))}
              {loading && <TypingIndicator />}
              {completed && (
                <TicketReceipt consultationId={consultationId} onClose={() => router.back()} />
              )}
            </ScrollView>
          </>
        )}

        {/* 입력 영역 (대화 시작 후에만) */}
        {started && !completed && (
          <>
            {/* 세 갈래 길 — 접었다 폈다 가능한 제안 패널.
                mode 전달 시 그 모드의 prompt 3개만, mode null이면 시간대별 다양성 prompt. */}
            <ThreePaths
              hasInput={input.trim().length > 0}
              onSelect={(prefill) => setInput(prefill)}
              mode={mode}
            />
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
          </>
        )}
      </View>

      {/* 음악 용어 정의 모달 */}
      <GlossaryModal
        visible={!!activeTerm}
        term={activeTerm}
        onClose={() => setActiveTerm(null)}
      />

      {/* 오늘의 한 음 — 마무리 카드 */}
      <ClosingCard
        visible={showClosingCard}
        messages={messages}
        onClose={() => setShowClosingCard(false)}
        onCloseAndExit={() => {
          setShowClosingCard(false);
          router.back();
        }}
      />
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
  const { colors } = useTheme();
  const styles = makeStyles(colors);
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
function MessageBubble({ message, onTermPress }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
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

  // assistant — 첫 메시지는 호흡 애니메이션, 이후 답변은 음악 용어 인식 텍스트
  if (message.firstAnimated) {
    return <AnimatedFirstMessage text={message.text} />;
  }

  return (
    <View style={styles.assistantWrap}>
      <View style={styles.assistantAvatar}>
        <ChopinAvatarSmall size={28} />
      </View>
      <View style={styles.assistantBubble}>
        <GlossaryText
          text={message.text}
          baseStyle={styles.assistantText}
          accentColor={colors.accent}
          onTermPress={onTermPress}
        />
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

  /* ── 가온 3개 모드 카드 ── */
  modesWrap: {
    width: '100%',
    gap: 10,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 6,
    backgroundColor: c.inputBg,
    borderWidth: 0.5,
    borderColor: 'rgba(201,169,110,0.4)',
  },
  modeCardIconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  modeCardText: {
    flex: 1,
    gap: 3,
  },
  modeCardLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: c.text,
    letterSpacing: 0.5,
  },
  modeCardSub: {
    fontSize: 11,
    color: c.textMuted,
    letterSpacing: 0.5,
  },
  modeCardExamplesWrap: {
    marginTop: 8,
    gap: 3,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: c.borderSoft,
  },
  modeCardExample: {
    fontSize: 11,
    color: c.textSoft,
    fontStyle: 'italic',
    letterSpacing: 0.2,
    lineHeight: 17,
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

  // 헤더 — "오늘의 한 음" 버튼 (대화가 일정 분량 진행됐을 때만 노출)
  summaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 0.5,
    borderColor: c.accent,
    borderRadius: 4,
    marginRight: 4,
  },
  summaryDiamond: {
    width: 4,
    height: 4,
    backgroundColor: c.accent,
    transform: [{ rotate: '45deg' }],
    opacity: 0.8,
  },
  summaryBtnText: {
    fontSize: 11,
    color: c.accent,
    letterSpacing: 1.2,
  },

  // 이어가기 카드 — idle 화면에서 진행 중이던 대화 복원
  resumeCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: c.surface,
    borderWidth: 0.5,
    borderColor: c.accent,
    borderRadius: 4,
    padding: 16,
    marginTop: 24,
    marginBottom: 4,
  },
  resumeLabel: {
    fontSize: 12,
    color: c.accent,
    letterSpacing: 1.4,
    marginBottom: 12,
    textAlign: 'center',
  },
  resumePreview: {
    fontSize: 13,
    color: c.text,
    lineHeight: 22,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  resumeTime: {
    fontSize: 10,
    color: c.textMuted,
    letterSpacing: 0.8,
    textAlign: 'right',
    marginBottom: 14,
  },
  resumeActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  resumePrimary: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 0.5,
    borderColor: c.accent,
    backgroundColor: c.accent,
    borderRadius: 4,
  },
  resumePrimaryText: {
    fontSize: 12,
    color: c.accentText,
    letterSpacing: 1.2,
  },
  resumeSecondary: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 0.5,
    borderColor: c.border,
    borderRadius: 4,
  },
  resumeSecondaryText: {
    fontSize: 12,
    color: c.textMuted,
    letterSpacing: 1.2,
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
