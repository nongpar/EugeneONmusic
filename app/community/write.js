import { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';

// SVG 아이콘
function CloseIcon({ size = 24, color = '#8a9bae' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const CATEGORIES = ['자유', '질문', '정보', '후기'];

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function WriteScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('자유');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      showAlert('알림', '제목을 입력해주세요.');
      return;
    }
    if (!body.trim()) {
      showAlert('알림', '내용을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'posts'), {
        title: title.trim(),
        body: body.trim(),
        category,
        authorId: user.uid,
        authorName: user.displayName || user.email?.split('@')[0] || '익명',
        commentCount: 0,
        likeCount: 0,
        createdAt: serverTimestamp(),
      });
      router.back();
    } catch {
      showAlert('오류', '게시글 작성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <CloseIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>글쓰기</Text>
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.disabledBtn]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitText}>{loading ? '등록 중...' : '등록'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.titleInput}
          placeholder="제목을 입력하세요"
          placeholderTextColor="#4a5a6a"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        <TextInput
          style={styles.bodyInput}
          placeholder="내용을 입력하세요"
          placeholderTextColor="#4a5a6a"
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1923' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a2530',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  submitBtn: {
    backgroundColor: '#2C5F8A', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
  },
  disabledBtn: { opacity: 0.5 },
  submitText: { fontSize: 14, fontWeight: 'bold', color: '#ffffff' },
  form: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  categoryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#1a2530', borderWidth: 1, borderColor: '#2a3a4a',
  },
  categoryChipActive: { backgroundColor: '#2C5F8A', borderColor: '#2C5F8A' },
  categoryChipText: { fontSize: 13, color: '#6b7b8d' },
  categoryChipTextActive: { color: '#ffffff', fontWeight: '600' },
  titleInput: {
    fontSize: 18, fontWeight: '600', color: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#1a2530', paddingBottom: 12, marginBottom: 16,
  },
  bodyInput: {
    fontSize: 15, color: '#ffffff', lineHeight: 24, minHeight: 200,
  },
});
