import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Platform, Alert, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { sendPushNotification } from '../../hooks/useNotifications';

let Haptics = null;
if (Platform.OS !== 'web') {
  try { Haptics = require('expo-haptics'); } catch {}
}

// ── SVG Icons ──

function BackIcon({ size = 24, color = '#F5F0E8' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SendIcon({ size = 20, color = '#110E0B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22 2L11 13" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M22 2l-7 20-4-9-9-4 20-7z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function UsersIcon({ size = 18, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Helpers ──

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

// ── Notification Types ──

const NOTIF_TYPES = [
  { key: 'announcement', label: '공지사항', emoji: '' },
  { key: 'schedule', label: '레슨 안내', emoji: '' },
  { key: 'event', label: '이벤트', emoji: '' },
];

// ── Target Audiences ──

const AUDIENCES = [
  { key: 'all', label: '전체 사용자' },
  { key: 'student', label: '학생만' },
  { key: 'teacher', label: '선생님만' },
];

// ── Manuscript Decorations ──

function StaffLines() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.staffLines} pointerEvents="none">
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} style={styles.staffLine} />
      ))}
    </View>
  );
}

// ── Main Screen ──

export default function SendNotificationScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('announcement');
  const [audience, setAudience] = useState('all');
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(null);

  // 권한 확인 (teacher만 접근 가능)
  const isAuthorized = user?.role === 'teacher';

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      showAlert('입력 오류', '제목과 내용을 모두 입력해주세요.');
      return;
    }

    if (!isAuthorized) {
      showAlert('권한 없음', '관리자만 알림을 전송할 수 있습니다.');
      return;
    }

    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSending(true);
    try {
      // 1. Firestore에 알림 저장 (모든 사용자가 인박스에서 볼 수 있도록)
      await addDoc(collection(db, 'notifications'), {
        type,
        title: title.trim(),
        body: body.trim(),
        audience,
        senderId: user.uid,
        senderName: user.displayName || '관리자',
        createdAt: serverTimestamp(),
      });

      // 2. 모든 Push Token 가져와서 전송
      const tokensSnap = await getDocs(collection(db, 'pushTokens'));
      let count = 0;

      const sendPromises = [];
      tokensSnap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const token = data.token;
        const userRole = data.role || 'student';

        // 대상 그룹 필터링
        if (audience === 'student' && userRole !== 'student') return;
        if (audience === 'teacher' && userRole !== 'teacher') return;

        if (token) {
          count++;
          sendPromises.push(
            sendPushNotification(token, title.trim(), body.trim(), {
              type,
              screen: '/notifications',
            })
          );
        }
      });

      await Promise.all(sendPromises);

      Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSentCount(count);
      setTitle('');
      setBody('');
      showAlert('전송 완료', `${count}명에게 알림을 전송했습니다.`);
    } catch (err) {
      console.error('Notification send error:', err);
      showAlert('전송 실패', '알림 전송 중 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  };

  if (!isAuthorized) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <BackIcon color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>알림 전송</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.unauthorized}>
          <Text style={styles.unauthorizedText}>관리자 권한이 필요합니다</Text>
          <Text style={styles.unauthorizedSub}>
            선생님 또는 관리자 계정으로 로그인해주세요.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <BackIcon color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림 전송</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* 알림 유형 */}
        <Text style={styles.sectionLabel}>알림 유형</Text>
        <View style={styles.typeRow}>
          {NOTIF_TYPES.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.typeBtn, type === t.key && styles.typeBtnActive]}
              onPress={() => {
                Haptics?.selectionAsync();
                setType(t.key);
              }}
            >
              <Text style={[styles.typeLabel, type === t.key && styles.typeLabelActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 대상 */}
        <Text style={styles.sectionLabel}>수신 대상</Text>
        <View style={styles.audienceCard}>
          <StaffLines />
          <UsersIcon color={colors.accent} />
          <View style={styles.audienceOptions}>
            {AUDIENCES.map(a => (
              <TouchableOpacity
                key={a.key}
                style={[styles.audienceBtn, audience === a.key && styles.audienceBtnActive]}
                onPress={() => {
                  Haptics?.selectionAsync();
                  setAudience(a.key);
                }}
              >
                <View style={[styles.radio, audience === a.key && styles.radioActive]}>
                  {audience === a.key && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.audienceLabel, audience === a.key && styles.audienceLabelActive]}>
                  {a.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 제목 */}
        <Text style={styles.sectionLabel}>제목</Text>
        <View style={styles.inputCard}>
          <StaffLines />
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="알림 제목을 입력하세요"
            placeholderTextColor={colors.accentMuted}
            maxLength={50}
          />
          <Text style={styles.charCount}>{title.length}/50</Text>
        </View>

        {/* 내용 */}
        <Text style={styles.sectionLabel}>내용</Text>
        <View style={styles.inputCard}>
          <StaffLines />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={body}
            onChangeText={setBody}
            placeholder="알림 내용을 입력하세요"
            placeholderTextColor={colors.accentMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={200}
          />
          <Text style={styles.charCount}>{body.length}/200</Text>
        </View>

        {/* 미리보기 */}
        {(title.trim() || body.trim()) && (
          <>
            <Text style={styles.sectionLabel}>미리보기</Text>
            <View style={styles.previewCard}>
              <StaffLines />
              <View style={styles.previewHeader}>
                <View style={styles.previewBadge}>
                  <Text style={styles.previewBadgeText}>
                    {NOTIF_TYPES.find(t => t.key === type)?.label || '공지'}
                  </Text>
                </View>
                <Text style={styles.previewTime}>방금</Text>
              </View>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {title.trim() || '제목 없음'}
              </Text>
              <Text style={styles.previewBody} numberOfLines={2}>
                {body.trim() || '내용 없음'}
              </Text>
            </View>
          </>
        )}

        {/* 전송 결과 */}
        {sentCount !== null && (
          <View style={styles.resultCard}>
            <Text style={styles.resultText}>
              마지막 전송: {sentCount}명에게 전송 완료
            </Text>
          </View>
        )}

        {/* 전송 버튼 */}
        <TouchableOpacity
          style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.bg} />
          ) : (
            <>
              <SendIcon color={colors.bg} />
              <Text style={styles.sendBtnText}>알림 전송</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          전송된 알림은 모든 대상자의 알림 인박스에 표시되며{'\n'}
          푸시 알림이 실시간으로 전송됩니다.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ──

const makeStyles = (c) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: c.surfaceStrong,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '300',
    color: c.text,
    letterSpacing: 1,
  },

  // Content
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 60,
  },

  // Section label
  sectionLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: c.accent,
    letterSpacing: 1.5,
    fontStyle: 'italic',
    marginBottom: 8,
    marginTop: 16,
    marginLeft: 2,
  },

  // Type selector
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: c.surface,
    borderWidth: 0.5,
    borderColor: c.border,
    alignItems: 'center',
  },
  typeBtnActive: {
    borderColor: c.accent,
    backgroundColor: 'rgba(201,169,110,0.12)',
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: c.textMuted,
    letterSpacing: 0.3,
  },
  typeLabelActive: {
    color: c.accent,
    fontWeight: '500',
  },

  // Audience
  audienceCard: {
    backgroundColor: 'rgba(245,240,225,0.04)',
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(180,150,100,0.15)',
    borderTopWidth: 1.5,
    borderTopColor: c.accentMuted,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  audienceOptions: {
    flex: 1,
    gap: 10,
  },
  audienceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  audienceBtnActive: {},
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: c.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: c.accent,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.accent,
  },
  audienceLabel: {
    fontSize: 14,
    color: c.textMuted,
    fontWeight: '400',
  },
  audienceLabelActive: {
    color: c.text,
  },

  // Input card
  inputCard: {
    backgroundColor: 'rgba(245,240,225,0.04)',
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(180,150,100,0.15)',
    borderTopWidth: 1.5,
    borderTopColor: c.accentMuted,
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  input: {
    fontSize: 15,
    color: c.text,
    fontWeight: '400',
    padding: 0,
    letterSpacing: 0.3,
  },
  textArea: {
    minHeight: 100,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 11,
    color: c.accentMuted,
    textAlign: 'right',
    marginTop: 8,
  },

  // Preview
  previewCard: {
    backgroundColor: 'rgba(245,240,225,0.06)',
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(180,150,100,0.2)',
    borderLeftWidth: 2,
    borderLeftColor: c.accent,
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
    gap: 4,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 2,
    backgroundColor: c.surface,
  },
  previewBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: c.accent,
    letterSpacing: 1,
  },
  previewTime: {
    fontSize: 11,
    color: c.textMuted,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '400',
    color: c.text,
    marginTop: 2,
  },
  previewBody: {
    fontSize: 13,
    color: c.textMuted,
    lineHeight: 18,
  },

  // Result
  resultCard: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 4,
    backgroundColor: c.surface,
    borderWidth: 0.5,
    borderColor: c.border,
  },
  resultText: {
    fontSize: 13,
    color: c.accent,
    textAlign: 'center',
    fontWeight: '400',
  },

  // Send button
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 4,
    backgroundColor: c.accent,
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: c.bg,
    letterSpacing: 0.5,
  },

  // Footer
  footerNote: {
    fontSize: 12,
    color: c.accentMuted,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },

  // Unauthorized
  unauthorized: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  unauthorizedText: {
    fontSize: 16,
    fontWeight: '300',
    color: c.textMuted,
  },
  unauthorizedSub: {
    fontSize: 14,
    color: c.accentMuted,
    textAlign: 'center',
  },

  // Staff lines
  staffLines: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 6,
    height: 24,
    justifyContent: 'space-between',
  },
  staffLine: {
    height: 0.5,
    backgroundColor: 'rgba(180,150,100,0.07)',
  },
});
