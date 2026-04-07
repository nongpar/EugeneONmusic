import { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ScrollView, Image, Linking,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';

// ── SVG 아이콘 ──
function BackIcon({ size = 22, color = '#8a9bae' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function UserIcon({ size = 20, color = '#6b7b8d' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function LockIcon({ size = 20, color = '#6b7b8d' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth={2} />
      <Path d="M7 11V7a5 5 0 0110 0v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function EyeIcon({ size = 20, color = '#6b7b8d', open = true }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {open ? (
        <>
          <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth={2} />
          <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
        </>
      ) : (
        <>
          <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" stroke={color} strokeWidth={2} strokeLinecap="round" />
          <Path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" stroke={color} strokeWidth={2} strokeLinecap="round" />
          <Path d="M1 1l22 22" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('알림', '아이디와 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      router.replace('/(tabs)/my');
    } catch (error) {
      Alert.alert('로그인 실패', error.message || '아이디 또는 비밀번호를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    Linking.openURL('https://eon-music.com/user-registration/');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* 뒤로가기 */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <BackIcon />
        </TouchableOpacity>

        {/* 로고 */}
        <View style={styles.logoSection}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>EON International</Text>
          <Text style={styles.logoAccent}>Music Academy</Text>
          <Text style={styles.subtitle}>eon-music.com 계정으로 로그인</Text>
        </View>

        {/* 폼 */}
        <View style={styles.form}>
          <View style={styles.inputWrap}>
            <View style={styles.inputIconWrap}>
              <UserIcon />
            </View>
            <TextInput
              style={styles.input}
              placeholder="아이디 또는 이메일"
              placeholderTextColor="#4a5a6a"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrap}>
            <View style={styles.inputIconWrap}>
              <LockIcon />
            </View>
            <TextInput
              style={styles.input}
              placeholder="비밀번호"
              placeholderTextColor="#4a5a6a"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <EyeIcon open={showPassword} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.disabledBtn]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? '로그인 중...' : '로그인'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 안내 */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            eon-music.com 원격평생교육원 계정으로 로그인하세요.{'\n'}
            앱의 모든 기능과 강좌 수강이 연동됩니다.
          </Text>
        </View>

        {/* 회원가입 */}
        <TouchableOpacity style={styles.signUpRow} onPress={handleSignUp}>
          <Text style={styles.toggleText}>계정이 없으신가요? </Text>
          <Text style={styles.toggleLink}>회원가입</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1923' },
  scrollContent: {
    flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1a2530', alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  logoSection: { alignItems: 'center', gap: 4, marginBottom: 40 },
  logoImage: { width: 64, height: 64, marginBottom: 8 },
  logoText: { fontSize: 22, fontWeight: '700', color: '#ffffff', letterSpacing: 0.3 },
  logoAccent: { fontSize: 14, fontWeight: '500', color: '#C9A96E', letterSpacing: 0.5 },
  subtitle: { fontSize: 13, color: '#6b7b8d', marginTop: 8 },

  form: { gap: 14 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a2530', borderRadius: 12,
    paddingHorizontal: 14, height: 52,
    borderWidth: 1, borderColor: '#2a3a4a',
  },
  inputIconWrap: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#ffffff' },
  eyeBtn: { padding: 4 },

  primaryBtn: {
    backgroundColor: '#C9A96E', borderRadius: 12,
    height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  disabledBtn: { opacity: 0.6 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#0f1923' },

  infoBox: {
    backgroundColor: '#1a2530', borderRadius: 12,
    padding: 16, marginTop: 24,
    borderWidth: 1, borderColor: '#222f3a',
  },
  infoText: { fontSize: 13, color: '#6b7b8d', lineHeight: 20, textAlign: 'center' },

  signUpRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  toggleText: { color: '#6b7b8d', fontSize: 14 },
  toggleLink: { color: '#C9A96E', fontSize: 14, fontWeight: 'bold' },
});
