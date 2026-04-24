/**
 * 사용자 본인 AI 상담 취소·숨기기
 *
 * 동작:
 *  - 진행 중(pending_review / in_progress 등)인 경우: status를 'cancelled_by_user'로 바꾸고
 *    관리자에게 취소 알림을 보냄. (이미 진행 중인 신청의 취소 통보)
 *  - 이미 완료(completed / closed)된 경우: status는 유지하고 hiddenByUser=true 만 설정.
 *    (기록은 관리자에게 남되 사용자 목록에서만 감춤)
 *  - 둘 다 동일하게 사용자 목록(listMyConsultations)에서는 더 이상 보이지 않음.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

exports.cancelMyConsultation = onCall(
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

    const { inquiryId } = request.data || {};
    if (!inquiryId || typeof inquiryId !== 'string') {
      throw new HttpsError('invalid-argument', 'inquiryId가 필요합니다.');
    }

    const db = admin.firestore();
    const ref = db.collection('experiencePlans').doc(inquiryId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError('not-found', '신청서를 찾을 수 없습니다.');
    }

    const data = snap.data();
    if (data.userId !== uid) {
      throw new HttpsError('permission-denied', '본인 신청만 취소할 수 있습니다.');
    }

    const currentStatus = data.status || 'pending_review';
    const isFinal = currentStatus === 'completed' || currentStatus === 'closed';

    const updates = {
      hiddenByUser: true,
      userHiddenAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (!isFinal && currentStatus !== 'cancelled_by_user') {
      // 진행 중인 건은 "사용자 취소"로 상태 전환 + 관리자 알림
      updates.status = 'cancelled_by_user';
      updates.cancelledAt = admin.firestore.FieldValue.serverTimestamp();

      // 관리자에게 취소 알림 (notifications 시스템 재사용)
      await db.collection('notifications').add({
        type: 'experienceInquiryCancelled',
        audience: 'teacher',
        title: 'AI 상담 신청이 취소되었어요',
        body: '사용자가 진행 중인 상담을 직접 취소했습니다.',
        data: {
          inquiryId,
          consultationId: data.consultationId || null,
          screen: `/admin/inquiries/${inquiryId}`,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await ref.update(updates);

    return {
      ok: true,
      status: updates.status || currentStatus,
      cancelled: !isFinal,
    };
  }
);
