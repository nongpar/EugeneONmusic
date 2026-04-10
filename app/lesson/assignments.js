import React, { useState, useEffect } from 'react';
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
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
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

function CheckIcon({ size = 16, color = '#F5F0E8' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ClipboardIcon({ size = 48, color = 'rgba(201,169,110,0.3)' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 2H9a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9 12h6M9 16h4" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function TrashIcon({ size = 16, color = '#e74c3c' }) {
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

function getNextWeekString() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function isOverdue(dueDate, status) {
  if (status !== 'pending') return false;
  if (!dueDate) return false;
  return dueDate < getTodayString();
}

// ── Main Component ─────────────────────────────────────────

export default function AssignmentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [mentorships, setMentorships] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
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

  // ── Load assignments by mentorshipIds ─────────────────

  useEffect(() => {
    if (mentorships.length === 0) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    const mentorshipIds = mentorships.map((m) => m.id);

    // Firestore 'in' query supports up to 30 items
    const chunks = [];
    for (let i = 0; i < mentorshipIds.length; i += 30) {
      chunks.push(mentorshipIds.slice(i, i + 30));
    }

    const unsubs = [];
    let allResults = {};

    chunks.forEach((chunk, chunkIdx) => {
      const q = query(
        collection(db, 'assignments'),
        where('mentorshipId', 'in', chunk)
      );

      const unsub = onSnapshot(q, (snap) => {
        allResults[chunkIdx] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Merge all chunks
        const merged = Object.values(allResults).flat();

        // Sort: pending first (by dueDate asc), then completed (by completedAt desc)
        merged.sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;

          if (a.status === 'pending' && b.status === 'pending') {
            return (a.dueDate || '').localeCompare(b.dueDate || '');
          }

          // Both completed: sort by completedAt desc
          const aTime = a.completedAt?.toMillis?.() || a.completedAt?.seconds * 1000 || 0;
          const bTime = b.completedAt?.toMillis?.() || b.completedAt?.seconds * 1000 || 0;
          return bTime - aTime;
        });

        setAssignments(merged);
        setLoading(false);
      });

      unsubs.push(unsub);
    });

    return () => unsubs.forEach((u) => u());
  }, [mentorships]);

  // ── Toggle assignment status ──────────────────────────

  const toggleStatus = async (assignment) => {
    try {
      const ref = doc(db, 'assignments', assignment.id);
      if (assignment.status === 'pending') {
        await updateDoc(ref, {
          status: 'completed',
          completedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(ref, {
          status: 'pending',
          completedAt: null,
        });
      }
    } catch (err) {
      showAlert('오류', '상태 변경에 실패했습니다.');
    }
  };

  // ── Delete assignment ─────────────────────────────────

  const confirmDelete = (assignmentId) => {
    if (Platform.OS === 'web') {
      if (window.confirm('이 과제를 삭제하시겠습니까?')) {
        deleteDoc(doc(db, 'assignments', assignmentId)).catch(() => showAlert('오류', '삭제에 실패했습니다.'));
      }
    } else {
      Alert.alert('삭제 확인', '이 과제를 삭제하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: () => deleteDoc(doc(db, 'assignments', assignmentId)).catch(() => showAlert('오류', '삭제에 실패했습니다.')) },
      ]);
    }
  };

  // ── Save new assignment ───────────────────────────────

  const handleSave = async () => {
    const trimmedTitle = formTitle.trim();
    if (!trimmedTitle) {
      showAlert('입력 오류', '과제 제목을 입력해주세요.');
      return;
    }
    if (!formDueDate.trim()) {
      showAlert('입력 오류', '마감일을 입력해주세요. (YYYY-MM-DD)');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(formDueDate.trim())) {
      showAlert('입력 오류', '마감일 형식이 올바르지 않습니다. (YYYY-MM-DD)');
      return;
    }
    if (!formMentorshipId) {
      showAlert('오류', '멘토십이 없습니다.');
      return;
    }

    const mentorship = mentorships.find((m) => m.id === formMentorshipId);
    if (!mentorship) {
      showAlert('오류', '멘토십 정보를 찾을 수 없습니다.');
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, 'assignments'), {
        teacherId: mentorship.teacherId,
        studentId: mentorship.studentId,
        mentorshipId: formMentorshipId,
        title: trimmedTitle,
        description: formDescription.trim(),
        dueDate: formDueDate.trim(),
        status: 'pending',
        completedAt: null,
        createdBy: user.uid,
        createdByName: user.displayName || '',
        createdAt: serverTimestamp(),
      });

      setFormTitle('');
      setFormDescription('');
      setFormDueDate('');
      setShowForm(false);
    } catch (err) {
      showAlert('저장 실패', '과제를 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // ── Section data ──────────────────────────────────────

  const pendingItems = assignments.filter((a) => a.status === 'pending');
  const completedItems = assignments.filter((a) => a.status === 'completed');

  const sections = [];
  if (pendingItems.length > 0) {
    sections.push({ type: 'section-header', key: 'header-pending', title: '진행 중', count: pendingItems.length });
    pendingItems.forEach((item) => sections.push({ type: 'item', key: item.id, data: item }));
  }
  if (completedItems.length > 0) {
    sections.push({ type: 'section-header', key: 'header-completed', title: '완료', count: completedItems.length });
    completedItems.forEach((item) => sections.push({ type: 'item', key: item.id, data: item }));
  }

  // ── Render helpers ────────────────────────────────────

  const renderSectionHeader = (title, count) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBadge}>
        <Text style={styles.sectionBadgeText}>{count}</Text>
      </View>
    </View>
  );

  const renderCheckbox = (isCompleted) => {
    if (isCompleted) {
      return (
        <View style={styles.checkboxCompleted}>
          <CheckIcon size={14} color="#fff" />
        </View>
      );
    }
    return <View style={styles.checkboxPending} />;
  };

  const renderAssignmentCard = (item) => {
    const isCompleted = item.status === 'completed';
    const overdue = isOverdue(item.dueDate, item.status);

    return (
      <View style={[styles.card, isCompleted && styles.cardCompleted]}>
        <StaffLines />
        <ParchmentCorner position="topLeft" />
        <ParchmentCorner position="topRight" />
        <TouchableOpacity
          style={styles.checkboxTouchable}
          onPress={() => toggleStatus(item)}
          activeOpacity={0.6}
        >
          {renderCheckbox(isCompleted)}
        </TouchableOpacity>

        <View style={styles.cardContent}>
          <Text
            style={[styles.cardTitle, isCompleted && styles.cardTitleCompleted]}
            numberOfLines={1}
          >
            {item.title}
          </Text>

          {item.description ? (
            <Text
              style={[styles.cardDescription, isCompleted && styles.cardTextCompleted]}
              numberOfLines={1}
            >
              {item.description}
            </Text>
          ) : null}

          <Text style={[styles.cardDueDate, overdue && styles.cardDueDateOverdue, isCompleted && styles.cardTextCompleted]}>
            마감: {item.dueDate}
            {overdue ? '  (기한 초과)' : ''}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => confirmDelete(item.id)}
          activeOpacity={0.6}
        >
          <TrashIcon size={16} color="#e74c3c" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    if (item.type === 'section-header') {
      return renderSectionHeader(item.title, item.count);
    }
    return renderAssignmentCard(item.data);
  };

  // ── Inline Form ───────────────────────────────────────

  const renderForm = () => {
    if (!showForm) return null;

    return (
      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>새 과제 추가</Text>

        {mentorships.length > 1 && (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>멘토십</Text>
            <View style={styles.chipRow}>
              {mentorships.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.chip, formMentorshipId === m.id && styles.chipActive]}
                  onPress={() => setFormMentorshipId(m.id)}
                >
                  <Text style={[styles.chipText, formMentorshipId === m.id && styles.chipTextActive]}>
                    {m.teacherName || m.studentName || m.id}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>과제 제목 *</Text>
          <TextInput
            style={styles.input}
            value={formTitle}
            onChangeText={setFormTitle}
            placeholder="예: 쇼팽 발라드 1번 - 1~30마디 연습"
            placeholderTextColor="#9e9282"
            returnKeyType="next"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>설명 (선택)</Text>
          <TextInput
            style={[styles.input, styles.descriptionInput]}
            value={formDescription}
            onChangeText={setFormDescription}
            placeholder="세부 내용을 입력하세요"
            placeholderTextColor="#9e9282"
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>마감일 *</Text>
          <View style={styles.dateRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={formDueDate}
              onChangeText={setFormDueDate}
              onFocus={() => { if (!formDueDate) setFormDueDate(getNextWeekString()); }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9e9282"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            <TouchableOpacity style={styles.quickBtn} onPress={() => setFormDueDate(getTodayString())}>
              <Text style={styles.quickBtnText}>오늘</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={() => setFormDueDate(getNextWeekString())}>
              <Text style={styles.quickBtnText}>+1주</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formButtons}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              setShowForm(false);
              setFormTitle('');
              setFormDescription('');
              setFormDueDate('');
            }}
          >
            <Text style={styles.cancelBtnText}>취소</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#110E0B" />
            ) : (
              <Text style={styles.submitBtnText}>저장</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Empty states ──────────────────────────────────────

  const renderEmpty = () => {
    if (loading) return null;

    if (mentorships.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <ClipboardIcon size={48} color="rgba(201,169,110,0.3)" />
          <Text style={styles.emptyTitle}>멘토십이 없습니다</Text>
          <Text style={styles.emptySubtitle}>
            선생님 또는 학생과 멘토십을 연결하면{'\n'}과제를 관리할 수 있습니다.
          </Text>
        </View>
      );
    }

    if (assignments.length === 0 && !showForm) {
      return (
        <View style={styles.emptyContainer}>
          <ClipboardIcon size={48} color="rgba(201,169,110,0.3)" />
          <Text style={styles.emptyTitle}>등록된 과제가 없습니다</Text>
          <Text style={styles.emptySubtitle}>
            우측 하단의 + 버튼을 눌러{'\n'}새 과제를 추가해보세요.
          </Text>
        </View>
      );
    }

    return null;
  };

  // ── Main render ───────────────────────────────────────

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>로그인이 필요합니다</Text>
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>연습 과제</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      ) : (
        <>
          <FlatList
            data={sections}
            keyExtractor={(item) => item.key}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={renderForm}
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
          />

          {/* FAB */}
          {mentorships.length > 0 && !showForm && (
            <TouchableOpacity
              style={[styles.fab, { bottom: insets.bottom + 24 }]}
              onPress={() => setShowForm(true)}
              activeOpacity={0.8}
            >
              <PlusIcon size={28} color="#110E0B" />
            </TouchableOpacity>
          )}
        </>
      )}
    </KeyboardAvoidingView>
  );
}

// ── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#110E0B',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#C9A96E',
    letterSpacing: 1.5,
    fontStyle: 'italic',
  },
  sectionBadge: {
    marginLeft: 8,
    backgroundColor: 'rgba(201,169,110,0.1)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#9e9282',
  },

  // Manuscript decorations
  staffLines: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 8,
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

  // Assignment card
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245,240,225,0.05)',
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(180,150,100,0.2)',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(201,169,110,0.25)',
    padding: 14,
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  cardCompleted: {
    opacity: 0.5,
  },
  checkboxTouchable: {
    paddingRight: 12,
    paddingTop: 2,
  },
  checkboxPending: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(201,169,110,0.25)',
  },
  checkboxCompleted: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4ade80',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#F5F0E8',
    marginBottom: 4,
  },
  cardTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9e9282',
  },
  cardDescription: {
    fontSize: 13,
    color: '#9e9282',
    marginBottom: 4,
  },
  cardTextCompleted: {
    color: '#9e9282',
  },
  cardDueDate: {
    fontSize: 12,
    color: '#9e9282',
    marginTop: 2,
  },
  cardDueDateOverdue: {
    color: '#e74c3c',
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 4,
    alignSelf: 'flex-start',
    opacity: 0.6,
  },

  // Form
  formContainer: {
    backgroundColor: 'rgba(201,169,110,0.07)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(201,169,110,0.18)',
    padding: 18,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '300',
    color: '#C9A96E',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
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
  descriptionInput: {
    height: 80,
    paddingTop: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#C9A96E',
    backgroundColor: 'rgba(201,169,110,0.1)',
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#C9A96E',
  },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },

  // Empty states
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '300',
    color: '#9e9282',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9e9282',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
