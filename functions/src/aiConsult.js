/**
 * AI 예술 상담 Cloud Function
 *
 * 흐름:
 *  1. 클라이언트(앱)에서 `aiConsult` 호출 — 인증된 유저 + 메시지 전송
 *  2. Firestore에 대화 저장/업데이트
 *  3. Claude API 호출 (주제 제한 시스템 프롬프트 + 이전 대화 히스토리)
 *  4. Claude가 submit_consultation_form 도구를 호출하면 → 신청서 확정 + 관리자 알림
 *     그렇지 않으면 → 일반 응답 반환 (대화 계속)
 *
 * 프롬프트 캐싱 사용: 시스템 프롬프트가 길어서 캐싱하면 반복 호출 시 약 90% 비용 절감.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const Anthropic = require('@anthropic-ai/sdk');

const {
  SUBMIT_FORM_TOOL,
  VALID_MODES,
  buildSystemPromptBlocks,
} = require('./config/systemPrompt');
const {
  checkAndIncrementRateLimit,
  decrementRateLimit,
  DAILY_LIMIT_PER_USER,
} = require('./utils/rateLimiter');

// Secret Manager에서 API 키 참조
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

// 대화 길이 제한 (어뷰즈·비용 제어)
const MAX_USER_MESSAGE_LENGTH = 1000;
const MAX_CONVERSATION_TURNS = 20; // 한 상담당 최대 turn 수

/**
 * AI 상담 메인 엔드포인트
 *
 * @param {Object} data - { consultationId?: string, userMessage: string }
 * @returns {Object} {
 *   consultationId: string,
 *   status: 'continue' | 'completed' | 'crisis' | 'off_topic',
 *   assistantMessage: string,
 *   formSubmitted: boolean,
 *   remainingToday?: number,
 * }
 */
exports.aiConsult = onCall(
  {
    region: 'asia-northeast3', // Seoul — 한국 유저 레이턴시 최적
    secrets: [ANTHROPIC_API_KEY],
    cors: true,
    timeoutSeconds: 60,
    memory: '512MiB',
    maxInstances: 10, // 동시 실행 상한 (비용 제어)
  },
  async (request) => {
    // 1. 인증 확인
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    const uid = request.auth.uid;

    // 2. 입력 검증
    const { consultationId, userMessage, mode: requestMode } = request.data || {};
    if (!userMessage || typeof userMessage !== 'string') {
      throw new HttpsError('invalid-argument', 'userMessage가 필요합니다.');
    }
    if (userMessage.length > MAX_USER_MESSAGE_LENGTH) {
      throw new HttpsError(
        'invalid-argument',
        `메시지는 ${MAX_USER_MESSAGE_LENGTH}자 이내로 작성해주세요.`
      );
    }
    // 모드 검증 — 유효한 값이 아니면 무시(null로 처리). 기본 BASE 톤으로 동작.
    const requestModeValid =
      requestMode && VALID_MODES.includes(requestMode) ? requestMode : null;

    const db = admin.firestore();

    // 3. 대화 로드 또는 신규 생성
    let consultRef;
    let messages = []; // Anthropic API용 messages 배열
    let turnCount = 0;
    // 대화 전체에 적용될 모드 — 신규는 클라이언트 값, 이어가기는 Firestore 값(클라이언트 값 무시)
    let conversationMode = null;

    if (consultationId) {
      consultRef = db.collection('aiConsultations').doc(consultationId);
      const consultSnap = await consultRef.get();
      if (!consultSnap.exists) {
        throw new HttpsError('not-found', '상담을 찾을 수 없습니다.');
      }
      const consult = consultSnap.data();
      if (consult.userId !== uid) {
        throw new HttpsError('permission-denied', '본인 상담만 접근 가능합니다.');
      }
      if (consult.status === 'completed') {
        throw new HttpsError('failed-precondition', '이미 완료된 상담입니다.');
      }
      messages = consult.messages || [];
      turnCount = messages.filter((m) => m.role === 'user').length;
      // 대화의 일관된 톤을 위해 처음 저장된 mode를 그대로 사용
      conversationMode = consult.mode || null;

      if (turnCount >= MAX_CONVERSATION_TURNS) {
        throw new HttpsError(
          'resource-exhausted',
          '대화 턴 수가 한도를 초과했습니다. 새 상담을 시작해주세요.'
        );
      }
    } else {
      // 신규 상담 — rate limit 체크
      const rateLimit = await checkAndIncrementRateLimit(uid);
      if (!rateLimit.allowed) {
        throw new HttpsError(
          'resource-exhausted',
          `오늘 AI 상담 ${DAILY_LIMIT_PER_USER}회를 모두 이용하셨어요. 내일 다시 이용해주세요.`,
          { resetAt: rateLimit.resetAt }
        );
      }
      consultRef = db.collection('aiConsultations').doc();
      messages = [];
      // 신규 대화는 클라이언트가 보낸 모드를 채택 (검증된 값만)
      conversationMode = requestModeValid;
    }

    // 4. 사용자 메시지 추가
    messages.push({
      role: 'user',
      content: userMessage,
    });

    // 5. Claude API 호출
    const client = new Anthropic({
      apiKey: ANTHROPIC_API_KEY.value(),
    });

    let response;
    try {
      response = await client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 2048,
        thinking: { type: 'adaptive' },
        // BASE 프롬프트는 캐싱(반복 호출 시 90% 비용 절감), 모드 addendum은 짧으니 캐싱 X
        system: buildSystemPromptBlocks(conversationMode),
        tools: [SUBMIT_FORM_TOOL],
        messages,
      });
    } catch (err) {
      // API 호출 실패 시 신규 상담이었으면 rate limit 복원
      if (!consultationId) {
        await decrementRateLimit(uid);
      }
      console.error('Anthropic API error:', err);
      if (err instanceof Anthropic.RateLimitError) {
        throw new HttpsError(
          'resource-exhausted',
          '현재 AI 상담이 많이 몰려있어요. 잠시 후 다시 시도해주세요.'
        );
      }
      if (err instanceof Anthropic.AuthenticationError) {
        throw new HttpsError('internal', 'AI 서비스 인증에 문제가 있습니다. 관리자에게 문의해주세요.');
      }
      throw new HttpsError('internal', '잠시 연결이 원활하지 않아요. 잠시 후 다시 시도해주세요.');
    }

    // 6. 응답 파싱 — content blocks 중 text + tool_use 추출
    let assistantText = '';
    let toolUseBlock = null;
    for (const block of response.content) {
      if (block.type === 'text') {
        assistantText += block.text;
      } else if (block.type === 'tool_use' && block.name === 'submit_consultation_form') {
        toolUseBlock = block;
      }
    }

    // 7. assistant turn을 대화 히스토리에 저장 (full content — 도구 호출 포함)
    messages.push({
      role: 'assistant',
      content: response.content,
    });

    // 8. 결과 분기 — 도구 호출 있으면 신청서 확정
    let status = 'continue';
    let formSubmitted = false;
    let consultationDocUpdate = {
      userId: uid,
      messages,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active',
      turnCount: turnCount + 1,
      lastUsage: response.usage || null,
    };

    if (!consultationId) {
      consultationDocUpdate.createdAt = admin.firestore.FieldValue.serverTimestamp();
      // 신규 대화는 모드를 함께 저장 — 이후 이어가기 호출에서 동일 모드 유지에 사용.
      // 모드 미선택(null)도 그대로 저장해 두면 이어가기 때 BASE 톤으로 복원됨.
      consultationDocUpdate.mode = conversationMode;
    }

    if (toolUseBlock) {
      // 신청서 데이터 추출
      const formData = toolUseBlock.input;

      // 신청서 별도 컬렉션에 저장
      const inquiryRef = await db.collection('experiencePlans').add({
        userId: uid,
        consultationId: consultRef.id,
        form: formData,
        aiSummary: formData.aiSummary || '',
        status: 'pending_review',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        assignedAdminUid: null,
      });

      // 관리자 알림 (기존 notifications 시스템 재사용)
      await db.collection('notifications').add({
        type: 'experienceInquiry',
        audience: 'teacher', // 관리자 역할
        title: '새 AI 예술 경험 상담',
        body: (formData.aiSummary || '신청서가 도착했습니다.').slice(0, 120),
        data: {
          inquiryId: inquiryRef.id,
          consultationId: consultRef.id,
          screen: `/admin/inquiries/${inquiryRef.id}`,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 도구 결과를 Claude에게 반환 (감사 메시지로 마무리하게)
      messages.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUseBlock.id,
            content: JSON.stringify({
              success: true,
              inquiryId: inquiryRef.id,
              message: '신청서가 관리자에게 전달되었습니다.',
            }),
          },
        ],
      });

      // 마지막 감사 메시지를 받기 위해 한 번 더 호출
      try {
        const finalResp = await client.messages.create({
          model: 'claude-opus-4-7',
          max_tokens: 512,
          thinking: { type: 'adaptive' },
          system: buildSystemPromptBlocks(conversationMode),
          tools: [SUBMIT_FORM_TOOL],
          messages,
        });
        const finalText = finalResp.content
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('');
        if (finalText) assistantText = finalText;
        messages.push({
          role: 'assistant',
          content: finalResp.content,
        });
      } catch (err) {
        // 마무리 메시지 실패는 치명적이지 않음 — 기본 문구 사용
        console.warn('Final thank-you message failed:', err);
        if (!assistantText) {
          assistantText =
            '신청서가 접수되었습니다. 관리자 검토 후 1~2일 내에 연락드리겠습니다. 감사합니다. 🎼';
        }
      }

      consultationDocUpdate.status = 'completed';
      consultationDocUpdate.inquiryId = inquiryRef.id;
      consultationDocUpdate.messages = messages;
      consultationDocUpdate.completedAt = admin.firestore.FieldValue.serverTimestamp();
      status = 'completed';
      formSubmitted = true;
    }

    // 9. Firestore에 대화 저장
    await consultRef.set(consultationDocUpdate, { merge: true });

    // 10. 응답
    return {
      consultationId: consultRef.id,
      status,
      assistantMessage: assistantText || '...',
      formSubmitted,
      turnCount: turnCount + 1,
    };
  }
);
