import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Platform, useWindowDimensions,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';

const WP_API = 'https://www.eugeneonmusic.com/wp-json/wp/v2';

// ── SVG 아이콘 ──
function BackIcon({ size = 22, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function ExternalIcon({ size = 18, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function CalendarIcon({ size = 14, color = '#9e9282' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="17" rx="2" stroke={color} strokeWidth={2} />
      <Path d="M3 9h18M8 2v4M16 2v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
function QuaverIcon({ size = 12, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18V5l9-2v4" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="6" cy="18" r="3" fill={color} opacity={0.4} stroke={color} strokeWidth={1} />
    </Svg>
  );
}
function ChevronRightIcon({ size = 14, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// 카테고리 설정 — 통일된 골드 톤, 라벨 텍스트로만 구분
const CATEGORY_CONFIG = {
  2:  { label: 'NEWS' },
  30: { label: '공연' },
  31: { label: '대관' },
  32: { label: '강좌' },
  66: { label: '콩쿠르' },
  67: { label: '콩쿠르' },
};

function getCategoryInfo(categoryIds) {
  for (const id of (categoryIds || [])) {
    if (CATEGORY_CONFIG[id]) return CATEGORY_CONFIG[id];
  }
  return { label: '소식' };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  return `${d.getFullYear()}년 ${months[d.getMonth()]} ${d.getDate()}일`;
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8216;/g, '\u2018')
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#8220;/g, '\u201C')
    .replace(/&#8221;/g, '\u201D')
    .replace(/&#8211;/g, '\u2013')
    .replace(/&#8212;/g, '\u2014')
    .replace(/&#8230;/g, '\u2026')
    .replace(/&#\d+;/g, (m) => {
      const code = parseInt(m.replace(/&#|;/g, ''));
      return String.fromCharCode(code);
    })
    .trim();
}

// ── HTML → 네이티브 컴포넌트 파싱 ──
function parseContentToBlocks(html) {
  if (!html) return [];
  const blocks = [];

  // 이미지 추출
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/g;
  // <h1>, <h2>, <h3> 추출
  const headingRegex = /<h([1-3])[^>]*>(.*?)<\/h[1-3]>/gi;
  // <p> 추출
  const pRegex = /<p[^>]*>(.*?)<\/p>/gi;
  // <figure> with img
  const figureRegex = /<figure[^>]*>.*?<img[^>]+src=["']([^"']+)["'][^>]*>.*?<\/figure>/gi;

  // 순서대로 파싱하기 위해 전체를 블록으로 분리
  // figure 블록을 먼저 placeholder로 치환
  let processed = html;
  const figures = [];
  let figMatch;

  const figureRegex2 = /<figure[^>]*>.*?<img[^>]+src=["']([^"']+)["'][^>]*>.*?<\/figure>/gis;
  while ((figMatch = figureRegex2.exec(html)) !== null) {
    figures.push(figMatch[1]);
  }

  // HTML을 줄 단위로 분리하여 순서 유지
  const parts = html.split(/(<\/?(?:h[1-3]|p|figure|div|ul|ol|li|blockquote)[^>]*>)/i);

  let currentTag = null;
  let currentContent = '';
  let figureIndex = 0;

  // 간단한 접근: 주요 태그별로 추출
  // h1, h2, h3
  const allHeadings = [];
  let hMatch;
  const hRegex = /<h([1-3])[^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  while ((hMatch = hRegex.exec(html)) !== null) {
    allHeadings.push({ type: 'heading', level: parseInt(hMatch[1]), text: stripHtml(hMatch[2]), pos: hMatch.index });
  }

  // 이미지 (figure 내부 포함)
  const allImages = [];
  let iMatch;
  // data-src 우선, 없으면 src
  const imgRegex2 = /<img[^>]+(?:data-src|src)=["']([^"']+)["'][^>]*>/gi;
  while ((iMatch = imgRegex2.exec(html)) !== null) {
    const url = iMatch[1];
    if (url && !url.includes('data:image') && !url.includes('.svg')) {
      allImages.push({ type: 'image', url, pos: iMatch.index });
    }
  }

  // 단락
  const allParagraphs = [];
  let pMatch;
  const pRegex2 = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  while ((pMatch = pRegex2.exec(html)) !== null) {
    const text = stripHtml(pMatch[1]).trim();
    if (text && text.length > 0) {
      allParagraphs.push({ type: 'paragraph', text, pos: pMatch.index });
    }
  }

  // 리스트 아이템
  const allListItems = [];
  let liMatch;
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  while ((liMatch = liRegex.exec(html)) !== null) {
    const text = stripHtml(liMatch[1]).trim();
    if (text) {
      allListItems.push({ type: 'listItem', text, pos: liMatch.index });
    }
  }

  // 모든 블록을 위치 순서대로 정렬
  const allBlocks = [...allHeadings, ...allImages, ...allParagraphs, ...allListItems];
  allBlocks.sort((a, b) => a.pos - b.pos);

  // 중복 제거 (같은 위치 근처의 이미지)
  const seen = new Set();
  return allBlocks.filter((block) => {
    if (block.type === 'image') {
      if (seen.has(block.url)) return false;
      seen.add(block.url);
    }
    if (block.type === 'paragraph' && block.text.length < 2) return false;
    return true;
  });
}

// ── 콘텐츠 블록 렌더러 ──
function ContentBlock({ block, screenWidth }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const imageWidth = screenWidth - 40; // padding 20 each side

  if (block.type === 'heading') {
    const fontSize = block.level === 1 ? 22 : block.level === 2 ? 19 : 16;
    return (
      <View style={styles.contentHeadingWrap}>
        <View style={styles.contentHeadingAccent} />
        <Text style={[styles.contentHeading, { fontSize }]}>{block.text}</Text>
      </View>
    );
  }

  if (block.type === 'image') {
    return (
      <View style={styles.contentImageWrap}>
        <Image
          source={{ uri: block.url }}
          style={[styles.contentImage, { width: imageWidth, height: imageWidth * 0.6 }]}
          resizeMode="cover"
        />
      </View>
    );
  }

  if (block.type === 'paragraph') {
    return <Text style={styles.contentParagraph}>{block.text}</Text>;
  }

  if (block.type === 'listItem') {
    return (
      <View style={styles.contentListItem}>
        <Text style={styles.contentBullet}>◆</Text>
        <Text style={styles.contentListText}>{block.text}</Text>
      </View>
    );
  }

  return null;
}

// ── 메인 화면 ──
export default function NewsDetailScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${WP_API}/posts/${id}?_embed`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setPost(data);
    } catch (err) {
      setError('글을 불러올 수 없습니다');
    }
    setLoading(false);
  };

  const handleOpenExternal = () => {
    if (!post?.link) return;
    if (Platform.OS === 'web') {
      window.open(post.link, '_blank');
      return;
    }
    // Apple/Google 심사 대응: 외부 브라우저 대신 앱 내 WebView 사용
    router.push({
      pathname: '/webview',
      params: { url: post.link, title: stripHtml(post.title?.rendered || '') },
    });
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={handleBack}>
            <BackIcon color={colors.accent} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>소식</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>불러오는 중...</Text>
        </View>
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={handleBack}>
            <BackIcon color={colors.accent} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>소식</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || '글을 찾을 수 없습니다'}</Text>
        </View>
      </View>
    );
  }

  const title = stripHtml(post.title?.rendered || '');
  const date = formatDate(post.date);
  const categoryInfo = getCategoryInfo(post.categories);
  const featuredImage = post._embedded?.['wp:featuredmedia']?.[0]?.source_url;
  const authorName = post._embedded?.author?.[0]?.name || '';
  const contentBlocks = parseContentToBlocks(post.content?.rendered || '');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={handleBack}>
          <BackIcon color={colors.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>소식</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={handleOpenExternal}>
          <ExternalIcon color={colors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 대표 이미지 + 하단 그라디언트 페이드 */}
        {featuredImage && (
          <View style={[styles.featuredWrap, { width: screenWidth }]}>
            <Image
              source={{ uri: featuredImage }}
              style={[styles.featuredImage, { width: screenWidth }]}
              resizeMode="cover"
            />
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(17,14,11,0)', 'rgba(17,14,11,0.6)', '#110E0B']}
              locations={[0, 0.6, 1]}
              style={styles.featuredFade}
            />
          </View>
        )}

        {/* 메타 정보 */}
        <View style={styles.metaSection}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{categoryInfo.label}</Text>
          </View>

          <Text style={styles.title}>{title}</Text>

          {/* 골드 장식 — 선 ◇ 선 */}
          <View style={styles.titleOrnament}>
            <View style={styles.goldLine} />
            <View style={styles.goldDiamond} />
            <View style={styles.goldLine} />
          </View>

          <View style={styles.metaRow}>
            <CalendarIcon color={colors.textMuted} />
            <Text style={styles.metaText}>{date}</Text>
            {authorName ? (
              <>
                <View style={styles.metaSep}>
                  <QuaverIcon size={11} color={colors.textHint} />
                </View>
                <Text style={styles.metaText}>{authorName}</Text>
              </>
            ) : null}
          </View>
        </View>

        {/* 구분선 */}
        <View style={styles.divider} />

        {/* 본문 콘텐츠 */}
        <View style={styles.contentSection}>
          {contentBlocks.length > 0 ? (
            contentBlocks.map((block, i) => (
              <ContentBlock key={i} block={block} screenWidth={screenWidth} />
            ))
          ) : (
            <Text style={styles.contentParagraph}>
              {stripHtml(post.excerpt?.rendered || '')}
            </Text>
          )}
        </View>

        {/* 원본 링크 */}
        <TouchableOpacity style={styles.originalLink} onPress={handleOpenExternal} activeOpacity={0.8}>
          <View style={styles.originalLinkLeft}>
            <ExternalIcon size={15} color={colors.accent} />
            <Text style={styles.originalLinkText}>원본 글 보기</Text>
          </View>
          <ChevronRightIcon size={14} color={colors.accent} />
        </TouchableOpacity>
        <Text style={styles.originalLinkSub}>eugeneonmusic.com</Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },

  /* 헤더 */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: c.surfaceStrong,
    gap: 8,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 16, fontWeight: '400', color: c.text, letterSpacing: 0.3,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: c.textMuted },
  errorText: { fontSize: 14, color: '#f87171' },

  scrollContent: { paddingBottom: 20 },

  /* 대표 이미지 */
  featuredWrap: {
    position: 'relative',
    backgroundColor: c.bg,
  },
  featuredImage: {
    height: 260,
    backgroundColor: c.surface,
  },
  featuredFade: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: 120,
  },

  /* 메타 */
  metaSection: {
    paddingHorizontal: 22, paddingTop: 6, gap: 14,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 11, paddingVertical: 4,
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(201,169,110,0.55)',
    backgroundColor: c.inputBg,
  },
  categoryText: {
    fontSize: 10, fontWeight: '500', color: c.accent,
    letterSpacing: 2,
  },
  title: {
    fontSize: 23, fontWeight: '300', color: c.text,
    lineHeight: 32, letterSpacing: 0.4,
  },
  titleOrnament: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: -2, marginBottom: 2,
  },
  goldLine: {
    height: 0.5, width: 28,
    backgroundColor: 'rgba(201,169,110,0.55)',
  },
  goldDiamond: {
    width: 5, height: 5,
    backgroundColor: c.accent,
    transform: [{ rotate: '45deg' }],
  },
  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  metaText: {
    fontSize: 12, color: c.textMuted, letterSpacing: 0.4,
  },
  metaSep: {
    paddingHorizontal: 2,
  },

  /* 구분선 */
  divider: {
    height: 0.5, backgroundColor: 'rgba(201,169,110,0.12)',
    marginHorizontal: 22, marginVertical: 22,
  },

  /* 본문 */
  contentSection: {
    paddingHorizontal: 22, gap: 16,
  },
  contentHeadingWrap: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, marginTop: 10, paddingLeft: 2,
  },
  contentHeadingAccent: {
    width: 2, alignSelf: 'stretch',
    backgroundColor: c.accent,
    marginTop: 6, marginBottom: 6,
    borderRadius: 1,
  },
  contentHeading: {
    flex: 1, fontWeight: '400', color: c.text,
    lineHeight: 28, letterSpacing: 0.3,
  },
  contentParagraph: {
    fontSize: 15, color: c.textSoft, lineHeight: 27, letterSpacing: 0.2,
  },
  contentImageWrap: {
    marginVertical: 10, borderRadius: 4, overflow: 'hidden',
    alignSelf: 'center',
    borderWidth: 0.5, borderColor: c.border,
  },
  contentImage: {
    borderRadius: 4, backgroundColor: c.surface,
  },
  contentListItem: {
    flexDirection: 'row', gap: 10, paddingLeft: 4,
  },
  contentBullet: {
    fontSize: 10, color: c.accent, lineHeight: 27,
    paddingTop: 1,
  },
  contentListText: { fontSize: 15, color: c.textSoft, lineHeight: 27, flex: 1 },

  /* 원본 링크 */
  originalLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 28, marginHorizontal: 22,
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 2,
    borderWidth: 0.5, borderColor: c.accentMuted,
    backgroundColor: 'rgba(201,169,110,0.04)',
  },
  originalLinkLeft: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  originalLinkText: {
    fontSize: 13, color: c.accent, fontWeight: '400', letterSpacing: 1.2,
  },
  originalLinkSub: {
    fontSize: 11, color: '#6d6558', letterSpacing: 0.8,
    textAlign: 'center', marginTop: 8,
  },
});
