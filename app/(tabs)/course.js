import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking,
  RefreshControl, ActivityIndicator, Platform,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

let Haptics = null;
if (Platform.OS !== 'web') {
  try { Haptics = require('expo-haptics'); } catch {}
}

// ── WordPress REST API ──
const WP_API = 'https://eon-music.com/wp-json/eon/v1';

// HTML 엔티티 디코딩
function decodeHTML(html) {
  if (!html) return '';
  return html
    .replace(/&#8211;/g, '–').replace(/&#8212;/g, '—')
    .replace(/&#8220;/g, '\u201C').replace(/&#8221;/g, '\u201D')
    .replace(/&#8216;/g, '\u2018').replace(/&#8217;/g, '\u2019')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/<[^>]*>/g, ''); // HTML 태그 제거
}

// 제목에서 작곡가 추출 ("Franz Liszt – La Campanella" → "Franz Liszt")
function extractComposer(title) {
  for (const sep of [' — ', ' – ', ' ― ']) {
    if (title.includes(sep)) return title.split(sep)[0].trim();
  }
  return '';
}

// 카테고리 판별
function determineCategory(title) {
  const lower = title.toLowerCase();
  if (lower.includes('12음기법') || lower.includes('작곡') || lower.includes('음악이론')
      || lower.includes('twelve-tone') || lower.includes('composition')) {
    return '작곡·음악이론';
  }
  return '피아노';
}

// API에서 강좌 목록 가져오기 (LearnDash 강좌)
async function fetchCoursesFromAPI() {
  const res = await fetch(`${WP_API}/courses`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();

  return data
    .filter(c => {
      const title = c.title || '';
      return !title.includes('복사용') && title.trim() !== '';
    })
    .map((c, index) => {
      const title = decodeHTML(c.title || '');
      return {
        id: String(c.id),
        title,
        composer: extractComposer(title),
        category: determineCategory(title),
        instructor: '최유진',
        thumbnail: c.thumbnail || '',
        link: c.link, // eon-music.com/courses/... (강좌 페이지)
        status: index === 0 ? 'new' : 'none',
      };
    });
}

// API 실패 시 폴백 데이터
const FALLBACK_COURSES = [
  { id: '5559', title: 'Franz Liszt – La Campanella', composer: 'Franz Liszt', category: '피아노', instructor: '최유진', thumbnail: 'https://eon-music.com/wp-content/uploads/2025/12/KakaoTalk_20260106_105143263-scaled.png', link: 'https://eon-music.com/product/franz-liszt-la-campanella/', status: 'new' },
  { id: '5561', title: 'Franz Liszt — Transcendental Étude No.4 "Mazeppa", S.139/4', composer: 'Franz Liszt', category: '피아노', instructor: '최유진', thumbnail: 'https://eon-music.com/wp-content/uploads/2025/09/KakaoTalk_20260102_174818213_02-scaled.png', link: 'https://eon-music.com/product/franz-liszt-transcendental-etude-no-4-mazeppa-s-139-4/', status: 'none' },
  { id: '5551', title: 'Frédéric Chopin — Ballade No.1 in G minor, Op.23', composer: 'Frédéric Chopin', category: '피아노', instructor: '최유진', thumbnail: 'https://eon-music.com/wp-content/uploads/2025/04/KakaoTalk_20260102_174818213-scaled.png', link: 'https://eon-music.com/product/%ec%87%bc%ed%8c%bd-%eb%b0%9c%eb%9d%bc%eb%93%9c-1%eb%b2%88-%eb%a7%88%ec%8a%a4%ed%84%b0%ed%81%b4%eb%9e%98%ec%8a%a4-1%eb%b6%80/', status: 'none' },
  { id: '5557', title: 'Frédéric Chopin — Étude in A minor, Op.25 No.4', composer: 'Frédéric Chopin', category: '피아노', instructor: '최유진', thumbnail: 'https://eon-music.com/wp-content/uploads/2025/12/KakaoTalk_20260102_174818213_06-scaled.png', link: 'https://eon-music.com/product/frederic-chopin-etude-in-a-minor-op-25-no-4/', status: 'none' },
  { id: '5560', title: 'Frédéric Chopin — Étude in C-sharp minor, Op.10 No.4', composer: 'Frédéric Chopin', category: '피아노', instructor: '최유진', thumbnail: 'https://eon-music.com/wp-content/uploads/2025/12/KakaoTalk_20260102_174818213_09-scaled.png', link: 'https://eon-music.com/product/frederic-chopin-etude-in-c-sharp-minor-op-10-no-4/', status: 'none' },
  { id: '5558', title: 'Frédéric Chopin — Étude in G-flat major, Op.10 No.5', composer: 'Frédéric Chopin', category: '피아노', instructor: '최유진', thumbnail: 'https://eon-music.com/wp-content/uploads/2025/12/KakaoTalk_20260102_174818213_10-scaled.png', link: 'https://eon-music.com/product/frederic-chopin-etude-in-g-flat-major-op-10-no-5/', status: 'none' },
  { id: '5562', title: 'Frédéric Chopin — Étude in G-sharp minor, Op.25 No.6', composer: 'Frédéric Chopin', category: '피아노', instructor: '최유진', thumbnail: 'https://eon-music.com/wp-content/uploads/2025/04/KakaoTalk_20260102_174818213_07-scaled.png', link: 'https://eon-music.com/product/frederic-chopin-etude-in-g-sharp-minor-op-25-no-6/', status: 'none' },
  { id: '5553', title: 'Mastering the Twelve-Tone Technique', composer: '', category: '작곡·음악이론', instructor: '최유진', thumbnail: 'https://eon-music.com/wp-content/uploads/2025/09/KakaoTalk_20260106_105143263_01-scaled.png', link: 'https://eon-music.com/product/%ed%99%a9%ec%9a%94%ed%95%9c-12%ec%9d%8c%ea%b8%b0%eb%b2%95/', status: 'none' },
];

const CATEGORIES = ['전체', '피아노', '작곡·음악이론'];

// ── SVG 아이콘 ──
function PlayIcon({ size = 16, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 5v14l11-7L8 5z" fill={color} />
    </Svg>
  );
}

function BookIcon({ size = 14, color = '#9e9282' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function ExternalIcon({ size = 16, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 17L17 7M17 7H7M17 7v10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MusicNoteIcon({ size = 14, color = '#9e9282' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18V5l12-2v13" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="6" cy="18" r="3" stroke={color} strokeWidth={2} />
      <Circle cx="18" cy="16" r="3" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function UserIcon({ size = 14, color = '#9e9282' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

// ── 배지 컴포넌트 ──
function CategoryBadge({ category }) {
  const colors = {
    '피아노': { bg: 'rgba(201,169,110,0.1)', text: '#C9A96E' },
    '작곡·음악이론': { bg: 'rgba(201,169,110,0.1)', text: '#C9A96E' },
  };
  const c = colors[category] || colors['피아노'];
  return (
    <View style={[styles.categoryBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.categoryBadgeText, { color: c.text }]}>{category}</Text>
    </View>
  );
}

function StatusBadge({ status }) {
  if (status === 'none') return null;
  const config = {
    new: { bg: '#C9A96E', text: '#0C0A08', label: 'NEW' },
    popular: { bg: '#2C5F8A', text: '#ffffff', label: 'BEST' },
  };
  const c = config[status];
  if (!c) return null;
  return (
    <View style={[styles.statusBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.statusText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

// ── 강좌 카드 ──
function CourseCard({ course, onPress }) {
  return (
    <TouchableOpacity style={styles.courseCard} activeOpacity={0.7} onPress={onPress} accessibilityRole="button">
      {/* 썸네일 */}
      <View style={styles.cardThumbnail}>
        {course.thumbnail ? (
          <Image
            source={{ uri: course.thumbnail }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.cardPlaceholder}>
            <PlayIcon size={32} color="rgba(201,169,110,0.6)" />
          </View>
        )}
        {/* 상태 배지 */}
        {course.status !== 'none' && (
          <View style={styles.statusOverlay}>
            <StatusBadge status={course.status} />
          </View>
        )}
        {/* 재생 오버레이 */}
        <View style={styles.playOverlay}>
          <View style={styles.playCircle}>
            <PlayIcon size={20} color="#ffffff" />
          </View>
        </View>
      </View>

      {/* 정보 */}
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <CategoryBadge category={course.category} />
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{course.title}</Text>
        {course.composer ? (
          <View style={styles.metaRow}>
            <MusicNoteIcon size={13} />
            <Text style={styles.metaText}>{course.composer}</Text>
          </View>
        ) : null}
        <View style={styles.metaRow}>
          <UserIcon size={13} />
          <Text style={styles.metaText}>강사: {course.instructor}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── 메인 화면 ──
export default function CourseScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('전체');
  const [courses, setCourses] = useState(FALLBACK_COURSES);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // API에서 강좌 목록 불러오기
  const loadCourses = useCallback(async () => {
    try {
      const apiCourses = await fetchCoursesFromAPI();
      if (apiCourses && apiCourses.length > 0) {
        setCourses(apiCourses);
      }
    } catch (e) {
      console.warn('강좌 목록 로딩 실패, 폴백 데이터 사용:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 최초 로딩
  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const filtered =
    activeCategory === '전체'
      ? courses
      : courses.filter((c) => c.category === activeCategory);

  const handleCoursePress = (course) => {
    router.push({
      pathname: '/course/[id]',
      params: {
        id: course.id,
        title: course.title,
        url: course.link,
      },
    });
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCourses();
  }, [loadCourses]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>강좌</Text>
          <Text style={styles.headerSub}>PIANO  ·  COMPOSITION  ·  THEORY</Text>
        </View>
      </View>

      {/* 카테고리 필터 */}
      <View style={styles.categoryWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryBtn, activeCategory === cat && styles.categoryBtnActive]}
              onPress={() => { if (Haptics) Haptics.selectionAsync(); setActiveCategory(cat); }}
            >
              <Text style={[styles.categoryLabel, activeCategory === cat && styles.categoryLabelActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 강좌 목록 */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#C9A96E"
            colors={['#C9A96E']}
          />
        }
      >
        {/* 상태 바 */}
        <View style={styles.statsBar}>
          <Text style={styles.statsText}>총 {filtered.length}개 강좌</Text>
          <View style={styles.sourceIndicator}>
            <View style={styles.sourceDot} />
            <Text style={styles.sourceText}>eon-music.com</Text>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#C9A96E" />
            <Text style={styles.loadingText}>강좌 불러오는 중...</Text>
          </View>
        )}

        {!loading && filtered.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            onPress={() => handleCoursePress(course)}
          />
        ))}

        {!loading && filtered.length === 0 && (
          <View style={styles.emptyWrap}>
            <BookIcon size={40} color="rgba(201,169,110,0.3)" />
            <Text style={styles.emptyText}>해당 카테고리의 강좌가 없습니다</Text>
          </View>
        )}

        {/* 수강신청 바로가기 */}
        <TouchableOpacity
          style={styles.cta}
          onPress={() => {
            router.push({
              pathname: '/course/[id]',
              params: {
                id: 'enroll',
                title: '수강신청',
                url: 'https://eon-music.com/%ec%88%98%ea%b0%95%ec%8b%a0%ec%b2%ad/',
              },
            });
          }}
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>수강신청 페이지 바로가기</Text>
          <ExternalIcon size={16} />
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#110E0B' },

  /* 헤더 */
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 14,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(201,169,110,0.15)',
  },
  headerTitle: { fontSize: 22, fontWeight: '300', color: '#F5F0E8', letterSpacing: 1 },
  headerSub: { fontSize: 10, color: '#C9A96E', marginTop: 4, fontWeight: '400', letterSpacing: 2.5 },

  /* 카테고리 */
  categoryWrap: { borderBottomWidth: 0.5, borderBottomColor: 'rgba(201,169,110,0.15)' },
  categoryRow: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  categoryBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 4, backgroundColor: 'rgba(201,169,110,0.07)',
    borderWidth: 0.5, borderColor: 'rgba(201,169,110,0.18)',
  },
  categoryBtnActive: { backgroundColor: 'transparent', borderColor: '#C9A96E' },
  categoryLabel: { fontSize: 13, fontWeight: '400', color: '#9e9282', letterSpacing: 0.3 },
  categoryLabelActive: { color: '#C9A96E' },

  /* 리스트 */
  listContent: { paddingHorizontal: 20, paddingTop: 8 },
  statsBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10,
  },
  statsText: { fontSize: 12, color: '#9e9282', fontWeight: '400' },
  sourceIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sourceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C9A96E' },
  sourceText: { fontSize: 11, color: '#9e9282' },

  /* 강좌 카드 */
  courseCard: {
    backgroundColor: 'rgba(201,169,110,0.07)', borderRadius: 4,
    marginBottom: 14, overflow: 'hidden',
    borderWidth: 0.5, borderColor: 'rgba(201,169,110,0.18)',
  },
  cardThumbnail: { height: 190, backgroundColor: '#0C0A08', position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(201,169,110,0.04)',
  },
  statusOverlay: { position: 'absolute', top: 10, left: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  playOverlay: {
    position: 'absolute', right: 12, bottom: 12,
  },
  playCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(201,169,110,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },

  cardBody: { padding: 16, gap: 6 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2 },
  categoryBadgeText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  cardTitle: { fontSize: 16, fontWeight: '400', color: '#F5F0E8', lineHeight: 23, letterSpacing: 0.3, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 13, color: '#9e9282', fontWeight: '400' },

  /* 로딩 */
  loadingWrap: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 14, color: '#9e9282' },

  /* 빈 상태 */
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, color: '#9e9282' },

  /* CTA */
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, marginTop: 8,
    borderWidth: 0.5, borderColor: 'rgba(201,169,110,0.25)', borderRadius: 4,
    backgroundColor: 'rgba(201,169,110,0.07)',
  },
  ctaText: { fontSize: 14, fontWeight: '400', color: '#C9A96E', letterSpacing: 0.5 },
});
