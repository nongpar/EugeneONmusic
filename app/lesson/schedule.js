import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

let Haptics = null;
if (Platform.OS !== 'web') {
  try { Haptics = require('expo-haptics'); } catch {}
}
import { useAuth } from '../../hooks/useAuth';

// ── SVG Icons ──────────────────────────────────────────────

function BackIcon({ size = 24, color = '#F5F0E8' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PlusIcon({ size = 28, color = '#110E0B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CalendarIcon({ size = 18, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ClockIcon({ size = 16, color = '#9e9282' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke={color}
        strokeWidth={1.8}
      />
      <Path d="M12 6v6l4 2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckIcon({ size = 16, color = '#F5F0E8' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function NoteIcon({ size = 48, color = 'rgba(201,169,110,0.3)' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM21 16a3 3 0 11-6 0 3 3 0 016 0z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrashIcon({ size = 18, color = '#e74c3c' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Manuscript Decorations ─────────────────────────────────

function StaffLines() {
  return (
    <View style={styles.staffLines} pointerEvents="none">
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} style={styles.staffLine} />
      ))}
    </View>
  );
}

function MusicalDivider() {
  return (
    <View style={styles.musicalDivider}>
      <View style={styles.mDivLine} />
      <Svg width={18} height={22} viewBox="0 0 18 22" fill="none">
        <Path d="M10 2v15" stroke="rgba(201,169,110,0.25)" strokeWidth={1.2} strokeLinecap="round" />
        <SvgCircle cx="7" cy="17" r="3.5" stroke="rgba(201,169,110,0.25)" strokeWidth={1.2} fill="rgba(201,169,110,0.08)" />
        <Path d="M10 2c2 1 4 3 4 5s-2 3-4 2" stroke="rgba(201,169,110,0.2)" strokeWidth={1} fill="rgba(201,169,110,0.06)" />
      </Svg>
      <View style={styles.mDivLine} />
    </View>
  );
}

function ParchmentCorner({ position = 'topLeft' }) {
  const isTop = position.includes('top');
  const isLeft = position.includes('Left');
  return (
    <View style={[
      styles.parchmentCorner,
      { [isTop ? 'top' : 'bottom']: 0, [isLeft ? 'left' : 'right']: 0 },
      !isTop && { transform: [{ scaleY: -1 }] },
      !isLeft && { transform: [{ scaleX: -1 }] },
      !isTop && !isLeft && { transform: [{ scaleX: -1 }, { scaleY: -1 }] },
    ]} pointerEvents="none">
      <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <Path d="M2 2 C2 2 2 8 8 8 C2 8 2 14 2 14" stroke="rgba(201,169,110,0.2)" strokeWidth={0.8} />
      </Svg>
    </View>
  );
}

// ── Helpers ────────────────────────────────────────────────

function showAlert(title, message) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

function getTodayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getCurrentTime() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

const STATUS_COLORS = {
  scheduled: '#C9A96E',
  completed: '#4ade80',
  cancelled: '#e74c3c',
};

const STATUS_LABELS = {
  scheduled: '예정',
  completed: '완료',
  cancelled: '취소',
};

const DURATION_OPTIONS = [30, 45, 60, 90];

// ── Main Component ─────────────────────────────────────────

export default function LessonScheduleScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [mentorships, setMentorships] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('피아노 레슨');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formDuration, setFormDuration] = useState(60);
  const [formMemo, setFormMemo] = useState('');
  const [formMentorshipId, setFormMentorshipId] = useState('');

  // ── Load mentorships ──────────────────────────────────

  useEffect(() => {
    if (!user?.uid) return;

    let teacherResults = [];
    let studentResults = [];
    let teacherDone = false;
    let studentDone = false;

    const merge = () => {
      if (!teacherDone || !studentDone) return;
      const map = new Map();
      [...teacherResults, ...studentResults].forEach((m) => map.set(m.id, m));
      const merged = Array.from(map.values());
      setMentorships(merged);
      if (merged.length > 0 && !formMentorshipId) {
        setFormMentorshipId(merged[0].id);
      }
      if (merged.length === 0) setLoading(false);
    };

    const teacherQ = query(
      collection(db, 'mentorships'),
      where('teacherId', '==', user.uid),
      where('status', '==', 'active')
    );

    const studentQ = query(
      collection(db, 'mentorships'),
      where('studentId', '==', user.uid),
      where('status', '==', 'active')
    );

    const unsubTeacher = onSnapshot(teacherQ, (snap) => {
      teacherResults = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      teacherDone = true;
      merge();
    });

    const unsubStudent = onSnapshot(studentQ, (snap) => {
      studentResults = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      studentDone = true;
      merge();
    });

    return () => {
      unsubTeacher();
      unsubStudent();
    };
  }, [user?.uid]);

  // ── Load schedules when mentorships change ────────────

  useEffect(() => {
    if (mentorships.length === 0) {
      setSchedules([]);
      setLoading(false);
      return;
    }

    const unsubs = [];
    let allSchedules = new Map();

    mentorships.forEach((m) => {
      const q = query(
        collection(db, 'lessonSchedules'),
        where('mentorshipId', '==', m.id)
      );

      const unsub = onSnapshot(q, (snap) => {
        snap.docs.forEach((d) => {
          allSchedules.set(d.id, { id: d.id, ...d.data() });
        });

        // Remove docs that no longer exist for this mentorship
        const currentIds = new Set(snap.docs.map((d) => d.id));
        for (const [key, val] of allSchedules) {
          if (val.mentorshipId === m.id && !currentIds.has(key)) {
            allSchedules.delete(key);
          }
        }

        const sorted = Array.from(allSchedules.values()).sort((a, b) => {
          const aKey = `${a.date} ${a.time}`;
          const bKey = `${b.date} ${b.time}`;
          return bKey.localeCompare(aKey);
        });

        setSchedules(sorted);
        setLoading(false);
      });

      unsubs.push(unsub);
    });

    return () => unsubs.forEach((u) => u());
  }, [mentorships]);

  // ── Add schedule ──────────────────────────────────────

  const handleAddSchedule = useCallback(async () => {
    if (!formDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      showAlert('입력 오류', '날짜를 YYYY-MM-DD 형식으로 입력해주세요.');
      return;
    }
    if (!formTime.match(/^\d{2}:\d{2}$/)) {
      showAlert('입력 오류', '시간을 HH:MM 형식으로 입력해주세요.');
      return;
    }
    if (!formTitle.trim()) {
      showAlert('입력 오류', '제목을 입력해주세요.');
      return;
    }
    if (!formMentorshipId) {
      showAlert('입력 오류', '멘토십을 선택해주세요.');
      return;
    }

    const mentorship = mentorships.find((m) => m.id === formMentorshipId);
    if (!mentorship) return;

    setSaving(true);
    try {
      await addDoc(collection(db, 'lessonSchedules'), {
        teacherId: mentorship.teacherId,
        studentId: mentorship.studentId,
        mentorshipId: mentorship.id,
        title: formTitle.trim(),
        date: formDate,
        time: formTime,
        duration: formDuration,
        memo: formMemo.trim(),
        status: 'scheduled',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });

      setShowForm(false);
      resetForm();
      showAlert('완료', '레슨 일정이 등록되었습니다.');
    } catch (err) {
      console.error(err);
      showAlert('오류', '일정 등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }, [formDate, formTime, formTitle, formMentorshipId, formDuration, formMemo, mentorships, user?.uid]);

  const resetForm = () => {
    setFormTitle('피아노 레슨');
    setFormDate('');
    setFormTime('');
    setFormDuration(60);
    setFormMemo('');
  };

  // ── Mark completed (teacher only) ─────────────────────

  const handleMarkCompleted = useCallback(
    async (schedule) => {
      const mentorship = mentorships.find((m) => m.id === schedule.mentorshipId);
      if (!mentorship || mentorship.teacherId !== user?.uid) {
        showAlert('권한 없음', '선생님만 완료 처리할 수 있습니다.');
        return;
      }
      if (schedule.status !== 'scheduled') return;

      try {
        await updateDoc(doc(db, 'lessonSchedules', schedule.id), {
          status: 'completed',
        });
      } catch (err) {
        console.error(err);
        showAlert('오류', '상태 변경에 실패했습니다.');
      }
    },
    [mentorships, user?.uid]
  );

  // ── Delete schedule ──────────────────────────────────

  const confirmDelete = (scheduleId) => {
    if (Platform.OS === 'web') {
      if (window.confirm('이 일정을 삭제하시겠습니까?')) {
        deleteDoc(doc(db, 'lessonSchedules', scheduleId)).catch(() => showAlert('오류', '삭제에 실패했습니다.'));
      }
    } else {
      Alert.alert('삭제 확인', '이 일정을 삭제하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: () => deleteDoc(doc(db, 'lessonSchedules', scheduleId)).catch(() => showAlert('오류', '삭제에 실패했습니다.')) },
      ]);
    }
  };

  // ── Group schedules by date ───────────────────────────

  const groupedSchedules = React.useMemo(() => {
    const groups = [];
    const map = new Map();
    schedules.forEach((s) => {
      if (!map.has(s.date)) {
        map.set(s.date, []);
      }
      map.get(s.date).push(s);
    });
    map.forEach((items, date) => {
      groups.push({ date, data: items });
    });
    return groups;
  }, [schedules]);

  // ── Render schedule item ──────────────────────────────

  const renderScheduleItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onLongPress={() => handleMarkCompleted(item)}
    >
      <StaffLines />
      <ParchmentCorner position="topLeft" />
      <ParchmentCorner position="topRight" />
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <CalendarIcon />
          <Text style={styles.cardTitle}>{item.title}</Text>
        </View>
        <View style={styles.cardHeaderRight}>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] || '#555' }]}>
            <Text style={styles.statusText}>{STATUS_LABELS[item.status] || item.status}</Text>
          </View>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(item.id)}>
            <TrashIcon size={16} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardInfoRow}>
          <ClockIcon />
          <Text style={styles.cardInfoText}>
            {item.time} ({item.duration}분)
          </Text>
        </View>
        {item.memo ? <Text style={styles.cardMemo}>{item.memo}</Text> : null}
      </View>

      {item.status === 'scheduled' && (
        <TouchableOpacity style={styles.completeBtn} onPress={() => handleMarkCompleted(item)}>
          <CheckIcon size={14} />
          <Text style={styles.completeBtnText}>완료</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  // ── Render date group ─────────────────────────────────

  const renderGroup = ({ item: group, index }) => (
    <View style={styles.group}>
      {index > 0 && <MusicalDivider />}
      <View style={styles.groupDateWrap}>
        <View style={styles.groupDateLine} />
        <Text style={styles.groupDate}>{group.date}</Text>
        <View style={styles.groupDateLine} />
      </View>
      {group.data.map((schedule) => (
        <View key={schedule.id}>{renderScheduleItem({ item: schedule })}</View>
      ))}
    </View>
  );

  // ── Empty state ───────────────────────────────────────

  const renderEmpty = () => {
    if (loading) return null;
    if (mentorships.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <NoteIcon size={64} color="rgba(201,169,110,0.3)" />
          <Text style={styles.emptyTitle}>멘토십이 없습니다</Text>
          <Text style={styles.emptySubtitle}>채팅 탭에서 멘토를 신청하세요</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <CalendarIcon size={48} color="rgba(201,169,110,0.3)" />
        <Text style={styles.emptyTitle}>등록된 일정이 없습니다</Text>
        <Text style={styles.emptySubtitle}>+ 버튼을 눌러 레슨 일정을 추가하세요</Text>
      </View>
    );
  };

  // ── Add form overlay ──────────────────────────────────

  const renderForm = () => {
    if (!showForm) return null;
    return (
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.formWrapper}
        >
          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formScrollContent}>
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>새 레슨 일정</Text>

              {/* Mentorship selector */}
              {mentorships.length > 1 && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>멘토십</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {mentorships.map((m) => (
                      <TouchableOpacity
                        key={m.id}
                        style={[
                          styles.chip,
                          formMentorshipId === m.id && styles.chipActive,
                        ]}
                        onPress={() => { if (Haptics) Haptics.selectionAsync(); setFormMentorshipId(m.id); }}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            formMentorshipId === m.id && styles.chipTextActive,
                          ]}
                        >
                          {m.teacherName || m.teacherId?.slice(0, 6)} / {m.studentName || m.studentId?.slice(0, 6)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Title */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>제목</Text>
                <TextInput
                  style={styles.input}
                  value={formTitle}
                  onChangeText={setFormTitle}
                  placeholder="피아노 레슨"
                  placeholderTextColor="#9e9282"
                />
              </View>

              {/* Date */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>날짜</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={formDate}
                    onChangeText={setFormDate}
                    onFocus={() => { if (!formDate) setFormDate(getTodayString()); }}
                    placeholder="2026-04-10"
                    placeholderTextColor="#9e9282"
                    keyboardType="default"
                    maxLength={10}
                  />
                  <TouchableOpacity style={styles.quickChip} onPress={() => setFormDate(getTodayString())}>
                    <Text style={styles.quickChipText}>오늘</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Time */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>시간</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={formTime}
                    onChangeText={setFormTime}
                    onFocus={() => { if (!formTime) setFormTime(getCurrentTime()); }}
                    placeholder="14:00"
                    placeholderTextColor="#9e9282"
                    keyboardType="default"
                    maxLength={5}
                  />
                  <TouchableOpacity style={styles.quickChip} onPress={() => setFormTime(getCurrentTime())}>
                    <Text style={styles.quickChipText}>현재</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Duration chips */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>수업 시간</Text>
                <View style={styles.chipRow}>
                  {DURATION_OPTIONS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.chip, formDuration === d && styles.chipActive]}
                      onPress={() => setFormDuration(d)}
                    >
                      <Text style={[styles.chipText, formDuration === d && styles.chipTextActive]}>
                        {d}분
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Memo */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>메모 (선택)</Text>
                <TextInput
                  style={[styles.input, styles.memoInput]}
                  value={formMemo}
                  onChangeText={setFormMemo}
                  placeholder="메모를 입력하세요"
                  placeholderTextColor="#9e9282"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Buttons */}
              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.cancelBtnText}>취소</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
                  onPress={handleAddSchedule}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#110E0B" />
                  ) : (
                    <Text style={styles.submitBtnText}>등록</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  };

  // ── Main render ───────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>레슨 일정</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      ) : (
        <FlatList
          data={groupedSchedules}
          keyExtractor={(item) => item.date}
          renderItem={renderGroup}
          contentContainerStyle={[
            styles.listContent,
            groupedSchedules.length === 0 && styles.listEmpty,
          ]}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      {mentorships.length > 0 && !showForm && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 24 }]}
          activeOpacity={0.8}
          onPress={() => setShowForm(true)}
        >
          <PlusIcon />
        </TouchableOpacity>
      )}

      {/* Form overlay */}
      {renderForm()}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#110E0B',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(201,169,110,0.15)',
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
    color: '#F5F0E8',
    letterSpacing: 1,
  },
  headerRight: {
    width: 40,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },
  listEmpty: {
    flexGrow: 1,
  },

  // Group
  group: {
    marginBottom: 20,
  },
  groupDateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  groupDateLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: 'rgba(201,169,110,0.15)',
  },
  groupDate: {
    fontSize: 13,
    fontWeight: '400',
    color: '#C9A96E',
    letterSpacing: 1.5,
    fontStyle: 'italic',
  },

  // Manuscript decorations
  staffLines: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 10,
    height: 28,
    justifyContent: 'space-between',
  },
  staffLine: {
    height: 0.5,
    backgroundColor: 'rgba(180,150,100,0.1)',
  },
  parchmentCorner: {
    position: 'absolute',
    zIndex: 1,
  },
  musicalDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 10,
  },
  mDivLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: 'rgba(201,169,110,0.12)',
  },

  // Card
  card: {
    backgroundColor: 'rgba(245,240,225,0.05)',
    borderRadius: 4,
    padding: 16,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(180,150,100,0.2)',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(201,169,110,0.25)',
    position: 'relative',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#F5F0E8',
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#F5F0E8',
    letterSpacing: 0.5,
  },
  cardBody: {
    gap: 6,
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardInfoText: {
    fontSize: 14,
    color: '#9e9282',
  },
  cardMemo: {
    fontSize: 13,
    color: '#9e9282',
    marginTop: 4,
    paddingLeft: 2,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderRadius: 4,
    gap: 4,
  },
  completeBtnText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#4ade80',
  },

  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '300',
    color: '#9e9282',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9e9282',
    textAlign: 'center',
    lineHeight: 20,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#C9A96E',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#C9A96E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },

  // Overlay / Form
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  formWrapper: {
    maxHeight: '90%',
  },
  formScroll: {
    maxHeight: '100%',
  },
  formScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  formContainer: {
    backgroundColor: '#1a1613',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: 'rgba(201,169,110,0.18)',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '300',
    color: '#F5F0E8',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 1,
  },

  // Fields
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: '#9e9282',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    backgroundColor: '#110E0B',
    borderWidth: 1,
    borderColor: 'rgba(201,169,110,0.18)',
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#F5F0E8',
  },
  memoInput: {
    height: 80,
    paddingTop: 12,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 4,
    backgroundColor: 'rgba(201, 169, 110, 0.15)',
    borderWidth: 1,
    borderColor: '#C9A96E',
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#C9A96E',
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: '#110E0B',
    borderWidth: 1,
    borderColor: 'rgba(201,169,110,0.18)',
    marginRight: 4,
  },
  chipActive: {
    backgroundColor: 'rgba(201, 169, 110, 0.15)',
    borderColor: '#C9A96E',
  },
  chipText: {
    fontSize: 14,
    color: '#9e9282',
    fontWeight: '400',
  },
  chipTextActive: {
    color: '#C9A96E',
  },

  // Form buttons
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(201,169,110,0.18)',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#9e9282',
  },
  submitBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 4,
    backgroundColor: '#C9A96E',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#110E0B',
  },
});
