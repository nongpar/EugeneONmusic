/**
 * WordPress JWT → Firebase Custom Token 교환
 *
 * 흐름:
 *  1. 앱이 WP로 로그인해서 WP JWT 획득 (기존 로직)
 *  2. 이 함수에 WP JWT 전달
 *  3. 함수가 WP 서버에 토큰 유효성 확인
 *  4. 유효하면 WP user_id 기반으로 Firebase Custom Token 생성 반환
 *  5. 앱이 signInWithCustomToken() 호출 → Firebase Auth 세션 활성화
 *  6. 이후 aiConsult 등 callable 함수 호출 가능
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const WP_VALIDATE_URL = 'https://www.eon-music.com/wp-json/jwt-auth/v1/token/validate';
const WP_ME_URL = 'https://www.eon-music.com/wp-json/wp/v2/users/me?context=edit';

exports.exchangeWpToken = onCall(
  {
    region: 'asia-northeast3',
    cors: true,
    timeoutSeconds: 30,
    memory: '256MiB',
    maxInstances: 10,
  },
  async (request) => {
    const { wpToken } = request.data || {};
    if (!wpToken || typeof wpToken !== 'string') {
      throw new HttpsError('invalid-argument', 'wpToken이 필요합니다.');
    }

    // 1. WP JWT 유효성 검증
    let validateRes;
    try {
      validateRes = await fetch(WP_VALIDATE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${wpToken}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      throw new HttpsError('unavailable', 'WordPress 서버 연결 실패');
    }

    if (!validateRes.ok) {
      throw new HttpsError('unauthenticated', '유효하지 않은 WP 토큰');
    }

    // 2. WP 유저 정보 조회 (uid, role 획득)
    let wpUser;
    try {
      const meRes = await fetch(WP_ME_URL, {
        headers: { Authorization: `Bearer ${wpToken}` },
      });
      if (!meRes.ok) {
        throw new Error(`WP users/me 실패: ${meRes.status}`);
      }
      wpUser = await meRes.json();
    } catch (err) {
      console.error('WP user fetch error:', err);
      throw new HttpsError('unavailable', 'WP 유저 정보 조회 실패');
    }

    const wpId = String(wpUser.id);
    if (!wpId) {
      throw new HttpsError('internal', 'WP 유저 ID 없음');
    }

    // 3. WordPress 역할 → 앱 역할 매핑 (기존 useAuth.js 로직과 동일)
    const wpRoles = wpUser.roles || [];
    const appRole =
      wpRoles.includes('administrator') ||
      wpRoles.includes('editor') ||
      wpRoles.includes('group_leader')
        ? 'teacher'
        : 'student';

    // 4. Firebase Custom Token 발행
    //    UID는 WP ID를 그대로 사용 — 기존 Firestore 데이터 호환
    try {
      const customToken = await admin.auth().createCustomToken(wpId, {
        wpId,
        role: appRole,
        email: wpUser.email || '',
        displayName: wpUser.name || '',
      });
      return { customToken, uid: wpId, role: appRole };
    } catch (err) {
      console.error('Custom token creation failed:', err);
      throw new HttpsError('internal', 'Firebase 토큰 생성 실패');
    }
  }
);
