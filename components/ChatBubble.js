import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';

const showAlert = (title, message, buttons) => {
  if (Platform.OS === 'web') {
    if (buttons) {
      const confirmed = window.confirm(`${title}\n${message}`);
      if (confirmed && buttons[1]?.onPress) buttons[1].onPress();
    } else {
      window.alert(`${title}\n${message}`);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

export default function ChatBubble({ message, isMine, onReport }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const time = message.createdAt?.toDate?.();
  const timeStr = time
    ? `${time.getHours()}:${String(time.getMinutes()).padStart(2, '0')}`
    : '';

  const handleLongPress = () => {
    if (isMine) return; // 내 메시지는 신고 불가
    showAlert(
      '메시지 신고',
      '이 메시지를 부적절한 콘텐츠로 신고하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '신고',
          style: 'destructive',
          onPress: () => {
            if (onReport) onReport(message);
            showAlert('신고 완료', '신고가 접수되었습니다. 검토 후 조치하겠습니다.');
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onLongPress={handleLongPress}
      delayLongPress={500}
      style={[styles.row, isMine && styles.rowMine]}
    >
      {!isMine && (
        <View style={styles.senderAvatar}>
          <Text style={styles.senderAvatarText}>
            {(message.senderName || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.bubbleCol}>
        {!isMine && (
          <Text style={styles.senderName}>{message.senderName}</Text>
        )}
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
          <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
            {message.text}
          </Text>
        </View>
        <Text style={[styles.timeText, isMine && styles.timeTextMine]}>{timeStr}</Text>
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (c) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  senderAvatarText: {
    fontSize: 13,
    fontWeight: '400',
    color: c.bg,
  },
  bubbleCol: {
    maxWidth: '75%',
    gap: 2,
  },
  senderName: {
    fontSize: 11,
    color: c.textMuted,
    marginBottom: 2,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 4,
  },
  bubbleOther: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 0,
  },
  bubbleMine: {
    backgroundColor: c.accent,
    borderTopRightRadius: 0,
  },
  bubbleText: {
    fontSize: 14,
    color: '#c0bab0',
    lineHeight: 20,
  },
  bubbleTextMine: {
    color: c.bg,
  },
  timeText: {
    fontSize: 10,
    color: c.textMuted,
  },
  timeTextMine: {
    textAlign: 'right',
  },
});
