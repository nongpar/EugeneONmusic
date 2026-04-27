/**
 * 가온의 첫 메시지 — "호흡" 애니메이션
 *
 * 한 번에 통째로 등장하던 환영 메시지를 단어 단위로 페이드인하고,
 * 줄 사이에 짧은 호흡(pause)을 둠. 마지막에 가는 골드 라인이
 * 슬며시 그려져 큐레이터의 서명 같은 마무리를 만든다.
 *
 * 첫 메시지에만 사용 — 이후 가온의 답변에는 적용하지 않는다.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { ChopinAvatarSmall } from './ChopinAvatar';
import { useTheme } from '../hooks/useTheme';

const WORD_DURATION = 280;   // 단어 한 개 페이드인 시간
const WORD_STAGGER = 75;     // 같은 줄 내 단어 간 간격
const LINE_PAUSE = 220;      // 줄과 줄 사이 호흡
const TIME_FADE_DURATION = 500; // 시간 표기 페이드인 시간
const FINAL_LINE_DELAY = 180; // 본문 끝나고 골드 라인 그리기 전 호흡
const FINAL_LINE_DURATION = 700;

// "오후 4:42" 형식으로 포맷
function formatTime(d) {
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h < 12 ? '오전' : '오후';
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${displayHour}:${String(m).padStart(2, '0')}`;
}

export default function AnimatedFirstMessage({ text }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  // 마운트 시점의 시간을 고정 — 메시지가 도착한 시각
  const [timeStr] = useState(() => formatTime(new Date()));

  // 줄 → 단어 분할
  const lines = useMemo(() => {
    return (text || '').split('\n').map((line) => line.split(' ').filter(Boolean));
  }, [text]);

  const totalWords = useMemo(
    () => lines.reduce((sum, words) => sum + words.length, 0),
    [lines]
  );

  // 단어별 애니메이션 값 (flat array)
  const wordAnims = useRef(
    Array.from({ length: totalWords }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(4),
    }))
  ).current;

  // 시간 표기 페이드인
  const timeOpacity = useRef(new Animated.Value(0)).current;

  // 골드 마무리 라인
  const finalLineWidth = useRef(new Animated.Value(0)).current;
  const finalLineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animations = [];
    let wordIdx = 0;

    // 0단계: 시간 표기가 먼저 부드럽게 등장 (편지 윗부분 날짜 같은)
    animations.push(
      Animated.timing(timeOpacity, {
        toValue: 0.55,
        duration: TIME_FADE_DURATION,
        useNativeDriver: true,
      })
    );

    lines.forEach((words, lineIdx) => {
      if (words.length === 0) {
        // 빈 줄도 짧게 호흡
        animations.push(Animated.delay(LINE_PAUSE));
        return;
      }
      const lineAnims = words.map(() => {
        const anim = wordAnims[wordIdx++];
        return Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: WORD_DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateY, {
            toValue: 0,
            duration: WORD_DURATION,
            useNativeDriver: true,
          }),
        ]);
      });
      animations.push(Animated.stagger(WORD_STAGGER, lineAnims));
      if (lineIdx < lines.length - 1) {
        animations.push(Animated.delay(LINE_PAUSE));
      }
    });

    // 본문 끝난 뒤 가는 골드 라인 — 큐레이터 서명 같은 마무리
    animations.push(Animated.delay(FINAL_LINE_DELAY));
    animations.push(
      Animated.parallel([
        Animated.timing(finalLineWidth, {
          toValue: 1,
          duration: FINAL_LINE_DURATION,
          useNativeDriver: false, // width 애니메이션은 native driver 미지원
        }),
        Animated.timing(finalLineOpacity, {
          toValue: 0.55,
          duration: 500,
          useNativeDriver: false,
        }),
      ])
    );

    Animated.sequence(animations).start();
    // mount 시 1회만 실행 — 의존성 의도적으로 비움
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let wordCounter = 0;
  return (
    <View style={styles.wrap}>
      <View style={styles.avatar}>
        <ChopinAvatarSmall size={28} />
      </View>
      <View style={styles.bubble}>
        {/* 시간 표기 — 우측 상단, 가는 골드 텍스트 */}
        <View style={styles.timeRow}>
          <Animated.Text style={[styles.timeText, { opacity: timeOpacity }]}>
            {timeStr}
          </Animated.Text>
        </View>
        {lines.map((words, lineIdx) => {
          if (words.length === 0) {
            return <View key={lineIdx} style={styles.emptyLine} />;
          }
          return (
            <View key={lineIdx} style={styles.line}>
              {words.map((w, i) => {
                const anim = wordAnims[wordCounter++];
                const isLast = i === words.length - 1;
                return (
                  <Animated.Text
                    key={i}
                    style={[
                      styles.text,
                      {
                        opacity: anim.opacity,
                        transform: [{ translateY: anim.translateY }],
                      },
                    ]}
                  >
                    {w}{isLast ? '' : ' '}
                  </Animated.Text>
                );
              })}
            </View>
          );
        })}
        {/* 골드 마무리 라인 — 가온의 서명 */}
        <Animated.View
          style={{
            height: 0.5,
            backgroundColor: colors.accent,
            opacity: finalLineOpacity,
            marginTop: 12,
            width: finalLineWidth.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '38%'],
            }),
          }}
        />
      </View>
    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      maxWidth: '92%',
    },
    avatar: { marginTop: 4 },
    bubble: {
      flex: 1,
      backgroundColor: c.surface,
      borderWidth: 0.5,
      borderColor: c.border,
      borderRadius: 4,
      padding: 14,
    },
    line: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'baseline',
    },
    emptyLine: {
      height: 8,
    },
    text: {
      fontSize: 15,
      color: c.text,
      lineHeight: 26,
      letterSpacing: 0.2,
    },
    timeRow: {
      alignItems: 'flex-end',
      marginBottom: 8,
    },
    timeText: {
      fontSize: 10,
      color: c.accent,
      letterSpacing: 1.4,
    },
  });
