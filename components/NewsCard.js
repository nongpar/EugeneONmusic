import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { router } from 'expo-router';
import { useTheme } from '../hooks/useTheme';

// ── SVG 아이콘 ──
function NewsIcon({ size = 12, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 4h16v16H4z" stroke={color} strokeWidth={2} />
      <Path d="M8 8h8M8 12h5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
function EventIcon({ size = 12, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="17" rx="2" stroke={color} strokeWidth={2} />
      <Path d="M3 9h18M8 2v4M16 2v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
function MusicIcon({ size = 12, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18V5l12-2v13" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="6" cy="18" r="3" stroke={color} strokeWidth={2} />
      <Circle cx="18" cy="16" r="3" stroke={color} strokeWidth={2} />
    </Svg>
  );
}
function TrophyIcon({ size = 12, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9H3a1 1 0 01-1-1V5a1 1 0 011-1h3M18 9h3a1 1 0 001-1V5a1 1 0 00-1-1h-3M6 4h12v6a6 6 0 01-12 0V4zM12 16v3M8 21h8" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function BookIcon({ size = 12, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 016.5 17H20" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

// 카테고리 ID → 디자인 매핑
const CATEGORY_CONFIG = {
  2:  { label: 'NEWS', icon: NewsIcon, color: '#3498db' },
  30: { label: '공연', icon: EventIcon, color: '#e74c3c' },
  31: { label: '대관', icon: BookIcon, color: '#2ecc71' },
  32: { label: '강좌', icon: MusicIcon, color: '#9b59b6' },
  66: { label: '콩쿠르', icon: TrophyIcon, color: '#C9A96E' },
  67: { label: '콩쿠르', icon: TrophyIcon, color: '#C9A96E' },
};

const DEFAULT_CONFIG = { label: '소식', icon: NewsIcon, color: '#C9A96E' };

function getCategoryConfig(categoryIds) {
  if (!categoryIds || categoryIds.length === 0) return DEFAULT_CONFIG;
  // 첫 번째 매칭되는 카테고리 사용
  for (const id of categoryIds) {
    if (CATEGORY_CONFIG[id]) return CATEGORY_CONFIG[id];
  }
  return DEFAULT_CONFIG;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
}

export default function NewsCard({ post, isHeadline, onPress }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const title = post?.title?.rendered
    ? stripHtml(post.title.rendered)
    : (post?.title || '');
  const excerpt = post?.excerpt?.rendered
    ? stripHtml(post.excerpt.rendered)
    : (post?.summary || '');
  const date = formatDate(post?.date);
  const categoryIds = post?.categories || [];
  const config = getCategoryConfig(categoryIds);
  const IconComponent = config.icon;
  const imageUrl = post?._embedded?.['wp:featuredmedia']?.[0]?.source_url
    || post?.featuredImage || null;
  const link = post?.link || '';

  const handlePress = () => {
    if (onPress) {
      onPress(post);
    } else if (post?.id) {
      router.push(`/news/${post.id}`);
    }
  };

  if (isHeadline) {
    return (
      <TouchableOpacity style={styles.headlineCard} onPress={handlePress} activeOpacity={0.8}>
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.headlineImage} resizeMode="cover" />
        )}
        <View style={[styles.headlineOverlay, imageUrl && styles.headlineOverlayWithImage]}>
          <View style={[styles.categoryBadge, { backgroundColor: config.color }]}>
            <IconComponent size={11} color="#fff" />
            <Text style={styles.categoryText}>{config.label}</Text>
          </View>
          <Text style={styles.headlineTitle} numberOfLines={2}>{title}</Text>
          {excerpt ? (
            <Text style={styles.headlineSummary} numberOfLines={2}>{excerpt}</Text>
          ) : null}
          <Text style={styles.dateText}>{date}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.cardContent}>
        <View style={styles.cardLeft}>
          <View style={[styles.categoryBadge, { backgroundColor: config.color }]}>
            <IconComponent size={11} color="#fff" />
            <Text style={styles.categoryText}>{config.label}</Text>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
          <Text style={styles.dateText}>{date}</Text>
        </View>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.cardThumb} resizeMode="cover" />
        ) : (
          <View style={[styles.cardIcon, { backgroundColor: config.color + '20' }]}>
            <IconComponent size={24} color={config.color} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (c) => StyleSheet.create({
  headlineCard: {
    borderRadius: 4,
    marginHorizontal: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: c.border,
    position: 'relative',
  },
  headlineImage: {
    width: '100%',
    height: 180,
  },
  headlineOverlay: {
    padding: 20,
    gap: 8,
    backgroundColor: c.surface,
  },
  // 사진 위 오버레이 — 다크 모드에서는 어둡게, 라이트 모드에서는 크림으로
  headlineOverlayWithImage: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: c.name === 'dark' ? 'rgba(12,10,8,0.85)' : 'rgba(245,239,227,0.92)',
    padding: 16,
  },
  headlineTitle: {
    fontSize: 17,
    fontWeight: '400',
    color: c.text,
    lineHeight: 24,
    letterSpacing: 0.3,
  },
  headlineSummary: {
    fontSize: 13,
    color: c.textMuted,
    lineHeight: 19,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 4,
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 14,
    borderWidth: 0.5,
    borderColor: c.borderSoft,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flex: 1,
    gap: 6,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: c.text,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  cardThumb: {
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: c.surfaceStrong,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '400',
    color: '#F5F0E8',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 11,
    color: c.textMuted,
  },
});
