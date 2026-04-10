import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function BackIcon({ size = 24, color = '#F5F0E8' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function TermsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>이용약관</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.updatedAt}>시행일: 2025년 1월 1일</Text>

        <Text style={styles.sectionTitle}>제1조 (목적)</Text>
        <Text style={styles.body}>
          이 약관은 EON International Music Academy(이하 "회사")가 제공하는 유진온뮤직 모바일 애플리케이션(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
        </Text>

        <Text style={styles.sectionTitle}>제2조 (정의)</Text>
        <Text style={styles.listItem}>1. "서비스"란 회사가 제공하는 음악 교육 관련 모바일 애플리케이션 및 관련 제반 서비스를 의미합니다.</Text>
        <Text style={styles.listItem}>2. "이용자"란 이 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</Text>
        <Text style={styles.listItem}>3. "회원"이란 서비스에 가입하여 이용자 계정을 부여받은 자를 말합니다.</Text>
        <Text style={styles.listItem}>4. "멘토십"이란 담당 선생님과 학생 간의 1:1 교육 관계를 의미합니다.</Text>

        <Text style={styles.sectionTitle}>제3조 (약관의 효력 및 변경)</Text>
        <Text style={styles.listItem}>1. 이 약관은 서비스를 이용하고자 하는 모든 이용자에 대하여 그 효력을 발생합니다.</Text>
        <Text style={styles.listItem}>2. 회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수 있습니다.</Text>
        <Text style={styles.listItem}>3. 약관이 변경되는 경우 회사는 변경사항을 시행일 7일 전부터 서비스 내 공지합니다.</Text>

        <Text style={styles.sectionTitle}>제4조 (회원가입)</Text>
        <Text style={styles.listItem}>1. 이용자는 회사가 정한 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.</Text>
        <Text style={styles.listItem}>2. 회사는 다음 각 호에 해당하는 신청에 대하여 승낙하지 않을 수 있습니다.</Text>
        <Text style={styles.subItem}>- 실명이 아니거나 타인의 명의를 이용한 경우</Text>
        <Text style={styles.subItem}>- 허위의 정보를 기재한 경우</Text>
        <Text style={styles.subItem}>- 기타 회원으로 등록하는 것이 서비스 운영에 현저히 지장이 있다고 판단되는 경우</Text>

        <Text style={styles.sectionTitle}>제5조 (서비스의 제공)</Text>
        <Text style={styles.body}>회사는 다음과 같은 서비스를 제공합니다.</Text>
        <Text style={styles.listItem}>1. 레슨 스케줄 관리 서비스</Text>
        <Text style={styles.listItem}>2. 레슨 노트 작성 및 공유 서비스</Text>
        <Text style={styles.listItem}>3. 연습 과제 관리 서비스</Text>
        <Text style={styles.listItem}>4. 연습 타이머 및 기록 서비스</Text>
        <Text style={styles.listItem}>5. 1:1 멘토링 채팅 서비스</Text>
        <Text style={styles.listItem}>6. 커뮤니티 서비스</Text>
        <Text style={styles.listItem}>7. 온라인 강좌 제공 서비스</Text>
        <Text style={styles.listItem}>8. 음악 뉴스 및 블로그 제공 서비스</Text>

        <Text style={styles.sectionTitle}>제6조 (서비스의 중단)</Text>
        <Text style={styles.body}>
          회사는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신의 두절 등의 사유가 발생한 경우에는 서비스의 제공을 일시적으로 중단할 수 있습니다.
        </Text>

        <Text style={styles.sectionTitle}>제7조 (회원의 의무)</Text>
        <Text style={styles.listItem}>1. 회원은 서비스 이용 시 관계법령, 이 약관의 규정, 이용안내 및 서비스 관련 공지사항을 준수하여야 합니다.</Text>
        <Text style={styles.listItem}>2. 회원은 다음 행위를 하여서는 안 됩니다.</Text>
        <Text style={styles.subItem}>- 타인의 정보를 도용하는 행위</Text>
        <Text style={styles.subItem}>- 회사가 게시한 정보를 변경하는 행위</Text>
        <Text style={styles.subItem}>- 서비스를 이용하여 법령 또는 이 약관이 금지하는 행위를 하는 것</Text>
        <Text style={styles.subItem}>- 다른 이용자의 개인정보를 수집하는 행위</Text>
        <Text style={styles.subItem}>- 서비스의 안정적인 운영에 지장을 주는 행위</Text>

        <Text style={styles.sectionTitle}>제8조 (채팅 서비스 이용규칙)</Text>
        <Text style={styles.listItem}>1. 회원은 1:1 멘토링 채팅을 통해 담당 선생님 또는 학생과 소통할 수 있습니다.</Text>
        <Text style={styles.listItem}>2. 다음 행위는 금지되며, 위반 시 서비스 이용이 제한될 수 있습니다:</Text>
        <Text style={styles.subItem}>- 욕설, 비방, 혐오 표현 등 부적절한 언어 사용</Text>
        <Text style={styles.subItem}>- 음란물, 불법 콘텐츠 공유</Text>
        <Text style={styles.subItem}>- 스팸, 광고성 메시지 전송</Text>
        <Text style={styles.subItem}>- 개인정보를 무단으로 요구하거나 공유하는 행위</Text>
        <Text style={styles.subItem}>- 타인을 사칭하거나 허위 정보를 유포하는 행위</Text>
        <Text style={styles.listItem}>3. 부적절한 메시지를 수신한 경우 메시지를 길게 눌러 신고할 수 있으며, 채팅방 상단 메뉴에서 사용자 신고 및 차단이 가능합니다.</Text>
        <Text style={styles.listItem}>4. 신고된 내용은 검토 후 경고, 이용 정지, 계정 삭제 등의 조치가 취해질 수 있습니다.</Text>
        <Text style={styles.listItem}>5. 차단된 사용자의 메시지는 더 이상 수신되지 않으며, 차단은 해제할 수 있습니다.</Text>

        <Text style={styles.sectionTitle}>제9조 (커뮤니티 서비스 이용규칙)</Text>
        <Text style={styles.listItem}>1. 회원은 커뮤니티 게시판을 통해 자유롭게 의견을 공유할 수 있습니다.</Text>
        <Text style={styles.listItem}>2. 다음 행위는 금지되며, 위반 시 게시글 삭제 및 서비스 이용이 제한될 수 있습니다:</Text>
        <Text style={styles.subItem}>- 욕설, 비방, 혐오 표현 등 부적절한 언어 사용</Text>
        <Text style={styles.subItem}>- 음란물, 불법 콘텐츠 또는 저작권을 침해하는 콘텐츠 게시</Text>
        <Text style={styles.subItem}>- 스팸, 광고성 게시글 및 댓글 작성</Text>
        <Text style={styles.subItem}>- 개인정보를 무단으로 게시하거나 타인의 사생활을 침해하는 행위</Text>
        <Text style={styles.subItem}>- 타인을 사칭하거나 허위 정보를 유포하는 행위</Text>
        <Text style={styles.subItem}>- 특정 개인이나 단체를 대상으로 한 괴롭힘 또는 위협</Text>
        <Text style={styles.listItem}>3. 부적절한 게시글은 상단 메뉴를 통해 신고할 수 있으며, 부적절한 댓글은 길게 눌러 신고할 수 있습니다.</Text>
        <Text style={styles.listItem}>4. 게시글 작성자를 차단할 수 있으며, 차단된 사용자의 콘텐츠는 더 이상 표시되지 않습니다.</Text>
        <Text style={styles.listItem}>5. 신고된 콘텐츠는 검토 후 경고, 게시글 삭제, 이용 정지, 계정 삭제 등의 조치가 취해질 수 있습니다.</Text>

        <Text style={styles.sectionTitle}>제10조 (회원 탈퇴 및 자격 상실)</Text>
        <Text style={styles.listItem}>1. 회원은 회사에 언제든지 탈퇴를 요청할 수 있으며, 회사는 즉시 회원탈퇴를 처리합니다.</Text>
        <Text style={styles.listItem}>2. 회원이 다음 각 호의 사유에 해당하는 경우 회사는 회원자격을 제한 및 정지시킬 수 있습니다.</Text>
        <Text style={styles.subItem}>- 가입 신청 시에 허위 내용을 등록한 경우</Text>
        <Text style={styles.subItem}>- 다른 사람의 서비스 이용을 방해하는 경우</Text>

        <Text style={styles.sectionTitle}>제11조 (저작권의 귀속)</Text>
        <Text style={styles.body}>
          서비스에서 제공하는 모든 강좌 콘텐츠, 레슨 자료, 악보 등의 저작권은 회사 또는 해당 저작권자에게 귀속됩니다. 이용자는 서비스를 통해 얻은 정보를 회사의 사전 승낙 없이 복제, 배포, 방송 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 제공할 수 없습니다.
        </Text>

        <Text style={styles.sectionTitle}>제12조 (면책)</Text>
        <Text style={styles.listItem}>1. 회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</Text>
        <Text style={styles.listItem}>2. 회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여는 책임을 지지 않습니다.</Text>

        <Text style={styles.sectionTitle}>제13조 (분쟁해결)</Text>
        <Text style={styles.body}>
          서비스 이용으로 발생한 분쟁에 대해 소송이 제기되는 경우 회사의 본사 소재지를 관할하는 법원을 관할 법원으로 합니다.
        </Text>

        <Text style={styles.sectionTitle}>부칙</Text>
        <Text style={styles.body}>이 약관은 2025년 1월 1일부터 시행합니다.</Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#110E0B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(201,169,110,0.18)',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#F5F0E8',
    letterSpacing: 0.3,
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
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#F5F0E8',
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  body: {
    fontSize: 14,
    color: '#C9A96E',
    lineHeight: 22,
    marginBottom: 8,
  },
  listItem: {
    fontSize: 13,
    color: '#C9A96E',
    lineHeight: 22,
    marginBottom: 4,
    paddingLeft: 8,
  },
  subItem: {
    fontSize: 13,
    color: '#9e9282',
    lineHeight: 22,
    marginBottom: 2,
    paddingLeft: 24,
  },
});
