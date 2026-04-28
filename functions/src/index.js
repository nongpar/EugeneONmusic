/**
 * Firebase Functions Entry Point
 *
 * 여기서 함수들을 export 합니다.
 * firebase deploy --only functions 시 이 파일이 진입점이 됩니다.
 */

const admin = require('firebase-admin');

// Firebase Admin SDK 초기화 (한 번만)
admin.initializeApp();

// === 함수 export ===
exports.aiConsult = require('./aiConsult').aiConsult;
exports.exchangeWpToken = require('./authExchange').exchangeWpToken;
exports.listMyConsultations = require('./listMyConsultations').listMyConsultations;
exports.cancelMyConsultation = require('./cancelMyConsultation').cancelMyConsultation;
exports.getConsultationStats = require('./getConsultationStats').getConsultationStats;
