import { Platform, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeIcon, LessonIcon, CourseIcon, SNSIcon, MyIcon } from '../../components/TabIcons';
import AIConsultFAB from '../../components/AIConsultFAB';

let Haptics = null;
if (Platform.OS !== 'web') {
  try { Haptics = require('expo-haptics'); } catch {}
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
      screenListeners={{
        tabPress: () => {
          if (Haptics) Haptics.selectionAsync();
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#C9A96E',
        tabBarInactiveTintColor: 'rgba(201,169,110,0.3)',
        tabBarStyle: {
          backgroundColor: '#0C0A08',
          borderTopColor: 'rgba(201,169,110,0.15)',
          borderTopWidth: 0.5,
          height: 64 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '400',
          letterSpacing: 1.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <HomeIcon size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="lesson"
        options={{
          title: 'Lesson',
          tabBarIcon: ({ color, size }) => <LessonIcon size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="course"
        options={{
          title: 'Course',
          tabBarIcon: ({ color, size }) => <CourseIcon size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sns"
        options={{
          title: 'SNS',
          tabBarIcon: ({ color, size }) => <SNSIcon size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my"
        options={{
          title: 'MY',
          tabBarIcon: ({ color, size }) => <MyIcon size={size} color={color} />,
        }}
      />
      {/* 숨김 탭들 */}
      <Tabs.Screen name="practice" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      </Tabs>

      {/* AI 음악 상담 플로팅 버튼 — 모든 탭에서 노출 */}
      <AIConsultFAB bottom={80 + insets.bottom} right={18} />
    </View>
  );
}
