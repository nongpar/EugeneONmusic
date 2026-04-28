/**
 * 가온 상담 통계 조회 (관리자 전용)
 *
 * 메세나 사업공모 등 외부 자료 작성 시 활용:
 *  - 모드별 누적 상담 건수 (둘러보기 / 공연 큐레이션 / 마음의 음악)
 *  - 월별 추이 (최근 6개월)
 *  - 사회 기여 성격 상담 건수 (마음의 음악 + 키워드 매칭)
 *  - 정식 신청서(experiencePlans) 제출 건수
 *
 * 관리자 권한 확인: request.auth.token.role === 'teacher'
 * (custom claim은 authExchange.js에서 WP 역할 매핑으로 설정됨)
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

// 마음의 음악 모드에서 사용자가 입력한 텍스트에 이 키워드들이 등장하면
// 사회 기여 성격의 상담으로 분류 — 메세나 사업공모 "사회 기여 프로그램의 시행 정도" 항목 어필 자료.
// 카테고리(연령·진단명·소속)를 사용자 라벨링이 아닌 "응답자가 자발적으로 언급한 자리"로 추적.
const SOCIAL_KEYWORDS = [
  '복지관', '어르신', '경로당', '노인', '요양원',
  '호스피스', '병원', '환자',
  '발달장애', '장애인', '시각장애', '청각장애', '특수교육', '특수학교', '치료',
  '도서관', '지역아동센터', '아동센터', '청소년센터',
  '다문화', '저소득', '취약계층', '소외계층', '독거',
];

// 모드 분포·총계 초기값 (none = 모드 미선택 / 자유 진입 대화)
function emptyByMode() {
  return { concierge: 0, curation: 0, mind: 0, none: 0 };
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// messages 배열에서 user 발화 텍스트만 추출 (Anthropic message 구조 호환)
function extractUserText(messages) {
  if (!Array.isArray(messages)) return '';
  return messages
    .filter((m) => m.role === 'user')
    .map((m) => {
      if (typeof m.content === 'string') return m.content;
      if (Array.isArray(m.content)) {
        return m.content
          .map((b) => (typeof b.text === 'string' ? b.text : ''))
          .join(' ');
      }
      return '';
    })
    .join(' ');
}

exports.getConsultationStats = onCall(
  {
    region: 'asia-northeast3',
    cors: true,
    timeoutSeconds: 60,
    memory: '512MiB',
    maxInstances: 5,
  },
  async (request) => {
    // 1. 인증 + 관리자 권한 확인
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    const role = request.auth.token?.role;
    if (role !== 'teacher') {
      throw new HttpsError('permission-denied', '관리자 권한이 필요합니다.');
    }

    const db = admin.firestore();

    // 2. aiConsultations 전체 읽기
    //    데이터셋이 수백~수천 건 수준이므로 client-side 페이지네이션 불필요.
    //    이후 규모가 커지면 createdAt 인덱스 + 기간 한정으로 변경.
    const consultsSnap = await db.collection('aiConsultations').get();

    const stats = {
      total: 0,
      byMode: emptyByMode(),
      byMonth: {}, // 'YYYY-MM' → { total, byMode }
      socialContribution: { total: 0, byKeyword: {} },
    };

    // 6개월 추이 윈도우 (현재 월 포함) — 빈 월도 0으로 잡아서 차트 칸 유지
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      stats.byMonth[getMonthKey(d)] = { total: 0, byMode: emptyByMode() };
    }

    for (const doc of consultsSnap.docs) {
      const data = doc.data() || {};
      const mode = data.mode || null;
      const modeKey = mode && stats.byMode[mode] !== undefined ? mode : 'none';

      stats.total += 1;
      stats.byMode[modeKey] += 1;

      const createdAt = data.createdAt?.toDate?.() || null;
      if (createdAt) {
        const mk = getMonthKey(createdAt);
        if (stats.byMonth[mk]) {
          stats.byMonth[mk].total += 1;
          stats.byMonth[mk].byMode[modeKey] += 1;
        }
      }

      // 사회 기여 분류 — 마음의 음악 모드 한정으로 키워드 스캔
      // (다른 모드에서 우연히 키워드가 등장해도 사회 기여 사례로 보긴 어려움)
      if (mode === 'mind') {
        const userText = extractUserText(data.messages);
        const hits = SOCIAL_KEYWORDS.filter((kw) => userText.includes(kw));
        if (hits.length > 0) {
          stats.socialContribution.total += 1;
          for (const kw of hits) {
            stats.socialContribution.byKeyword[kw] =
              (stats.socialContribution.byKeyword[kw] || 0) + 1;
          }
        }
      }
    }

    // 3. byMonth → 정렬된 배열로 변환
    const byMonthArr = Object.entries(stats.byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v }));

    // 4. experiencePlans (정식 신청서) — 모드별 집계
    const formsSnap = await db.collection('experiencePlans').get();
    const submittedByMode = emptyByMode();
    formsSnap.docs.forEach((doc) => {
      const m = doc.data()?.mode;
      const k = m && submittedByMode[m] !== undefined ? m : 'none';
      submittedByMode[k] += 1;
    });

    return {
      total: stats.total,
      byMode: stats.byMode,
      byMonth: byMonthArr,
      socialContribution: stats.socialContribution,
      submitted: { total: formsSnap.size, byMode: submittedByMode },
      generatedAt: Date.now(),
    };
  }
);
