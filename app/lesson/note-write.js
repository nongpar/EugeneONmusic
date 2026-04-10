import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert,
  ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  collection, query, where, onSnapshot, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';

// ── SVG 아이콘 ──
function CloseIcon({ size = 22, color = '#9e9282' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── 메인 화면 ──
export default function NoteWriteScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [mentorships, setMentorships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [lessonDate, setLessonDate] = useState('');
  const [content, setContent] = useState('');

  // 활성 멘토십 조회
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let teacherList = [];
    let studentList = [];
    let teacherDone = false;
    let studentDone = false;

    const merge = () => {
      if (teacherDone && studentDone) {
        const map = new Map();
        [...teacherList, ...studentList].forEach((m) => map.set(m.id, m));
        setMentorships(Array.from(map.values()));
        setLoading(false);
      }
    };

    const teacherQ = query(
      collection(db, 'mentorships'),
      where('teacherId', '==', user.uid),
      where('status', '==', 'active')
    );
    const unsubTeacher = onSnapshot(teacherQ, (snap) => {
      teacherList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      teacherDone = true;
      merge();
    }, (err) => {
      console.error('[NoteWrite] teacher query error:', err.message || err);
      teacherDone = true;
      merge();
    });

    const studentQ = query(
      collection(db, 'mentorships'),
      where('studentId', '==', user.uid),
      where('status', '==', 'active')
    );
    const unsubStudent = onSnapshot(studentQ, (snap) => {
      studentList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      studentDone = true;
      merge();
    }, (err) => {
      console.error('[NoteWrite] student query error:', err.message || err);
      studentDone = true;
      merge();
    });

    return () => {
      unsubTeacher();
      unsubStudent();
    };
  }, [user]);

  const showAlert = (titleMsg, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${titleMsg}\n\n${message}`);
    } else {
      Alert.alert(titleMsg, message);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showAlert('입력 오류', '제목을 입력해주세요.');
      return;
    }
    if (!content.trim()) {
      showAlert('입력 오류', '내용을 입력해주세요.');
      return;
    }
    if (mentorships.length === 0) {
      showAlert('오류', '활성 멘토십이 없습니다.');
      return;
    }

    const mentorship = mentorships[0];
    const isTeacher = mentorship.teacherId === user.uid;

    setSaving(true);
    try {
      await addDoc(collection(db, 'lessonNotes'), {
        teacherId: mentorship.teacherId,
        studentId: mentorship.studentId,
        mentorshipId: mentorship.id,
        title: title.trim(),
        content: content.trim(),
        authorId: user.uid,
        authorName: user.displayName || user.email,
        authorRole: isTeacher ? 'teacher' : 'student',
        lessonDate: lessonDate.trim() || '',
        createdAt: serverTimestamp(),
      });
      router.back();
    } catch (err) {
      console.error('[NoteWrite] save error:', err.message || err);
      showAlert('저장 실패', '노트를 저장하지 못했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <CloseIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>노트 작성</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      </View>
    );
  }

  if (mentorships.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <CloseIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>노트 작성</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyText}>멘토십이 없습니다</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <CloseIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>노트 작성</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#110E0B" />
          ) : (
            <Text style={styles.saveBtnText}>저장</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 폼 */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.form}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* 제목 */}
          <Text style={styles.label}>제목</Text>
          <TextInput
            style={styles.input}
            placeholder="레슨 노트 제목"
            placeholderTextColor="#9e9282"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          {/* 레슨 날짜 */}
          <Text style={styles.label}>레슨 날짜</Text>
          <View style={styles.dateRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="2026-04-10"
              placeholderTextColor="#9e9282"
              value={lessonDate}
              onChangeText={setLessonDate}
              onFocus={() => { if (!lessonDate) setLessonDate(getTodayString()); }}
              maxLength={10}
            />
            <TouchableOpacity
              style={styles.todayBtn}
              onPress={() => setLessonDate(getTodayString())}
            >
              <Text style={styles.todayBtnText}>오늘</Text>
            </TouchableOpacity>
          </View>

          {/* 내용 */}
          <Text style={styles.label}>내용</Text>
          <TextInput
            style={[styles.input, styles.contentInput]}
            placeholder="레슨 내용, 피드백, 연습 메모 등을 작성하세요"
            placeholderTextColor="#9e9282"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── 스타일 ──
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#110E0B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(201,169,110,0.15)',
  },
  headerBtn: {
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
  saveBtn: {
    backgroundColor: '#C9A96E',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 4,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#110E0B',
    fontSize: 15,
    fontWeight: '400',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#9e9282',
    fontSize: 15,
    textAlign: 'center',
  },
  form: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '400',
    color: '#9e9282',
    marginBottom: 8,
    marginTop: 16,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(201,169,110,0.07)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(201,169,110,0.18)',
    color: '#F5F0E8',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  contentInput: {
    minHeight: 200,
    paddingTop: 14,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayBtn: {
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#C9A96E',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  todayBtnText: {
    color: '#C9A96E',
    fontSize: 14,
    fontWeight: '400',
  },
});
