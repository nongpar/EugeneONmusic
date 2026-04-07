<?php
/**
 * EON Music App - 자동 로그인
 * 파일 위치: wp-content/mu-plugins/eon-autologin.php
 */

add_action('init', function () {
    if (!isset($_GET['eon_autologin']) || empty($_GET['eon_autologin'])) {
        return;
    }

    $token    = sanitize_text_field($_GET['eon_autologin']);
    $redirect = isset($_GET['redirect']) ? esc_url_raw($_GET['redirect']) : home_url('/my-courses/');

    // JWT 토큰 디코딩
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        wp_redirect($redirect);
        exit;
    }

    $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
    if (!$payload || empty($payload['data']['user']['id'])) {
        wp_redirect($redirect);
        exit;
    }

    $user_id = intval($payload['data']['user']['id']);

    // 만료 확인
    if (!empty($payload['exp']) && $payload['exp'] < time()) {
        wp_redirect($redirect);
        exit;
    }

    // JWT 서명 검증
    $secret = defined('JWT_AUTH_SECRET_KEY') ? JWT_AUTH_SECRET_KEY : '';
    if ($secret) {
        $sig_check = rtrim(strtr(base64_encode(hash_hmac('sha256', $parts[0] . '.' . $parts[1], $secret, true)), '+/', '-_'), '=');
        if (!hash_equals($sig_check, $parts[2])) {
            wp_redirect($redirect);
            exit;
        }
    }

    // 유저 확인
    $user = get_user_by('ID', $user_id);
    if (!$user) {
        wp_redirect($redirect);
        exit;
    }

    // WordPress 로그인 쿠키 설정
    wp_clear_auth_cookie();
    wp_set_current_user($user_id);
    wp_set_auth_cookie($user_id, true);

    // 리다이렉트
    wp_redirect($redirect);
    exit;
});
