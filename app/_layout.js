import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Animated, StyleSheet, Dimensions, Platform, Easing } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { ThemeProvider, useTheme } from '../hooks/useTheme';
import { doc, setDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import InAppNotification from '../components/InAppNotification';
import Svg, { Path, Circle as SvgCircle, Line } from 'react-native-svg';
import { hasUserConsented } from './consent';

// 앱 시작 시 세로 고정 (특정 화면에서만 가로 허용)
if (Platform.OS !== 'web') {
  try {
    const ScreenOrientation = require('expo-screen-orientation');
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  } catch {}
}

// 네이티브 스플래시 스크린 유지 (앱 준비 전까지)
SplashScreen.preventAutoHideAsync().catch(() => {});

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── SVG 음악 아이콘들 ──
function DoubleNote({ size = 24, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18V5l12-2v13" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 21a3 3 0 100-6 3 3 0 000 6z" fill={color} opacity={0.3} stroke={color} strokeWidth={1} />
      <Path d="M18 19a3 3 0 100-6 3 3 0 000 6z" fill={color} opacity={0.3} stroke={color} strokeWidth={1} />
    </Svg>
  );
}

function SingleNote({ size = 20, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3v15" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M12 3l6-1v5l-6 1V3z" fill={color} opacity={0.25} stroke={color} strokeWidth={1} strokeLinejoin="round" />
      <SvgCircle cx="9" cy="18" r="3" fill={color} opacity={0.3} stroke={color} strokeWidth={1} />
    </Svg>
  );
}

function TrebleClef({ size = 32, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size * 1.6} viewBox="0 0 24 38" fill="none">
      <Path
        d="M12 36V8c0-4 3-7 5-7s3 2 3 4c0 3-4 6-8 8-4 2-7 5-7 9 0 5 4 8 7 8 2 0 4-1 5-3"
        stroke={color} strokeWidth={1.2} strokeLinecap="round" fill="none" />
      <SvgCircle cx="12" cy="28" r="2" fill={color} opacity={0.4} />
    </Svg>
  );
}

function SharpSign({ size = 18, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="8" y1="2" x2="8" y2="22" stroke={color} strokeWidth={1.5} />
      <Line x1="16" y1="2" x2="16" y2="22" stroke={color} strokeWidth={1.5} />
      <Line x1="3" y1="8" x2="21" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="3" y1="18" x2="21" y2="16" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// ── 떠다니는 파티클 (골드 반짝임) ──
function FloatingParticle({ anim, x, y, size = 3 }) {
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#C9A96E',
        opacity: anim.opacity,
        transform: [{ translateY: anim.translateY }, { scale: anim.scale }],
      }}
    />
  );
}

// ── 오선지 (Staff Lines) ──
function StaffLines({ opacity, width: lineW, align = 'flex-end' }) {
  return (
    <Animated.View style={{ position: 'absolute', opacity, width: SCREEN_W, alignItems: align }}>
      {[0, 6, 12, 18, 24].map((offset) => (
        <Animated.View
          key={offset}
          style={{
            height: 0.5,
            backgroundColor: '#C9A96E',
            opacity: 0.12,
            marginBottom: 5.5,
            width: lineW,
          }}
        />
      ))}
    </Animated.View>
  );
}

// ── 스플래시 오디오 에러 바운더리 ──
// iOS 26에서 expo-audio 훅이 초기화 중 throw할 경우 앱 전체가 SIGABRT로 죽지 않도록 격리
class SplashAudioErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error) { console.warn('[SplashAudio] error:', error?.message || error); }
  render() { return this.state.hasError ? null : this.props.children; }
}

// 오프닝 음원 재생을 담당하는 격리 컴포넌트
// useAudioPlayer 훅이 throw해도 ErrorBoundary가 잡아내고, 부모 스플래시는 2초 타임아웃으로 계속 진행됨
function SplashOpeningAudio({ onLoaded }) {
  const player = useAudioPlayer(require('../assets/audio/eon_opening.mp3'));
  const status = useAudioPlayerStatus(player);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    if (!status?.isLoaded) return;
    startedRef.current = true;
    // 부모에게 로드 완료 알림 → 애니메이션 시퀀스 시작
    try { onLoaded?.(); } catch {}
    // iOS 무음 스위치 ON에서 재생되지 않도록 함
    try { setAudioModeAsync({ playsInSilentMode: false }).catch(() => {}); } catch {}
    try { player.play(); } catch {}
  }, [status?.isLoaded]);

  return null;
}

// ── 애니메이션 스플래시 화면 ──
function AnimatedSplash({ onFinish }) {
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioTimedOut, setAudioTimedOut] = useState(false);
  const startedRef = useRef(false);

  // 메인 요소 애니메이션
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoRotate = useRef(new Animated.Value(-0.02)).current;
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(10)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;
  const lineLeftWidth = useRef(new Animated.Value(0)).current;
  const lineRightWidth = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;
  const finalScale = useRef(new Animated.Value(1)).current;

  // 잔잔한 헤일로 — 로고에서 부드럽게 한 번 퍼지는 동심원 (호수 위 파문처럼)
  // 클라이맥스 시점에 단 한 번, 천천히 큰 폭으로 퍼지며 사라짐
  const haloScale = useRef(new Animated.Value(0.4)).current;
  const haloOpacity = useRef(new Animated.Value(0)).current;

  // 로고 호흡 — 로고 안착 후 매우 미세한 scale loop (1.0 ↔ 1.015) — 살아있는 느낌
  const logoBreath = useRef(new Animated.Value(1)).current;

  // 타이틀 글자별 등장 — '유진온뮤직' 5글자가 한 음씩 타건되듯 순차 페이드인
  const TITLE_CHARS = ['유', '진', '온', '뮤', '직'];
  const titleCharAnims = useRef(
    TITLE_CHARS.map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(12),
    }))
  ).current;

  // 오선지 배경
  const staffOpacity = useRef(new Animated.Value(0)).current;
  const staffWidth = useRef(new Animated.Value(0)).current;

  // 건반 장식 (미사용)
  const pianoOpacity = useRef(new Animated.Value(0)).current;

  // 음표/음악기호 애니메이션 (8개)
  const NUM_NOTES = 8;
  const noteAnims = useRef(
    Array.from({ length: NUM_NOTES }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      scale: new Animated.Value(0.5),
      rotate: new Animated.Value(0),
    }))
  ).current;

  // 골드 파티클 (6개) — 정돈된 여백을 위해 12 → 6으로 감소
  const NUM_PARTICLES = 6;
  const particleAnims = useRef(
    Array.from({ length: NUM_PARTICLES }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  // 음표 위치/종류 설정 — delay는 이제 멜로디 박자처럼 순차적으로 분포 (좌→우 교차)
  // 6.92초 전체 스플래시 중 1.4~3.5초 구간에 8개 음표가 박자감 있게 등장
  const noteConfigs = [
    { x: SCREEN_W * 0.08, y: SCREEN_H * 0.2,  type: 'single', size: 18, delay: 0,    floatDist: -25 },
    { x: SCREEN_W * 0.82, y: SCREEN_H * 0.18, type: 'double', size: 20, delay: 280,  floatDist: -30 },
    { x: SCREEN_W * 0.15, y: SCREEN_H * 0.38, type: 'sharp',  size: 14, delay: 540,  floatDist: -15 },
    { x: SCREEN_W * 0.78, y: SCREEN_H * 0.42, type: 'single', size: 16, delay: 820,  floatDist: -20 },
    { x: SCREEN_W * 0.05, y: SCREEN_H * 0.58, type: 'double', size: 22, delay: 1100, floatDist: -28 },
    { x: SCREEN_W * 0.85, y: SCREEN_H * 0.62, type: 'treble', size: 20, delay: 1380, floatDist: -22 },
    { x: SCREEN_W * 0.2,  y: SCREEN_H * 0.75, type: 'single', size: 15, delay: 1660, floatDist: -18 },
    { x: SCREEN_W * 0.72, y: SCREEN_H * 0.78, type: 'double', size: 17, delay: 1940, floatDist: -24 },
  ];


  // 파티클 위치 (로고 주변 원형 배치)
  const particleConfigs = Array.from({ length: NUM_PARTICLES }, (_, i) => {
    const angle = (i / NUM_PARTICLES) * Math.PI * 2;
    const radius = 80 + Math.random() * 40;
    return {
      x: SCREEN_W / 2 + Math.cos(angle) * radius - 2,
      y: SCREEN_H / 2 - 40 + Math.sin(angle) * radius - 2,
      size: 2 + Math.random() * 3,
      delay: i * 60,
      floatDist: -15 - Math.random() * 20,
    };
  });

  // 음원 로드가 너무 오래 걸리면 2초 후 음원 없이 진행 (폴백)
  useEffect(() => {
    const t = setTimeout(() => setAudioTimedOut(true), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // 음원 로드 완료되거나 폴백 타임아웃이 떨어질 때까지 네이티브 스플래시 유지
    if (startedRef.current) return;
    if (!audioLoaded && !audioTimedOut) return;
    startedRef.current = true;

    SplashScreen.hideAsync().catch(() => {});
    // 오디오 재생은 SplashOpeningAudio 서브컴포넌트가 로드 완료 시점에 자체적으로 처리

    // ── 음표 애니메이션 생성 ──
    const noteAnimations = noteAnims.map((anim, i) => {
      const cfg = noteConfigs[i];
      return Animated.sequence([
        Animated.delay(600 + cfg.delay),
        Animated.parallel([
          Animated.timing(anim.opacity, { toValue: 0.5 + Math.random() * 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(anim.scale, { toValue: 0.8 + Math.random() * 0.4, duration: 600, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
          Animated.timing(anim.translateY, { toValue: cfg.floatDist, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(anim.rotate, { toValue: (Math.random() - 0.5) * 0.3, duration: 1800, useNativeDriver: true }),
          // 좌우 미세 흔들림
          Animated.sequence([
            Animated.timing(anim.translateX, { toValue: (Math.random() - 0.5) * 10, duration: 900, useNativeDriver: true }),
            Animated.timing(anim.translateX, { toValue: (Math.random() - 0.5) * 8, duration: 900, useNativeDriver: true }),
          ]),
        ]),
      ]);
    });

    // ── 파티클 애니메이션 생성 ──
    const particleAnimations = particleAnims.map((anim, i) => {
      const cfg = particleConfigs[i];
      return Animated.sequence([
        Animated.delay(800 + cfg.delay),
        Animated.parallel([
          Animated.sequence([
            Animated.timing(anim.opacity, { toValue: 0.7 + Math.random() * 0.3, duration: 300, useNativeDriver: true }),
            Animated.delay(400 + Math.random() * 400),
            Animated.timing(anim.opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
          ]),
          Animated.timing(anim.translateY, { toValue: cfg.floatDist, duration: 1200, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(anim.scale, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(anim.scale, { toValue: 0, duration: 900, useNativeDriver: true }),
          ]),
        ]),
      ]);
    });

    // ── 헤일로 애니메이션 (클라이맥스, ~3.0초 시점) — 단 한 번 부드럽게 퍼짐 ──
    const haloAnimation = Animated.sequence([
      Animated.delay(2900),
      Animated.parallel([
        Animated.timing(haloScale, { toValue: 2.2, duration: 1800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(haloOpacity, { toValue: 0.22, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(haloOpacity, { toValue: 0, duration: 1200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
      ]),
    ]);

    // ── 로고 호흡 루프 — 안착 후 1.5초부터 페이드아웃 직전까지 ──
    // scale 1.0 ↔ 1.015를 2.5초 주기로 2번 반복 (총 5초) — 거의 의식 못 할 정도로 미세
    // iterations 명시: 무한 루프면 parallel.start() 콜백이 안 불려 onFinish 안 됨
    const logoBreathLoop = Animated.sequence([
      Animated.delay(1500),
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoBreath, { toValue: 1.015, duration: 1250, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(logoBreath, { toValue: 1, duration: 1250, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        { iterations: 2 }
      ),
    ]);

    // ── 메인 시퀀스 ──
    Animated.parallel([
      // 오선지: 독립적으로 오른쪽→왼쪽 끝까지 펼쳐짐
      Animated.parallel([
        Animated.timing(staffOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(staffWidth, { toValue: SCREEN_W * 0.55, duration: 1800, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]),

      // 헤일로 + 로고 호흡 루프
      haloAnimation,
      logoBreathLoop,

      // 메인 시퀀스
      Animated.sequence([
        // 1단계: 짧은 대기 후 로고 등장
        Animated.delay(300),

        // 2단계: 로고 등장 + 링 이펙트
        Animated.parallel([
          Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 35, useNativeDriver: true }),
          Animated.timing(logoRotate, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          // 링 확장 이펙트
          Animated.sequence([
            Animated.delay(200),
            Animated.parallel([
              Animated.timing(ringScale, { toValue: 1.8, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
              Animated.sequence([
                Animated.timing(ringOpacity, { toValue: 0.6, duration: 200, useNativeDriver: true }),
                Animated.timing(ringOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
              ]),
            ]),
          ]),
        ]),

        // 3단계: 골드 라인 양쪽으로 확장 (1000~1400ms)
        Animated.parallel([
          Animated.timing(lineLeftWidth, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
          Animated.sequence([
            Animated.delay(80),
            Animated.timing(lineRightWidth, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
          ]),
          // 건반 장식 등장
          Animated.sequence([
            Animated.delay(200),
            Animated.timing(pianoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          ]),
        ]),

        // 4단계: 타이틀 글자별 stagger + 서브타이틀 (1400~2400ms)
        // 한 글자씩 130ms 간격으로 페이드인 + 살짝 위로 — 한 음씩 타건되는 느낌
        Animated.parallel([
          Animated.stagger(
            130,
            titleCharAnims.map((anim) =>
              Animated.parallel([
                Animated.timing(anim.opacity, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                Animated.spring(anim.translateY, { toValue: 0, friction: 9, tension: 50, useNativeDriver: true }),
              ])
            )
          ),
          Animated.sequence([
            Animated.delay(700), // 마지막 글자 등장 직후
            Animated.parallel([
              Animated.timing(subtitleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
              Animated.spring(subtitleTranslateY, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
            ]),
          ]),
        ]),

        // 5단계: 페이드아웃 전 대기 (음원 6.92초 중 뒷부분 1초 컷 → 총 스플래시 ~5.92초)
        Animated.delay(3072),

        // 6단계: 페이드아웃 + 살짝 확대
        Animated.parallel([
          Animated.timing(fadeOut, { toValue: 0, duration: 450, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          Animated.timing(finalScale, { toValue: 1.05, duration: 450, useNativeDriver: true }),
        ]),
      ]),

      // 음표들 동시에 (delay로 시차)
      ...noteAnimations,

      // 파티클들 동시에
      ...particleAnimations,
    ]).start(() => {
      onFinish();
    });
  }, [audioLoaded, audioTimedOut]);

  // 보간값
  const animLineLeft = lineLeftWidth.interpolate({ inputRange: [0, 1], outputRange: [0, 40] });
  const animLineRight = lineRightWidth.interpolate({ inputRange: [0, 1], outputRange: [0, 40] });
  const logoRotateStr = logoRotate.interpolate({ inputRange: [-0.1, 0.1], outputRange: ['-6deg', '6deg'] });

  // 음표 아이콘 렌더링
  const renderNoteIcon = (type, size, color) => {
    switch (type) {
      case 'double': return <DoubleNote size={size} color={color} />;
      case 'single': return <SingleNote size={size} color={color} />;
      case 'treble': return <TrebleClef size={size} color={color} />;
      case 'sharp': return <SharpSign size={size} color={color} />;
      default: return <SingleNote size={size} color={color} />;
    }
  };

  return (
    <Animated.View style={[splashStyles.container, { opacity: fadeOut, transform: [{ scale: finalScale }] }]}>

      {/* 오프닝 오디오 — ErrorBoundary로 격리. 네이티브 오디오 모듈이 iOS 26에서
          throw해도 앱 전체가 SIGABRT로 내려가지 않도록 분리되어 있음. 실패 시
          2초 타임아웃(audioTimedOut)으로 스플래시 애니메이션은 계속 진행됨. */}
      <SplashAudioErrorBoundary>
        <SplashOpeningAudio onLoaded={() => setAudioLoaded(true)} />
      </SplashAudioErrorBoundary>

      {/* 오선지 배경 (지그재그 4개) */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: SCREEN_H * 0.15 }}>
        <StaffLines opacity={staffOpacity} width={staffWidth} align="flex-start" />
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, top: SCREEN_H * 0.28 }}>
        <StaffLines opacity={staffOpacity} width={staffWidth} align="flex-end" />
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, top: SCREEN_H * 0.68 }}>
        <StaffLines opacity={staffOpacity} width={staffWidth} align="flex-start" />
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, top: SCREEN_H * 0.80 }}>
        <StaffLines opacity={staffOpacity} width={staffWidth} align="flex-end" />
      </View>

      {/* 떠다니는 음표/음악기호들 */}
      {noteConfigs.map((cfg, i) => {
        const anim = noteAnims[i];
        const rotateStr = anim.rotate.interpolate({
          inputRange: [-0.5, 0.5],
          outputRange: ['-15deg', '15deg'],
        });
        return (
          <Animated.View
            key={`note-${i}`}
            style={{
              position: 'absolute',
              left: cfg.x,
              top: cfg.y,
              opacity: anim.opacity,
              transform: [
                { translateY: anim.translateY },
                { translateX: anim.translateX },
                { scale: anim.scale },
                { rotate: rotateStr },
              ],
            }}
          >
            {renderNoteIcon(cfg.type, cfg.size, '#C9A96E')}
          </Animated.View>
        );
      })}

      {/* 골드 파티클 (로고 주변 반짝임) */}
      {particleConfigs.map((cfg, i) => (
        <FloatingParticle
          key={`particle-${i}`}
          anim={particleAnims[i]}
          x={cfg.x}
          y={cfg.y}
          size={cfg.size}
        />
      ))}

      {/* 로고 + 링 컨테이너 */}
      <View style={splashStyles.logoWrap}>
        {/* 잔잔한 헤일로 — 로고 중심에서 부드럽게 한 번 퍼지는 동심원 (호수 위 파문) */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 140,
            height: 140,
            borderRadius: 70,
            borderWidth: 0.8,
            borderColor: '#C9A96E',
            opacity: haloOpacity,
            transform: [{ scale: haloScale }],
          }}
        />

        {/* 로고 링 이펙트 */}
        <Animated.View
          style={[
            splashStyles.logoRing,
            {
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />

        {/* 로고 — logoScale(등장)과 logoBreath(호흡 루프)를 곱 transform으로 조합 */}
        <Animated.Image
          source={require('../assets/images/logo.png')}
          style={[
            splashStyles.logo,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }, { scale: logoBreath }, { rotate: logoRotateStr }],
            },
          ]}
          resizeMode="contain"
        />
      </View>

      {/* 골드 라인 (좌우 대칭 확장) */}
      <View style={splashStyles.lineRow}>
        <Animated.View style={[splashStyles.goldLine, { width: animLineLeft, marginRight: 6 }]} />
        <View style={splashStyles.goldDiamond} />
        <Animated.View style={[splashStyles.goldLine, { width: animLineRight, marginLeft: 6 }]} />
      </View>

      {/* 앱 타이틀 — 글자별로 한 음씩 타건되듯 순차 등장 */}
      <View style={splashStyles.titleRow}>
        {TITLE_CHARS.map((ch, i) => {
          const a = titleCharAnims[i];
          return (
            <Animated.Text
              key={`titleChar-${i}`}
              style={[
                splashStyles.title,
                {
                  opacity: a.opacity,
                  transform: [{ translateY: a.translateY }],
                },
              ]}
            >
              {ch}
            </Animated.Text>
          );
        })}
      </View>

      {/* 서브타이틀 */}
      <Animated.Text
        style={[
          splashStyles.subtitle,
          {
            opacity: subtitleOpacity,
            transform: [{ translateY: subtitleTranslateY }],
          },
        ]}
      >
        EON International Music
      </Animated.Text>
    </Animated.View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#110E0B',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  logoWrap: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#C9A96E',
  },
  logo: {
    width: 120,
    height: 120,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  goldLine: {
    height: 1.5,
    backgroundColor: '#C9A96E',
    borderRadius: 1,
  },
  goldDiamond: {
    width: 6,
    height: 6,
    backgroundColor: '#C9A96E',
    transform: [{ rotate: '45deg' }],
  },
  pianoWrap: {
    marginBottom: 18,
    opacity: 0.4,
  },
  // 글자별 등장이라 marginBottom은 부모 row에 부여, 개별 글자엔 letterSpacing만
  titleRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '300',
    color: '#F5F0E8',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '400',
    color: '#9e9282',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});

// 로그인 상태 + 약관 동의 체크 게이트
// - 로그인했지만 약관 미동의 → /consent로 이동
function ConsentGate() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const checkedRef = useRef(null);

  useEffect(() => {
    if (loading) return;
    if (!user?.uid) {
      checkedRef.current = null;
      return;
    }

    // 이미 체크된 사용자면 건너뛰기
    if (checkedRef.current === user.uid) return;

    // consent 페이지와 로그인 페이지는 체크 제외
    if (pathname === '/consent' || pathname?.startsWith('/auth')) return;

    hasUserConsented(user.uid).then((consented) => {
      checkedRef.current = user.uid;
      if (!consented) {
        router.replace('/consent');
      }
    }).catch((err) => {
      console.warn('[ConsentGate] error:', err);
    });
  }, [user?.uid, loading, pathname]);

  return null;
}

// 앱 시작 시 푸시 토큰을 Firestore에 저장하는 컴포넌트
function NotificationInit() {
  const { user } = useAuth();
  const { expoPushToken } = useNotifications(user);

  useEffect(() => {
    if (!user?.uid || !expoPushToken) return;

    (async () => {
      try {
        // 같은 디바이스 토큰이 다른 uid 아래 남아있다면 삭제
        // (이전 계정 로그아웃 없이 새 계정으로 전환한 경우 등)
        // 그대로 두면 채팅 푸시가 엉뚱한 계정으로 가거나 본인에게 되돌아옴
        const staleQ = query(
          collection(db, 'pushTokens'),
          where('token', '==', expoPushToken)
        );
        const stale = await getDocs(staleQ);
        await Promise.all(
          stale.docs
            .filter((d) => d.id !== user.uid)
            .map((d) => deleteDoc(d.ref).catch(() => {}))
        );
      } catch (err) {
        console.warn('Stale push token cleanup failed:', err);
      }

      // Firestore에 유저별 푸시 토큰 저장
      setDoc(
        doc(db, 'pushTokens', user.uid),
        {
          token: expoPushToken,
          uid: user.uid,
          role: user.role || 'student',
          updatedAt: new Date(),
        },
        { merge: true }
      ).catch((err) => console.warn('Push token save failed:', err));
    })();
  }, [user, expoPushToken]);

  return null;
}

// 테마 토큰을 사용해야 하는 부분(Stack 배경, StatusBar)을 ThemeProvider 하위로 격리
function ThemedRootContent({ splashDone, onSplashFinish }) {
  const { colors } = useTheme();
  return (
    <>
      <StatusBar style={colors.statusBar} />
      <NotificationInit />
      <ConsentGate />
      <InAppNotification />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="auth/login"
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="consent"
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="community/index" />
        <Stack.Screen name="community/write" options={{ presentation: 'modal' }} />
        <Stack.Screen name="community/[id]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="course/[id]" />
        <Stack.Screen name="mentor/index" />
        <Stack.Screen name="blog/[id]" />
        <Stack.Screen name="lesson/schedule" />
        <Stack.Screen name="lesson/notes" />
        <Stack.Screen name="lesson/note-write" options={{ presentation: 'modal' }} />
        <Stack.Screen name="lesson/assignments" />
        <Stack.Screen name="lesson/sheet-music" />
        <Stack.Screen name="lesson/videos" />
        <Stack.Screen name="news/[id]" />
        <Stack.Screen name="settings/profile" />
        <Stack.Screen name="settings/notifications" />
        <Stack.Screen name="settings/practice-goal" />
        <Stack.Screen name="settings/help" />
        <Stack.Screen name="settings/app-info" />
        <Stack.Screen name="settings/practice-stats" />
        <Stack.Screen name="settings/privacy" />
        <Stack.Screen name="settings/terms" />
        <Stack.Screen name="settings/theme" />
        <Stack.Screen name="admin/send-notification" />
        <Stack.Screen name="admin/inquiries/index" />
        <Stack.Screen name="admin/inquiries/[id]" />
        <Stack.Screen name="ai-consult" options={{ presentation: 'modal', gestureEnabled: false }} />
        <Stack.Screen name="my-consultations" />
      </Stack>
      {!splashDone && <AnimatedSplash onFinish={onSplashFinish} />}
    </>
  );
}

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);

  const handleSplashFinish = useCallback(() => {
    setSplashDone(true);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider>
          <ThemedRootContent splashDone={splashDone} onSplashFinish={handleSplashFinish} />
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
