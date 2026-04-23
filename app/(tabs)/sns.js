import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking,
  Image, ActivityIndicator, Platform,
} from 'react-native';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

let Haptics = null;
if (Platform.OS !== 'web') {
  try { Haptics = require('expo-haptics'); } catch {}
}

const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
const CHANNEL_ID = 'UCK6jLVvnwAMA5lpuUYShWog';

const SNS_CHANNELS = [
  { id: 'youtube', name: 'YouTube', color: '#FF0000', url: 'https://www.youtube.com/@eugeneonmusic22' },
  { id: 'blog', name: 'Blog', color: '#03C75A', url: 'https://blog.naver.com/eugeneonmusic' },
  { id: 'wordpress', name: 'Web', color: '#21759B', url: 'https://www.eugeneonmusic.com' },
  { id: 'instagram', name: 'Instagram', color: '#E4405F', url: 'https://www.instagram.com/eugeneonmusic/' },
];

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
}

function formatPubDate(dateStr) {
  try {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  } catch {
    return dateStr;
  }
}

async function fetchBlogPosts() {
  const RSS_URL = 'https://rss.blog.naver.com/eugeneonmusic';

  let xml = '';
  if (Platform.OS === 'web') {
    // 웹에서는 CORS 프록시 사용 (여러 프록시 순차 시도)
    const proxies = [
      `https://api.codetabs.com/v1/proxy?quest=${RSS_URL}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(RSS_URL)}`,
    ];
    let fetched = false;
    for (const proxyUrl of proxies) {
      try {
        const res = await fetch(proxyUrl);
        if (res.ok) {
          xml = await res.text();
          fetched = true;
          break;
        }
      } catch { /* try next proxy */ }
    }
    if (!fetched) throw new Error('All CORS proxies failed');
  } else {
    // 네이티브(Android/iOS)는 직접 호출
    const res = await fetch(RSS_URL);
    xml = await res.text();
  }

  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]>/) || block.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
    const rawLink = (block.match(/<link><!\[CDATA\[([\s\S]*?)\]\]>/) || block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
    // link 태그 밖에 있는 URL 형태도 처리 (일부 RSS는 <link/>https://... 형태)
    const link = rawLink.trim() || (block.match(/https?:\/\/blog\.naver\.com[^\s<"']*/)?.[0] || '');
    const description = (block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]>/) || block.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '';
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '';

    // description 안의 <img src="..."> 에서 썸네일 추출
    const thumbnailMatch = description.match(/<img\s+[^>]*src=["']([^"']+)["']/);
    let thumbnail = thumbnailMatch ? thumbnailMatch[1] : null;
    if (thumbnail) {
      // 네이버 이미지는 외부 사이트에서 핫링크 차단됨 → 이미지 프록시 경유
      thumbnail = `https://wsrv.nl/?url=${encodeURIComponent(thumbnail)}&w=200&h=200&fit=cover`;
    }

    items.push({
      id: link || String(items.length),
      title: stripHtml(title),
      link: link.trim(),
      preview: stripHtml(description),
      date: formatPubDate(pubDate),
      source: 'Naver Blog',
      sourceColor: '#03C75A',
      thumbnail,
    });
  }
  return items;
}

// SVG 아이콘들
function YouTubeIcon({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="4" width="20" height="16" rx="4" fill="#FF0000" />
      <Path d="M10 8.5v7l5.5-3.5L10 8.5z" fill="#fff" />
    </Svg>
  );
}
function BlogIcon({ size = 20, color = '#03C75A' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" stroke={color} strokeWidth={1.8} />
      <Line x1="6" y1="9" x2="18" y2="9" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1="6" y1="13" x2="14" y2="13" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1="6" y1="17" x2="10" y2="17" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}
function WebIcon({ size = 20, color = '#21759B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.8} />
      <Path d="M2.5 12h19M12 3c-3 3-3 15 0 18M12 3c3 3 3 15 0 18" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}
function InstaIcon({ size = 20, color = '#E4405F' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="18" height="18" rx="5" stroke={color} strokeWidth={1.8} />
      <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={1.8} />
      <Circle cx="17.5" cy="6.5" r="1.2" fill={color} />
    </Svg>
  );
}
function PlayIcon({ size = 36 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="11" fill="rgba(0,0,0,0.4)" />
      <Path d="M10 8l6 4-6 4V8z" fill="rgba(255,255,255,0.9)" />
    </Svg>
  );
}
function ArrowIcon({ size = 16, color = 'rgba(201,169,110,0.3)' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 17L17 7M17 7H7M17 7v10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const channelIcons = {
  youtube: (s) => <YouTubeIcon size={s} />,
  blog: (s) => <BlogIcon size={s} />,
  wordpress: (s) => <WebIcon size={s} />,
  instagram: (s) => <InstaIcon size={s} />,
};

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  if (diffWeek < 5) return `${diffWeek}주 전`;
  return `${diffMonth}개월 전`;
}

function formatViews(count) {
  const num = parseInt(count, 10);
  if (num >= 10000) return `${(num / 10000).toFixed(1)}만회`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}천회`;
  return `${num}회`;
}

function VideoCard({ video }) {
  return (
    <TouchableOpacity
      style={styles.videoCard}
      onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${video.videoId}`)}
      activeOpacity={0.7}
    >
      <View style={styles.thumbnailBox}>
        <Image source={{ uri: video.thumbnail }} style={styles.thumbnailImage} resizeMode="cover" />
        <View style={styles.playOverlay}>
          <PlayIcon />
        </View>
      </View>
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
        <Text style={styles.videoMeta}>{video.channel} · {video.views} · {video.date}</Text>
      </View>
    </TouchableOpacity>
  );
}

function BlogThumb({ uri }) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return (
      <View style={[styles.blogThumb, styles.blogThumbPlaceholder]}>
        <BlogIcon size={24} color="#3a4a5a" />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={styles.blogThumb}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

function BlogCard({ post }) {
  const handlePress = () => {
    if (post.link) {
      // 앱 내 블로그 미리보기
      router.push({
        pathname: '/blog/[id]',
        params: { id: `blog-${Date.now()}`, title: post.title, url: post.link },
      });
    }
  };

  return (
    <TouchableOpacity style={styles.blogCard} activeOpacity={0.7} onPress={handlePress}>
      <View style={styles.blogRow}>
        <BlogThumb uri={post.thumbnail} />
        <View style={styles.blogContent}>
          <View style={styles.blogHeader}>
            <View style={[styles.sourceBadge, { backgroundColor: post.sourceColor + '15' }]}>
              <Text style={[styles.sourceText, { color: post.sourceColor }]}>{post.source}</Text>
            </View>
            <Text style={styles.blogDate}>{post.date}</Text>
          </View>
          <Text style={styles.blogTitle} numberOfLines={2}>{post.title}</Text>
          <Text style={styles.blogPreview} numberOfLines={2}>{post.preview}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function SNSScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('all');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blogPosts, setBlogPosts] = useState([]);
  const [blogLoading, setBlogLoading] = useState(true);
  const [blogError, setBlogError] = useState(false);

  useEffect(() => { fetchYouTubeVideos(); loadBlogPosts(); }, []);

  const loadBlogPosts = async () => {
    try {
      setBlogLoading(true);
      setBlogError(false);
      const posts = await fetchBlogPosts();
      setBlogPosts(posts);
    } catch (e) {
      setBlogError(true);
    } finally {
      setBlogLoading(false);
    }
  };

  const fetchYouTubeVideos = async () => {
    try {
      setLoading(true);
      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&order=date&maxResults=6&type=video&key=${YOUTUBE_API_KEY}`
      );
      const searchData = await searchRes.json();
      if (!searchData.items) { setLoading(false); return; }

      const videoIds = searchData.items.map((item) => item.id.videoId).join(',');
      const detailRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
      );
      const detailData = await detailRes.json();

      const merged = searchData.items.map((item) => {
        const detail = detailData.items?.find((d) => d.id === item.id.videoId);
        return {
          videoId: item.id.videoId,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails.high.url,
          date: timeAgo(item.snippet.publishedAt),
          views: formatViews(detail?.statistics?.viewCount || '0'),
        };
      });
      setVideos(merged);
    } catch (e) { /* YouTube fetch failed */ }
    finally { setLoading(false); }
  };

  const tabs = [
    { key: 'all', label: '전체' },
    { key: 'youtube', label: 'YouTube' },
    { key: 'blog', label: '블로그' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SNS</Text>
        <Text style={styles.headerSub}>CHANNEL  ·  VIDEO  ·  BLOG</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 채널 바로가기 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.channelRow}>
          {SNS_CHANNELS.map((ch) => (
            <TouchableOpacity key={ch.id} style={styles.channelChip} onPress={() => Linking.openURL(ch.url)}>
              <View style={[styles.channelChipIcon, { backgroundColor: ch.color + '15' }]}>
                {channelIcons[ch.id](22)}
              </View>
              <Text style={styles.channelChipLabel}>{ch.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 탭 필터 */}
        <View style={styles.tabRow}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
              onPress={() => { if (Haptics) Haptics.selectionAsync(); setActiveTab(tab.key); }}
            >
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* YouTube */}
        {(activeTab === 'all' || activeTab === 'youtube') && (
          <>
            <View style={styles.sectionHeader}>
              <YouTubeIcon size={18} />
              <Text style={styles.sectionTitleText}>최신 영상</Text>
            </View>
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#C9A96E" />
                <Text style={styles.loadingText}>영상을 불러오는 중...</Text>
              </View>
            ) : (
              videos.map((v) => <VideoCard key={v.videoId} video={v} />)
            )}
          </>
        )}

        {/* 블로그 */}
        {(activeTab === 'all' || activeTab === 'blog') && (
          <>
            <View style={styles.sectionHeader}>
              <BlogIcon size={18} />
              <Text style={styles.sectionTitleText}>블로그 포스트</Text>
            </View>
            {blogLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#C9A96E" />
                <Text style={styles.loadingText}>블로그 글을 불러오는 중...</Text>
              </View>
            ) : blogError ? (
              <View style={styles.loadingBox}>
                <Text style={styles.loadingText}>블로그 글을 불러올 수 없습니다</Text>
              </View>
            ) : (
              blogPosts.map((p) => <BlogCard key={p.id} post={p} />)
            )}
          </>
        )}

        {/* 채널 목록 */}
        {activeTab === 'all' && (
          <>
            <Text style={styles.sectionLabel}>모든 채널</Text>
            {SNS_CHANNELS.map((ch) => (
              <TouchableOpacity key={ch.id} style={styles.channelCard} onPress={() => Linking.openURL(ch.url)}>
                <View style={[styles.channelCardIcon, { backgroundColor: ch.color + '15' }]}>
                  {channelIcons[ch.id](22)}
                </View>
                <View style={styles.channelCardInfo}>
                  <Text style={styles.channelCardName}>{ch.name}</Text>
                </View>
                <ArrowIcon />
              </TouchableOpacity>
            ))}
          </>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#110E0B' },
  header: {
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 14,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(201,169,110,0.15)',
  },
  headerTitle: { fontSize: 22, fontWeight: '300', color: '#F5F0E8', letterSpacing: 1 },
  headerSub: { fontSize: 10, color: '#C9A96E', marginTop: 4, fontWeight: '400', letterSpacing: 2.5 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 540,
  },

  channelRow: { gap: 16, paddingVertical: 16 },
  channelChip: { alignItems: 'center', gap: 6, width: 68 },
  channelChipIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(201,169,110,0.18)' },
  channelChipLabel: { fontSize: 11, color: '#9e9282', fontWeight: '400', letterSpacing: 0.3 },

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, backgroundColor: 'rgba(201,169,110,0.07)', borderWidth: 0.5, borderColor: 'rgba(201,169,110,0.18)' },
  tabBtnActive: { backgroundColor: 'transparent', borderColor: '#C9A96E' },
  tabLabel: { fontSize: 13, fontWeight: '400', color: '#9e9282', letterSpacing: 0.3 },
  tabLabelActive: { color: '#C9A96E' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4 },
  sectionTitleText: { fontSize: 16, fontWeight: '400', color: '#F5F0E8', letterSpacing: 0.3 },
  sectionLabel: { fontSize: 10, fontWeight: '500', color: 'rgba(201,169,110,0.6)', textTransform: 'uppercase', letterSpacing: 2.5, marginTop: 24, marginBottom: 12 },

  loadingBox: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingText: { fontSize: 13, color: '#9e9282' },

  videoCard: { backgroundColor: 'rgba(201,169,110,0.07)', borderRadius: 4, marginBottom: 12, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(201,169,110,0.18)' },
  thumbnailBox: { height: 200, backgroundColor: '#0C0A08', position: 'relative' },
  thumbnailImage: { width: '100%', height: '100%' },
  playOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  videoInfo: { padding: 14, gap: 6 },
  videoTitle: { fontSize: 14, fontWeight: '400', color: '#F5F0E8', lineHeight: 20, letterSpacing: 0.2 },
  videoMeta: { fontSize: 12, color: '#9e9282' },

  blogCard: { backgroundColor: 'rgba(201,169,110,0.07)', borderRadius: 4, padding: 12, marginBottom: 10, borderWidth: 0.5, borderColor: 'rgba(201,169,110,0.18)' },
  blogRow: { flexDirection: 'row', gap: 12 },
  blogThumb: { width: 80, height: 80, borderRadius: 4, backgroundColor: '#0C0A08', overflow: 'hidden' },
  blogThumbPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(201,169,110,0.04)' },
  blogContent: { flex: 1, gap: 6 },
  blogHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sourceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2 },
  sourceText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  blogDate: { fontSize: 11, color: '#9e9282' },
  blogTitle: { fontSize: 14, fontWeight: '400', color: '#F5F0E8', lineHeight: 20, letterSpacing: 0.2 },
  blogPreview: { fontSize: 12, color: '#9e9282', lineHeight: 17 },

  channelCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(201,169,110,0.07)', borderRadius: 4, padding: 14, marginBottom: 8, gap: 14, borderWidth: 0.5, borderColor: 'rgba(201,169,110,0.18)' },
  channelCardIcon: { width: 42, height: 42, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  channelCardInfo: { flex: 1 },
  channelCardName: { fontSize: 14, fontWeight: '400', color: '#F5F0E8', letterSpacing: 0.3 },
});
