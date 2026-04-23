import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';

let Haptics = null;
if (Platform.OS !== 'web') {
  try { Haptics = require('expo-haptics'); } catch {}
}

// v2: 2026-04-23 — AI 음악 상담 서비스 추가, Anthropic 국외이전 등 중대 변경 반영
export const CONSENT_VERSION = 'v2';
export const CONSENT_KEY_PREFIX = '@eon_consent_';

export async function hasUserConsented(uid) {
  if (!uid) return false;
  try {
    const saved = await AsyncStorage.getItem(`${CONSENT_KEY_PREFIX}${CONSENT_VERSION}_${uid}`);
    return saved === 'true';
  } catch {
    return false;
  }
}

export async function markUserConsented(uid) {
  if (!uid) return;
  try {
    await AsyncStorage.setItem(`${CONSENT_KEY_PREFIX}${CONSENT_VERSION}_${uid}`, 'true');
  } catch {}
}

// ── 아이콘 ──
function CheckIcon({ size = 16, color = '#0C0A08' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ArrowIcon({ size = 16, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function DocIcon({ size = 40, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Checkbox({ checked, onPress, label, required, onViewDetail }) {
  return (
    <View style={styles.checkRow}>
      <TouchableOpacity
        style={styles.checkboxWrap}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked && <CheckIcon size={14} />}
        </View>
        <View style={styles.checkLabelWrap}>
          {required && <Text style={styles.requiredBadge}>필수</Text>}
          <Text style={styles.checkLabel}>{label}</Text>
        </View>
      </TouchableOpacity>
      {onViewDetail && (
        <TouchableOpacity style={styles.viewBtn} onPress={onViewDetail}>
          <Text style={styles.viewBtnText}>보기</Text>
          <ArrowIcon size={14} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ConsentScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const allAgreed = agreeTerms && agreePrivacy;

  const toggleAll = () => {
    if (Haptics) Haptics.selectionAsync();
    const next = !allAgreed;
    setAgreeTerms(next);
    setAgreePrivacy(next);
  };

  const toggleTerms = () => {
    if (Haptics) Haptics.selectionAsync();
    setAgreeTerms((v) => !v);
  };

  const togglePrivacy = () => {
    if (Haptics) Haptics.selectionAsync();
    setAgreePrivacy((v) => !v);
  };

  const handleContinue = useCallback(async () => {
    if (!allAgreed || !user?.uid) return;
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);
    try {
      await markUserConsented(user.uid);
      // 홈으로 이동 (뒤로가기 방지)
      router.replace('/');
    } catch (err) {
      console.warn('Consent save failed:', err);
      Alert.alert('오류', '동의 저장에 실패했습니다. 다시 시도해주세요.');
      setSubmitting(false);
    }
  }, [allAgreed, user]);

  const handleLogout = useCallback(() => {
    const confirmLogout = async () => {
      if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await logout();
      router.replace('/auth/login');
    };

    if (Platform.OS === 'web') {
      if (window.confirm('로그아웃 하시겠습니까?')) confirmLogout();
    } else {
      Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', style: 'destructive', onPress: confirmLogout },
      ]);
    }
  }, [logout]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.iconWrap}>
          <DocIcon />
        </View>
        <Text style={styles.title}>서비스 이용 동의</Text>
        <Text style={styles.subtitle}>
          유진온뮤직을 이용하시려면{'\n'}
          아래 약관에 동의해주세요
        </Text>

        {/* 설명 */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            본 약관은 서비스 이용과 관련된 이용자의 권리·의무 및 책임사항을 규정합니다. 각 항목을 확인한 후 동의해주세요.
          </Text>
        </View>

        {/* 전체 동의 */}
        <TouchableOpacity style={styles.allAgreeBox} onPress={toggleAll} activeOpacity={0.7}>
          <View style={[styles.checkbox, styles.checkboxLarge, allAgreed && styles.checkboxChecked]}>
            {allAgreed && <CheckIcon size={18} />}
          </View>
          <Text style={styles.allAgreeText}>모두 동의합니다</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* 필수 항목 */}
        <Checkbox
          checked={agreeTerms}
          onPress={toggleTerms}
          label="이용약관 동의"
          required
          onViewDetail={() => router.push('/settings/terms')}
        />

        <Checkbox
          checked={agreePrivacy}
          onPress={togglePrivacy}
          label="개인정보처리방침 동의"
          required
          onViewDetail={() => router.push('/settings/privacy')}
        />

        {/* 안내 문구 */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            ⓘ 동의하지 않으시면 서비스 이용이 제한됩니다.{'\n'}
            동의 후에도 설정에서 언제든 내용을 확인하실 수 있습니다.
          </Text>
        </View>
      </ScrollView>

      {/* 하단 고정 버튼 */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[styles.primaryBtn, (!allAgreed || submitting) && styles.primaryBtnDisabled]}
          onPress={handleContinue}
          disabled={!allAgreed || submitting}
          activeOpacity={0.8}
        >
          <Text style={[styles.primaryBtnText, (!allAgreed || submitting) && styles.primaryBtnTextDisabled]}>
            {submitting ? '처리 중...' : '동의하고 시작하기'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleLogout}>
          <Text style={styles.secondaryBtnText}>로그아웃</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#110E0B' },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },

  iconWrap: {
    alignSelf: 'center',
    width: 72, height: 72, borderRadius: 8,
    backgroundColor: 'rgba(201,169,110,0.1)',
    borderWidth: 0.5, borderColor: 'rgba(201,169,110,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },

  title: {
    fontSize: 22, fontWeight: '400', color: '#F5F0E8',
    textAlign: 'center', letterSpacing: 0.5, marginBottom: 8,
  },
  subtitle: {
    fontSize: 14, color: '#9e9282',
    textAlign: 'center', lineHeight: 22, marginBottom: 28,
  },

  infoBox: {
    backgroundColor: 'rgba(201,169,110,0.05)',
    borderRadius: 4,
    borderLeftWidth: 2, borderLeftColor: '#C9A96E',
    padding: 14, marginBottom: 20,
  },
  infoText: {
    fontSize: 12, color: '#c0bab0', lineHeight: 18, letterSpacing: 0.2,
  },

  allAgreeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 16, paddingHorizontal: 16,
    backgroundColor: 'rgba(201,169,110,0.07)',
    borderRadius: 4,
    borderWidth: 0.5, borderColor: 'rgba(201,169,110,0.25)',
    marginBottom: 16,
  },
  allAgreeText: {
    fontSize: 16, fontWeight: '500', color: '#F5F0E8', letterSpacing: 0.3,
  },

  divider: {
    height: 0.5, backgroundColor: 'rgba(201,169,110,0.18)',
    marginBottom: 8,
  },

  checkRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  checkboxWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 3,
    borderWidth: 1.5, borderColor: '#9e9282',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxLarge: {
    width: 24, height: 24, borderRadius: 4,
  },
  checkboxChecked: {
    backgroundColor: '#C9A96E', borderColor: '#C9A96E',
  },
  checkLabelWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1,
  },
  requiredBadge: {
    fontSize: 10, fontWeight: '600', color: '#C9A96E',
    backgroundColor: 'rgba(201,169,110,0.15)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3,
    letterSpacing: 0.5,
  },
  checkLabel: {
    fontSize: 14, color: '#F5F0E8', letterSpacing: 0.3,
  },

  viewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  viewBtnText: {
    fontSize: 12, color: '#C9A96E', letterSpacing: 0.3,
  },

  noticeBox: {
    backgroundColor: 'rgba(201,169,110,0.04)',
    borderRadius: 4,
    padding: 14, marginTop: 16,
  },
  noticeText: {
    fontSize: 11, color: '#9e9282', lineHeight: 18, letterSpacing: 0.2,
  },

  footer: {
    paddingHorizontal: 24, paddingTop: 12,
    borderTopWidth: 0.5, borderTopColor: 'rgba(201,169,110,0.15)',
    backgroundColor: '#110E0B',
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: '#C9A96E',
    paddingVertical: 16, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnDisabled: {
    backgroundColor: 'rgba(201,169,110,0.2)',
  },
  primaryBtnText: {
    fontSize: 15, fontWeight: '500', color: '#0C0A08', letterSpacing: 0.5,
  },
  primaryBtnTextDisabled: {
    color: 'rgba(245,240,232,0.4)',
  },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 13, color: '#9e9282', letterSpacing: 0.3,
  },
});
