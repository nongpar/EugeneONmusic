/**
 * 관리자 — AI 예술 경험 신청서 상세
 *
 * - experiencePlans/{id} 실시간 구독
 * - 연락처 빠른 액션 (전화, SMS, 카카오톡)
 * - 상태 변경 (pending_review → in_progress → completed/rejected)
 * - 내부 메모 추가
 * - 관련 AI 대화 이력 펼쳐보기 (aiConsultations/{consultationId})
 */
import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, Platform, Linking,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  doc, onSnapshot, updateDoc, getDoc, arrayUnion, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../hooks/useAuth';

let Haptics = null;
if (Platform.OS !== 'web') {
  try { Haptics = require('expo-haptics'); } catch {}
}

const STATUS_FLOW = [
  { key: 'pending_review', label: '미검토', color: '#C9A96E' },
  { key: 'in_progress',    label: '처리중', color: '#6EA3C9' },
  { key: 'completed',      label: '완료',   color: '#8FB97A' },
  { key: 'rejected',       label: '반려',   color: '#C98A6E' },
];

const TYPE_LABEL = {
  concert: '공연 감상',
  education: '교육/레슨',
  rental: '행사/대관',
  other: '기타',
};

const CONTACT_METHOD_LABEL = {
  phone: '전화',
  kakao: '카카오톡',
  sms: '문자',
  email: '이메일',
};

function BackIcon({ size = 24, color = '#F5F0E8' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PhoneIcon({ size = 16, color = '#110E0B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MessageIcon({ size = 16, color = '#110E0B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronIcon({ size = 18, color = '#9e9282', open }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function formatDateTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

export default function InquiryDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [showConversation, setShowConversation] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'teacher') {
      router.replace('/');
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!id || !user || user.role !== 'teacher') return;
    const ref = doc(db, 'experiencePlans', String(id));
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setInquiry({ id: snap.id, ...snap.data() });
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [id, user?.uid]);

  // 대화 이력 펼치면 한 번만 로드
  const loadConversation = async () => {
    if (conversation !== null || !inquiry?.consultationId) {
      setShowConversation((v) => !v);
      return;
    }
    try {
      const snap = await getDoc(doc(db, 'aiConsultations', inquiry.consultationId));
      if (snap.exists()) setConversation(snap.data());
      else setConversation({ messages: [] });
    } catch {
      setConversation({ messages: [] });
    } finally {
      setShowConversation(true);
    }
  };

  const updateStatus = async (nextStatus) => {
    if (updatingStatus || !inquiry) return;
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUpdatingStatus(true);
    try {
      await updateDoc(doc(db, 'experiencePlans', inquiry.id), {
        status: nextStatus,
        assignedAdminUid: user.uid,
        statusUpdatedAt: serverTimestamp(),
        statusUpdatedBy: user.displayName || user.uid,
      });
    } catch (err) {
      Alert.alert('상태 변경 실패', err?.message || '잠시 후 다시 시도해주세요.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const addNote = async () => {
    const text = noteText.trim();
    if (!text || savingNote) return;
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSavingNote(true);
    try {
      await updateDoc(doc(db, 'experiencePlans', inquiry.id), {
        notes: arrayUnion({
          text,
          by: user.displayName || user.uid,
          byUid: user.uid,
          createdAt: new Date().toISOString(),
        }),
      });
      setNoteText('');
    } catch (err) {
      Alert.alert('메모 저장 실패', err?.message || '잠시 후 다시 시도해주세요.');
    } finally {
      setSavingNote(false);
    }
  };

  const callContact = (phone) => {
    if (!phone) return;
    const cleaned = String(phone).replace(/[^\d+]/g, '');
    Linking.openURL(`tel:${cleaned}`).catch(() => {});
  };

  const smsContact = (phone) => {
    if (!phone) return;
    const cleaned = String(phone).replace(/[^\d+]/g, '');
    Linking.openURL(`sms:${cleaned}`).catch(() => {});
  };

  if (loading || authLoading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#C9A96E" />
      </View>
    );
  }

  if (notFound) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>신청서</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>신청서를 찾을 수 없습니다</Text>
        </View>
      </View>
    );
  }

  const form = inquiry.form || {};
  const contact = form.contactInfo || {};
  const prefs = form.preferences || {};
  const practical = form.practicalInfo || {};
  const status = inquiry.status || 'pending_review';
  const statusMeta = STATUS_FLOW.find((s) => s.key === status) || STATUS_FLOW[0];
  const typeLabel = TYPE_LABEL[form.type] || '상담';
  const notes = Array.isArray(inquiry.notes) ? inquiry.notes : [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>신청서 상세</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 상태 + 타입 배지 */}
        <View style={styles.topRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{typeLabel}</Text>
          </View>
          <View style={[styles.statusBadge, { borderColor: statusMeta.color }]}>
            <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>
              {statusMeta.label}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <Text style={styles.timeText}>{formatDateTime(inquiry.createdAt)}</Text>
        </View>

        {/* AI 요약 */}
        {!!(inquiry.aiSummary || form.aiSummary) && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>AI 요약</Text>
            <Text style={styles.summaryText}>
              {inquiry.aiSummary || form.aiSummary}
            </Text>
          </View>
        )}

        {/* 연락처 */}
        <Section title="연락처">
          <Row label="이름" value={contact.name} />
          <Row label="전화" value={contact.phone} />
          <Row
            label="선호 연락"
            value={CONTACT_METHOD_LABEL[contact.preferredContact] || contact.preferredContact}
          />
          {(contact.phone) && (
            <View style={styles.contactActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => callContact(contact.phone)}>
                <PhoneIcon />
                <Text style={styles.actionBtnText}>전화</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => smsContact(contact.phone)}>
                <MessageIcon />
                <Text style={styles.actionBtnText}>문자</Text>
              </TouchableOpacity>
            </View>
          )}
        </Section>

        {/* 선호 & 일정 */}
        <Section title="선호 · 일정">
          <Row label="세부 카테고리" value={form.subCategory} />
          <Row label="분위기" value={prefs.mood} />
          <Row
            label="장르"
            value={Array.isArray(prefs.genre) && prefs.genre.length ? prefs.genre.join(', ') : null}
          />
          <Row
            label="피하고 싶은 요소"
            value={Array.isArray(prefs.avoid) && prefs.avoid.length ? prefs.avoid.join(', ') : null}
          />
          <Row label="희망 일정" value={practical.preferredDate} />
          <Row label="시간대" value={practical.timeSlot} />
          <Row label="인원" value={practical.partySize ? `${practical.partySize}명` : null} />
          <Row label="예산" value={practical.budget} />
          <Row label="장소" value={practical.location} />
          <Row label="특별한 계기" value={form.occasion} />
        </Section>

        {/* AI 대화 이력 */}
        {!!inquiry.consultationId && (
          <TouchableOpacity
            style={styles.conversationToggle}
            activeOpacity={0.7}
            onPress={loadConversation}
          >
            <Text style={styles.sectionTitle}>AI 대화 이력</Text>
            <ChevronIcon open={showConversation} />
          </TouchableOpacity>
        )}
        {showConversation && conversation && (
          <View style={styles.conversationBox}>
            {conversation.messages?.length ? conversation.messages.map((m, idx) => {
              // content가 배열(tool_use 포함)이면 text만 추출
              let text = '';
              if (typeof m.content === 'string') text = m.content;
              else if (Array.isArray(m.content)) {
                text = m.content
                  .filter((b) => b.type === 'text')
                  .map((b) => b.text)
                  .join('');
              }
              if (!text) return null;
              return (
                <View
                  key={idx}
                  style={[
                    styles.convoBubble,
                    m.role === 'user' ? styles.convoBubbleUser : styles.convoBubbleAssistant,
                  ]}
                >
                  <Text style={styles.convoRole}>
                    {m.role === 'user' ? '사용자' : '가온'}
                  </Text>
                  <Text style={styles.convoText}>{text}</Text>
                </View>
              );
            }) : (
              <Text style={styles.emptyMini}>대화 내용이 없습니다</Text>
            )}
          </View>
        )}

        {/* 상태 변경 */}
        <Section title="상태 변경">
          <View style={styles.statusFlow}>
            {STATUS_FLOW.map((s) => {
              const active = status === s.key;
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[
                    styles.statusPill,
                    active && { borderColor: s.color, backgroundColor: `${s.color}22` },
                  ]}
                  onPress={() => updateStatus(s.key)}
                  disabled={active || updatingStatus}
                >
                  <Text style={[styles.statusPillText, active && { color: s.color }]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {inquiry.statusUpdatedBy && (
            <Text style={styles.statusMeta}>
              마지막 변경: {inquiry.statusUpdatedBy} · {formatDateTime(inquiry.statusUpdatedAt)}
            </Text>
          )}
        </Section>

        {/* 내부 메모 */}
        <Section title="내부 메모">
          {notes.length > 0 && (
            <View style={styles.notesList}>
              {notes.map((n, i) => (
                <View key={i} style={styles.noteItem}>
                  <Text style={styles.noteText}>{n.text}</Text>
                  <Text style={styles.noteMeta}>
                    {n.by} · {n.createdAt ? formatDateTime(n.createdAt) : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.noteInputRow}>
            <TextInput
              style={styles.noteInput}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="메모 입력..."
              placeholderTextColor="rgba(201,169,110,0.35)"
              multiline
              editable={!savingNote}
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.noteAddBtn, (!noteText.trim() || savingNote) && styles.noteAddBtnDisabled]}
              onPress={addNote}
              disabled={!noteText.trim() || savingNote}
            >
              <Text style={styles.noteAddBtnText}>추가</Text>
            </TouchableOpacity>
          </View>
        </Section>

        <View style={{ height: 20 + insets.bottom }} />
      </ScrollView>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{String(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#110E0B' },
  center: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(201,169,110,0.15)',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '300', color: '#F5F0E8', letterSpacing: 1 },
  scrollContent: { padding: 16, paddingTop: 14, gap: 14 },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2,
    backgroundColor: 'rgba(201,169,110,0.15)',
  },
  typeBadgeText: { fontSize: 10, color: '#C9A96E', letterSpacing: 1, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2, borderWidth: 0.5 },
  statusBadgeText: { fontSize: 10, letterSpacing: 1, fontWeight: '500' },
  timeText: { fontSize: 11, color: '#9e9282' },

  summaryBox: {
    backgroundColor: 'rgba(201,169,110,0.08)',
    borderWidth: 0.5, borderColor: 'rgba(201,169,110,0.3)',
    borderRadius: 4, padding: 14, gap: 6,
  },
  summaryLabel: { fontSize: 10, color: '#C9A96E', letterSpacing: 1.5, fontWeight: '500' },
  summaryText: { fontSize: 14, color: '#F5F0E8', lineHeight: 22 },

  section: { gap: 8 },
  sectionTitle: {
    fontSize: 11, color: '#C9A96E', letterSpacing: 2, fontWeight: '500',
    textTransform: 'uppercase',
  },
  sectionBody: {
    backgroundColor: 'rgba(245,240,225,0.04)',
    borderWidth: 0.5, borderColor: 'rgba(180,150,100,0.15)',
    borderRadius: 4, padding: 14, gap: 10,
  },
  row: { flexDirection: 'row', gap: 10 },
  rowLabel: { fontSize: 12, color: '#9e9282', width: 90 },
  rowValue: { fontSize: 14, color: '#F5F0E8', flex: 1, lineHeight: 20 },

  contactActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#C9A96E', paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 4,
  },
  actionBtnText: { fontSize: 13, color: '#110E0B', fontWeight: '500', letterSpacing: 0.5 },

  conversationToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 4,
  },
  conversationBox: {
    backgroundColor: 'rgba(245,240,225,0.03)',
    borderWidth: 0.5, borderColor: 'rgba(180,150,100,0.12)',
    borderRadius: 4, padding: 12, gap: 10,
  },
  convoBubble: { borderRadius: 4, padding: 10, gap: 4 },
  convoBubbleUser: { backgroundColor: 'rgba(201,169,110,0.12)', alignSelf: 'flex-end', maxWidth: '88%' },
  convoBubbleAssistant: {
    backgroundColor: 'rgba(201,169,110,0.05)',
    borderWidth: 0.5, borderColor: 'rgba(201,169,110,0.15)',
    alignSelf: 'flex-start', maxWidth: '94%',
  },
  convoRole: { fontSize: 10, color: '#9e9282', letterSpacing: 0.5 },
  convoText: { fontSize: 13, color: '#F5F0E8', lineHeight: 19 },
  emptyMini: { fontSize: 13, color: '#9e9282', textAlign: 'center', paddingVertical: 10 },

  statusFlow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusPill: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 4,
    borderWidth: 0.5, borderColor: 'rgba(201,169,110,0.25)',
  },
  statusPillText: { fontSize: 12, color: '#9e9282', letterSpacing: 0.5 },
  statusMeta: { fontSize: 11, color: '#9e9282', marginTop: 2 },

  notesList: { gap: 8, marginBottom: 4 },
  noteItem: {
    backgroundColor: 'rgba(201,169,110,0.05)',
    borderLeftWidth: 2, borderLeftColor: 'rgba(201,169,110,0.35)',
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 2, gap: 3,
  },
  noteText: { fontSize: 13, color: '#F5F0E8', lineHeight: 19 },
  noteMeta: { fontSize: 10, color: '#9e9282' },
  noteInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 },
  noteInput: {
    flex: 1, minHeight: 40, maxHeight: 100,
    backgroundColor: 'rgba(201,169,110,0.06)',
    borderWidth: 0.5, borderColor: 'rgba(201,169,110,0.22)',
    borderRadius: 4, paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 13, color: '#F5F0E8',
  },
  noteAddBtn: {
    backgroundColor: '#C9A96E', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 4,
  },
  noteAddBtnDisabled: { backgroundColor: 'rgba(201,169,110,0.35)' },
  noteAddBtnText: { fontSize: 13, color: '#110E0B', fontWeight: '500', letterSpacing: 0.5 },

  emptyTitle: { fontSize: 15, color: '#9e9282', fontWeight: '300' },
});
