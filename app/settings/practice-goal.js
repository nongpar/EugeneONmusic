import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../hooks/useTheme';

const STORAGE_KEY = '@eon_practice_goal';

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(message);
  } else {
    Alert.alert(title, message);
  }
};

const GOALS = [
  { minutes: 30, label: '30분' },
  { minutes: 60, label: '1시간' },
  { minutes: 90, label: '1시간 30분' },
  { minutes: 120, label: '2시간' },
  { minutes: 180, label: '3시간' },
];

// ── SVG Icons ──
function BackIcon({ size = 24, color = '#F5F0E8' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MusicIcon({ size = 48, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18V5l12-2v13" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="6" cy="18" r="3" stroke={color} strokeWidth={1.5} />
      <Circle cx="18" cy="16" r="3" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

function CheckIcon({ size = 20, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function PracticeGoalScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [selectedMinutes, setSelectedMinutes] = useState(60);

  // Load saved goal
  useEffect(() => {
    const loadGoal = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          setSelectedMinutes(Number(saved));
        }
      } catch (err) {
        console.warn('Failed to load practice goal:', err);
      }
    };
    loadGoal();
  }, []);

  const handleSave = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, String(selectedMinutes));
      const goalLabel = GOALS.find((g) => g.minutes === selectedMinutes)?.label || `${selectedMinutes}분`;
      if (Platform.OS === 'web') {
        const start = window.confirm(`매일 ${goalLabel} 연습 목표가 설정되었습니다!\n\n바로 연습을 시작할까요?`);
        if (start) {
          router.replace({ pathname: '/(tabs)/practice', params: { autoStart: '1' } });
        } else {
          router.back();
        }
      } else {
        Alert.alert(
          '목표 설정 완료!',
          `매일 ${goalLabel} 목표가 설정되었습니다.\n바로 연습을 시작할까요?`,
          [
            { text: '나중에', style: 'cancel', onPress: () => router.back() },
            { text: '바로 시작', onPress: () => router.replace({ pathname: '/(tabs)/practice', params: { autoStart: '1' } }) },
          ]
        );
      }
    } catch (err) {
      showAlert('오류', '저장에 실패했습니다');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <BackIcon color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>연습 목표 설정</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Icon */}
        <View style={styles.iconSection}>
          <MusicIcon color={colors.accent} />
          <Text style={styles.iconTitle}>일일 연습 목표</Text>
          <Text style={styles.iconSubtitle}>매일 달성할 연습 시간을 설정하세요</Text>
        </View>

        {/* Goal Options */}
        <View style={styles.card}>
          {GOALS.map((goal, index) => {
            const isSelected = selectedMinutes === goal.minutes;
            return (
              <TouchableOpacity
                key={goal.minutes}
                style={[
                  styles.goalRow,
                  index === GOALS.length - 1 && { borderBottomWidth: 0 },
                ]}
                onPress={() => setSelectedMinutes(goal.minutes)}
                activeOpacity={0.7}
              >
                <View style={styles.goalLeft}>
                  <View style={[styles.goalDot, isSelected && styles.goalDotSelected]} />
                  <Text style={[styles.goalLabel, isSelected && styles.goalLabelSelected]}>
                    {goal.label}
                  </Text>
                </View>
                {isSelected && <CheckIcon color={colors.accent} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Current Selection */}
        <View style={styles.selectedDisplay}>
          <Text style={styles.selectedValue}>
            {GOALS.find((g) => g.minutes === selectedMinutes)?.label || ''}
          </Text>
          <Text style={styles.selectedSub}>/ 일</Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>저장</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.bg,
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
    color: c.text,
    letterSpacing: 0.3,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  iconSection: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6,
  },
  iconTitle: {
    fontSize: 20,
    fontWeight: '400',
    color: c.text,
    marginTop: 12,
    letterSpacing: 0.3,
  },
  iconSubtitle: {
    fontSize: 13,
    color: c.textMuted,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: c.border,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: c.bg,
  },
  goalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: c.textMuted,
    backgroundColor: 'transparent',
  },
  goalDotSelected: {
    borderColor: c.accent,
    backgroundColor: c.accent,
  },
  goalLabel: {
    fontSize: 16,
    color: c.text,
  },
  goalLabelSelected: {
    color: c.accent,
    fontWeight: '600',
  },
  selectedDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: 24,
    gap: 4,
  },
  selectedValue: {
    fontSize: 32,
    fontWeight: '300',
    color: c.accent,
  },
  selectedSub: {
    fontSize: 16,
    color: c.textMuted,
  },
  saveBtn: {
    backgroundColor: c.accent,
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '400',
    color: c.bg,
    letterSpacing: 0.5,
  },
});
