import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
function BackIcon({ size = 24, color = '#ffffff' }) {
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
      showAlert('저장 완료', '연습 목표가 설정되었습니다');
    } catch (err) {
      showAlert('오류', '저장에 실패했습니다');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>연습 목표 설정</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Icon */}
        <View style={styles.iconSection}>
          <MusicIcon />
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
                {isSelected && <CheckIcon />}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1923',
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
    fontWeight: 'bold',
    color: '#ffffff',
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
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 12,
  },
  iconSubtitle: {
    fontSize: 13,
    color: '#6b7b8d',
  },
  card: {
    backgroundColor: '#1a2530',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222f3a',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#0f1923',
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
    borderColor: '#4a5a6a',
    backgroundColor: 'transparent',
  },
  goalDotSelected: {
    borderColor: '#C9A96E',
    backgroundColor: '#C9A96E',
  },
  goalLabel: {
    fontSize: 16,
    color: '#ffffff',
  },
  goalLabelSelected: {
    color: '#C9A96E',
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
    fontWeight: 'bold',
    color: '#C9A96E',
  },
  selectedSub: {
    fontSize: 16,
    color: '#6b7b8d',
  },
  saveBtn: {
    backgroundColor: '#C9A96E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f1923',
  },
});
