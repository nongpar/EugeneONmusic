import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';

function BackIcon({ size = 24, color = '#F5F0E8' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <BackIcon color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>개인정보처리방침</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.updatedAt}>시행일: 2026년 4월 23일</Text>

        <Text style={styles.intro}>
          EON International Music(이하 "회사")는 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
        </Text>

        <Text style={styles.sectionTitle}>제1조 (개인정보의 처리 목적)</Text>
        <Text style={styles.body}>
          회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
        </Text>
        <Text style={styles.listItem}>1. 회원 가입 및 관리: 회원 가입의사 확인, 본인 식별·인증, 회원자격 유지·관리, 서비스 부정이용 방지</Text>
        <Text style={styles.listItem}>2. 서비스 제공: 레슨 스케줄 관리, 레슨 노트 제공, 과제 관리, 연습 기록 저장, 1:1 멘토링 채팅, 커뮤니티 운영</Text>
        <Text style={styles.listItem}>3. AI 음악 큐레이션(가온) 서비스 제공: 공연·레슨·대관 상담, 맞춤 기획 제안, 신청서 접수 및 관리자 전달</Text>
        <Text style={styles.listItem}>4. 마케팅 및 광고 활용: 이벤트·광고성 정보 제공 및 참여기회 제공(선택 동의 시)</Text>

        <Text style={styles.sectionTitle}>제2조 (수집하는 개인정보의 항목)</Text>
        <Text style={styles.body}>회사는 다음의 개인정보 항목을 수집하고 있습니다.</Text>
        <Text style={styles.listItem}>- 필수항목: 이메일 주소, 비밀번호, 이름(닉네임)</Text>
        <Text style={styles.listItem}>- 선택항목: 프로필 사진, 전화번호</Text>
        <Text style={styles.listItem}>- 자동수집항목: 기기 정보(OS, 기기 모델), 앱 사용 기록, 푸시 토큰</Text>
        <Text style={styles.listItem}>- AI 음악 큐레이션 이용 시: 이용자가 입력한 대화 내용, 신청서에 기입한 이름·연락처·선호 연락 방식, AI가 생성한 취향·일정·예산 요약, 이용 횟수 및 시각</Text>

        <Text style={styles.sectionTitle}>제3조 (개인정보의 처리 및 보유기간)</Text>
        <Text style={styles.body}>
          회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의 받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
        </Text>
        <Text style={styles.listItem}>- 회원 정보: 회원 탈퇴 시까지 (탈퇴 후 즉시 파기)</Text>
        <Text style={styles.listItem}>- 레슨 기록: 서비스 이용 종료 후 1년</Text>
        <Text style={styles.listItem}>- 연습 기록: 서비스 이용 종료 후 1년</Text>
        <Text style={styles.listItem}>- AI 상담 대화 기록 및 신청서: 상담 완료 후 1년 (상담 품질 개선·사후 문의 대응 목적). 이용자 요청 시 즉시 파기</Text>
        <Text style={styles.listItem}>- AI 상담 이용 횟수 기록: 일일 한도 관리 목적으로 당일 24시까지 보관 후 자동 초기화</Text>

        <Text style={styles.sectionTitle}>제4조 (개인정보의 제3자 제공)</Text>
        <Text style={styles.body}>
          회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 다음의 경우에는 예외로 합니다.
        </Text>
        <Text style={styles.listItem}>- 이용자가 사전에 동의한 경우</Text>
        <Text style={styles.listItem}>- 법률에 특별한 규정이 있는 경우</Text>

        <Text style={styles.sectionTitle}>제5조 (개인정보 처리의 위탁 및 국외이전)</Text>
        <Text style={styles.body}>
          회사는 서비스 제공을 위해 아래와 같이 개인정보 처리를 위탁하며, 일부 수탁업체의 서버는 해외에 위치합니다. 이용자는 AI 상담 기능을 이용함으로써 아래 국외이전에 동의한 것으로 간주됩니다. 원치 않을 경우 AI 상담 기능을 이용하지 않으시면 됩니다.
        </Text>
        <Text style={styles.listItem}>① 수탁자: Google LLC (Firebase / Google Cloud Platform)</Text>
        <Text style={styles.subItem}>- 위탁 업무: 계정 인증, 데이터베이스(Firestore), 클라우드 함수 실행, 푸시 알림 전송</Text>
        <Text style={styles.subItem}>- 이전되는 항목: 본 방침 제2조의 필수·선택·자동수집항목 및 AI 관련 항목</Text>
        <Text style={styles.subItem}>- 이전 국가/서버: 미국, 한국(asia-northeast3)</Text>
        <Text style={styles.subItem}>- 이전 방법: HTTPS(TLS) 암호화 통신</Text>
        <Text style={styles.subItem}>- 보유 기간: 서비스 제공 목적 달성 시 또는 회원 탈퇴 시까지</Text>

        <Text style={styles.listItem}>② 수탁자: Anthropic, PBC (Claude API)</Text>
        <Text style={styles.subItem}>- 위탁 업무: AI 음악 큐레이션(가온) 대화 생성</Text>
        <Text style={styles.subItem}>- 이전되는 항목: 이용자가 AI 상담창에 입력한 대화 내용</Text>
        <Text style={styles.subItem}>- 이전 국가: 미국</Text>
        <Text style={styles.subItem}>- 이전 방법: HTTPS(TLS) 암호화 통신</Text>
        <Text style={styles.subItem}>- 보유 기간: Anthropic 정책상 최대 30일. 회사는 대화 내용을 모델 학습 목적으로 제공하지 않습니다.</Text>

        <Text style={styles.listItem}>③ 수탁자: WordPress(회사 자체 운영 서버, eon-music.com)</Text>
        <Text style={styles.subItem}>- 위탁 업무: 강좌 수강, 회원 계정 통합 관리</Text>
        <Text style={styles.subItem}>- 이전되는 항목: 계정 식별자, 역할, 이메일</Text>
        <Text style={styles.subItem}>- 서버 위치: 국내</Text>

        <Text style={styles.sectionTitle}>제6조 (개인정보의 파기)</Text>
        <Text style={styles.body}>
          회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다. 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용합니다. 회원 탈퇴 요청 시 AI 상담 대화 기록, 신청서 등 이용자와 관련된 모든 데이터를 즉시 파기합니다.
        </Text>

        <Text style={styles.sectionTitle}>제7조 (이용자의 권리·의무 및 행사방법)</Text>
        <Text style={styles.body}>
          이용자는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다. 앱 내 '설정 > 프로필 편집 > 계정 삭제'를 통해 직접 탈퇴할 수 있으며, 개별 데이터(AI 상담 기록 등)의 열람·삭제는 고객지원 이메일로 요청해주시기 바랍니다.
        </Text>
        <Text style={styles.listItem}>1. 개인정보 열람 요구</Text>
        <Text style={styles.listItem}>2. 오류 등이 있을 경우 정정 요구</Text>
        <Text style={styles.listItem}>3. 삭제 요구 (AI 상담 대화·신청서 개별 삭제 포함)</Text>
        <Text style={styles.listItem}>4. 처리정지 요구</Text>

        <Text style={styles.sectionTitle}>제8조 (개인정보의 안전성 확보조치)</Text>
        <Text style={styles.body}>
          회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.
        </Text>
        <Text style={styles.listItem}>- 비밀번호의 암호화 저장 및 관리</Text>
        <Text style={styles.listItem}>- 전송 구간 HTTPS(TLS) 암호화</Text>
        <Text style={styles.listItem}>- 해킹 등에 대비한 기술적 대책</Text>
        <Text style={styles.listItem}>- 개인정보에 대한 접근 제한 및 권한 최소화</Text>
        <Text style={styles.listItem}>- 개인정보 처리 직원의 최소화 및 교육</Text>
        <Text style={styles.listItem}>- AI 상담 서비스의 주제 제한, 일일 이용 한도, 위기 상황 안전 안내 등 오남용 방지 조치</Text>

        <Text style={styles.sectionTitle}>제9조 (AI 상담 서비스 관련 고지)</Text>
        <Text style={styles.listItem}>1. AI 상담(가온)은 대형 언어 모델(Claude)을 이용한 자동 응답 서비스로, 사람이 직접 응답하지 않습니다.</Text>
        <Text style={styles.listItem}>2. AI 응답은 참고용이며, 의료·법률·재정 등 전문 판단이 필요한 사안에는 전문가와 상담하시기 바랍니다.</Text>
        <Text style={styles.listItem}>3. 이용자가 심각한 정서적 위기를 겪는 것으로 감지되는 경우, 서비스는 예술 상담을 중단하고 자살예방상담전화(1393) 등 전문 기관 안내를 제공합니다.</Text>
        <Text style={styles.listItem}>4. 이용자의 대화 내용은 모델 학습 목적으로 제3자에게 제공되지 않으며, 회사 내부의 상담 품질 개선 및 신청 처리 목적에 한정되어 이용됩니다.</Text>

        <Text style={styles.sectionTitle}>제10조 (개인정보 보호책임자)</Text>
        <Text style={styles.body}>
          회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
        </Text>
        <Text style={styles.listItem}>- 개인정보 보호책임자: 최유진</Text>
        <Text style={styles.listItem}>- 이메일: help@eugeneonmusic.com</Text>
        <Text style={styles.listItem}>- 전화: 02-718-8954</Text>

        <Text style={styles.sectionTitle}>제11조 (개인정보 처리방침 변경)</Text>
        <Text style={styles.body}>
          이 개인정보처리방침은 2026년 4월 23일부터 적용됩니다. 변경 시 변경사항과 시행일을 앱 공지 및 본 화면에 게시하며, 중대한 변경의 경우 서비스 재동의 절차를 거칩니다.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: c.text,
    letterSpacing: 0.3,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  updatedAt: {
    fontSize: 12,
    color: c.accent,
    marginBottom: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  intro: {
    fontSize: 14,
    color: c.textMuted,
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '400',
    color: c.text,
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  body: {
    fontSize: 14,
    color: c.accent,
    lineHeight: 22,
    marginBottom: 8,
  },
  listItem: {
    fontSize: 13,
    color: c.accent,
    lineHeight: 22,
    marginBottom: 4,
    paddingLeft: 8,
  },
  subItem: {
    fontSize: 13,
    color: c.textMuted,
    lineHeight: 22,
    marginBottom: 2,
    paddingLeft: 24,
  },
});
