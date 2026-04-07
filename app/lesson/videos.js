import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Platform, Image, RefreshControl,
} from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';

const WP_BASE = 'https://www.eon-music.com/wp-json';
const VIDEO_TAG = 'eon-lesson-video';
const MAX_VIDEO_DURATION = 300;
const MAX_FILE_SIZE = 100 * 1024 * 1024;

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

// ── SVG 아이콘 ──
function BackIcon({ size = 22, color = '#8a9bae' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function UploadIcon({ size = 22, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 8l-5-5-5 5M12 3v12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PlayIcon({ size = 32, color = '#ffffff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.5} fill="rgba(0,0,0,0.5)" />
      <Path d="M10 8l6 4-6 4V8z" fill={color} />
    </Svg>
  );
}

function VideoEmptyIcon({ size = 56, color = '#2a3a4a' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="5" width="15" height="14" rx="2" stroke={color} strokeWidth={1.5} />
      <Path d="M17 9l5-3v12l-5-3V9z" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

function TrashIcon({ size = 16, color = '#e74c3c' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ── 영상 카드 ──
function VideoCard({ item, onDelete, onPlay, canDelete }) {
  const time = new Date(item.date);
  const dateStr = `${time.getFullYear()}.${time.getMonth() + 1}.${time.getDate()}`;
  const title = item.title?.rendered?.replace(/&#8211;/g, '-')?.replace(/&amp;/g, '&') || '레슨 영상';

  return (
    <TouchableOpacity style={styles.videoCard} activeOpacity={0.8} onPress={() => onPlay(item)}>
      <View style={styles.thumbnailWrap}>
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <VideoEmptyIcon size={32} color="#3a4a5a" />
        </View>
        <View style={styles.playOverlay}>
          <PlayIcon />
        </View>
      </View>

      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>{title}</Text>
        <View style={styles.videoMeta}>
          <Text style={styles.videoMetaText}>{dateStr}</Text>
          {item.media_details?.filesize ? (
            <>
              <Text style={styles.videoMetaDot}>·</Text>
              <Text style={styles.videoMetaText}>{formatFileSize(item.media_details.filesize)}</Text>
            </>
          ) : null}
        </View>
      </View>

      {canDelete && (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            onDelete(item);
          }}
        >
          <TrashIcon />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default function LessonVideosScreen() {
  const insets = useSafeAreaInsets();
  const { user, getToken } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // WordPress 미디어에서 영상 목록 가져오기
  const fetchVideos = useCallback(async () => {
    try {
      const res = await fetch(
        `${WP_BASE}/wp/v2/media?search=${VIDEO_TAG}&per_page=50&orderby=date&order=desc&media_type=video`
      );
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter(
          (m) => m.description?.rendered?.includes(VIDEO_TAG) || m.caption?.rendered?.includes(VIDEO_TAG)
        );
        setVideos(filtered);
      }
    } catch (err) {
      console.warn('영상 목록 로드 실패:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVideos();
  }, [fetchVideos]);

  // 영상 업로드 (선생님만)
  const handleUpload = async () => {
    if (!user) return;
    if (!isTeacher) {
      showAlert('권한 없음', '영상 업로드는 선생님만 가능합니다.');
      return;
    }

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAlert('권한 필요', '사진/영상 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.7,
      videoMaxDuration: MAX_VIDEO_DURATION,
    });

    if (result.canceled) return;

    const video = result.assets?.[0];
    if (!video?.uri) return;

    if (video.duration && video.duration > MAX_VIDEO_DURATION * 1000) {
      showAlert('영상 길이 초과', '5분 이내의 영상만 업로드할 수 있습니다.');
      return;
    }

    if (video.fileSize && video.fileSize > MAX_FILE_SIZE) {
      showAlert('파일 크기 초과', '100MB 이하의 영상만 업로드할 수 있습니다.');
      return;
    }

    setUploading(true);
    setUploadProgress(20);

    try {
      const token = getToken();
      if (!token) throw new Error('인증 토큰이 없습니다.');

      const ext = video.uri.split('.').pop() || 'mp4';
      const fileName = `lesson_${Date.now()}.${ext}`;

      const formData = new FormData();
      formData.append('file', { uri: video.uri, name: fileName, type: video.mimeType || 'video/mp4' });
      formData.append('caption', VIDEO_TAG);
      formData.append('description', VIDEO_TAG);

      setUploadProgress(50);

      const uploadRes = await fetch(`${WP_BASE}/wp/v2/media`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        throw new Error(errData.message || `업로드 실패 (${uploadRes.status})`);
      }

      setUploadProgress(100);
      showAlert('업로드 완료', '레슨 영상이 저장되었습니다.');
      fetchVideos();
    } catch (err) {
      console.warn('업로드 오류:', err);
      showAlert('업로드 실패', `${err.message || '영상 업로드 중 오류가 발생했습니다.'}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handlePlay = (item) => {
    if (Platform.OS === 'web') {
      window.open(item.source_url, '_blank');
    } else {
      const { Linking } = require('react-native');
      Linking.openURL(item.source_url);
    }
  };

  const handleDelete = (item) => {
    const title = item.title?.rendered || '영상';
    showAlert(
      '영상 삭제',
      `"${title}" 영상을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = getToken();
              if (token) {
                await fetch(`${WP_BASE}/wp/v2/media/${item.id}?force=true`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` },
                });
                fetchVideos();
              }
            } catch (err) {
              console.warn('삭제 실패:', err);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <BackIcon />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>레슨 영상</Text>
          <Text style={styles.headerSub}>레슨 녹화 · 연습 영상</Text>
        </View>
        {isTeacher ? (
          <TouchableOpacity style={styles.headerBtn} onPress={handleUpload}>
            <UploadIcon />
          </TouchableOpacity>
        ) : <View style={styles.headerBtn} />}
      </View>

      {uploading && (
        <View style={styles.uploadBar}>
          <View style={[styles.uploadProgress, { width: `${uploadProgress}%` }]} />
          <Text style={styles.uploadText}>업로드 중... {uploadProgress}%</Text>
        </View>
      )}

      {isTeacher && (
        <View style={styles.infoBar}>
          <Text style={styles.infoText}>5분 이내 · 100MB 이하 영상만 업로드 가능</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      ) : videos.length === 0 ? (
        <FlatList
          data={[]}
          renderItem={null}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <VideoEmptyIcon size={64} />
              <Text style={styles.emptyTitle}>레슨 영상이 없습니다</Text>
              <Text style={styles.emptyDesc}>
                {isTeacher
                  ? '연습 영상이나 레슨 녹화를 업로드하세요\n학생들이 복습할 수 있어요'
                  : '선생님이 레슨 영상을 등록하면\n이곳에서 확인할 수 있어요'}
              </Text>
              {isTeacher && (
                <TouchableOpacity style={styles.emptyUploadBtn} onPress={handleUpload}>
                  <UploadIcon size={18} />
                  <Text style={styles.emptyUploadText}>영상 업로드</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C9A96E" />}
        />
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <VideoCard
              item={item}
              onDelete={handleDelete}
              onPlay={handlePlay}
              canDelete={isTeacher}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C9A96E" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1923' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1a2530', gap: 12,
  },
  headerBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
  headerSub: { fontSize: 11, color: '#5a6a7a', marginTop: 1 },

  uploadBar: { height: 28, backgroundColor: '#1a2530', justifyContent: 'center' },
  uploadProgress: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#fb923c30' },
  uploadText: { fontSize: 11, color: '#fb923c', textAlign: 'center', fontWeight: '600' },

  infoBar: { paddingVertical: 8, paddingHorizontal: 20, backgroundColor: '#1a2530' },
  infoText: { fontSize: 11, color: '#4a5a6a', textAlign: 'center' },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40, paddingTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginTop: 8 },
  emptyDesc: { fontSize: 13, color: '#5a6a7a', textAlign: 'center', lineHeight: 20 },
  emptyUploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#C9A96E', paddingVertical: 14, paddingHorizontal: 28,
    borderRadius: 12, marginTop: 12,
  },
  emptyUploadText: { fontSize: 15, fontWeight: '700', color: '#0f1923' },

  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },

  videoCard: {
    flexDirection: 'row', backgroundColor: '#1a2530', borderRadius: 12,
    marginBottom: 10, overflow: 'hidden',
    borderWidth: 1, borderColor: '#222f3a',
  },
  thumbnailWrap: {
    width: 140, height: 90, backgroundColor: '#0f1923',
    position: 'relative',
  },
  thumbnail: { width: '100%', height: '100%' },
  thumbnailPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  playOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },

  videoInfo: { flex: 1, padding: 12, justifyContent: 'center', gap: 6 },
  videoTitle: { fontSize: 14, fontWeight: '600', color: '#ffffff', lineHeight: 20 },
  videoMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  videoMetaText: { fontSize: 11, color: '#5a6a7a' },
  videoMetaDot: { fontSize: 11, color: '#3a4a5a' },

  deleteBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(15,25,35,0.8)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e74c3c30',
  },
});
