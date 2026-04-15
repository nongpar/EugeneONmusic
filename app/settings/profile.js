import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Linking, Alert, Platform } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { deleteDoc, doc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(message);
  } else {
    Alert.alert(title, message);
  }
};

// ── SVG Icons ──
function BackIcon({ size = 24, color = '#F5F0E8' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PersonIcon({ size = 48, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

function GlobeIcon({ size = 18, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.8} />
      <Path d="M2 12h20" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

function TrashIcon({ size = 18, color = '#e74c3c' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const [displayName, setDisplayName] = useState(
    user?.displayName || user?.email?.split('@')[0] || ''
  );

  const email = user?.email || '';
  const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';

  const handleSave = () => {
    showAlert('안내', '프로필 수정은 eon-music.com에서 가능합니다');
  };

  const handleDeleteAccount = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('정말로 계정을 삭제하시겠습니까?\n\n삭제된 계정은 복구할 수 없으며, 모든 데이터(연습 기록, 채팅, 레슨 노트 등)가 영구적으로 삭제됩니다.')) {
        deleteAccount();
      }
    } else {
      Alert.alert(
        '계정 삭제',
        '정말로 계정을 삭제하시겠습니까?\n\n삭제된 계정은 복구할 수 없으며, 모든 데이터(연습 기록, 채팅, 레슨 노트 등)가 영구적으로 삭제됩니다.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: deleteAccount,
          },
        ]
      );
    }
  };

  const deleteAccount = async () => {
    if (!user?.uid) return;
    try {
      // Firestore 사용자 관련 데이터 삭제
      await deleteDoc(doc(db, 'pushTokens', user.uid)).catch(() => {});

      // 로그아웃
      await logout();

      showAlert('계정 삭제 완료', '계정이 삭제되었습니다. 이용해 주셔서 감사합니다.');
      router.replace('/');
    } catch (err) {
      showAlert('오류', '계정 삭제 중 문제가 발생했습니다. 고객지원에 문의해주세요.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>프로필 편집</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>이름</Text>
          <TextInput
            style={styles.textInput}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="이름을 입력하세요"
            placeholderTextColor="rgba(201,169,110,0.3)"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>이메일</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>{email}</Text>
          </View>
          <Text style={styles.fieldHint}>이메일은 변경할 수 없습니다</Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>저장</Text>
        </TouchableOpacity>

        {/* Website Link */}
        <TouchableOpacity
          style={styles.webLink}
          onPress={() => Linking.openURL('https://eon-music.com/my-account/')}
        >
          <GlobeIcon />
          <Text style={styles.webLinkText}>eon-music.com에서 프로필 관리</Text>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="#C9A96E" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <TrashIcon />
          <Text style={styles.deleteBtnText}>계정 삭제</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#110E0B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#F5F0E8',
    letterSpacing: 0.3,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#C9A96E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#110E0B',
  },
  card: {
    backgroundColor: 'rgba(201,169,110,0.07)',
    borderRadius: 4,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(201,169,110,0.18)',
  },
  fieldLabel: {
    fontSize: 12,
    color: '#9e9282',
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#0C0A08',
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#F5F0E8',
    borderWidth: 0.5,
    borderColor: 'rgba(201,169,110,0.18)',
  },
  readOnlyField: {
    backgroundColor: '#0C0A08',
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(201,169,110,0.18)',
  },
  readOnlyText: {
    fontSize: 15,
    color: '#9e9282',
  },
  fieldHint: {
    fontSize: 11,
    color: 'rgba(201,169,110,0.3)',
    marginTop: 6,
    marginLeft: 4,
  },
  saveBtn: {
    backgroundColor: '#C9A96E',
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#110E0B',
    letterSpacing: 0.5,
  },
  webLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(201,169,110,0.07)',
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#C9A96E30',
  },
  webLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C9A96E',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 32,
    marginBottom: 8,
    backgroundColor: 'rgba(231,76,60,0.08)',
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(231,76,60,0.25)',
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e74c3c',
  },
});
