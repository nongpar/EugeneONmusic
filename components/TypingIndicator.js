/**
 * 가온의 타이핑 인디케이터
 *
 * 점 3개 또는 ActivityIndicator 대신 — 작은 음표가 부드럽게 박동하고
 * "가온이 살피고 있어요" 텍스트가 한 박자 늦게 미세하게 페이드인.
 * 챗봇이 아닌, 신중히 답을 고르는 큐레이터의 호흡.
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import Svg, { Path, Ellipse } from 'react-native-svg';
import { ChopinAvatarSmall } from './ChopinAvatar';
import { useTheme } from '../hooks/useTheme';

// 작은 음표 — 8분음표 모양
function NoteIcon({ size = 14, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 17V5l10-2v12"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Ellipse cx="6" cy="17" rx="3" ry="2" stroke={color} strokeWidth={1.6} />
      <Ellipse cx="16" cy="15" rx="3" ry="2" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

export default function TypingIndicator() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  // 음표 — opacity와 scale을 동시에 박동
  const noteOpacity = useRef(new Animated.Value(0.4)).current;
  const noteScale = useRef(new Animated.Value(0.92)).current;

  // 텍스트 — 음표보다 한 박자 늦게 한 번만 페이드인
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 음표 무한 박동 — 1.4초 주기 (들숨/날숨)
    const noteLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(noteOpacity, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(noteScale, {
            toValue: 1.06,
            duration: 700,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(noteOpacity, {
            toValue: 0.4,
            duration: 700,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(noteScale, {
            toValue: 0.92,
            duration: 700,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    noteLoop.start();

    // 텍스트는 한 번만 부드럽게 등장 (살짝 늦게)
    Animated.timing(textOpacity, {
      toValue: 0.7,
      duration: 800,
      delay: 220,
      useNativeDriver: true,
    }).start();

    return () => noteLoop.stop();
  }, [noteOpacity, noteScale, textOpacity]);

  return (
    <View style={styles.wrap}>
      <View style={styles.avatar}>
        <ChopinAvatarSmall size={24} />
      </View>
      <View style={styles.bubble}>
        <Animated.View
          style={{
            opacity: noteOpacity,
            transform: [{ scale: noteScale }],
          }}
        >
          <NoteIcon size={14} color={colors.accent} />
        </Animated.View>
        <Animated.Text style={[styles.text, { opacity: textOpacity }]}>
          가온이 살피고 있어요
        </Animated.Text>
      </View>
    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    avatar: { marginTop: 2 },
    bubble: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.surface,
      borderWidth: 0.5,
      borderColor: c.border,
      borderRadius: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    text: {
      fontSize: 12,
      color: c.textMuted,
      letterSpacing: 0.6,
    },
  });
