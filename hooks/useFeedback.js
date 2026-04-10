import { useCallback } from 'react';
import { Platform } from 'react-native';

let Haptics = null;
if (Platform.OS !== 'web') {
  try {
    Haptics = require('expo-haptics');
  } catch {}
}

/**
 * useFeedback 훅
 * - 햅틱 진동을 간편하게 사용
 * - 웹에서는 자동으로 무시됨
 */
export function useFeedback() {
  // ── 햅틱 (진동) ──

  /** 가벼운 탭 - 버튼 누를 때 */
  const lightTap = useCallback(() => {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  /** 중간 탭 - 중요한 액션 */
  const mediumTap = useCallback(() => {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, []);

  /** 강한 탭 - 삭제, 전송 등 */
  const heavyTap = useCallback(() => {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, []);

  /** 성공 피드백 - 완료, 저장 시 */
  const successVibe = useCallback(() => {
    if (Haptics) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  /** 경고 피드백 - 오류, 경고 시 */
  const warningVibe = useCallback(() => {
    if (Haptics) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, []);

  /** 선택 변경 - 탭 전환, 필터 변경 */
  const selectionTap = useCallback(() => {
    if (Haptics) {
      Haptics.selectionAsync();
    }
  }, []);

  // ── 복합 피드백 ──

  /** 버튼 터치 피드백 */
  const buttonPress = useCallback(() => {
    lightTap();
  }, [lightTap]);

  /** 메시지 전송 피드백 */
  const messageSent = useCallback(() => {
    mediumTap();
  }, [mediumTap]);

  /** 성공 피드백 */
  const successFeedback = useCallback(() => {
    successVibe();
  }, [successVibe]);

  /** 탭/슬라이드 전환 피드백 */
  const tabSwitch = useCallback(() => {
    selectionTap();
  }, [selectionTap]);

  return {
    // 개별 햅틱
    lightTap,
    mediumTap,
    heavyTap,
    successVibe,
    warningVibe,
    selectionTap,

    // 복합 피드백
    buttonPress,
    messageSent,
    successFeedback,
    tabSwitch,
  };
}
