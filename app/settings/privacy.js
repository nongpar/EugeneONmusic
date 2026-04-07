import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function BackIcon({ size = 24, color = '#ffffff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>개인정보처리방침</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.updatedAt}>시행일: 2025년 1월 1일</Text>

        <Text style={styles.intro}>
          EON International Music Academy(이하 "회사")는 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
        </Text>

        <Text style={styles.sectionTitle}>제1조 (개인정보의 처리 목적)</Text>
        <Text style={styles.body}>
          회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
        </Text>
        <Text style={styles.listItem}>1. 회원 가입 및 관리: 회원 가입의사 확인, 본인 식별·인증, 회원자격 유지·관리, 서비스 부정이용 방지</Text>
        <Text style={styles.listItem}>2. 서비스 제공: 레슨 스케줄 관리, 레슨 노트 제공, 과제 관리, 연습 기록 저장, 1:1 멘토링 채팅</Text>
        <Text style={styles.listItem}>3. 마케팅 및 광고 활용: 이벤트·광고성 정보 제공 및 참여기회 제공(선택 동의 시)</Text>

        <Text style={styles.sectionTitle}>제2조 (수집하는 개인정보의 항목)</Text>
        <Text style={styles.body}>회사는 다음의 개인정보 항목을 수집하고 있습니다.</Text>
        <Text style={styles.listItem}>- 필수항목: 이메일 주소, 비밀번호, 이름(닉네임)</Text>
        <Text style={styles.listItem}>- 선택항목: 프로필 사진, 전화번호</Text>
        <Text style={styles.listItem}>- 자동수집항목: 기기 정보(OS, 기기 모델), 앱 사용 기록, 푸시 토큰</Text>

        <Text style={styles.sectionTitle}>제3조 (개인정보의 처리 및 보유기간)</Text>
        <Text style={styles.body}>
          회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의 받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
        </Text>
        <Text style={styles.listItem}>- 회원 정보: 회원 탈퇴 시까지 (탈퇴 후 즉시 파기)</Text>
        <Text style={styles.listItem}>- 레슨 기록: 서비스 이용 종료 후 1년</Text>
        <Text style={styles.listItem}>- 연습 기록: 서비스 이용 종료 후 1년</Text>

        <Text style={styles.sectionTitle}>제4조 (개인정보의 제3자 제공)</Text>
        <Text style={styles.body}>
          회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 다음의 경우에는 예외로 합니다.
        </Text>
        <Text style={styles.listItem}>- 이용자가 사전에 동의한 경우</Text>
        <Text style={styles.listItem}>- 법률에 특별한 규정이 있는 경우</Text>

        <Text style={styles.sectionTitle}>제5조 (개인정보의 파기)</Text>
        <Text style={styles.body}>
          회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다. 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용합니다.
        </Text>

        <Text style={styles.sectionTitle}>제6조 (이용자의 권리·의무 및 행사방법)</Text>
        <Text style={styles.body}>
          이용자는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.
        </Text>
        <Text style={styles.listItem}>1. 개인정보 열람 요구</Text>
        <Text style={styles.listItem}>2. 오류 등이 있을 경우 정정 요구</Text>
        <Text style={styles.listItem}>3. 삭제 요구</Text>
        <Text style={styles.listItem}>4. 처리정지 요구</Text>

        <Text style={styles.sectionTitle}>제7조 (개인정보의 안전성 확보조치)</Text>
        <Text style={styles.body}>
          회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.
        </Text>
        <Text style={styles.listItem}>- 비밀번호의 암호화 저장 및 관리</Text>
        <Text style={styles.listItem}>- 해킹 등에 대비한 기술적 대책</Text>
        <Text style={styles.listItem}>- 개인정보에 대한 접근 제한</Text>
        <Text style={styles.listItem}>- 개인정보 처리 직원의 최소화 및 교육</Text>

        <Text style={styles.sectionTitle}>제8조 (개인정보 보호책임자)</Text>
        <Text style={styles.body}>
          회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
        </Text>
        <Text style={styles.listItem}>- 개인정보 보호책임자: 최유진</Text>
        <Text style={styles.listItem}>- 이메일: help@eugeneonmusic.com</Text>
        <Text style={styles.listItem}>- 전화: 02-718-8954</Text>

        <Text style={styles.sectionTitle}>제9조 (개인정보 처리방침 변경)</Text>
        <Text style={styles.body}>
          이 개인정보처리방침은 2025년 1월 1일부터 적용됩니다. 이전의 개인정보 처리방침은 아래에서 확인하실 수 있습니다.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1923',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222f3a',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  updatedAt: {
    fontSize: 12,
    color: '#C9A96E',
    marginBottom: 16,
    fontWeight: '600',
  },
  intro: {
    fontSize: 14,
    color: '#b0bec5',
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    color: '#8a9bae',
    lineHeight: 22,
    marginBottom: 8,
  },
  listItem: {
    fontSize: 13,
    color: '#8a9bae',
    lineHeight: 22,
    marginBottom: 4,
    paddingLeft: 8,
  },
});
