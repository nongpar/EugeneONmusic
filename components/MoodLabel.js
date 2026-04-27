/**
 * 결의 흐름 라벨
 *
 * 사용자가 첫 메시지를 보낸 직후, 가온이 그 결을 읽었음을 보여주는 작은 라벨.
 * 채팅 영역 상단(헤더 아래)에 부드럽게 페이드인하며 표시됨.
 * "이 큐레이터는 나를 봤구나"라는 신호.
 *
 * 사용자가 닫기(✕) 또는 새 대화 시작 시 사라짐.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../hooks/useTheme';

function CloseIcon({ size = 12, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export default function MoodLabel({ mood, onDismiss }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  if (!mood) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.goldLine} />
      <View style={styles.chip}>
        <Text style={styles.label}>가온의 큐레이션</Text>
        <View style={styles.dot} />
        <Text style={styles.mood}>{mood}</Text>
        {onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={styles.dismissBtn}
            accessibilityLabel="결 라벨 닫기"
          >
            <CloseIcon color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.goldLine} />
    </Animated.View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
      backgroundColor: c.bg,
    },
    goldLine: {
      flex: 1,
      height: 0.5,
      backgroundColor: c.accent,
      opacity: 0.45,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    label: {
      fontSize: 10,
      color: c.textMuted,
      letterSpacing: 1.4,
    },
    dot: {
      width: 2,
      height: 2,
      borderRadius: 1,
      backgroundColor: c.accent,
      opacity: 0.6,
    },
    mood: {
      fontSize: 11,
      color: c.accent,
      letterSpacing: 1.3,
    },
    dismissBtn: {
      marginLeft: 4,
      padding: 2,
    },
  });
