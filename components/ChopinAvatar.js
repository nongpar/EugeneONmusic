/**
 * 가온 (AI 음악 큐레이터) 아바타
 *
 * 쇼팽 풍 캐릭터 유화 이미지 (assets/gaon-avatar.jpeg)를 모든 사이즈에서 사용.
 * 다크 배경 원 + 골드 외곽 링(옵션)으로 둘러쌈.
 *
 * 사용처:
 *  - 24px (TypingIndicator 채팅 입력 인디케이터)
 *  - 28px (메시지 옆 가온이)
 *  - 36px (AI 상담 화면 헤더)
 *  - 52px (홈 우하단 FAB)
 *  - 120px (AI 상담 환영 화면)
 *
 * Props:
 *  - size: 크기 (기본 40)
 *  - accent: 외곽 링 색 (기본 골드)
 *  - background: 이미지 로드 전·외곽 갭의 배경 색 (기본 다크)
 *  - withFrame: 외곽 골드 링 노출 여부 (기본 true)
 */
import React, { useRef, useCallback } from 'react';
import { View, Animated } from 'react-native';

const GAON_CHARACTER = require('../assets/gaon-avatar.jpeg');

export default function ChopinAvatar({
  size = 40,
  accent = '#C9A96E',
  background = '#1A1612',
  withFrame = true,
}) {
  // 외곽 링 두께 — 사이즈에 비례 (24 → ~1px, 120 → ~1.7px)
  const ringWidth = Math.max(0.8, size * 0.014);

  // 이미지 로드 완료 시점에 0 → 1 페이드인 (다크 배경 위로 부드럽게 떠오름)
  const opacity = useRef(new Animated.Value(0)).current;
  const onLoad = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <View style={{ width: size, height: size }}>
      {/* 캐릭터 이미지 — 다크 배경 위에 원형으로 클리핑, 로드 완료 후 페이드인 */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor: background,
        }}
      >
        <Animated.Image
          source={GAON_CHARACTER}
          style={{ width: size, height: size, opacity }}
          resizeMode="cover"
          onLoad={onLoad}
        />
      </View>
      {/* 외곽 골드 링 (옵션) — 별도 레이어로 올려 borderRadius+overflow 호환성 확보 */}
      {withFrame && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: ringWidth,
            borderColor: accent,
            opacity: 0.55,
          }}
        />
      )}
    </View>
  );
}

// 말풍선·헤더용 소형 — 프레임 없음
export function ChopinAvatarSmall({ size = 24, accent = '#C9A96E', background = '#1A1612' }) {
  return (
    <ChopinAvatar
      size={size}
      accent={accent}
      background={background}
      withFrame={false}
    />
  );
}
