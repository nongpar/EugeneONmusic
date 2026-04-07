import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';

// SVG 아이콘
function BackIcon({ size = 24, color = '#8a9bae' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function SendIcon({ size = 18, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function getTimeAgo(date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

function CommentItem({ item }) {
  const time = getTimeAgo(item.createdAt?.toDate?.() || new Date());
  return (
    <View style={styles.commentCard}>
      <View style={styles.commentHeader}>
        <View style={styles.commentAvatar}>
          <Text style={styles.commentAvatarText}>
            {(item.authorName || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.commentAuthor}>{item.authorName || '익명'}</Text>
        <Text style={styles.commentTime}>{time}</Text>
      </View>
      <Text style={styles.commentBody}>{item.body}</Text>
    </View>
  );
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      const snap = await getDoc(doc(db, 'posts', id));
      if (snap.exists()) setPost({ id: snap.id, ...snap.data() });
      setLoading(false);
    };
    fetchPost();
  }, [id]);

  useEffect(() => {
    const q = query(
      collection(db, 'posts', id, 'comments'),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [id]);

  const handleSendComment = async () => {
    if (!commentText.trim() || !user) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'posts', id, 'comments'), {
        body: commentText.trim(),
        authorId: user.uid,
        authorName: user.displayName || user.email?.split('@')[0] || '익명',
        createdAt: serverTimestamp(),
      });
      setCommentText('');
    } catch { /* ignore */ }
    setSending(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#C9A96E" size="large" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.emptyText}>게시글을 찾을 수 없습니다</Text>
      </View>
    );
  }

  const postTime = getTimeAgo(post.createdAt?.toDate?.() || new Date());

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>게시글</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={() => (
          <View style={styles.postSection}>
            <Text style={styles.postTitle}>{post.title}</Text>
            <View style={styles.postMeta}>
              <Text style={styles.postAuthor}>{post.authorName || '익명'}</Text>
              <Text style={styles.postTime}>{postTime}</Text>
            </View>
            <Text style={styles.postBody}>{post.body}</Text>
            <View style={styles.divider} />
            <Text style={styles.commentTitle}>댓글 {comments.length}</Text>
          </View>
        )}
        renderItem={({ item }) => <CommentItem item={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {user && (
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TextInput
            style={styles.commentInput}
            placeholder="댓글을 입력하세요"
            placeholderTextColor="#4a5a6a"
            value={commentText}
            onChangeText={setCommentText}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!commentText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSendComment}
            disabled={!commentText.trim() || sending}
          >
            <SendIcon />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1923' },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  emptyText: { fontSize: 16, color: '#6b7b8d' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  postSection: { marginBottom: 8 },
  postTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', lineHeight: 28, marginBottom: 8 },
  postMeta: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  postAuthor: { fontSize: 13, color: '#8a9bae', fontWeight: '600' },
  postTime: { fontSize: 13, color: '#5a6a7a' },
  postBody: { fontSize: 15, color: '#c0cdd8', lineHeight: 24 },
  divider: { height: 1, backgroundColor: '#1a2530', marginVertical: 20 },
  commentTitle: { fontSize: 15, fontWeight: 'bold', color: '#ffffff', marginBottom: 12 },
  commentCard: {
    backgroundColor: '#1a2530', borderRadius: 10, padding: 12, marginBottom: 8, gap: 6,
  },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#2C5F8A',
    alignItems: 'center', justifyContent: 'center',
  },
  commentAvatarText: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  commentAuthor: { fontSize: 13, fontWeight: '600', color: '#8a9bae' },
  commentTime: { fontSize: 11, color: '#5a6a7a' },
  commentBody: { fontSize: 14, color: '#c0cdd8', lineHeight: 20, paddingLeft: 36 },
  inputBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8,
    backgroundColor: '#1a2530', borderTopWidth: 1, borderTopColor: '#2a3a4a', gap: 8,
  },
  commentInput: {
    flex: 1, backgroundColor: '#0f1923', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#ffffff',
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#2C5F8A',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
