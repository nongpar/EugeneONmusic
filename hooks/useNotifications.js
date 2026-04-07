import { useState, useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import { router } from 'expo-router';

let Notifications = null;
let Device = null;

// 네이티브 전용 모듈 로드 (웹에서는 무시)
if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');
  } catch {}
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
      projectId: 'eugeneonmusic', // Expo 프로젝트 ID
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
export async function sendPushNotification(expoPushToken, title, body, data = {}) {
  if (!expoPushToken) return;

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
        body,
        data,
        priority: 'high',
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

    // Android 알림 채널 설정
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('chat', {
        name: '채팅 알림',
        importance: Notifications.AndroidImportance?.MAX || 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C9A96E',
        sound: 'default',
      });
    }

    // 포그라운드 알림 처리 설정
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // 푸시 토큰 등록
    registerForPushNotifications().then((token) => {
      if (token) {
        setExpoPushToken(token);
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
    };
  }, [user]);

  return { expoPushToken, notification };
}
