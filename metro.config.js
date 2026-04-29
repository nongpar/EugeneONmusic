// Metro bundler config
// 프로젝트 루트의 functions/ 는 Cloud Functions 서버 코드라 RN 번들러가 watch할
// 필요 없음. Windows에서 npm install 후 functions/node_modules 안에 깨진 심볼릭
// 링크가 생겨 Metro 파일 워처가 죽는 문제(UNKNOWN: lstat ...?...) 방지용.
//
// 주의: 단순히 /functions/ 패턴만 막으면 node_modules/firebase/functions (클라이언트
// Firebase SDK)까지 차단됨. 프로젝트 루트의 functions/ 절대 경로로 앵커링해야 함.

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const functionsRoot = path.join(__dirname, 'functions');
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

config.resolver.blockList = [
  new RegExp(`^${escapeRegExp(functionsRoot)}[\\\\/]`),
];

module.exports = config;
