/**
 * "권해드릴까요" — 가온 채팅창의 접었다 폈다 하는 제안 패널
 * (내부 명칭은 ThreePaths/PATHS_BY_PERIOD로 유지 — 시간대별 3개 경로를 권하는 구조)
 *
 * 입력창 위에 작은 골드 라벨이 항시 보임.
 * 탭하면 위로 펼쳐지며 시간대 기반 prompt 3개를 보여준다.
 * - prompt 탭 → 입력창에 자동 채움 + 패널 접힘
 * - 사용자가 입력 시작 → 자동 접힘
 * - 30초간 입력·상호작용 없으면 라벨이 한 번 부드럽게 펄스해서 존재 알림
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Easing,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../hooks/useTheme';

let Haptics = null;
if (Platform.OS !== 'web') {
  try {
    Haptics = require('expo-haptics');
  } catch {}
}

// ── 시간대별 세 갈래 길 ──
// 매번 같은 chip이 아니라 방문 시각에 따라 미세하게 다른 결의 prompt를 제시.
// 4개의 영역(곡 감상 / 레슨 / 공연·EON HALL / 행사)을 순환·재배치해서
// 사용자가 한 가지 길로만 몰리지 않도록 균형 잡았다.
const PATHS_BY_PERIOD = {
  morning: [
    { label: '하루를 여는 음악 한 곡', prefill: '하루를 차분하게 시작할 수 있는 음악 한 곡을 권해주시겠어요?' },
    { label: '처음 시작하는 피아노 레슨', prefill: '피아노를 처음 배워보고 싶어요. 성인 취미반에 대해 알고 싶습니다.' },
    { label: '이번 주 EON HALL 공연', prefill: '이번 주 EON HALL에서 어떤 공연이 있는지 궁금해요.' },
  ],
  noon: [
    { label: '한낮에 어울릴 음악', prefill: '한낮의 시간에 어울리는 음악을 추천해주시겠어요?' },
    { label: '특별한 자리를 위한 음악 기획', prefill: '특별한 날을 기념할 음악 경험을 찾고 있어요. 어떤 기획이 가능한지 궁금합니다.' },
    { label: '성인 취미반 안내', prefill: '성인 취미반 레슨에 대해 안내받고 싶어요.' },
  ],
  evening: [
    { label: '하루를 정돈해주는 곡', prefill: '하루를 정돈해주는 음악 한 곡을 권해주시겠어요?' },
    { label: 'EON HALL 발표회 대관', prefill: 'EON HALL에서 발표회를 열어보고 싶어요. 대관 가능한지 궁금합니다.' },
    { label: '오늘 마음에 어울릴 공연', prefill: '오늘 제 마음에 어울릴 공연이 있을지 추천해주세요.' },
  ],
  night: [
    { label: '밤의 호흡에 어울리는 곡', prefill: '밤의 호흡에 어울리는 음악 한 곡을 권해주시겠어요?' },
    { label: '조용한 밤을 채워줄 음악', prefill: '조용한 밤을 채워줄 음악을 알려주세요.' },
    { label: '특별한 날을 위한 음악', prefill: '특별한 날을 기념할 음악을 찾고 있어요.' },
  ],
};

function getCurrentPaths() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return PATHS_BY_PERIOD.morning;
  if (hour >= 12 && hour < 17) return PATHS_BY_PERIOD.noon;
  if (hour >= 17 && hour < 22) return PATHS_BY_PERIOD.evening;
  return PATHS_BY_PERIOD.night;
}

function ChevronIcon({ open, size = 11, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={open ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function ThreePaths({ onSelect, hasInput }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [open, setOpen] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const idleTimerRef = useRef(null);

  const paths = useMemo(() => getCurrentPaths(), []);

  // 사용자가 입력 시작 → 자동 접힘
  useEffect(() => {
    if (hasInput && open) {
      setOpen(false);
    }
    // open 의존성은 의도적으로 빼서, 사용자가 펼친 직후 input 비어있을 때
    // 다시 접히는 race를 막는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInput]);

  // 펼침/접힘 애니메이션
  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: open ? 1 : 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // maxHeight 애니메이션
    }).start();
  }, [open, expandAnim]);

  // 30초간 사용자 입력·상호작용 없으면 라벨 한 번 부드럽게 펄스
  useEffect(() => {
    if (hasInput || open) {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      return;
    }
    idleTimerRef.current = setTimeout(() => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]).start();
    }, 30000);
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [hasInput, open, pulseAnim]);

  const labelOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.65, 1],
  });

  const handleToggle = () => {
    Haptics?.selectionAsync();
    setOpen((prev) => !prev);
  };

  const handleSelect = (prefill) => {
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect?.(prefill);
    setOpen(false);
  };

  return (
    <View style={styles.container}>
      {/* 펼침 영역 — 항상 DOM에 있되 maxHeight·opacity로 시각적으로 숨김 */}
      <Animated.View
        style={[
          styles.expandWrap,
          {
            maxHeight: expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 220] }),
            opacity: expandAnim,
          },
        ]}
      >
        <View style={styles.expandHeader}>
          <View style={styles.goldLine} />
          <Text style={styles.expandHeaderText}>이런 결의 대화도 가능해요</Text>
          <View style={styles.goldLine} />
        </View>
        {paths.map((p, i) => (
          <TouchableOpacity
            key={i}
            style={styles.pathItem}
            activeOpacity={0.65}
            onPress={() => handleSelect(p.prefill)}
          >
            <Text style={styles.pathBullet}>·</Text>
            <Text style={styles.pathLabel}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* 라벨 — 항상 보임 */}
      <TouchableOpacity
        style={styles.labelRow}
        activeOpacity={0.7}
        onPress={handleToggle}
        hitSlop={{ top: 6, bottom: 6, left: 16, right: 16 }}
        accessibilityLabel={open ? '제안 닫기' : '제안 열기'}
        accessibilityRole="button"
      >
        <Animated.View style={[styles.labelInner, { opacity: labelOpacity }]}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <Text style={styles.labelText}>권해드릴까요</Text>
          <ChevronIcon open={open} color={colors.accent} />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    container: {
      backgroundColor: c.bg,
    },

    // 펼침 영역
    expandWrap: {
      overflow: 'hidden',
      backgroundColor: c.surface,
      borderTopWidth: 0.5,
      borderTopColor: c.borderSoft,
    },
    expandHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingTop: 14,
      paddingBottom: 8,
      gap: 10,
    },
    expandHeaderText: {
      fontSize: 11,
      color: c.textMuted,
      letterSpacing: 1.2,
    },
    goldLine: {
      flex: 1,
      height: 0.5,
      backgroundColor: c.accent,
      opacity: 0.45,
    },
    pathItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 22,
      paddingVertical: 11,
      gap: 12,
    },
    pathBullet: {
      fontSize: 16,
      color: c.accent,
      lineHeight: 16,
    },
    pathLabel: {
      fontSize: 14,
      color: c.text,
      flex: 1,
      letterSpacing: 0.1,
    },

    // 라벨 (항상 보임)
    labelRow: {
      alignItems: 'center',
      paddingVertical: 8,
      backgroundColor: c.bg,
    },
    labelInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    dot: {
      width: 2,
      height: 2,
      borderRadius: 1,
      backgroundColor: c.accent,
      opacity: 0.7,
    },
    labelText: {
      fontSize: 11,
      color: c.accent,
      letterSpacing: 1.5,
      marginHorizontal: 8,
    },
  });
