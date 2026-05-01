<?php
/**
 * EON Music App - 회원가입 후 앱 자동 로그인
 *
 * 동작:
 *  1) 사용자가 RN WebView 안에서 회원가입을 완료하면 user_register 훅이 발화
 *     → 새 user_id를 60초짜리 HttpOnly 쿠키에 기록
 *  2) 가입 완료 후 이동되는 페이지(예: /user-registration/registered/)의
 *     wp_footer에서 UA 마커("EonMusicApp")를 확인하고, 쿠키 또는 현재
 *     로그인 사용자의 ID로 JWT(JWT Auth 플러그인 호환)를 발급
 *  3) <script>로 window.ReactNativeWebView.postMessage(JSON) 호출
 *     → RN 앱의 register.js 가 onMessage로 받아 자동 로그인
 *
 * 보안:
 *  - UA에 "EonMusicApp"이 없으면 일반 브라우저 가입자에게는 어떤 토큰도 노출되지 않음
 *  - 발급 가능한 시점: 가입 직후 60초 안의 thank-you 페이지 (쿠키 1회 소비)
 *  - 토큰 서명은 JWT_AUTH_SECRET_KEY 로 HMAC-SHA256 (eon-autologin.php와 동일)
 *
 * 설치: wp-content/mu-plugins/signup-postmessage.php 로 배치하거나
 *       Code Snippets 플러그인에 추가.
 */

if (!defined('ABSPATH')) { exit; }

/**
 * JWT Auth 플러그인이 발급하는 토큰과 동일한 구조로 JWT를 생성한다.
 * (페이로드 data.user.id, HS256 서명, JWT_AUTH_SECRET_KEY 사용)
 */
function eon_signup_generate_jwt($user_id) {
    if (!defined('JWT_AUTH_SECRET_KEY') || !JWT_AUTH_SECRET_KEY) {
        return null;
    }
    $secret = JWT_AUTH_SECRET_KEY;
    $now    = time();
    $exp    = $now + (DAY_IN_SECONDS * 7);

    $header  = ['alg' => 'HS256', 'typ' => 'JWT'];
    $payload = [
        'iss'  => get_bloginfo('url'),
        'iat'  => $now,
        'nbf'  => $now,
        'exp'  => $exp,
        'data' => [ 'user' => [ 'id' => (string) $user_id ] ],
    ];

    $b64 = function ($data) {
        return rtrim(strtr(base64_encode(wp_json_encode($data)), '+/', '-_'), '=');
    };
    $h = $b64($header);
    $p = $b64($payload);
    $sig = hash_hmac('sha256', $h . '.' . $p, $secret, true);
    $s = rtrim(strtr(base64_encode($sig), '+/', '-_'), '=');

    return $h . '.' . $p . '.' . $s;
}

/**
 * 회원가입 직후, 새 user_id를 짧은 쿠키에 기록한다.
 * (가입 완료 페이지로 리다이렉트되기 전에 실행됨)
 */
add_action('user_register', function ($user_id) {
    $host   = parse_url(home_url(), PHP_URL_HOST);
    $secure = is_ssl();
    // 60초만 유효 — 같은 WebView 컨텍스트에서 thank-you 페이지를 볼 동안만
    setcookie('eon_signup_uid', (string) intval($user_id), [
        'expires'  => time() + 60,
        'path'     => '/',
        'domain'   => $host,
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}, 10, 1);

/**
 * RN WebView 안에서 보고 있는 페이지의 footer에 postMessage 스크립트를 인젝션.
 * UA 마커가 없으면 아무것도 하지 않는다 (일반 브라우저 안전).
 */
add_action('wp_footer', function () {
    $ua = isset($_SERVER['HTTP_USER_AGENT']) ? (string) $_SERVER['HTTP_USER_AGENT'] : '';
    if (strpos($ua, 'EonMusicApp') === false) {
        return; // RN WebView가 아니면 종료
    }

    // 가입 직후에만 발화: 쿠키가 있어야 함
    if (empty($_COOKIE['eon_signup_uid'])) {
        return;
    }
    $uid = intval($_COOKIE['eon_signup_uid']);
    if ($uid <= 0) { return; }

    // 1회 소비 — 즉시 만료
    $host = parse_url(home_url(), PHP_URL_HOST);
    setcookie('eon_signup_uid', '', [
        'expires'  => time() - 3600,
        'path'     => '/',
        'domain'   => $host,
        'secure'   => is_ssl(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    $user = get_userdata($uid);
    if (!$user) { return; }

    $token = eon_signup_generate_jwt($uid);
    if (!$token) { return; }

    $msg = [
        'type'  => 'EON_SIGNUP_SUCCESS',
        'token' => $token,
        'user'  => [
            'id'          => (string) $uid,
            'email'       => $user->user_email,
            'displayName' => $user->display_name,
            'nickname'    => $user->user_nicename,
        ],
    ];
    // postMessage는 string을 받으므로 JS에서 string 리터럴로 안전하게 주입
    $msg_json   = wp_json_encode($msg);
    $msg_js_str = wp_json_encode($msg_json); // double-encode → JS 안에서 "..." 형태로 안전

    echo "<script>(function(){try{if(window.ReactNativeWebView&&typeof window.ReactNativeWebView.postMessage==='function'){window.ReactNativeWebView.postMessage({$msg_js_str});}}catch(e){}})();</script>";
}, 99);
