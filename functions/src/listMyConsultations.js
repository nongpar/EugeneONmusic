/**
 * 사용자 본인 AI 상담 신청서 목록 조회
 *
 * 사용자의 "MY" 탭 → "음악 큐레이션 내역"에서 호출.
 * experiencePlans 컬렉션에서 본인이 제출한 신청서만 요약 필드로 반환.
 * 관리자용 필드(assignedAdminUid, 관리자 메모 등)는 노출하지 않음.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

exports.listMyConsultations = onCall(
  {
    region: 'asia-northeast3',
    cors: true,
    timeoutSeconds: 30,
    memory: '256MiB',
    maxInstances: 10,
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    const uid = request.auth.uid;

    const db = admin.firestore();

    // experiencePlans에서 본인 것만 최신순, 최대 20건
    // (Firestore composite index 필요: userId ASC + createdAt DESC — 첫 호출 시 콘솔에서 자동 제안)
    const snap = await db
      .collection('experiencePlans')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    // 사용자에게 노출할 간략 요약 필드만 골라서 반환
    // hiddenByUser=true 인 항목은 사용자 목록에서 제외 (본인이 직접 지운 건)
    const items = snap.docs
      .filter((doc) => !doc.data()?.hiddenByUser)
      .map((doc) => {
        const data = doc.data() || {};
        const form = data.form || {};
        return {
          id: doc.id,
          type: form.type || null,               // concert / education / rental / other
          subCategory: form.subCategory || null, // 예: "성인 취미 피아노 레슨"
          aiSummary: data.aiSummary || '',       // AI가 요약한 한 줄 요지
          status: data.status || 'pending_review',
          createdAt: data.createdAt ? data.createdAt.toMillis() : null,
          mode: data.mode || null,               // 가온 모드 (concierge/curation/mind) — 기존 데이터는 null
        };
      });

    return { items };
  }
);
