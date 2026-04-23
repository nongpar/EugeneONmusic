import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';

const GOLD = '#C9A96E';
const GOLD_DIM = 'rgba(201,169,110,0.6)';

// SVG 아이콘들 — 골드 톤 통일
function CalendarIcon({ size = 22, color = GOLD }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="17" rx="2" stroke={color} strokeWidth={1.8} />
      <Line x1="3" y1="9" x2="21" y2="9" stroke={color} strokeWidth={1.5} />
      <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
function NoteIcon({ size = 22, color = GOLD }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={color} strokeWidth={1.8} />
      <Polyline points="14,2 14,8 20,8" stroke={color} strokeWidth={1.8} />
      <Line x1="8" y1="13" x2="16" y2="13" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1="8" y1="17" x2="12" y2="17" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}
function TaskIcon({ size = 22, color = GOLD }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 11l3 3L22 4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}
function CommunityIcon({ size = 22, color = GOLD }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="7" r="3" stroke={color} strokeWidth={1.8} />
      <Path d="M3 21v-1a5 5 0 0110 0v1" stroke={color} strokeWidth={1.8} />
      <Circle cx="17" cy="9" r="2.5" stroke={color} strokeWidth={1.5} />
      <Path d="M21 21v-1a3.5 3.5 0 00-4-3.5" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}
function ChatIcon({ size = 22, color = GOLD }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke={color} strokeWidth={1.8} />
      <Line x1="8" y1="9" x2="16" y2="9" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1="8" y1="13" x2="13" y2="13" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}
function TimerIcon({ size = 22, color = GOLD }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="13" r="8" stroke={color} strokeWidth={1.8} />
      <Path d="M12 9v4l2.5 2.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1="12" y1="2" x2="12" y2="4" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="10" y1="2" x2="14" y2="2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
function SheetIcon({ size = 22, color = GOLD }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="2" width="16" height="20" rx="2" stroke={color} strokeWidth={1.8} />
      <Circle cx="10" cy="10" r="2" stroke={color} strokeWidth={1.5} />
      <Path d="M12 10V7" stroke={color} strokeWidth={1.5} />
      <Circle cx="14" cy="14" r="2" stroke={color} strokeWidth={1.5} />
      <Path d="M16 14V11" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}
function VideoIcon({ size = 22, color = GOLD }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="5" width="15" height="14" rx="2" stroke={color} strokeWidth={1.8} />
      <Path d="M17 9l5-3v12l-5-3V9z" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}
function MentorManageIcon({ size = 22, color = GOLD }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth={2} />
      <Line x1="20" y1="8" x2="20" y2="14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="23" y1="11" x2="17" y2="11" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
function ChevronIcon({ size = 16, color = 'rgba(201,169,110,0.3)' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// 장식 디바이더
function OrnamentLine() {
  return (
    <View style={styles.ornamentLine}>
      <View style={styles.ornamentLeft} />
      <View style={styles.ornamentDot} />
      <View style={styles.ornamentRight} />
    </View>
  );
}

function MenuCard({ icon, title, subtitle, onPress }) {
  return (
    <TouchableOpacity style={styles.menuCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuIconWrap}>
        {icon}
      </View>
      <View style={styles.menuText}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <ChevronIcon />
    </TouchableOpacity>
  );
}

export default function LessonScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>레슨</Text>
        <Text style={styles.headerSub}>SCHEDULE  ·  NOTE  ·  STUDY</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 선생님 전용: 멘토 관리 */}
        {isTeacher && (
          <>
            <Text style={styles.sectionTitle}>선생님 메뉴</Text>
            <MenuCard
              icon={<MentorManageIcon />}
              title="멘토 관리"
              subtitle="학생 멘토 신청 확인 및 배정"
              onPress={() => router.push('/mentor')}
            />
          </>
        )}

        {/* 레슨 관리 */}
        <Text style={styles.sectionTitle}>레슨 관리</Text>
        <MenuCard
          icon={<CalendarIcon />}
          title="레슨 스케줄"
          subtitle="다음 레슨 일정을 확인하세요"
          onPress={() => router.push('/lesson/schedule')}
        />
        <MenuCard
          icon={<NoteIcon />}
          title="레슨 노트"
          subtitle="선생님과 학생이 남긴 피드백"
          onPress={() => router.push('/lesson/notes')}
        />
        <MenuCard
          icon={<TaskIcon />}
          title="과제 목록"
          subtitle="이번 주 연습 과제"
          onPress={() => router.push('/lesson/assignments')}
        />

        <OrnamentLine />

        {/* 연습 */}
        <Text style={styles.sectionTitle}>연습</Text>
        <MenuCard
          icon={<TimerIcon />}
          title="연습 타이머"
          subtitle="연습 시간을 기록하세요"
          onPress={() => router.push('/practice')}
        />

        <OrnamentLine />

        {/* 소통 */}
        <Text style={styles.sectionTitle}>소통</Text>
        <MenuCard
          icon={<CommunityIcon />}
          title="커뮤니티"
          subtitle="질문, 후기, 정보를 나눠보세요"
          onPress={() => router.push('/community')}
        />
        <MenuCard
          icon={<ChatIcon />}
          title="1:1 멘토링 채팅"
          subtitle="멘토 신청 후 담당 선생님과 대화하세요"
          onPress={() => router.push('/chat')}
        />

        <OrnamentLine />

        {/* 학습 자료 */}
        <Text style={styles.sectionTitle}>학습 자료</Text>
        <MenuCard
          icon={<SheetIcon />}
          title="악보 라이브러리"
          subtitle="나만의 악보 컬렉션"
          onPress={() => router.push('/lesson/sheet-music')}
        />
        <MenuCard
          icon={<VideoIcon />}
          title="레슨 영상"
          subtitle="연습 영상 업로드 · 다시보기"
          onPress={() => router.push('/lesson/videos')}
        />

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
  headerTitle: {
    fontSize: 22, fontWeight: '300', color: '#F5F0E8', letterSpacing: 1,
  },
  headerSub: {
    fontSize: 10, color: GOLD, marginTop: 4, fontWeight: '400', letterSpacing: 2.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 540,
  },
  sectionTitle: {
    fontSize: 10, fontWeight: '500', color: GOLD_DIM,
    textTransform: 'uppercase', letterSpacing: 2.5,
    marginTop: 24, marginBottom: 12,
  },

  // 장식 디바이더
  ornamentLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
    gap: 8,
  },
  ornamentLeft: {
    flex: 1, height: 0.5,
    backgroundColor: 'rgba(201,169,110,0.2)',
  },
  ornamentDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(201,169,110,0.3)',
  },
  ornamentRight: {
    flex: 1, height: 0.5,
    backgroundColor: 'rgba(201,169,110,0.2)',
  },

  // 메뉴 카드
  menuCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(201,169,110,0.07)',
    borderRadius: 4, padding: 16,
    marginBottom: 8, gap: 14,
    borderWidth: 0.5, borderColor: 'rgba(201,169,110,0.18)',
  },
  menuIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(201,169,110,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: 'rgba(201,169,110,0.25)',
  },
  menuText: { flex: 1, gap: 3 },
  menuTitle: {
    fontSize: 15, fontWeight: '400', color: '#F5F0E8', letterSpacing: 0.3,
  },
  menuSubtitle: {
    fontSize: 12, color: '#9e9282', letterSpacing: 0.2,
  },
});
