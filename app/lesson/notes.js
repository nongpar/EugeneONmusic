import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
  ActivityIndicator, Platform,
} from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  collection, query, where, onSnapshot, deleteDoc, doc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';

// ── SVG 아이콘 ──
function BackIcon({ size = 22, color = '#9e9282' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function NoteIcon({ size = 20, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PlusIcon({ size = 24, color = '#110E0B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

function CalendarIcon({ size = 14, color = '#9e9282' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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

// ── Manuscript Decorations ──
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

// ── 노트 카드 ──
function NoteCard({ note, user, confirmDelete }) {
  const badgeColor = note.authorRole === 'teacher' ? '#C9A96E' : '#9e9282';
  const roleLabel = note.authorRole === 'teacher' ? '선생님' : '학생';
  const isAuthor = user && note.authorId === user.uid;

  return (
    <View style={styles.noteCard}>
      <StaffLines />
      <ParchmentCorner position="topLeft" />
      <ParchmentCorner position="topRight" />
      <View style={styles.noteHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.noteTitle} numberOfLines={1}>{note.title}</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: badgeColor + '22', borderColor: badgeColor }]}>
          <Text style={[styles.roleBadgeText, { color: badgeColor }]}>{roleLabel}</Text>
        </View>
        {isAuthor && (
          <TouchableOpacity onPress={() => confirmDelete(note.id)} style={styles.deleteBtn}>
            <TrashIcon />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.noteMeta}>
        <Text style={styles.noteAuthor}>{note.authorName}</Text>
        <View style={styles.metaDot} />
        <CalendarIcon />
        <Text style={styles.noteDate}>{note.lessonDate || '-'}</Text>
      </View>

      <Text style={styles.notePreview} numberOfLines={2}>
        {note.content}
      </Text>
    </View>
  );
}

// ── 메인 화면 ──
export default function LessonNotesScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [mentorships, setMentorships] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const confirmDelete = (noteId) => {
    if (Platform.OS === 'web') {
      if (window.confirm('이 노트를 삭제하시겠습니까?')) {
        deleteDoc(doc(db, 'lessonNotes', noteId)).catch(() => {});
      }
    } else {
      Alert.alert('삭제 확인', '이 노트를 삭제하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: () => deleteDoc(doc(db, 'lessonNotes', noteId)).catch(() => {}) },
      ]);
    }
  };

  // 활성 멘토십 조회 (teacher + student 역할 모두)
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
      console.error('[LessonNotes] teacher query error:', err.message || err);
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
      console.error('[LessonNotes] student query error:', err.message || err);
      studentDone = true;
      merge();
    });

    return () => {
      unsubTeacher();
      unsubStudent();
    };
  }, [user]);

  // 멘토십별 레슨 노트 조회
  useEffect(() => {
    if (mentorships.length === 0) {
      setNotes([]);
      return;
    }

    const mentorshipIds = mentorships.map((m) => m.id);
    const unsubs = [];

    let allNotes = {};

    mentorshipIds.forEach((mId) => {
      const notesQ = query(
        collection(db, 'lessonNotes'),
        where('mentorshipId', '==', mId)
      );
      const unsub = onSnapshot(notesQ, (snap) => {
        allNotes[mId] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // 모든 mentorshipId의 노트를 합치고 createdAt desc 정렬
        const merged = Object.values(allNotes).flat();
        merged.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() || 0;
          const tb = b.createdAt?.toMillis?.() || 0;
          return tb - ta;
        });
        setNotes(merged);
      }, (err) => {
        console.error('[LessonNotes] notes query error:', err.message || err);
      });
      unsubs.push(unsub);
    });

    return () => unsubs.forEach((u) => u());
  }, [mentorships]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>레슨 노트</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      </View>
    );
  }

  // 멘토십이 없는 경우
  if (mentorships.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>레슨 노트</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.center}>
          <NoteIcon size={48} color="rgba(201,169,110,0.3)" />
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
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>레슨 노트</Text>
        <View style={styles.headerBtn} />
      </View>

      {/* 노트 목록 */}
      {notes.length === 0 ? (
        <View style={styles.center}>
          <NoteIcon size={48} color="rgba(201,169,110,0.3)" />
          <Text style={styles.emptyText}>
            아직 레슨 노트가 없습니다.{'\n'}첫 노트를 작성해보세요!
          </Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NoteCard note={item} user={user} confirmDelete={confirmDelete} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB 버튼 */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => router.push('/lesson/note-write')}
        activeOpacity={0.8}
      >
        <PlusIcon />
      </TouchableOpacity>
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
    marginTop: 16,
    lineHeight: 22,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  noteCard: {
    backgroundColor: 'rgba(245,240,225,0.05)',
    borderRadius: 4,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(180,150,100,0.2)',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(201,169,110,0.25)',
    position: 'relative',
    overflow: 'hidden',
  },
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
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#F5F0E8',
    marginRight: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  deleteBtn: {
    marginLeft: 8,
    padding: 4,
  },
  noteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  noteAuthor: {
    fontSize: 13,
    color: '#9e9282',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(201,169,110,0.25)',
    marginHorizontal: 8,
  },
  noteDate: {
    fontSize: 13,
    color: '#9e9282',
    marginLeft: 4,
  },
  notePreview: {
    fontSize: 14,
    color: '#9e9282',
    lineHeight: 20,
  },
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
});
