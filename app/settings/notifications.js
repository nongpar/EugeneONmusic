import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@eon_notification_settings';

// ── SVG Icons ──
function BackIcon({ size = 24, color = '#F5F0E8' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChatIcon({ size = 22, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CalendarIcon({ size = 22, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MegaphoneIcon({ size = 22, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.73 21a2 2 0 01-3.46 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function UserPlusIcon({ size = 22, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="8.5" cy="7" r="4" stroke={color} strokeWidth={1.8} />
      <Path d="M20 8v6M23 11h-6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function NotificationRow({ icon, label, description, value, onValueChange }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.iconWrap}>{icon}</View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowLabel}>{label}</Text>
          {description && <Text style={styles.rowDesc}>{description}</Text>}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: 'rgba(201,169,110,0.18)', true: '#C9A96E' }}
        thumbColor={value ? '#F5F0E8' : '#9e9282'}
      />
    </View>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();

  const [settings, setSettings] = useState({
    chat: true,
    lesson: true,
    announcement: true,
    mentor: true,
  });

  // Load saved settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          setSettings(JSON.parse(saved));
        }
      } catch (err) {
        console.warn('Failed to load notification settings:', err);
      }
    };
    loadSettings();
  }, []);

  // Save when settings change
  const updateSetting = async (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to save notification settings:', err);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림 설정</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>알림</Text>
        <View style={styles.card}>
          <NotificationRow
            icon={<ChatIcon />}
            label="채팅 알림"
            description="새로운 채팅 메시지 알림"
            value={settings.chat}
            onValueChange={(v) => updateSetting('chat', v)}
          />
          <NotificationRow
            icon={<CalendarIcon />}
            label="레슨 알림"
            description="레슨 일정 및 리마인더"
            value={settings.lesson}
            onValueChange={(v) => updateSetting('lesson', v)}
          />
          <NotificationRow
            icon={<MegaphoneIcon />}
            label="공지사항 알림"
            description="학원 공지사항 및 이벤트"
            value={settings.announcement}
            onValueChange={(v) => updateSetting('announcement', v)}
          />
          <NotificationRow
            icon={<UserPlusIcon />}
            label="멘토십 알림"
            description="멘토 배정 및 멘토십 관련 알림"
            value={settings.mentor}
            onValueChange={(v) => updateSetting('mentor', v)}
          />
        </View>

        <Text style={styles.footerNote}>
          알림을 비활성화하면 해당 항목의 푸시 알림을 받지 않습니다.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#110E0B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#F5F0E8',
    letterSpacing: 0.3,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9e9282',
    marginBottom: 10,
    marginTop: 12,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: 'rgba(201,169,110,0.07)',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(201,169,110,0.18)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#110E0B',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#110E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {
    marginLeft: 12,
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    color: '#F5F0E8',
    fontWeight: '500',
  },
  rowDesc: {
    fontSize: 12,
    color: '#9e9282',
    marginTop: 2,
  },
  footerNote: {
    fontSize: 12,
    color: 'rgba(201,169,110,0.3)',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
});
