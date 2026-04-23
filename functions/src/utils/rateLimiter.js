/**
 * Firestore 기반 유저별 일일 사용량 제한
 *
 * 남용 방지용. 한 유저가 하루에 AI 상담을 너무 많이 시작하지 못하게 함.
 */
const admin = require('firebase-admin');

const DAILY_LIMIT_PER_USER = 5; // 유저당 하루 최대 AI 상담 완료 건수

/**
 * 사용자의 오늘 AI 상담 횟수가 한도를 넘었는지 확인
 *
 * 문서 구조: aiRateLimits/{uid}
 *   {
 *     date: "2026-04-22",     // YYYY-MM-DD (KST 기준)
 *     count: 3,
 *     lastUsedAt: Timestamp,
 *   }
 *
 * @param {string} uid - 유저 UID
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: string}>}
 */
async function checkAndIncrementRateLimit(uid) {
  const db = admin.firestore();
  const ref = db.collection('aiRateLimits').doc(uid);
  const today = getTodayKey();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : {};

    // 날짜가 바뀌었으면 리셋
    const currentDate = data.date || today;
    const currentCount = currentDate === today ? (data.count || 0) : 0;

    if (currentCount >= DAILY_LIMIT_PER_USER) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: getTomorrowKstMidnight(),
      };
    }

    tx.set(
      ref,
      {
        date: today,
        count: currentCount + 1,
        lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      allowed: true,
      remaining: DAILY_LIMIT_PER_USER - (currentCount + 1),
      resetAt: getTomorrowKstMidnight(),
    };
  });
}

/**
 * 한도 초과해서 차감한 카운터를 되돌림 (예: AI 호출 실패 시)
 */
async function decrementRateLimit(uid) {
  const db = admin.firestore();
  const ref = db.collection('aiRateLimits').doc(uid);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const data = snap.data();
      if (!data.count || data.count <= 0) return;
      tx.update(ref, { count: data.count - 1 });
    });
  } catch (e) {
    // 복원 실패는 치명적이지 않음 (하루 지나면 리셋됨)
    console.warn('rate limit decrement failed:', e);
  }
}

/**
 * 오늘 날짜 (KST 기준, YYYY-MM-DD)
 */
function getTodayKey() {
  const now = new Date();
  const kstOffset = 9 * 60; // KST = UTC+9
  const kst = new Date(now.getTime() + (kstOffset + now.getTimezoneOffset()) * 60000);
  const y = kst.getFullYear();
  const m = String(kst.getMonth() + 1).padStart(2, '0');
  const d = String(kst.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 내일 KST 자정 시각 (ISO 문자열)
 */
function getTomorrowKstMidnight() {
  const now = new Date();
  const kstOffset = 9 * 60;
  const kst = new Date(now.getTime() + (kstOffset + now.getTimezoneOffset()) * 60000);
  kst.setDate(kst.getDate() + 1);
  kst.setHours(0, 0, 0, 0);
  // UTC로 다시 변환해서 ISO 출력
  return new Date(kst.getTime() - (kstOffset + now.getTimezoneOffset()) * 60000).toISOString();
}

module.exports = {
  DAILY_LIMIT_PER_USER,
  checkAndIncrementRateLimit,
  decrementRateLimit,
};
