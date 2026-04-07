/**
 * EON Music App - 자동 로그인 엔드포인트
 *
 * 앱에서 JWT 토큰을 전달하면 WordPress 로그인 쿠키를 설정하고
 * 지정된 페이지로 리다이렉트합니다.
 *
 * 사용법: https://eon-music.com/?eon_autologin=JWT_TOKEN&redirect=TARGET_URL
 *
 * Code Snippets 플러그인에 추가하거나 functions.php에 넣으세요.
 */

add_action('init', function () {
    if (!isset($_GET['eon_autologin']) || empty($_GET['eon_autologin'])) {
        return;
    }

    $token    = sanitize_text_field($_GET['eon_autologin']);
    $redirect = isset($_GET['redirect']) ? esc_url_raw($_GET['redirect']) : home_url('/my-courses/');

    // 1) JWT 토큰 디코딩 → user_id 추출
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        wp_safe_redirect($redirect);
        exit;
    }

    $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
    if (!$payload || empty($payload['data']['user']['id'])) {
        wp_safe_redirect($redirect);
        exit;
    }

    $user_id = intval($payload['data']['user']['id']);

    // 2) JWT 토큰 유효성 검증 (JWT Auth 플러그인 활용)
    $validate_url = home_url('/wp-json/jwt-auth/v1/token/validate');
    $response = wp_remote_post($validate_url, array(
        'headers' => array(
            'Authorization' => 'Bearer ' . $token,
        ),
        'timeout' => 10,
    ));

    if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
        // 토큰이 유효하지 않으면 그냥 리다이렉트
        wp_safe_redirect($redirect);
        exit;
    }

    // 3) 유저 확인
    $user = get_user_by('ID', $user_id);
    if (!$user) {
        wp_safe_redirect($redirect);
        exit;
    }

    // 4) WordPress 로그인 쿠키 설정
    wp_clear_auth_cookie();
    wp_set_current_user($user_id);
    wp_set_auth_cookie($user_id, true);

    // 5) 대상 페이지로 리다이렉트
    wp_safe_redirect($redirect);
    exit;
});
