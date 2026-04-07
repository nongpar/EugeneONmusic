import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import Svg, { Circle, Path, Line } from 'react-native-svg';
import { savePracticeSession } from '../hooks/usePracticeStats';

// SVG 아이콘
function RefreshSvg({ size = 24, color = '#8a9bae' }) {
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
function SaveSvg({ size = 24, color = '#8a9bae' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 21v-8H7v8M7 3v5h8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const RADIUS = 110;
const STROKE_WIDTH = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SIZE = (RADIUS + STROKE_WIDTH) * 2;

export default function PracticeTimer({ userId }) {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const toggle = useCallback(() => setIsRunning((r) => !r), []);

  const handleSave = useCallback(async () => {
    if (seconds === 0) return;
    if (!userId) {
      showAlert('알림', '로그인 후 연습 기록을 저장할 수 있습니다.');
      return;
    }
    setSaving(true);
    try {
      await savePracticeSession(userId, seconds);
      showAlert('저장 완료', `${formatFullTime(seconds)} 연습이 기록되었습니다.`);
      setIsRunning(false);
      setSeconds(0);
    } catch (err) {
      console.warn('Practice save error:', err);
      showAlert('오류', '연습 기록 저장에 실패했습니다.');
    }
    setSaving(false);
  }, [seconds, userId]);

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

  const progress = (seconds % 3600) / 3600;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <View style={styles.container}>
      <View style={styles.timerWrap}>
        <Svg width={SIZE} height={SIZE}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke="#1a2530" strokeWidth={STROKE_WIDTH} fill="transparent" />
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke="#C9A96E" strokeWidth={STROKE_WIDTH} fill="transparent" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={strokeDashoffset} strokeLinecap="round" transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`} />
        </Svg>
        <View style={styles.timeDisplay}>
          <Text style={styles.timeText}>{timeStr}</Text>
          <Text style={styles.sessionLabel}>
            {isRunning ? '연습 중...' : seconds > 0 ? '일시정지' : '시작하세요'}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.sideBtn} onPress={reset}>
          <RefreshSvg />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.mainBtn, isRunning && styles.mainBtnStop]} onPress={toggle}>
          {isRunning ? <PauseSvg /> : <PlaySvg />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sideBtn, seconds > 0 && styles.saveBtnActive]}
          onPress={handleSave}
          disabled={saving || seconds === 0}
        >
          <SaveSvg color={seconds > 0 ? '#C9A96E' : '#8a9bae'} />
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

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 20 },
  timerWrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  timeDisplay: { position: 'absolute', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 44, fontWeight: '200', color: '#ffffff', fontVariant: ['tabular-nums'] },
  sessionLabel: { fontSize: 14, color: '#6b7b8d' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 16 },
  sideBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1a2530', alignItems: 'center', justifyContent: 'center' },
  saveBtnActive: { borderWidth: 1, borderColor: '#C9A96E40' },
  mainBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#2C5F8A', alignItems: 'center', justifyContent: 'center' },
  mainBtnStop: { backgroundColor: '#e74c3c' },
  saveHint: { fontSize: 12, color: '#C9A96E', marginTop: 12, opacity: 0.7 },
});
