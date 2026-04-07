import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// 앱 시작 시 푸시 토큰을 Firestore에 저장하는 컴포넌트
function NotificationInit() {
  const { user } = useAuth();
  const { expoPushToken } = useNotifications(user);

  useEffect(() => {
    if (user?.uid && expoPushToken) {
      // Firestore에 유저별 푸시 토큰 저장
      setDoc(
        doc(db, 'pushTokens', user.uid),
        {
          token: expoPushToken,
          uid: user.uid,
          role: user.role || 'student',
          updatedAt: new Date(),
        },
        { merge: true }
      ).catch((err) => console.warn('Push token save failed:', err));
    }
  }, [user, expoPushToken]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <NotificationInit />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0f1923' },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="auth/login"
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="community/index" />
        <Stack.Screen name="community/write" options={{ presentation: 'modal' }} />
        <Stack.Screen name="community/[id]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="course/[id]" />
        <Stack.Screen name="mentor/index" />
        <Stack.Screen name="blog/[id]" />
        <Stack.Screen name="lesson/schedule" />
        <Stack.Screen name="lesson/notes" />
        <Stack.Screen name="lesson/note-write" options={{ presentation: 'modal' }} />
        <Stack.Screen name="lesson/assignments" />
        <Stack.Screen name="news/[id]" />
        <Stack.Screen name="settings/profile" />
        <Stack.Screen name="settings/notifications" />
        <Stack.Screen name="settings/practice-goal" />
        <Stack.Screen name="settings/help" />
        <Stack.Screen name="settings/app-info" />
        <Stack.Screen name="settings/practice-stats" />
        <Stack.Screen name="settings/privacy" />
        <Stack.Screen name="settings/terms" />
      </Stack>
    </AuthProvider>
  );
}
