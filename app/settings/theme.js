/**
 * 테마 설정 화면 — 다크 / 밝은 모드 / 시스템 따라가기
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';

let Haptics = null;
if (Platform.OS !== 'web') {
  try { Haptics = require('expo-haptics'); } catch {}
}

function BackIcon({ color }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MoonIcon({ color, size = 28 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
    </Svg>
  );
}

function SunIcon({ color, size = 28 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={1.5} />
      <Path
        d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function SystemIcon({ color, size = 28 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" stroke={color} strokeWidth={1.5} />
      <Path d="M8 21h8M12 17v4" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function CheckIcon({ color, size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 13l4 4L19 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const OPTIONS = [
  {
    value: 'dark',
    title: '다크 모드',
    description: '공연장 조명 톤의 어두운 화면. 화면 깊이와 골드 액센트가 가장 잘 살아납니다.',
    Icon: MoonIcon,
  },
  {
    value: 'light',
    title: '밝은 모드',
    description: '크림색 배경의 밝은 화면. 글씨가 더 잘 보이며, 환한 환경에서 눈이 편합니다.',
    Icon: SunIcon,
  },
  {
    value: 'system',
    title: '시스템 설정 따라가기',
    description: '폰의 다크/라이트 모드 설정에 자동으로 맞춥니다.',
    Icon: SystemIcon,
  },
];

export default function ThemeSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { mode, setMode, colors } = useTheme();

  const handlePick = (next) => {
    if (next === mode) return;
    Haptics?.selectionAsync();
    setMode(next);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: colors.borderSoft }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.headerBtn}
        >
          <BackIcon color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>화면 테마</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: colors.textMuted }]}>
          편안한 화면 톤을 선택해주세요. 언제든 다시 바꿀 수 있습니다.
        </Text>

        <View style={styles.optionsWrap}>
          {OPTIONS.map(({ value, title, description, Icon }) => {
            const selected = value === mode;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => handlePick(value)}
                activeOpacity={0.85}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: selected ? colors.surfaceStrong : colors.surface,
                    borderColor: selected ? colors.accent : colors.border,
                    borderWidth: selected ? 1 : 0.5,
                  },
                ]}
              >
                <View style={styles.optionIconWrap}>
                  <Icon color={colors.accent} />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>{title}</Text>
                  <Text style={[styles.optionDesc, { color: colors.textMuted }]}>{description}</Text>
                </View>
                {selected ? (
                  <View
                    style={[
                      styles.checkBadge,
                      { backgroundColor: colors.accent },
                    ]}
                  >
                    <CheckIcon color={colors.accentText} size={14} />
                  </View>
                ) : (
                  <View style={[styles.checkBadge, { borderColor: colors.borderSoft, borderWidth: 1, backgroundColor: 'transparent' }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.note, { color: colors.textMuted }]}>
          밝은 모드는 일부 화면에서 단계적으로 적용됩니다. 적용되지 않은 화면은 다크 모드로 표시될 수 있어요.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, letterSpacing: 0.5 },
  scroll: { paddingHorizontal: 20, paddingTop: 24 },
  intro: { fontSize: 13, lineHeight: 20, marginBottom: 24 },
  optionsWrap: { gap: 12 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 6,
  },
  optionIconWrap: { width: 36, alignItems: 'center', justifyContent: 'center' },
  optionTextWrap: { flex: 1, gap: 4 },
  optionTitle: { fontSize: 15, letterSpacing: 0.3 },
  optionDesc: { fontSize: 12, lineHeight: 18 },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 28,
    paddingHorizontal: 4,
  },
});
