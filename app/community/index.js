import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  collection, query, orderBy, onSnapshot, limit, where, getDocs,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';

// SVG 아이콘
function BackIcon({ size = 24, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function WriteIcon({ size = 24, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function EmptyDocIcon({ size = 48, color = '#9e9282' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={color} strokeWidth={1.5} />
      <Path d="M14 2v6h6M8 13h8M8 17h5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}
function ChatBubbleIcon({ size = 14, color = '#9e9282' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function HeartIcon({ size = 14, color = '#9e9282' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const CATEGORY_COLORS = {
  '자유': '#2C5F8A',
  '질문': '#e67e22',
  '정보': '#2ecc71',
  '후기': '#C9A96E',
};

function PostItem({ item }) {
  const timeAgo = getTimeAgo(item.createdAt?.toDate?.() || new Date());

  return (
    <TouchableOpacity
      style={styles.postCard}
      onPress={() => router.push(`/community/${item.id}`)}
    >
      <View style={styles.postHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLORS[item.category] || '#2C5F8A' }]}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
        <Text style={styles.timeText}>{timeAgo}</Text>
      </View>
      <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.postBody} numberOfLines={2}>{item.body}</Text>
      <View style={styles.postFooter}>
        <Text style={styles.authorText}>{item.authorName || '익명'}</Text>
        <View style={styles.statsRow}>
          <ChatBubbleIcon />
          <Text style={styles.statText}>{item.commentCount || 0}</Text>
          <View style={{ width: 10 }} />
          <HeartIcon />
          <Text style={styles.statText}>{item.likeCount || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function getTimeAgo(date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blockedIds, setBlockedIds] = useState(new Set());

  // 차단 목록 로드 (로그인 사용자가 차단한 사람들의 UID)
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
    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPosts(data);
      setLoading(false);
    }, () => setLoading(false));

    return unsubscribe;
  }, []);

  // 차단 사용자 게시글 제외
  const visiblePosts = posts.filter((p) => !blockedIds.has(p.authorId));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>커뮤니티</Text>
        <TouchableOpacity
          onPress={() => {
            if (!user) {
              router.push('/auth/login');
              return;
            }
            router.push('/community/write');
          }}
        >
          <WriteIcon />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#C9A96E" size="large" />
        </View>
      ) : visiblePosts.length === 0 ? (
        <View style={styles.center}>
          <EmptyDocIcon />
          <Text style={styles.emptyText}>아직 게시글이 없습니다</Text>
          <Text style={styles.emptySubtext}>첫 게시글을 작성해보세요!</Text>
        </View>
      ) : (
        <FlatList
          data={visiblePosts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostItem item={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#110E0B' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '400', color: '#F5F0E8', letterSpacing: 0.5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '400', color: '#C9A96E' },
  emptySubtext: { fontSize: 14, color: '#9e9282' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  postCard: {
    backgroundColor: 'rgba(201,169,110,0.07)', borderRadius: 4, padding: 16,
    marginBottom: 10, gap: 8, borderWidth: 0.5, borderColor: 'rgba(201,169,110,0.15)',
  },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  categoryText: { fontSize: 11, fontWeight: '400', color: '#fff', letterSpacing: 0.5 },
  timeText: { fontSize: 12, color: '#9e9282' },
  postTitle: { fontSize: 16, fontWeight: '400', color: '#F5F0E8', lineHeight: 22, letterSpacing: 0.3 },
  postBody: { fontSize: 13, color: '#9e9282', lineHeight: 20 },
  postFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 4,
  },
  authorText: { fontSize: 12, color: '#9e9282' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: '#9e9282' },
});
