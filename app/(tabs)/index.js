import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Dimensions, Platform, Animated, Pressable, Easing,
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
import { useTheme } from '../../hooks/useTheme';
import { getTodayCuration, getGreeting } from '../../constants/dailyCuration';

let Haptics = null;
if (Platform.OS !== 'web') {
  try { Haptics = require('expo-haptics'); } catch {}
}

const { width: RAW_SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
// iPad/태블릿 등 큰 화면에서 콘텐츠가 과하게 넓어지지 않도록 제한
const SCREEN_W = Math.min(RAW_SCREEN_W, 540);
const WP_API = 'https://www.eugeneonmusic.com/wp-json/wp/v2';

// ── SVG Icons ──
function ClockIcon({ size = 20, color }) {
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
function RefreshIcon({ size = 16, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M1 4v6h6M23 20v-6h-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
// 가온 카드 우측 데코용 — 가는 트레블 클레프
function TrebleClefDeco({ size = 56, color }) {
  return (
    <Svg width={size} height={size * 1.55} viewBox="0 0 24 38" fill="none">
      <Path
        d="M12 36V8c0-4 3-7 5-7s3 2 3 4c0 3-4 6-8 8-4 2-7 5-7 9 0 5 4 8 7 8 2 0 4-1 5-3"
        stroke={color} strokeWidth={1} strokeLinecap="round" fill="none"
      />
      <Circle cx="12" cy="28" r="2" fill={color} />
    </Svg>
  );
}

// 떠다니는 배경 음표 — 매우 은은하게 (opacity 0.05~0.07)
function FloatingNoteIcon({ type = 'single', size = 22, color }) {
  if (type === 'treble') {
    return (
      <Svg width={size} height={size * 1.6} viewBox="0 0 24 38" fill="none">
        <Path d="M12 36V8c0-4 3-7 5-7s3 2 3 4c0 3-4 6-8 8-4 2-7 5-7 9 0 5 4 8 7 8 2 0 4-1 5-3" stroke={color} strokeWidth={1.2} strokeLinecap="round" fill="none" />
        <Circle cx="12" cy="28" r="2" fill={color} />
      </Svg>
    );
  }
  if (type === 'double') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M9 18V5l12-2v13" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M6 21a3 3 0 100-6 3 3 0 000 6z" fill={color} opacity={0.4} stroke={color} strokeWidth={1} />
        <Path d="M18 19a3 3 0 100-6 3 3 0 000 6z" fill={color} opacity={0.4} stroke={color} strokeWidth={1} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3v15" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M12 3l6-1v5l-6 1V3z" fill={color} opacity={0.35} stroke={color} strokeWidth={1} strokeLinejoin="round" />
      <Circle cx="9" cy="18" r="3" fill={color} opacity={0.4} stroke={color} strokeWidth={1} />
    </Svg>
  );
}

// 떠다니는 음표 한 개 — 부모 위치에서 천천히 위아래로 ±6px 흔들리는 sin loop
function FloatingNote({ anim, top, left, type, size, color }) {
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        left,
        opacity: 0.06,
        transform: [{ translateY }],
      }}
    >
      <FloatingNoteIcon type={type} size={size} color={color} />
    </Animated.View>
  );
}

// 클래식 장식선 (Ornamental Divider)
function OrnamentDivider({ width = 200, color }) {
  return (
    <Svg width={width} height={20} viewBox={`0 0 ${width} 20`}>
      <Line x1="0" y1="10" x2={width * 0.35} y2="10" stroke={color} strokeWidth={0.5} opacity={0.4} />
      <Line x1={width * 0.65} y1="10" x2={width} y2="10" stroke={color} strokeWidth={0.5} opacity={0.4} />
      <Circle cx={width * 0.5} cy="10" r="3" stroke={color} strokeWidth={0.8} fill="none" opacity={0.6} />
      <Circle cx={width * 0.5} cy="10" r="1" fill={color} opacity={0.4} />
      <Path d={`M${width * 0.38} 10 Q${width * 0.44} 4 ${width * 0.5} 10 Q${width * 0.56} 16 ${width * 0.62} 10`} stroke={color} strokeWidth={0.6} fill="none" opacity={0.5} />
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
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { todaySeconds, streakDays, loading: statsLoading } = usePracticeStats(user?.uid);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState(FALLBACK_SLIDES);
  const scrollRef = useRef(null);

  // 가온의 오늘의 한 곡 — 시간대별 인사 + 날짜 기반 deterministic 큐레이션
  const greeting = useMemo(() => getGreeting(new Date().getHours()), []);
  const todayPick = useMemo(() => getTodayCuration(), []);
  const userName = user?.displayName || '';

  // 외곽 ScrollView 스크롤 위치 — 히어로 paralax용
  const scrollY = useRef(new Animated.Value(0)).current;
  const heroParalax = scrollY.interpolate({
    inputRange: [-200, 0, 400],
    outputRange: [-40, 0, 80],
    extrapolate: 'clamp',
  });

  // 떠다니는 배경 음표 sin loop (각각 다른 주기로 자연스럽게 어긋남)
  const noteAnim1 = useRef(new Animated.Value(0)).current;
  const noteAnim2 = useRef(new Animated.Value(0)).current;
  const noteAnim3 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const makeLoop = (anim, duration, delay = 0) => {
      const seq = Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ])
        ),
      ]);
      seq.start();
      return seq;
    };
    const a = makeLoop(noteAnim1, 5500, 0);
    const b = makeLoop(noteAnim2, 7200, 800);
    const c = makeLoop(noteAnim3, 6300, 1500);
    return () => { a.stop(); b.stop(); c.stop(); };
  }, []);

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
    if (idx !== activeSlide) {
      if (Haptics) Haptics.selectionAsync();
    }
    setActiveSlide(idx);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header />

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* ── 히어로 캐러셀 ── (paralax — 스크롤보다 천천히 따라옴) */}
        <Animated.View style={[styles.heroSection, { transform: [{ translateY: heroParalax }] }]}>
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
                  colors={['transparent', 'rgba(12,10,8,0.3)', 'rgba(12,10,8,0.88)']}
                  locations={[0, 0.4, 1]}
                  style={styles.heroGradient}
                />
                {/* 클래식 프레임 장식 */}
                <View style={styles.heroFrame}>
                  <View style={styles.heroFrameCornerTL} />
                  <View style={styles.heroFrameCornerTR} />
                  <View style={styles.heroFrameCornerBL} />
                  <View style={styles.heroFrameCornerBR} />
                </View>
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
        </Animated.View>

        {/* ── 장식 디바이더 ── */}
        <View style={{ alignItems: 'center', marginVertical: 4 }}>
          <OrnamentDivider width={SCREEN_W - 80} color={colors.accent} />
        </View>

        {/* ── 퀵 액션 — Pressable로 누르는 순간 0.97 scale + opacity 미세 변화로 입체감 ── */}
        <View style={styles.quickRow}>
          <Pressable
            style={({ pressed }) => [
              styles.quickCard,
              pressed && styles.cardPressed,
            ]}
            onPress={() => router.push('/(tabs)/course')}
          >
            <Image source={{ uri: 'https://eugeneonmusic.com/wp-content/uploads/2026/02/KakaoTalk_20260214_162600793_01.jpg' }} style={styles.quickImage} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(12,10,8,0.85)']}
              style={styles.quickGradient}
            />
            <View style={styles.quickBorder} />
            <Text style={styles.quickLabel}>음악교육</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.quickCard,
              pressed && styles.cardPressed,
            ]}
            onPress={() => router.push('/(tabs)/sns')}
          >
            <Image source={{ uri: 'https://eugeneonmusic.com/wp-content/uploads/2025/10/DSC06077.jpg' }} style={styles.quickImage} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(12,10,8,0.85)']}
              style={styles.quickGradient}
            />
            <View style={styles.quickBorder} />
            <Text style={styles.quickLabel}>예술기획</Text>
          </Pressable>
        </View>

        {/* ── 가온의 오늘의 한 곡 ──
            시간대별 인사 + 날짜 기반 클래식 큐레이션 1곡 + 한 줄 코멘트.
            탭하면 가온 AI 큐레이터(/ai-consult)로 진입. 큐레이션 풀은 constants/dailyCuration.js. */}
        <Pressable
          onPress={() => router.push('/ai-consult')}
          style={({ pressed }) => [
            styles.gaonCardWrap,
            pressed && styles.cardPressed,
          ]}
        >
          <LinearGradient
            colors={[colors.surface, colors.inputBg]}
            style={styles.gaonCard}
          >
            {/* 우측 상단 데코: 가는 트레블 클레프 */}
            <View style={styles.gaonClefDecor} pointerEvents="none">
              <TrebleClefDeco color={colors.accent} />
            </View>

            {/* 인사말 */}
            <Text style={styles.gaonGreeting}>
              {greeting}{userName ? `, ${userName}님` : ''}
            </Text>

            {/* 라벨 — 양쪽 대칭 골드 라인 (콘서트 프로그램 톤) */}
            <View style={styles.gaonLabelRow}>
              <View style={styles.gaonLabelLine} />
              <Text style={styles.gaonLabel}>오늘의 한 곡</Text>
              <View style={styles.gaonLabelLine} />
            </View>

            {/* 곡명 (영문/원어 원제) + 작곡가 (원어) — 콘서트 프로그램 톤 */}
            <Text style={styles.gaonTitle} numberOfLines={2}>
              {todayPick.titleEn}
            </Text>
            <Text style={styles.gaonComposer}>{todayPick.composer}</Text>

            {/* 가온 코멘트 */}
            <Text style={styles.gaonComment} numberOfLines={3}>
              “{todayPick.comment}”
            </Text>

            {/* CTA */}
            <View style={styles.gaonCta}>
              <Text style={styles.gaonCtaText}>가온과 더 이야기하기  →</Text>
            </View>
          </LinearGradient>
        </Pressable>

        {/* ── 연습 현황 ── */}
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
                colors={[colors.surface, colors.inputBg]}
                style={styles.practiceCard}
              >
                <View style={styles.practiceIconWrap}>
                  <ClockIcon color={colors.accent} />
                </View>
                <Text style={styles.practiceValue}>
                  {statsLoading ? '...' : formatPracticeTime(todaySeconds)}
                </Text>
                <Text style={styles.practiceLabel}>오늘 연습</Text>
              </LinearGradient>
              <LinearGradient
                colors={[colors.surface, colors.inputBg]}
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
            <LinearGradient colors={[colors.surface, colors.inputBg]} style={styles.practiceEmpty}>
              <Text style={styles.practiceEmptyText}>로그인하면 연습 기록을 확인할 수 있어요</Text>
            </LinearGradient>
          )}
        </View>

        {/* ── 뉴스 섹션 ── */}
        <View style={styles.newsSection}>
          {/* 장식 디바이더 */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <OrnamentDivider width={SCREEN_W - 80} color={colors.accent} />
          </View>

          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWrap}>
              <View style={styles.goldBar} />
              <Text style={styles.sectionTitle}>NEWS</Text>
            </View>
            <TouchableOpacity onPress={fetchPosts} style={styles.refreshBtn}>
              {loading ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <RefreshIcon color={colors.textMuted} />
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
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>소식을 불러오는 중...</Text>
          </View>
        ) : (
          newsPosts.map((post) => (
            <NewsCard key={post.id} post={post} />
          ))
        )}

        <View style={{ height: 30 }} />
      </Animated.ScrollView>

      {/* ── 떠다니는 배경 음표 ──
          ScrollView 위에 absolute로 떠 있어 스크롤과 무관하게 화면에 머묾.
          opacity 0.06으로 매우 은은하게, sin loop로 천천히 위아래로 흔들림.
          pointerEvents=none으로 인터랙션 차단 X. */}
      <View pointerEvents="none" style={styles.notesOverlay}>
        <FloatingNote anim={noteAnim1} top={SCREEN_H * 0.18} left={SCREEN_W * 0.82} type="treble" size={26} color={colors.accent} />
        <FloatingNote anim={noteAnim2} top={SCREEN_H * 0.45} left={SCREEN_W * 0.06} type="single" size={20} color={colors.accent} />
        <FloatingNote anim={noteAnim3} top={SCREEN_H * 0.72} left={SCREEN_W * 0.78} type="double" size={22} color={colors.accent} />
      </View>
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 4 },

  /* ── 히어로 캐러셀 ──
     히어로는 사진 위 흰색 텍스트 구도라 다크/라이트 양쪽에서 어두운 그라디언트로
     하단 가독성을 확보 (브랜드 톤 유지). 프레임 코너만 골드 액센트 사용. */
  heroSection: {
    marginBottom: 10,
  },
  heroSlide: {
    width: SCREEN_W - 40,
    height: 260,
    borderRadius: 6,
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
  heroFrame: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  heroFrameCornerTL: {
    position: 'absolute', top: 10, left: 10,
    width: 24, height: 24,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderColor: 'rgba(201,169,110,0.5)',
  },
  heroFrameCornerTR: {
    position: 'absolute', top: 10, right: 10,
    width: 24, height: 24,
    borderTopWidth: 1, borderRightWidth: 1,
    borderColor: 'rgba(201,169,110,0.5)',
  },
  heroFrameCornerBL: {
    position: 'absolute', bottom: 10, left: 10,
    width: 24, height: 24,
    borderBottomWidth: 1, borderLeftWidth: 1,
    borderColor: 'rgba(201,169,110,0.5)',
  },
  heroFrameCornerBR: {
    position: 'absolute', bottom: 10, right: 10,
    width: 24, height: 24,
    borderBottomWidth: 1, borderRightWidth: 1,
    borderColor: 'rgba(201,169,110,0.5)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 26,
    left: 24,
    right: 24,
  },
  heroBadge: {
    backgroundColor: 'rgba(201,169,110,0.9)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 2,
    marginBottom: 10,
  },
  heroBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0C0A08',
    letterSpacing: 2.5,
  },
  heroTitle: {
    fontSize: 23,
    fontWeight: '300',
    color: '#F5F0E8',
    lineHeight: 30,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  heroSub: {
    fontSize: 12,
    color: 'rgba(201,169,110,0.9)',
    marginTop: 8,
    letterSpacing: 1,
    fontWeight: '400',
  },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.borderSoft,
    borderWidth: 0.5,
    borderColor: c.border,
  },
  indicatorActive: {
    width: 24,
    backgroundColor: c.accent,
    borderRadius: 3,
    borderColor: c.accent,
  },

  /* ── 퀵 액션 ── */
  quickRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 8,
  },
  quickCard: {
    flex: 1,
    height: 95,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  quickImage: { width: '100%', height: '100%' },
  quickGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  quickBorder: {
    position: 'absolute',
    top: 4, left: 4, right: 4, bottom: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(201,169,110,0.4)',
  },
  quickLabel: {
    position: 'absolute',
    bottom: 14,
    left: 16,
    fontSize: 13,
    fontWeight: '400',
    color: '#F5F0E8',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  /* ── 카드 누름 피드백 (퀵 액션 + 가온 카드 공용) ── */
  cardPressed: {
    transform: [{ scale: 0.975 }],
    opacity: 0.92,
  },

  /* ── 가온 "오늘의 한 곡" 카드 ── */
  gaonCardWrap: {
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  gaonCard: {
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(201,169,110,0.35)',
    position: 'relative',
  },
  gaonClefDecor: {
    position: 'absolute',
    top: 14,
    right: 16,
    opacity: 0.18,
  },
  gaonGreeting: {
    fontSize: 12,
    color: c.textMuted,
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  gaonLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  gaonLabelLine: {
    width: 22,
    height: 0.8,
    backgroundColor: c.accent,
  },
  gaonLabel: {
    fontSize: 10,
    color: c.accent,
    letterSpacing: 2.5,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  gaonTitle: {
    fontSize: 20,
    fontWeight: '300',
    color: c.text,
    letterSpacing: 0.3,
    lineHeight: 28,
    marginBottom: 4,
  },
  gaonComposer: {
    fontSize: 12,
    color: c.textSoft,
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  gaonComment: {
    fontSize: 13,
    fontStyle: 'italic',
    color: c.textSoft,
    lineHeight: 21,
    letterSpacing: 0.2,
    marginBottom: 16,
  },
  gaonCta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: c.borderSoft,
  },
  gaonCtaText: {
    fontSize: 11,
    color: c.accent,
    letterSpacing: 1.5,
    fontWeight: '500',
  },

  /* ── 떠다니는 배경 음표 오버레이 ── */
  notesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    gap: 10,
  },
  goldBar: {
    width: 2,
    height: 18,
    backgroundColor: c.accent,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: c.text,
    letterSpacing: 1.5,
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
    borderRadius: 4,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 0.5,
    borderColor: c.border,
  },
  practiceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: c.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: c.border,
  },
  practiceValue: {
    fontSize: 22,
    fontWeight: '300',
    color: c.text,
    letterSpacing: 0.5,
  },
  practiceLabel: {
    fontSize: 11,
    color: c.textMuted,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  practiceEmpty: {
    marginHorizontal: 20,
    borderRadius: 4,
    padding: 24,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: c.border,
  },
  practiceEmptyText: { fontSize: 13, color: c.textMuted, letterSpacing: 0.3 },

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
    fontSize: 14,
    color: c.textSoft,
    fontStyle: 'italic',
    paddingHorizontal: 24,
    marginBottom: 14,
    lineHeight: 22,
    letterSpacing: 0.3,
  },

  /* ── 로딩/에러 ── */
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: { fontSize: 13, color: c.textMuted },
  errorBox: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 10,
    marginHorizontal: 20,
    backgroundColor: c.bgElevated,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: c.borderSoft,
  },
  errorText: { fontSize: 14, color: c.danger },
  retryBtn: {
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: c.border,
  },
  retryText: { fontSize: 13, fontWeight: '500', color: c.accent, letterSpacing: 0.5 },
});
