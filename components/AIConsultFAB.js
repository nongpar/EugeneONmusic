/**
 * AI 상담 플로팅 버튼 (FAB)
 *
 * 홈 + 모든 주요 탭의 우하단에 떠있는 버튼.
 * 탭하면 /ai-consult 모달 화면으로 이동.
 * 첫 사용자에겐 부드러운 펄스 애니메이션으로 주목을 유도.
 *
 * 숨기기: 오른쪽으로 드래그하면 화면 가장자리로 tucked됨. 상태는 AsyncStorage에 저장되어
 * 앱 재시작 후에도 유지. tucked 상태에서 탭하면 복원.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Platform, PanResponder,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChopinAvatar from './ChopinAvatar';

let Haptics = null;
if (Platform.OS !== 'web') {
  try { Haptics = require('expo-haptics'); } catch {}
}

const HINT_SEEN_KEY = '@ai_consult_fab_hint_seen';
const HIDDEN_KEY = '@ai_consult_fab_hidden';
const HIDDEN_OFFSET = 64; // 숨길 때 오른쪽으로 이동할 px. FAB(56) 대부분이 화면 밖, ~14px 피크

export default function AIConsultFAB({ bottom = 90, right = 20 }) {
  const [showHint, setShowHint] = useState(false);
  const [hidden, setHidden] = useState(false);
  const hiddenRef = useRef(false); // 최신 값을 panResponder 클로저에서 참조
  const pulse = useRef(new Animated.Value(0)).current;
  const hintOpacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 저장된 숨김 상태 복원
    (async () => {
      try {
        const v = await AsyncStorage.getItem(HIDDEN_KEY);
        if (v === '1') {
          hiddenRef.current = true;
          setHidden(true);
          translateX.setValue(HIDDEN_OFFSET);
        }
      } catch {}
    })();

    // 첫 사용자 여부 확인 — hint 표시 + pulse 애니메이션
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(HINT_SEEN_KEY);
        if (!seen) {
          setShowHint(true);
          // hint 페이드인
          Animated.timing(hintOpacity, {
            toValue: 1,
            duration: 500,
            delay: 1200,
            useNativeDriver: true,
          }).start();
          // 5초 후 hint 페이드아웃
          setTimeout(() => {
            Animated.timing(hintOpacity, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }).start(() => setShowHint(false));
          }, 6500);
        }
      } catch {}
    })();

    // 펄스 애니메이션 (계속)
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const persistHidden = (v) => {
    hiddenRef.current = v;
    setHidden(v);
    AsyncStorage.setItem(HIDDEN_KEY, v ? '1' : '0').catch(() => {});
  };

  const snapTo = (value) => {
    Animated.spring(translateX, {
      toValue: value,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  };

  // 드래그(pan) — 수평 이동이 수직보다 명확할 때만 캡처
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => {
        const base = hiddenRef.current ? HIDDEN_OFFSET : 0;
        const x = Math.max(0, Math.min(HIDDEN_OFFSET, base + g.dx));
        translateX.setValue(x);
      },
      onPanResponderRelease: (_, g) => {
        const base = hiddenRef.current ? HIDDEN_OFFSET : 0;
        const finalX = base + g.dx;
        if (finalX > HIDDEN_OFFSET / 2) {
          snapTo(HIDDEN_OFFSET);
          if (!hiddenRef.current) {
            persistHidden(true);
            Haptics?.selectionAsync();
          }
        } else {
          snapTo(0);
          if (hiddenRef.current) persistHidden(false);
        }
      },
    })
  ).current;

  const handlePress = async () => {
    // 숨겨진 상태에서 탭하면 복원
    if (hiddenRef.current) {
      Haptics?.selectionAsync();
      snapTo(0);
      persistHidden(false);
      return;
    }
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try { await AsyncStorage.setItem(HINT_SEEN_KEY, '1'); } catch {}
    setShowHint(false);
    router.push('/ai-consult');
  };

  // 펄스 애니메이션 값 → 외곽 링 scale & opacity
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  // 캡션은 숨겨질 때 자연스럽게 페이드아웃
  const captionOpacity = translateX.interpolate({
    inputRange: [0, HIDDEN_OFFSET],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, { bottom, right }]} pointerEvents="box-none">
      {/* 힌트 말풍선 (숨김 상태에선 미표시) */}
      {showHint && !hidden && (
        <Animated.View style={[styles.hint, { opacity: hintOpacity }]} pointerEvents="none">
          <Text style={styles.hintText}>AI 음악 상담</Text>
          <View style={styles.hintTail} />
        </Animated.View>
      )}

      {/* 드래그 가능한 전체 엠블럼 */}
      <Animated.View
        style={{ alignItems: 'center', transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        {/* 아이콘 래퍼 — 펄스 링 중심 정렬 보장 */}
        <View style={styles.iconWrap}>
          {/* 펄스 링 (숨김 상태에서는 숨김) */}
          {!hidden && (
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  transform: [{ scale: ringScale }],
                  opacity: ringOpacity,
                },
              ]}
              pointerEvents="none"
            />
          )}
          <TouchableOpacity
            style={styles.fab}
            activeOpacity={0.85}
            onPress={handlePress}
            accessibilityLabel={
              hidden
                ? 'AI 음악 상담 다시 꺼내기 — 가온'
                : 'AI 음악 상담 열기 — 가온, 음악 큐레이터'
            }
          >
            <ChopinAvatar size={52} />
          </TouchableOpacity>
        </View>

        {/* 아이콘 아래 라벨 */}
        <Animated.Text style={[styles.captionName, { opacity: captionOpacity }]}>
          가온
        </Animated.Text>
        <Animated.Text style={[styles.captionRole, { opacity: captionOpacity }]}>
          음악 큐레이터
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const SIZE = 56;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 100,
  },
  fab: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    // 골드 외곽
    borderWidth: 1.2,
    borderColor: '#C9A96E',
    backgroundColor: '#1A1612',
    // 그림자 (elevation on Android)
    shadowColor: '#C9A96E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  iconWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 1.5,
    borderColor: '#C9A96E',
  },
  captionName: {
    fontSize: 11,
    color: '#C9A96E',
    fontWeight: '500',
    letterSpacing: 1,
    marginTop: 4,
  },
  captionRole: {
    fontSize: 9,
    color: 'rgba(201,169,110,0.6)',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  hint: {
    position: 'absolute',
    right: SIZE + 10,
    top: SIZE / 2 - 14,
    backgroundColor: '#1A1612',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(201,169,110,0.4)',
  },
  hintText: {
    fontSize: 12,
    color: '#F5F0E8',
    fontWeight: '400',
    letterSpacing: 0.4,
  },
  hintTail: {
    position: 'absolute',
    right: -5,
    top: 10,
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#1A1612',
  },
});
