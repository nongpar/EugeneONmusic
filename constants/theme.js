/**
 * 테마 색 토큰 — 다크(기본) / 라이트(밝은 모드)
 *
 * 디자인 의도:
 *  - 두 팔레트 모두 "유진온뮤직" 골드 정체성을 유지 (공연장·클래식 톤)
 *  - 다크: 어두운 갈색 배경 + 크림 텍스트 + 골드 액센트
 *  - 라이트: 크림 배경 + 진한 갈색 텍스트 + 짙은 골드 액센트 (대비 확보)
 *
 * 토큰 명명:
 *  - bg/bgElevated: 화면 배경, 카드/모달 배경
 *  - surface/surfaceStrong: 말풍선·인풋 등 표면 (반투명 골드 틴트)
 *  - border/borderSoft/borderStrong: 테두리 강도
 *  - text/textMuted/textSoft: 텍스트 강도
 *  - accent/accentText: 골드 액센트 + 액센트 위 텍스트
 *  - danger: 경고/삭제
 *  - statusBar: 'light' | 'dark'
 *  - overlayDark: 배경 이미지 위 어두운 그라디언트 (사진 대비 확보용)
 */

export const palettes = {
  dark: {
    name: 'dark',
    bg: '#110E0B',
    bgElevated: '#1a1410',
    surface: 'rgba(201,169,110,0.08)',
    surfaceStrong: 'rgba(201,169,110,0.15)',
    inputBg: 'rgba(201,169,110,0.06)',
    border: 'rgba(201,169,110,0.2)',
    borderSoft: 'rgba(201,169,110,0.15)',
    borderStrong: '#C9A96E',
    text: '#F5F0E8',
    textSoft: '#C9BEAC',
    textMuted: '#9e9282',
    textHint: 'rgba(201,169,110,0.5)',
    placeholder: 'rgba(201,169,110,0.35)',
    accent: '#C9A96E',
    accentMuted: 'rgba(201,169,110,0.3)',
    accentText: '#110E0B',
    danger: '#e74c3c',
    statusBar: 'light',
    // 그라디언트 오버레이 (배경 사진 위) — 4-stop
    overlayDark: [
      'rgba(17,14,11,0.9)',
      'rgba(17,14,11,0.65)',
      'rgba(17,14,11,0.7)',
      'rgba(17,14,11,0.92)',
    ],
  },
  light: {
    name: 'light',
    // 배경 — 따뜻한 크림. 아이보리에 가까운 톤으로 클래식 종이 느낌
    bg: '#F5EFE3',
    bgElevated: '#FBF6EC',
    // 표면 — 짙은 골드 틴트 (라이트 배경에서 대비 확보)
    surface: 'rgba(123,90,42,0.08)',
    surfaceStrong: 'rgba(123,90,42,0.15)',
    inputBg: 'rgba(123,90,42,0.05)',
    border: 'rgba(123,90,42,0.22)',
    borderSoft: 'rgba(123,90,42,0.14)',
    borderStrong: '#7B5A2A',
    // 텍스트 — 진한 갈색 (#1f1610에 가까운 톤)
    text: '#231812',
    textSoft: '#3B2A1E',
    textMuted: '#6B5A48',
    textHint: 'rgba(123,90,42,0.6)',
    placeholder: 'rgba(123,90,42,0.45)',
    // 액센트 — 짙은 골드 (#7B5A2A — 라이트 배경에서도 충분한 대비)
    accent: '#7B5A2A',
    accentMuted: 'rgba(123,90,42,0.3)',
    accentText: '#FBF6EC',
    danger: '#c0392b',
    statusBar: 'dark',
    // 라이트 모드의 오버레이 — 사진 위에 옅은 크림 베일을 씌워 본문 가독성 확보
    overlayDark: [
      'rgba(245,239,227,0.92)',
      'rgba(245,239,227,0.7)',
      'rgba(245,239,227,0.75)',
      'rgba(245,239,227,0.95)',
    ],
  },
};

export const THEME_MODES = ['dark', 'light', 'system'];
export const THEME_STORAGE_KEY = '@eon_theme_mode';
