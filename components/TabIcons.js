import Svg, { Path, Circle, Rect, G, Line, Polyline } from 'react-native-svg';

// 홈 아이콘 — 미니멀 하우스
export function HomeIcon({ size = 24, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-4.5v-5.5a1 1 0 00-1-1h-3a1 1 0 00-1 1V21H5a1 1 0 01-1-1v-9.5z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 레슨 아이콘 — 피아노 건반
export function LessonIcon({ size = 24, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth={1.8} />
      <Line x1="7" y1="4" x2="7" y2="20" stroke={color} strokeWidth={1.2} />
      <Line x1="12" y1="4" x2="12" y2="20" stroke={color} strokeWidth={1.2} />
      <Line x1="17" y1="4" x2="17" y2="20" stroke={color} strokeWidth={1.2} />
      <Rect x="5.5" y="4" width="3" height="9" rx="0.5" fill={color} opacity={0.5} />
      <Rect x="10.5" y="4" width="3" height="9" rx="0.5" fill={color} opacity={0.5} />
      <Rect x="15.5" y="4" width="3" height="9" rx="0.5" fill={color} opacity={0.5} />
    </Svg>
  );
}

// 강좌 아이콘 — 모니터+재생 (온라인 강의)
export function CourseIcon({ size = 24, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="3" width="20" height="14" rx="2" stroke={color} strokeWidth={1.8} />
      <Path d="M10 8l5 3-5 3V8z" fill={color} opacity={0.7} />
      <Line x1="8" y1="21" x2="16" y2="21" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1="12" y1="17" x2="12" y2="21" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

// SNS 아이콘 — 공유/연결 노드
export function SNSIcon({ size = 24, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="18" cy="5" r="3" stroke={color} strokeWidth={1.8} />
      <Circle cx="6" cy="12" r="3" stroke={color} strokeWidth={1.8} />
      <Circle cx="18" cy="19" r="3" stroke={color} strokeWidth={1.8} />
      <Line x1="8.7" y1="10.7" x2="15.3" y2="6.3" stroke={color} strokeWidth={1.5} />
      <Line x1="8.7" y1="13.3" x2="15.3" y2="17.7" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

// MY 아이콘 — 유저 프로필
export function MyIcon({ size = 24, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={1.8} />
      <Path
        d="M4 21v-1a6 6 0 0112 0v1"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
