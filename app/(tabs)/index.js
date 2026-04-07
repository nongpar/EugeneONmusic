import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Dimensions, Animated,
} from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import Header from '../../components/Header';
import NewsCard from '../../components/NewsCard';
import { useAuth } from '../../hooks/useAuth';
import { usePracticeStats } from '../../hooks/usePracticeStats';

const { width: SCREEN_W } = Dimensions.get('window');
const WP_API = 'https://www.eugeneonmusic.com/wp-json/wp/v2';

// ── SVG Icons ──
function ClockIcon({ size = 20, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.8} />
      <Path d="M12 7v5l3 3" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
function FlameIcon({ size = 20, color = '#e74c3c' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2c.5 4-3 6-3 10a5 5 0 0010 0c0-4-3.5-5-3-10-1.5 1-4 3.5-4 3.5S12.5 3 12 2z" stroke={color} strokeWidth={1.8} fill={color} opacity={0.2} />
    </Svg>
  );
}
function RefreshIcon({ size = 16, color = '#5a6a7a' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M1 4v6h6M23 20v-6h-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function StaffLines({ width = 100, color = 'rgba(201,169,110,0.08)' }) {
  return (
    <Svg width={width} height={24} viewBox={`0 0 ${width} 24`}>
      {[4, 8, 12, 16, 20].map((y) => (
        <Line key={y} x1="0" y1={y} x2={width} y2={y} stroke={color} strokeWidth={1} />
      ))}
    </Svg>
  );
}

function formatPracticeTime(totalSecs) {
  if (totalSecs === 0) return '-';
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  return `${m}분`;
}

// ── 히어로 배너 슬라이드 폴백 데이터 (Firestore 연결 실패 시 사용) ──
const FALLBACK_SLIDES = [
  {
    image: require('../../assets/images/masterclass.jpg'),
    badge: 'EON MUSIC',
    title: 'Where Passion\nMeets Mastery',
    sub: '열정이 예술이 되는 순간, 유진온뮤직',
  },
  {
    image: require('../../assets/images/concert.jpg'),
    badge: 'UPCOMING',
    title: '2nd EON International\nPiano Competition',
    sub: '글로벌 아티스트의 산실',
  },
  {
    image: require('../../assets/images/competition.jpg'),
    badge: 'COMPETITION',
    title: 'EON Amateur\nPiano Competition',
    sub: '음악을 사랑하는 모든 이를 위한 무대',
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { todaySeconds, streakDays, loading: statsLoading } = usePracticeStats(user?.uid);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState(FALLBACK_SLIDES);
  const scrollRef = useRef(null);

  // Firestore에서 배너 데이터 가져오기
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const q = query(
          collection(db, 'banners'),
          orderBy('order', 'asc')
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const slides = snapshot.docs
            .map((doc) => doc.data())
            .filter((d) => d.active === true)
            .map((d) => ({
              image: d.imageUrl ? { uri: d.imageUrl } : FALLBACK_SLIDES[0].image,
              badge: d.badge || '',
              title: (d.title || '').replace(/\\n/g, '\n'),
              sub: d.sub || '',
            }));
          if (slides.length > 0) {
            setHeroSlides(slides);
          }
        }
      } catch (err) {
        console.warn('배너 로딩 실패, 폴백 사용:', err);
      }
    };
    fetchBanners();
  }, []);

  // 배너 자동 슬라이드
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % heroSlides.length;
        scrollRef.current?.scrollTo({ x: next * (SCREEN_W - 40), animated: true });
        return next;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides]);

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${WP_API}/posts?per_page=7&_embed&orderby=date&order=desc&categories=2,30`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.warn('뉴스 로딩 실패:', err);
      setError('뉴스를 불러올 수 없습니다');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const headlinePost = posts[0] || null;
  const newsPosts = posts.slice(1);

  const handleSlideScroll = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / (SCREEN_W - 40));
    setActiveSlide(idx);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── 히어로 캐러셀 ── */}
        <View style={styles.heroSection}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleSlideScroll}
            snapToInterval={SCREEN_W - 40}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {heroSlides.map((slide, i) => (
              <View key={i} style={styles.heroSlide}>
                <Image source={slide.image} style={styles.heroImage} resizeMode="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(15,25,35,0.4)', 'rgba(15,25,35,0.85)']}
                  locations={[0, 0.4, 1]}
                  style={styles.heroGradient}
                />
                <View style={styles.heroContent}>
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>{slide.badge}</Text>
                  </View>
                  <Text style={styles.heroTitle}>{slide.title}</Text>
                  <Text style={styles.heroSub}>{slide.sub}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          {/* 인디케이터 */}
          <View style={styles.indicatorRow}>
            {heroSlides.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.indicator,
                  activeSlide === i && styles.indicatorActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* ── 퀵 액션 ── */}
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/(tabs)/course')} activeOpacity={0.85}>
            <Image source={{ uri: 'https://eugeneonmusic.com/wp-content/uploads/2026/02/KakaoTalk_20260214_162600793_01.jpg' }} style={styles.quickImage} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(15,25,35,0.85)']}
              style={styles.quickGradient}
            />
            <Text style={styles.quickLabel}>음악교육</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/(tabs)/sns')} activeOpacity={0.85}>
            <Image source={{ uri: 'https://eugeneonmusic.com/wp-content/uploads/2025/10/DSC06077.jpg' }} style={styles.quickImage} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(15,25,35,0.85)']}
              style={styles.quickGradient}
            />
            <Text style={styles.quickLabel}>예술기획</Text>
          </TouchableOpacity>
        </View>

        {/* ── 연습 현황 (글래스모피즘) ── */}
        <View style={styles.practiceSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWrap}>
              <View style={styles.goldBar} />
              <Text style={styles.sectionTitle}>연습 현황</Text>
            </View>
          </View>

          {user ? (
            <View style={styles.practiceRow}>
              <LinearGradient
                colors={['#1a2530', '#1e2d3d']}
                style={styles.practiceCard}
              >
                <View style={styles.practiceIconWrap}>
                  <ClockIcon />
                </View>
                <Text style={styles.practiceValue}>
                  {statsLoading ? '...' : formatPracticeTime(todaySeconds)}
                </Text>
                <Text style={styles.practiceLabel}>오늘 연습</Text>
              </LinearGradient>
              <LinearGradient
                colors={['#1a2530', '#1e2d3d']}
                style={styles.practiceCard}
              >
                <View style={styles.practiceIconWrap}>
                  <FlameIcon />
                </View>
                <Text style={styles.practiceValue}>
                  {statsLoading ? '...' : streakDays > 0 ? `${streakDays}일` : '-'}
                </Text>
                <Text style={styles.practiceLabel}>연속 연습</Text>
              </LinearGradient>
            </View>
          ) : (
            <LinearGradient colors={['#1a2530', '#1e2d3d']} style={styles.practiceEmpty}>
              <Text style={styles.practiceEmptyText}>로그인하면 연습 기록을 확인할 수 있어요</Text>
            </LinearGradient>
          )}
        </View>

        {/* ── 뉴스 섹션 ── */}
        <View style={styles.newsSection}>
          {/* 오선지 장식 */}
          <View style={styles.staffDecor}>
            <StaffLines width={SCREEN_W} />
          </View>

          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWrap}>
              <View style={styles.goldBar} />
              <Text style={styles.sectionTitle}>NEWS</Text>
            </View>
            <TouchableOpacity onPress={fetchPosts} style={styles.refreshBtn}>
              {loading ? (
                <ActivityIndicator size="small" color="#C9A96E" />
              ) : (
                <RefreshIcon />
              )}
            </TouchableOpacity>
          </View>

          {/* 헤드라인 뉴스 텍스트 */}
          {headlinePost && (
            <Text style={styles.newsQuote} numberOfLines={2}>
              {headlinePost.title?.rendered?.replace(/&amp;/g, '&')?.replace(/&#8217;/g, "'")?.replace(/<[^>]+>/g, '') || ''}
            </Text>
          )}
        </View>

        {/* 뉴스 카드 */}
        {headlinePost && <NewsCard post={headlinePost} isHeadline />}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchPosts} style={styles.retryBtn}>
              <Text style={styles.retryText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : loading && posts.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#C9A96E" />
            <Text style={styles.loadingText}>소식을 불러오는 중...</Text>
          </View>
        ) : (
          newsPosts.map((post) => (
            <NewsCard key={post.id} post={post} />
          ))
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1923' },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 4 },

  /* ── 히어로 캐러셀 ── */
  heroSection: {
    marginBottom: 14,
  },
  heroSlide: {
    width: SCREEN_W - 40,
    height: 240,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 12,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroContent: {
    position: 'absolute',
    bottom: 22,
    left: 22,
    right: 22,
  },
  heroBadge: {
    backgroundColor: '#C9A96E',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 10,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0f1923',
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 28,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
    letterSpacing: 0.3,
  },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2a3a4a',
  },
  indicatorActive: {
    width: 20,
    backgroundColor: '#C9A96E',
    borderRadius: 3,
  },

  /* ── 퀵 액션 ── */
  quickRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 8,
  },
  quickCard: {
    flex: 1,
    height: 90,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#222f3a',
  },
  quickImage: { width: '100%', height: '100%' },
  quickGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  quickLabel: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  /* ── 섹션 공통 ── */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goldBar: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#C9A96E',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  refreshBtn: { padding: 6 },

  /* ── 연습 현황 ── */
  practiceSection: {
    marginTop: 20,
    marginBottom: 8,
  },
  practiceRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  practiceCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#222f3a',
  },
  practiceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(201,169,110,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201,169,110,0.15)',
  },
  practiceValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  practiceLabel: {
    fontSize: 12,
    color: '#5a6a7a',
    fontWeight: '500',
  },
  practiceEmpty: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222f3a',
  },
  practiceEmptyText: { fontSize: 14, color: '#5a6a7a' },

  /* ── 뉴스 섹션 ── */
  newsSection: {
    marginTop: 24,
    position: 'relative',
  },
  staffDecor: {
    position: 'absolute',
    top: -4,
    left: 0,
    right: 0,
    opacity: 0.5,
  },
  newsQuote: {
    fontSize: 15,
    color: '#8a9bae',
    fontStyle: 'italic',
    paddingHorizontal: 24,
    marginBottom: 14,
    lineHeight: 22,
    letterSpacing: -0.2,
  },

  /* ── 로딩/에러 ── */
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: { fontSize: 13, color: '#5a6a7a' },
  errorBox: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 10,
    marginHorizontal: 20,
    backgroundColor: '#1a2530',
    borderRadius: 12,
  },
  errorText: { fontSize: 14, color: '#f87171' },
  retryBtn: {
    backgroundColor: '#C9A96E20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: { fontSize: 13, fontWeight: '600', color: '#C9A96E' },
});
