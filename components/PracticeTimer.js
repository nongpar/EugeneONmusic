import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, Animated, AppState } from 'react-native';
import Svg, { Circle, Path, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { savePracticeSession, loadGoalMinutes } from '../hooks/usePracticeStats';
import { useTheme } from '../hooks/useTheme';
import { confirmStartPractice } from './practiceStart';

// 화면 켜짐 유지 (Android/iOS 동일)
let KeepAwake = null;
try { KeepAwake = require('expo-keep-awake'); } catch {}

// SVG 아이콘
function RefreshSvg({ size = 24, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M1 4v6h6M23 20v-6h-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function PlaySvg({ size = 32, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 3l14 9-14 9V3z" fill={color} />
    </Svg>
  );
}
function PauseSvg({ size = 32, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="6" y1="4" x2="6" y2="20" stroke={color} strokeWidth={3} strokeLinecap="round" />
      <Line x1="18" y1="4" x2="18" y2="20" stroke={color} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}
function SaveSvg({ size = 24, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 21v-8H7v8M7 3v5h8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function TrophySvg({ size = 24, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M6 3h12v7a6 6 0 01-12 0V3z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 16v3M8 22h8M10 19h4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

const showAlert = (title, message, buttons) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message, buttons);
  }
};

const RADIUS = 110;
const STROKE_WIDTH = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SIZE = (RADIUS + STROKE_WIDTH) * 2;

export default function PracticeTimer({ userId, todaySeconds: externalTodaySeconds = 0, autoStart = false }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [goalMinutes, setGoalMinutes] = useState(60);
  const [celebrated, setCelebrated] = useState(false);
  const autoStarted = useRef(false);
  const celebrateAnim = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef(null);
  const backgroundTimeRef = useRef(null); // 백그라운드 진입 시각
  const keepAwakeActive = useRef(false); // KeepAwake 활성화 상태 추적

  // KeepAwake 안전 활성화/비활성화 헬퍼
  const safeActivateKeepAwake = () => {
    if (!KeepAwake || keepAwakeActive.current) return;
    try {
      const result = KeepAwake.activateKeepAwakeAsync?.('practice-timer');
      if (result?.catch) result.catch(() => {});
      keepAwakeActive.current = true;
    } catch {}
  };
  const safeDeactivateKeepAwake = () => {
    if (!KeepAwake || !keepAwakeActive.current) return;
    try {
      const result = KeepAwake.deactivateKeepAwake?.('practice-timer');
      if (result?.catch) result.catch(() => {});
    } catch {}
    keepAwakeActive.current = false;
  };

  // 목표 로드
  useEffect(() => {
    loadGoalMinutes().then(setGoalMinutes);
  }, []);

  // 자동 시작 (목표 설정 → 바로 시작)
  useEffect(() => {
    if (autoStart && !autoStarted.current) {
      autoStarted.current = true;
      setIsRunning(true);
    }
  }, [autoStart]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
      // 타이머 실행 중에는 화면 꺼짐 방지
      safeActivateKeepAwake();
    } else {
      safeDeactivateKeepAwake();
    }
    return () => {
      clearInterval(intervalRef.current);
      safeDeactivateKeepAwake();
    };
  }, [isRunning]);

  // 백그라운드 ↔ 포그라운드 전환 시 시간 정확히 유지
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (!isRunning) return;
      if (nextState === 'background' || nextState === 'inactive') {
        // 백그라운드 진입: 시각 저장, interval 정리
        backgroundTimeRef.current = Date.now();
        clearInterval(intervalRef.current);
      } else if (nextState === 'active' && backgroundTimeRef.current) {
        // 포그라운드 복귀: 경과 시간 계산 후 추가
        const elapsed = Math.floor((Date.now() - backgroundTimeRef.current) / 1000);
        if (elapsed > 0) {
          setSeconds((s) => s + elapsed);
        }
        backgroundTimeRef.current = null;
        // 재시작 (isRunning effect 에서 자동 처리되도록 interval 새로 설정)
        intervalRef.current = setInterval(() => {
          setSeconds((s) => s + 1);
        }, 1000);
      }
    });
    return () => sub.remove();
  }, [isRunning]);

  // 목표 달성 실시간 감지
  const totalTodaySeconds = externalTodaySeconds + seconds;
  const goalSeconds = goalMinutes * 60;
  const justReachedGoal = totalTodaySeconds >= goalSeconds && !celebrated && isRunning;

  useEffect(() => {
    if (justReachedGoal) {
      setCelebrated(true);
      // 축하 애니메이션
      Animated.sequence([
        Animated.timing(celebrateAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(celebrateAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ]).start();
    }
  }, [justReachedGoal]);

  // 타이머 리셋시 축하 상태도 리셋
  useEffect(() => {
    if (seconds === 0) setCelebrated(false);
  }, [seconds]);

  const toggle = useCallback(() => {
    // 새 연습 세션 시작 (정지 + 누적 0초)에만 경고 알림 + 강한 햅틱 (공통 헬퍼).
    // 일시정지에서 재개하거나 멈출 때는 가벼운 햅틱만 — 방해 최소화.
    if (!isRunning && seconds === 0) {
      confirmStartPractice(() => setIsRunning(true));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setIsRunning((r) => !r);
  }, [isRunning, seconds]);

  const handleSave = useCallback(async () => {
    if (seconds === 0) return;
    if (!userId) {
      showAlert('알림', '로그인 후 연습 기록을 저장할 수 있습니다.');
      return;
    }
    setSaving(true);
    try {
      await savePracticeSession(userId, seconds);
      const newTotal = externalTodaySeconds + seconds;
      const goalMet = newTotal >= goalSeconds;

      if (goalMet) {
        showAlert(
          '목표 달성!',
          `${formatFullTime(seconds)} 연습이 기록되었습니다.\n\n오늘의 목표 ${goalMinutes}분을 달성했습니다! 훌륭해요!`
        );
      } else {
        const remaining = goalSeconds - newTotal;
        showAlert(
          '저장 완료',
          `${formatFullTime(seconds)} 연습이 기록되었습니다.\n목표까지 ${formatFullTime(remaining)} 남았어요!`
        );
      }

      setIsRunning(false);
      setSeconds(0);
    } catch (err) {
      console.warn('Practice save error:', err);
      showAlert('오류', '연습 기록 저장에 실패했습니다.');
    }
    setSaving(false);
  }, [seconds, userId, externalTodaySeconds, goalSeconds, goalMinutes]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setSeconds(0);
  }, []);

  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const timeStr =
    hours > 0
      ? `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // 프로그래스: 오늘 총 연습시간 / 목표
  const progress = goalSeconds > 0 ? Math.min(totalTodaySeconds / goalSeconds, 1) : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  const progressPercent = Math.round(progress * 100);

  // 프로그래스 원 색상
  const progressColor = progress >= 1 ? '#4ade80' : colors.accent;

  // 오늘 기존 연습 시간 표시
  const todayMins = Math.floor(externalTodaySeconds / 60);

  return (
    <View style={styles.container}>
      {/* 목표 정보 헤더 */}
      <View style={styles.goalHeader}>
        <TrophySvg size={16} color={progress >= 1 ? '#4ade80' : colors.textMuted} />
        <Text style={[styles.goalText, progress >= 1 && styles.goalTextMet]}>
          {progress >= 1
            ? '오늘 목표 달성!'
            : `오늘 목표: ${goalMinutes}분`
          }
        </Text>
      </View>

      <View style={styles.timerWrap}>
        <Svg width={SIZE} height={SIZE}>
          {/* 배경 원 */}
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={colors.surfaceStrong} strokeWidth={STROKE_WIDTH} fill="transparent" />
          {/* 오늘 기존 연습분 (어두운 색) */}
          {externalTodaySeconds > 0 && (
            <Circle
              cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
              stroke={progress >= 1 ? '#4ade8030' : '#C9A96E20'}
              strokeWidth={STROKE_WIDTH} fill="transparent"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - Math.min(externalTodaySeconds / goalSeconds, 1))}
              strokeLinecap="round"
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
          )}
          {/* 현재 포함 총 진행 */}
          <Circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
            stroke={progressColor}
            strokeWidth={STROKE_WIDTH} fill="transparent"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View style={styles.timeDisplay}>
          <Text style={styles.timeText}>{timeStr}</Text>
          <Text style={styles.sessionLabel}>
            {isRunning
              ? progress >= 1 ? '목표 달성! 계속 연습 중...' : '연습 중...'
              : seconds > 0 ? '일시정지' : '시작하세요'}
          </Text>
          {/* 달성률 퍼센트 */}
          <Text style={[styles.progressText, progress >= 1 && styles.progressTextMet]}>
            {progressPercent}%
          </Text>
        </View>
      </View>

      {/* 축하 배너 */}
      <Animated.View style={[styles.celebrateBanner, { opacity: celebrateAnim }]} pointerEvents="none">
        <Text style={styles.celebrateText}>목표 달성! 대단해요!</Text>
      </Animated.View>

      {/* 오늘 누적 시간 표시 */}
      {externalTodaySeconds > 0 && (
        <Text style={styles.todayAccum}>
          오늘 누적: {formatFullTime(externalTodaySeconds)}
          {seconds > 0 ? ` + ${formatFullTime(seconds)}` : ''}
        </Text>
      )}

      <View style={styles.controls}>
        <TouchableOpacity style={styles.sideBtn} onPress={reset}>
          <RefreshSvg color={colors.accent} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.mainBtn, isRunning && styles.mainBtnStop]} onPress={toggle}>
          {isRunning ? <PauseSvg /> : <PlaySvg />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sideBtn, seconds > 0 && styles.saveBtnActive]}
          onPress={handleSave}
          disabled={saving || seconds === 0}
        >
          <SaveSvg color={seconds > 0 ? colors.accent : colors.textMuted} />
        </TouchableOpacity>
      </View>

      {seconds > 0 && !isRunning && (
        <Text style={styles.saveHint}>저장 버튼을 눌러 기록을 저장하세요</Text>
      )}
    </View>
  );
}

function formatFullTime(totalSecs) {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
}

const makeStyles = (c) => StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 12 },

  goalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 8,
    backgroundColor: c.surface, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 4,
  },
  goalText: { fontSize: 13, color: c.textMuted, fontWeight: '400', letterSpacing: 0.3 },
  goalTextMet: { color: '#4ade80' },

  timerWrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  timeDisplay: { position: 'absolute', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 44, fontWeight: '200', color: c.text, fontVariant: ['tabular-nums'] },
  sessionLabel: { fontSize: 14, color: c.textMuted },
  progressText: { fontSize: 22, fontWeight: '300', color: c.accent, marginTop: 4 },
  progressTextMet: { color: '#4ade80' },

  celebrateBanner: {
    position: 'absolute', top: 80,
    backgroundColor: '#4ade80', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 4,
  },
  celebrateText: { fontSize: 16, fontWeight: '400', color: c.bg },

  todayAccum: { fontSize: 12, color: c.textMuted, marginTop: 4, marginBottom: 4 },

  controls: { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 16 },
  sideBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  saveBtnActive: { borderWidth: 0.5, borderColor: '#C9A96E40' },
  mainBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  mainBtnStop: { backgroundColor: c.danger },
  saveHint: { fontSize: 12, color: c.accent, marginTop: 12, opacity: 0.7, letterSpacing: 0.3 },
});
