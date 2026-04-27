/**
 * 용어 인식 텍스트
 *
 * 가온의 텍스트에서 음악 용어를 자동 식별해 점선 밑줄로 표시.
 * 평소엔 텍스트의 가독성을 해치지 않고, 모르는 사용자만 탭해서 정의를 펼침.
 *
 * 매칭은 constants/musicGlossary.js의 사전 기반.
 * 정의는 부모(GlossaryProvider 형태로 ai-consult.js에 위치)가 모달로 표시.
 */
import React from 'react';
import { Text, StyleSheet, Platform } from 'react-native';
import { tokenizeWithGlossary } from '../constants/musicGlossary';

export default function GlossaryText({ text, baseStyle, accentColor, onTermPress }) {
  const segments = tokenizeWithGlossary(text || '');
  return (
    <Text style={baseStyle}>
      {segments.map((seg, i) => {
        if (seg.type === 'plain') {
          return seg.text;
        }
        // term — 점선 밑줄 + 탭
        return (
          <Text
            key={i}
            onPress={() => onTermPress?.(seg.term)}
            // iOS는 textDecorationStyle: 'dotted'를 정상 지원, Android는 일부 버전에서 미지원
            // 폴백: 텍스트 색상만 살짝 강조 + underline (style은 'dotted'로 시도)
            style={[
              {
                color: accentColor,
                textDecorationLine: 'underline',
                textDecorationStyle: Platform.OS === 'ios' ? 'dotted' : 'dashed',
                textDecorationColor: accentColor,
              },
            ]}
          >
            {seg.text}
          </Text>
        );
      })}
    </Text>
  );
}

// (참고) 외부에서 별도 스타일 필요 시 사용 — 현재는 baseStyle을 받아 그대로 적용
export const glossaryStyles = StyleSheet.create({
  // placeholder
});
