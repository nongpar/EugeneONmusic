/**
 * 오늘의 한 음 — 대화 마무리 카드
 *
 * 가온과의 대화가 일정 분량 이상 진행된 후, 사용자가 마무리를 원할 때 호출.
 * 우리가 나눈 마음 + 함께 떠올린 음악 + 가온의 서명을 한 장 카드로.
 *
 * AI 호출 없이 클라이언트에서 메시지 배열을 발췌해 구성.
 *   - 나누었던 마음: 첫 user 메시지 (50자 내)
 *   - 함께 떠올린 음악: 가장 마지막 assistant 메시지 (140자 내)
 *
 * 사용자가 캡처해서 간직하고 싶은 결의 카드 — 큐레이션의 휘발 방지.
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
  Platform,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';

let Haptics = null;
if (Platform.OS !== 'web') {
  try {
    Haptics = require('expo-haptics');
  } catch {}
}

function formatDateForCard(d) {
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h < 12 ? '오전' : '오후';
  const dispH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${month}월 ${day}일, ${period} ${dispH}시 ${String(m).padStart(2, '0')}분`;
}

function trimText(text, max) {
  if (!text) return '';
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + '…';
}

function extractFromMessages(messages) {
  if (!messages || messages.length === 0) {
    return { firstUserText: '', lastAssistantText: '' };
  }
  const firstUser = messages.find((m) => m.role === 'user');
  let lastAssistant = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === 'assistant') {
      lastAssistant = messages[i];
      break;
    }
  }
  return {
    firstUserText: trimText(firstUser?.text, 60),
    lastAssistantText: trimText(lastAssistant?.text, 160),
  };
}

export default function ClosingCard({ visible, messages, onClose, onCloseAndExit }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const fade = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslate, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fade.setValue(0);
      cardTranslate.setValue(20);
    }
  }, [visible, fade, cardTranslate]);

  if (!visible) return null;

  const { firstUserText, lastAssistantText } = extractFromMessages(messages);
  const dateStr = formatDateForCard(new Date());

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
                { transform: [{ translateY: cardTranslate }] },
              ]}
            >
              {/* 헤더 — 오늘의 한 음 */}
              <Text style={styles.label}>오늘의 한 음</Text>
              <View style={styles.ornamentRow}>
                <View style={styles.goldLine} />
                <View style={styles.diamond} />
                <View style={styles.goldLine} />
              </View>

              {/* 날짜·시간 */}
              <Text style={styles.dateText}>{dateStr}</Text>

              {/* 나누었던 마음 */}
              {firstUserText ? (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>나누었던 마음</Text>
                  <Text style={styles.sectionBody}>"{firstUserText}"</Text>
                </View>
              ) : null}

              {/* 함께 떠올린 음악 */}
              {lastAssistantText ? (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>함께 떠올린 한 마디</Text>
                  <Text style={styles.sectionBody}>"{lastAssistantText}"</Text>
                </View>
              ) : null}

              {/* 점선 구분 */}
              <View style={styles.dashedLine} />

              {/* 서명 */}
              <Text style={styles.signature}>· 가온, EON HALL 음악 큐레이터</Text>

              {/* 버튼 */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  activeOpacity={0.75}
                  onPress={onClose}
                >
                  <Text style={styles.secondaryText}>대화로 돌아가기</Text>
                </TouchableOpacity>
                {onCloseAndExit && (
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    activeOpacity={0.85}
                    onPress={onCloseAndExit}
                  >
                    <Text style={styles.primaryText}>마무리</Text>
                  </TouchableOpacity>
                )}
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
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: c.bgElevated,
      borderWidth: 0.5,
      borderColor: c.accent,
      borderRadius: 6,
      paddingHorizontal: 26,
      paddingVertical: 28,
    },
    label: {
      fontSize: 11,
      color: c.accent,
      letterSpacing: 3,
      textAlign: 'center',
      marginBottom: 10,
    },
    ornamentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 22,
    },
    goldLine: {
      flex: 1,
      height: 0.5,
      backgroundColor: c.accent,
      opacity: 0.55,
    },
    diamond: {
      width: 4,
      height: 4,
      backgroundColor: c.accent,
      transform: [{ rotate: '45deg' }],
      opacity: 0.7,
    },
    dateText: {
      fontSize: 12,
      color: c.textMuted,
      textAlign: 'center',
      letterSpacing: 0.6,
      marginBottom: 22,
    },
    section: {
      marginBottom: 18,
    },
    sectionLabel: {
      fontSize: 10,
      color: c.accent,
      letterSpacing: 2,
      marginBottom: 8,
    },
    sectionBody: {
      fontSize: 14,
      color: c.text,
      lineHeight: 24,
      letterSpacing: 0.2,
      fontStyle: 'italic',
    },
    dashedLine: {
      height: 0.5,
      backgroundColor: 'transparent',
      borderTopWidth: 0.5,
      borderTopColor: c.accent,
      borderStyle: 'dashed',
      opacity: 0.4,
      marginVertical: 12,
    },
    signature: {
      fontSize: 12,
      color: c.text,
      textAlign: 'right',
      letterSpacing: 0.6,
      marginBottom: 22,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'flex-end',
    },
    secondaryBtn: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 0.5,
      borderColor: c.border,
      borderRadius: 4,
    },
    secondaryText: {
      fontSize: 12,
      color: c.textMuted,
      letterSpacing: 1,
    },
    primaryBtn: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      backgroundColor: c.accent,
      borderRadius: 4,
    },
    primaryText: {
      fontSize: 12,
      color: c.accentText,
      letterSpacing: 1,
    },
  });
