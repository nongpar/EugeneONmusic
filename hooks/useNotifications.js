import { useState, useEffect, useRef } from 'react';
import { Platform, Alert, AppState } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

let Notifications = null;
let Device = null;

// 네이티브 전용 모듈 로드 (웹에서는 무시)
if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');
  } catch {}
}

const NOTIF_SETTINGS_KEY = '@eon_notification_settings';

/**
 * 알림 설정 로드
 * - chat, lesson, announcement 각각 on/off
 */
async function getNotificationSettings() {
  try {
    const saved = await AsyncStorage.getItem(NOTIF_SETTINGS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { chat: true, lesson: true, announcement: true };
}

/**
 * 알림 유형이 설정에서 허용되는지 확인
 */
function isNotificationAllowed(settings, type) {
  if (!type) return true;
  if (type === 'chat') return settings.chat !== false;
  if (type === 'schedule' || type === 'lesson') return settings.lesson !== false;
  if (type === 'announcement' || type === 'event') return settings.announcement !== false;
  if (type === 'mentor') return settings.mentor !== false;
  return true; // 알 수 없는 타입은 기본 허용
}

/**
 * 푸시 알림 등록 및 토큰 반환
 * - 네이티브(Android/iOS)에서만 동작
 * - 웹에서는 null 반환
 */
export async function registerForPushNotifications() {
  if (Platform.OS === 'web' || !Notifications || !Device) {
    return null;
  }

  // 실제 디바이스 확인 (에뮬레이터에서도 작동하지만 경고)
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
  }

  // 기존 권한 확인
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // 권한 요청
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission denied');
    return null;
  }

  // Expo Push Token 가져오기
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '32eb65a4-71bb-4f57-b925-86d8bef2ffd8',
    });
    return tokenData.data;
  } catch (err) {
    console.warn('Failed to get push token:', err);
    return null;
  }
}

/**
 * 푸시 알림 전송 (Expo Push API)
 * - 서버 없이도 Expo Push API로 직접 전송 가능
 */
/**
 * 알림 유형 → Android 채널 매핑
 */
const TYPE_CHANNEL_MAP = {
  chat: 'chat',
  announcement: 'announcement',
  event: 'announcement',
  schedule: 'lesson',
  lesson: 'lesson',
  mentor: 'mentor',
};

/**
 * 알림 유형 → 서브타이틀 매핑
 */
const TYPE_SUBTITLE_MAP = {
  chat: '채팅',
  announcement: '공지사항',
  event: '이벤트',
  schedule: '레슨 일정',
  lesson: '레슨',
  mentor: '멘토십',
};

export async function sendPushNotification(expoPushToken, title, body, data = {}) {
  if (!expoPushToken) return;

  const type = data?.type || 'announcement';
  const channelId = TYPE_CHANNEL_MAP[type] || 'announcement';
  const subtitle = TYPE_SUBTITLE_MAP[type] || '유진온뮤직';

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: 'default',
        title,
        subtitle,              // iOS: 제목 아래 작은 텍스트
        body,
        data,
        priority: 'high',
        channelId,             // Android: 유형별 알림 채널
        // iOS 뱃지는 앱에서 읽음 처리 기반으로 관리 (하드코딩 제거)
        categoryId: type,      // 알림 카테고리 (액션 버튼용)
      }),
    });
  } catch (err) {
    console.warn('Push send failed:', err);
  }
}

/**
 * useNotifications 훅
 * - 알림 권한 요청 + 토큰 관리
 * - 포그라운드/백그라운드 알림 리스너
 * - 알림 탭 시 채팅방으로 이동
 */
export function useNotifications(user) {
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [notification, setNotification] = useState(null);
  const notificationListener = useRef(null);
  const responseListener = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'web' || !Notifications || !user) return;

    // Android 알림 채널 설정 (유형별 분리)
    if (Platform.OS === 'android') {
      // 채팅 알림 — 최고 중요도, 진동, 소리
      Notifications.setNotificationChannelAsync('chat', {
        name: '채팅 메시지',
        description: '선생님/학생과의 1:1 채팅 알림',
        importance: Notifications.AndroidImportance?.MAX || 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C9A96E',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      // 공지/이벤트 알림 — 높은 중요도
      Notifications.setNotificationChannelAsync('announcement', {
        name: '공지사항',
        description: '학원 공지사항 및 이벤트 알림',
        importance: Notifications.AndroidImportance?.HIGH || 3,
        vibrationPattern: [0, 200, 100, 200],
        lightColor: '#C9A96E',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      // 레슨 알림 — 높은 중요도
      Notifications.setNotificationChannelAsync('lesson', {
        name: '레슨 일정',
        description: '레슨 스케줄 및 리마인더',
        importance: Notifications.AndroidImportance?.HIGH || 3,
        vibrationPattern: [0, 300],
        lightColor: '#C9A96E',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      // 멘토십 알림 — 기본 중요도
      Notifications.setNotificationChannelAsync('mentor', {
        name: '멘토십',
        description: '멘토 배정 및 멘토십 관련 알림',
        importance: Notifications.AndroidImportance?.DEFAULT || 2,
        lightColor: '#C9A96E',
        sound: 'default',
        showBadge: true,
      });
    }

    // 알림 카테고리 (알림에서 바로 액션 버튼)
    Notifications.setNotificationCategoryAsync('chat', [
      {
        identifier: 'open_chat',
        buttonTitle: '채팅 열기',
        options: { opensAppToForeground: true },
      },
    ]);

    Notifications.setNotificationCategoryAsync('announcement', [
      {
        identifier: 'view_detail',
        buttonTitle: '자세히 보기',
        options: { opensAppToForeground: true },
      },
    ]);

    // 포그라운드 알림 처리 설정 (설정에 따라 필터링)
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data;

        // 본인이 보낸 알림 suppress — 같은 디바이스에 다른 계정 토큰이 남아있을 때
        // 자기 메시지 푸시가 자기에게 오는 버그 방지
        if (data?.senderId && user?.uid && String(data.senderId) === String(user.uid)) {
          return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false };
        }

        const settings = await getNotificationSettings();
        const allowed = isNotificationAllowed(settings, data?.type);

        return {
          shouldShowAlert: allowed,
          shouldPlaySound: allowed,
          shouldSetBadge: allowed,
        };
      },
    });

    // 푸시 토큰 등록
    registerForPushNotifications().then((token) => {
      if (token) {
        setExpoPushToken(token);
      }
    });

    // 앱 시작 시 뱃지 카운트 초기화
    try { Notifications.setBadgeCountAsync(0); } catch {}

    // 앱이 포그라운드로 돌아올 때마다 뱃지 초기화
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        try { Notifications.setBadgeCountAsync(0); } catch {}
      }
    });

    // 포그라운드 알림 수신 리스너
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notif) => {
        setNotification(notif);
      }
    );

    // 알림 탭 (사용자가 알림을 눌렀을 때) 리스너
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        // 채팅방 ID가 있으면 해당 채팅방으로 이동
        if (data?.chatRoomId) {
          router.push(`/chat/${data.chatRoomId}`);
        } else if (data?.screen) {
          router.push(data.screen);
        }
      }
    );

    return () => {
      if (notificationListener.current) {
        if (typeof Notifications?.removeNotificationSubscription === 'function') {
          Notifications.removeNotificationSubscription(notificationListener.current);
        } else if (typeof notificationListener.current?.remove === 'function') {
          notificationListener.current.remove();
        }
      }
      if (responseListener.current) {
        if (typeof Notifications?.removeNotificationSubscription === 'function') {
          Notifications.removeNotificationSubscription(responseListener.current);
        } else if (typeof responseListener.current?.remove === 'function') {
          responseListener.current.remove();
        }
      }
      if (appStateSub && typeof appStateSub.remove === 'function') {
        appStateSub.remove();
      }
    };
  }, [user]);

  return { expoPushToken, notification };
}
