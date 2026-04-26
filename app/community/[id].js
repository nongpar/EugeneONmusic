import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Modal,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc,
  where, getDocs,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

const showAlert = (title, message, buttons) => {
  if (Platform.OS === 'web') {
    if (buttons) {
      const confirmed = window.confirm(`${title}\n${message}`);
      if (confirmed && buttons[1]?.onPress) buttons[1].onPress();
    } else {
      window.alert(`${title}\n${message}`);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

// SVG 아이콘
function BackIcon({ size = 24, color = '#C9A96E' }) {
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
function MoreIcon({ size = 20, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5" r="1.5" fill={color} />
      <Circle cx="12" cy="12" r="1.5" fill={color} />
      <Circle cx="12" cy="19" r="1.5" fill={color} />
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

function CommentItem({ item, currentUid, onReportComment }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const time = getTimeAgo(item.createdAt?.toDate?.() || new Date());
  const isMine = item.authorId === currentUid;

  const handleLongPress = () => {
    if (isMine) return;
    showAlert(
      '댓글 신고',
      '이 댓글을 부적절한 콘텐츠로 신고하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '신고',
          style: 'destructive',
          onPress: () => {
            if (onReportComment) onReportComment(item);
            showAlert('신고 완료', '신고가 접수되었습니다. 검토 후 조치하겠습니다.');
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onLongPress={handleLongPress}
      delayLongPress={500}
    >
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
    </TouchableOpacity>
  );
}

export default function PostDetailScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [blockedIds, setBlockedIds] = useState(new Set());
  const [isBlockedAuthor, setIsBlockedAuthor] = useState(false);

  // 차단 목록 로드
  useEffect(() => {
    if (!user?.uid) {
      setBlockedIds(new Set());
      return;
    }
    const loadBlocked = async () => {
      try {
        const blockedQ = query(
          collection(db, 'blockedUsers'),
          where('blockerUid', '==', user.uid)
        );
        const snap = await getDocs(blockedQ);
        const ids = new Set(snap.docs.map((d) => d.data().blockedUid));
        setBlockedIds(ids);
      } catch (err) {
        console.warn('차단 목록 로드 실패:', err);
      }
    };
    loadBlocked();
  }, [user?.uid]);

  useEffect(() => {
    const fetchPost = async () => {
      const snap = await getDoc(doc(db, 'posts', id));
      if (snap.exists()) {
        const postData = { id: snap.id, ...snap.data() };
        setPost(postData);
        // 차단한 작성자인지 확인
        if (blockedIds.has(postData.authorId)) {
          setIsBlockedAuthor(true);
        }
      }
      setLoading(false);
    };
    fetchPost();
  }, [id, blockedIds]);

  useEffect(() => {
    const q = query(
      collection(db, 'posts', id, 'comments'),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [id]);

  // 차단된 사용자의 댓글 필터링
  const visibleComments = comments.filter((c) => !blockedIds.has(c.authorId));

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

  // 게시글 신고
  const handleReportPost = () => {
    if (!user || !post) return;
    showAlert(
      '게시글 신고',
      '이 게시글을 부적절한 콘텐츠로 신고하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '신고',
          style: 'destructive',
          onPress: async () => {
            try {
              await addDoc(collection(db, 'reports'), {
                type: 'post',
                postId: post.id,
                postTitle: post.title,
                reportedUserId: post.authorId,
                reportedUserName: post.authorName,
                reporterUserId: user.uid,
                reporterName: user.displayName || user.email,
                createdAt: serverTimestamp(),
                status: 'pending',
              });
              showAlert('신고 완료', '신고가 접수되었습니다. 검토 후 조치하겠습니다.');
            } catch (err) {
              console.warn('신고 저장 실패:', err);
            }
            setShowMoreMenu(false);
          },
        },
      ]
    );
  };

  // 작성자 차단
  const handleBlockUser = () => {
    if (!user || !post) return;
    const authorName = post.authorName || '익명';
    showAlert(
      '사용자 차단',
      `${authorName}님을 차단하시겠습니까?\n차단하면 이 사용자의 게시글과 댓글이 표시되지 않습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '차단',
          style: 'destructive',
          onPress: async () => {
            try {
              await setDoc(doc(db, 'blockedUsers', `${user.uid}_${post.authorId}`), {
                blockerUid: user.uid,
                blockedUid: post.authorId,
                blockedName: authorName,
                createdAt: serverTimestamp(),
              });
              showAlert('차단 완료', '사용자가 차단되었습니다.');
            } catch (err) {
              console.warn('차단 실패:', err);
            }
            setShowMoreMenu(false);
          },
        },
      ]
    );
  };

  // 댓글 신고
  const handleReportComment = async (comment) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'reports'), {
        type: 'comment',
        postId: id,
        commentId: comment.id,
        commentText: comment.body,
        reportedUserId: comment.authorId,
        reportedUserName: comment.authorName,
        reporterUserId: user.uid,
        reporterName: user.displayName || user.email,
        createdAt: serverTimestamp(),
        status: 'pending',
      });
    } catch (err) {
      console.warn('댓글 신고 저장 실패:', err);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.accent} size="large" />
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

  // 차단한 사용자의 게시글이면 접근 차단
  if (isBlockedAuthor) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <BackIcon color={colors.accent} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>게시글</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyText}>차단한 사용자의 게시글입니다</Text>
          <Text style={[styles.emptyText, { fontSize: 13, marginTop: 8, color: colors.textMuted }]}>
            차단을 해제하려면 MY 페이지에서 관리할 수 있습니다
          </Text>
        </View>
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
          <BackIcon color={colors.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>게시글</Text>
        {user && post && post.authorId !== user.uid ? (
          <TouchableOpacity onPress={() => setShowMoreMenu(true)}>
            <MoreIcon color={colors.accent} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {/* 더보기 메뉴 모달 */}
      <Modal visible={showMoreMenu} transparent animationType="fade" onRequestClose={() => setShowMoreMenu(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMoreMenu(false)}>
          <View style={[styles.menuBox, { top: insets.top + 50 }]}>
            <TouchableOpacity style={styles.menuOptionItem} onPress={handleReportPost}>
              <Text style={styles.menuOptionText}>게시글 신고</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuOptionItem} onPress={handleBlockUser}>
              <Text style={[styles.menuOptionText, { color: colors.danger }]}>작성자 차단</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <FlatList
        data={visibleComments}
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
            <Text style={styles.commentTitle}>댓글 {visibleComments.length}</Text>
          </View>
        )}
        renderItem={({ item }) => <CommentItem item={item} currentUid={user?.uid} onReportComment={handleReportComment} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {user && (
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TextInput
            style={styles.commentInput}
            placeholder="댓글을 입력하세요"
            placeholderTextColor={colors.accentMuted}
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

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '400', color: c.text, letterSpacing: 0.5 },
  emptyText: { fontSize: 16, color: c.textMuted },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  postSection: { marginBottom: 8 },
  postTitle: { fontSize: 20, fontWeight: '300', color: c.text, lineHeight: 28, marginBottom: 8, letterSpacing: 0.3 },
  postMeta: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  postAuthor: { fontSize: 13, color: c.accent, fontWeight: '400' },
  postTime: { fontSize: 13, color: c.textMuted },
  postBody: { fontSize: 15, color: '#c0bab0', lineHeight: 24 },
  divider: { height: 0.5, backgroundColor: c.surfaceStrong, marginVertical: 20 },
  commentTitle: { fontSize: 15, fontWeight: '400', color: c.text, marginBottom: 12, letterSpacing: 0.3 },
  commentCard: {
    backgroundColor: c.surface, borderRadius: 4, padding: 12, marginBottom: 8, gap: 6,
  },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: c.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  commentAvatarText: { fontSize: 12, fontWeight: '400', color: c.bg },
  commentAuthor: { fontSize: 13, fontWeight: '400', color: c.accent },
  commentTime: { fontSize: 11, color: c.textMuted },
  commentBody: { fontSize: 14, color: '#c0bab0', lineHeight: 20, paddingLeft: 36 },
  inputBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8,
    backgroundColor: c.surface, borderTopWidth: 0.5, borderTopColor: c.border, gap: 8,
  },
  commentInput: {
    flex: 1, backgroundColor: c.bg, borderRadius: 4,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: c.text,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: c.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },

  /* 더보기 메뉴 */
  menuOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
  },
  menuBox: {
    position: 'absolute', right: 16,
    backgroundColor: '#1a1510', borderRadius: 4,
    paddingVertical: 4, minWidth: 150,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
    borderWidth: 0.5, borderColor: c.border,
  },
  menuOptionItem: {
    paddingHorizontal: 16, paddingVertical: 14,
  },
  menuOptionText: {
    fontSize: 14, fontWeight: '400', color: '#c0bab0', letterSpacing: 0.3,
  },
  menuDivider: {
    height: 0.5, backgroundColor: c.border,
  },
});
