/**
 * 음악 용어 정의 모달
 *
 * GlossaryText에서 단어를 탭하면 호출되는 작은 카드.
 * 화면 중앙 가까이 떠서 정의를 보여주고, 외부 영역 또는 닫기 버튼 탭으로 닫힘.
 * 큐레이터의 어깨 너머 짧은 메모 같은 분위기.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableWithoutFeedback,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../hooks/useTheme';
import { getDefinition } from '../constants/musicGlossary';

function CloseIcon({ size = 16, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export default function GlossaryModal({ visible, term, onClose }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const definition = term ? getDefinition(term) : null;

  const fade = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fade.setValue(0);
      cardScale.setValue(0.96);
    }
  }, [visible, fade, cardScale]);

  if (!term || !definition) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.card,
                { transform: [{ scale: cardScale }] },
              ]}
            >
              {/* 상단 — 닫기 */}
              <View style={styles.header}>
                <Text style={styles.headerLabel}>음악 용어</Text>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="닫기"
                >
                  <CloseIcon color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* 골드 라인 */}
              <View style={styles.goldLine} />

              {/* 용어 + 정의 */}
              <Text style={styles.term}>{term}</Text>
              <Text style={styles.definition}>{definition}</Text>

              {/* 하단 골드 마침표 */}
              <View style={styles.footer}>
                <View style={styles.diamond} />
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: c.bgElevated,
      borderWidth: 0.5,
      borderColor: c.accent,
      borderRadius: 6,
      padding: 22,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    headerLabel: {
      fontSize: 10,
      color: c.textMuted,
      letterSpacing: 2,
    },
    goldLine: {
      height: 0.5,
      backgroundColor: c.accent,
      opacity: 0.5,
      marginBottom: 18,
    },
    term: {
      fontSize: 22,
      fontWeight: '300',
      color: c.text,
      letterSpacing: 1,
      marginBottom: 12,
    },
    definition: {
      fontSize: 14,
      color: c.text,
      lineHeight: 24,
      letterSpacing: 0.2,
    },
    footer: {
      alignItems: 'center',
      marginTop: 22,
    },
    diamond: {
      width: 4,
      height: 4,
      backgroundColor: c.accent,
      transform: [{ rotate: '45deg' }],
      opacity: 0.6,
    },
  });
