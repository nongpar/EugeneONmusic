// 연습 시작 시 공통 사용되는 경고 알림 + 강한 햅틱 헬퍼
//
// 두 진입점에서 사용:
//   1. PracticeTimer Play 버튼 직접 탭
//   2. my 탭의 "연습 시작" 배지 탭 → autoStart로 practice 탭 이동
//
// 알림 메시지·햅틱 강도 조정은 이 파일 한 곳에서.

import { Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const TITLE = '연습 시작';
const BODY = '집중할 준비가 되셨나요?\n\n과도한 연습은 손목·어깨에 무리가 될 수 있으니\n30~50분마다 짧게 휴식을 취해주세요.';

/**
 * 강한 시작 햅틱 — Warning 패턴 + Heavy 임팩트 두 번 겹침으로 "쿵-쿵" 체감.
 * 단독으로도 호출 가능 (예: 알림을 거치지 않는 흐름에서 햅틱만 주고 싶을 때).
 */
export function fireStartPracticeHaptic() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  setTimeout(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  }, 120);
}

/**
 * 경고 알림창을 띄우고, 사용자가 "시작"을 누르면 강한 햅틱 후 onConfirm 실행.
 * 취소는 no-op.
 *
 * Web 플랫폼은 window.confirm으로 폴백.
 *
 * @param {() => void} onConfirm - 사용자가 시작 확정 시 실행할 콜백
 */
export function confirmStartPractice(onConfirm) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${TITLE}\n\n${BODY}`)) {
      fireStartPracticeHaptic();
      onConfirm();
    }
    return;
  }
  Alert.alert(
    TITLE,
    BODY,
    [
      { text: '취소', style: 'cancel' },
      {
        text: '시작',
        style: 'default',
        onPress: () => {
          fireStartPracticeHaptic();
          onConfirm();
        },
      },
    ],
  );
}
