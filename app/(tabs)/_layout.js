import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeIcon, LessonIcon, CourseIcon, SNSIcon, MyIcon } from '../../components/TabIcons';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#C9A96E',
        tabBarInactiveTintColor: '#4a5a6a',
        tabBarStyle: {
          backgroundColor: '#0f1923',
          borderTopColor: '#1a2530',
          borderTopWidth: 1,
          height: 64 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.3,
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
  );
}
