import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform, Image, RefreshControl,
} from 'react-native';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';

const WP_BASE = 'https://www.eon-music.com/wp-json';
// WordPress 미디어 카테고리 태그 (악보 구분용)
const SHEET_MUSIC_TAG = 'eon-sheet-music';

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
function BackIcon({ size = 22, color = '#9e9282' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PlusIcon({ size = 22, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.8} />
      <Path d="M12 8v8M8 12h8" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function SheetDocIcon({ size = 40, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="2" width="16" height="20" rx="2" stroke={color} strokeWidth={1.5} />
      <Circle cx="10" cy="11" r="2" stroke={color} strokeWidth={1.2} />
      <Path d="M12 11V7" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
      <Circle cx="14" cy="15" r="2" stroke={color} strokeWidth={1.2} />
      <Path d="M16 15V11" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1="7" y1="6" x2="11" y2="6" stroke={color} strokeWidth={1} strokeLinecap="round" />
    </Svg>
  );
}

function ImageIcon({ size = 40, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth={1.5} />
      <Circle cx="8.5" cy="8.5" r="1.5" stroke={color} strokeWidth={1.2} />
      <Path d="M21 15l-5-5L5 21" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
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

// ── 악보 카드 ──
function SheetCard({ item, onDelete, canDelete }) {
  const isImage = item.mime_type?.startsWith('image/');
  const time = new Date(item.date);
  const dateStr = `${time.getFullYear()}.${time.getMonth() + 1}.${time.getDate()}`;

  return (
    <TouchableOpacity
      style={styles.sheetCard}
      activeOpacity={0.8}
      onPress={() => {
        if (Platform.OS === 'web') {
          window.open(item.source_url, '_blank');
        } else {
          const { Linking } = require('react-native');
          Linking.openURL(item.source_url);
        }
      }}
    >
      <View style={styles.bookCover}>
        {isImage && item.source_url ? (
          <Image source={{ uri: item.source_url }} style={styles.bookThumbnail} resizeMode="cover" />
        ) : (
          <SheetDocIcon size={36} />
        )}
        <View style={styles.bookSpine} />
      </View>
      <Text style={styles.sheetTitle} numberOfLines={2}>
        {item.title?.rendered?.replace(/&#8211;/g, '-')?.replace(/&amp;/g, '&') || item.slug || '악보'}
      </Text>
      <Text style={styles.sheetDate}>{dateStr}</Text>

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

export default function SheetMusicScreen() {
  const insets = useSafeAreaInsets();
  const { user, getToken } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // WordPress 미디어에서 악보 목록 가져오기
  const fetchSheets = useCallback(async () => {
    try {
      const res = await fetch(
        `${WP_BASE}/wp/v2/media?search=${SHEET_MUSIC_TAG}&per_page=50&orderby=date&order=desc&media_type=image,application`
      );
      if (res.ok) {
        const data = await res.json();
        // 설명(description)에 태그가 포함된 미디어만 필터
        const filtered = data.filter(
          (m) => m.description?.rendered?.includes(SHEET_MUSIC_TAG) || m.caption?.rendered?.includes(SHEET_MUSIC_TAG)
        );
        setSheets(filtered);
      }
    } catch (err) {
      console.warn('악보 목록 로드 실패:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSheets();
  }, [fetchSheets]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSheets();
  }, [fetchSheets]);

  // 파일 업로드 (선생님만)
  const handleUpload = async (type) => {
    if (!user) return;
    if (!isTeacher) {
      showAlert('권한 없음', '악보 업로드는 선생님만 가능합니다.');
      return;
    }

    let result;
    if (type === 'document') {
      result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showAlert('권한 필요', '사진 접근 권한이 필요합니다.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
    }

    if (result.canceled) return;

    const file = result.assets?.[0];
    if (!file?.uri) return;

    if (file.fileSize && file.fileSize > 20 * 1024 * 1024) {
      showAlert('파일 크기 초과', '20MB 이하의 파일만 업로드할 수 있습니다.');
      return;
    }

    setUploading(true);
    setUploadProgress(20);

    try {
      const token = getToken();
      if (!token) throw new Error('인증 토큰이 없습니다.');

      const fileName = file.name || `sheet_${Date.now()}.${file.uri.split('.').pop()}`;
      const mimeType = file.mimeType || 'application/octet-stream';

      const formData = new FormData();
      formData.append('file', { uri: file.uri, name: fileName, type: mimeType });
      // 캡션에 태그를 넣어 악보임을 표시
      formData.append('caption', SHEET_MUSIC_TAG);
      formData.append('description', SHEET_MUSIC_TAG);

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
      showAlert('업로드 완료', '악보가 저장되었습니다.');
      fetchSheets();
    } catch (err) {
      console.warn('업로드 오류:', err);
      showAlert('업로드 실패', `${err.message || '파일 업로드 중 오류가 발생했습니다.'}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // 악보 삭제
  const handleDelete = (item) => {
    const title = item.title?.rendered || '악보';
    showAlert(
      '악보 삭제',
      `"${title}" 악보를 삭제하시겠습니까?`,
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
                fetchSheets();
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
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <BackIcon />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>악보 라이브러리</Text>
          <Text style={styles.headerSub}>악보 컬렉션</Text>
        </View>
        {isTeacher ? (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => {
              showAlert('악보 추가', '어떤 방식으로 추가하시겠습니까?', [
                { text: '취소', style: 'cancel' },
                { text: '파일 선택', onPress: () => handleUpload('document') },
              ]);
            }}
          >
            <PlusIcon />
          </TouchableOpacity>
        ) : <View style={styles.headerBtn} />}
      </View>

      {/* 업로드 진행 바 */}
      {uploading && (
        <View style={styles.uploadBar}>
          <View style={[styles.uploadProgress, { width: `${uploadProgress}%` }]} />
          <Text style={styles.uploadText}>업로드 중... {uploadProgress}%</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      ) : sheets.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyShelf}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C9A96E" />}
        >
          <View style={styles.shelfRow}>
            <View style={styles.shelfBoard} />
          </View>
          <SheetDocIcon size={56} color="rgba(201,169,110,0.3)" />
          <Text style={styles.emptyTitle}>악보가 아직 없습니다</Text>
          <Text style={styles.emptyDesc}>
            {isTeacher
              ? 'PDF나 사진으로 악보를 추가해보세요\n학생들이 열람할 수 있어요'
              : '선생님이 악보를 등록하면\n이곳에서 확인할 수 있어요'}
          </Text>
          {isTeacher && (
            <View style={styles.uploadBtns}>
              <TouchableOpacity style={styles.uploadBtn} onPress={() => handleUpload('document')}>
                <SheetDocIcon size={20} />
                <Text style={styles.uploadBtnText}>PDF / 파일</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadBtn} onPress={() => handleUpload('image')}>
                <ImageIcon size={20} />
                <Text style={styles.uploadBtnText}>사진 촬영본</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.shelfRow}>
            <View style={styles.shelfBoard} />
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.shelfContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C9A96E" />}
        >
          {isTeacher && (
            <View style={styles.uploadBtnsRow}>
              <TouchableOpacity style={styles.uploadBtnSmall} onPress={() => handleUpload('document')}>
                <SheetDocIcon size={16} />
                <Text style={styles.uploadBtnSmallText}>PDF / 파일</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadBtnSmall} onPress={() => handleUpload('image')}>
                <ImageIcon size={16} />
                <Text style={styles.uploadBtnSmallText}>사진</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.shelfGrid}>
            {sheets.map((item, i) => (
              <View key={item.id} style={styles.shelfSlot}>
                <SheetCard item={item} onDelete={handleDelete} canDelete={isTeacher} />
                {(i % 2 === 1 || i === sheets.length - 1) && (
                  <View style={styles.shelfBoardFull} />
                )}
              </View>
            ))}
          </View>
          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#110E0B' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(201,169,110,0.15)', gap: 12,
  },
  headerBtn: { width: 36, height: 36, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '300', color: '#F5F0E8', letterSpacing: 1 },
  headerSub: { fontSize: 11, color: '#9e9282', marginTop: 1, letterSpacing: 0.5 },

  uploadBar: { height: 28, backgroundColor: 'rgba(201,169,110,0.07)', justifyContent: 'center' },
  uploadProgress: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(201,169,110,0.15)' },
  uploadText: { fontSize: 11, color: '#C9A96E', textAlign: 'center', fontWeight: '400' },

  emptyShelf: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '300', color: '#F5F0E8', marginTop: 8, letterSpacing: 0.5 },
  emptyDesc: { fontSize: 13, color: '#9e9282', textAlign: 'center', lineHeight: 20 },

  shelfRow: { width: '100%', paddingHorizontal: 20, marginVertical: 16 },
  shelfBoard: {
    height: 6, backgroundColor: '#2a1a0e', borderRadius: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 4,
    borderBottomWidth: 2, borderBottomColor: '#1a0f06',
  },

  uploadBtns: { flexDirection: 'row', gap: 12, marginTop: 12 },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(201,169,110,0.07)', paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: 4, borderWidth: 1, borderColor: 'rgba(201,169,110,0.18)',
  },
  uploadBtnText: { fontSize: 13, fontWeight: '400', color: '#C9A96E' },

  uploadBtnsRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 16, marginBottom: 8,
  },
  uploadBtnSmall: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(201,169,110,0.07)', paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 4, borderWidth: 1, borderColor: 'rgba(201,169,110,0.18)',
  },
  uploadBtnSmallText: { fontSize: 12, fontWeight: '400', color: '#9e9282' },

  shelfContainer: { paddingBottom: 20 },
  shelfGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 },
  shelfSlot: { width: '50%', paddingHorizontal: 6, marginBottom: 4 },

  sheetCard: {
    backgroundColor: 'rgba(201,169,110,0.07)', borderRadius: 4, padding: 12,
    alignItems: 'center', marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(201,169,110,0.18)',
  },
  bookCover: {
    width: '100%', height: 120, backgroundColor: '#110E0B',
    borderRadius: 4, alignItems: 'center', justifyContent: 'center',
    marginBottom: 10, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(201,169,110,0.18)',
  },
  bookThumbnail: { width: '100%', height: '100%' },
  bookSpine: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
    backgroundColor: 'rgba(201,169,110,0.25)', borderTopLeftRadius: 4, borderBottomLeftRadius: 4,
  },
  sheetTitle: { fontSize: 13, fontWeight: '400', color: '#F5F0E8', textAlign: 'center', lineHeight: 18 },
  sheetDate: { fontSize: 10, color: '#9e9282', marginTop: 4 },
  deleteBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 4,
    backgroundColor: 'rgba(201,169,110,0.07)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e74c3c30',
  },

  shelfBoardFull: {
    height: 5, backgroundColor: '#2a1a0e', borderRadius: 2, marginHorizontal: -6,
    borderBottomWidth: 2, borderBottomColor: '#1a0f06',
  },
});
