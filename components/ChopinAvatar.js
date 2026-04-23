/**
 * 가온 (AI 음악 큐레이터) 아바타
 *
 * 피아노 건반 엠블럼 — 흰 건반 3개 + 검은 건반 2개 클러스터.
 * 소형(24~40px)에서도 즉시 피아노로 인식됨.
 *
 * Props:
 *  - size: 크기 (기본 40)
 *  - accent: 심볼 색 (기본 골드)
 *  - background: 원 배경 색 (기본 다크)
 *  - withFrame: 외곽 링 노출 여부 (기본 true)
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

export default function ChopinAvatar({
  size = 40,
  accent = '#C9A96E',
  background = '#1A1612',
  withFrame = true,
}) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* 다크 원 배경 */}
        <Circle cx="50" cy="50" r="49" fill={background} />

        {/* 얇은 외곽 링 */}
        {withFrame && (
          <Circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={accent}
            strokeWidth={0.8}
            opacity={0.55}
          />
        )}

        {/* 피아노 건반 */}
        <G>
          {/* 건반 전체 외곽 (흰 건반 영역의 테두리) */}
          <Rect
            x="22"
            y="35"
            width="56"
            height="38"
            rx="2"
            fill="none"
            stroke={accent}
            strokeWidth={1.6}
          />

          {/* 흰 건반 분할선 2개 (C|D, D|E) — 하단에서만 보이도록 검은 건반 아래에서 시작 */}
          <Path
            d="M 40.67 56 L 40.67 73"
            stroke={accent}
            strokeWidth={1.4}
          />
          <Path
            d="M 59.33 56 L 59.33 73"
            stroke={accent}
            strokeWidth={1.4}
          />

          {/* 검은 건반 2개 (C#, D#) — 흰 건반 분할선 위 중앙 정렬 */}
          <Rect
            x="35.17"
            y="35"
            width="11"
            height="22"
            rx="1.2"
            fill={accent}
          />
          <Rect
            x="53.83"
            y="35"
            width="11"
            height="22"
            rx="1.2"
            fill={accent}
          />
        </G>
      </Svg>
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

