import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── SVG Icons ──
function BackIcon({ size = 24, color = '#F5F0E8' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MailIcon({ size = 22, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth={1.8} />
      <Path d="M22 4l-10 8L2 4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PhoneIcon({ size = 22, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MobileIcon({ size = 22, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="2" width="14" height="20" rx="2" stroke={color} strokeWidth={1.8} />
      <Path d="M12 18h.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ClockIcon({ size = 20, color = '#C9A96E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.8} />
      <Path d="M12 6v6l4 2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ContactItem({ icon, label, value, onPress }) {
  return (
    <TouchableOpacity style={styles.contactItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.contactIcon}>{icon}</View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={styles.contactValue}>{value}</Text>
      </View>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path d="M9 18l6-6-6-6" stroke="#9e9282" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </TouchableOpacity>
  );
}

export default function HelpScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>고객센터</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* 문의하기 */}
        <Text style={styles.sectionTitle}>문의하기</Text>
        <View style={styles.card}>
          <ContactItem
            icon={<MailIcon />}
            label="이메일"
            value="help@eugeneonmusic.com"
            onPress={() => Linking.openURL('mailto:help@eugeneonmusic.com')}
          />
          <ContactItem
            icon={<PhoneIcon />}
            label="전화 (대표)"
            value="02-718-8954"
            onPress={() => Linking.openURL('tel:02-718-8954')}
          />
          <ContactItem
            icon={<MobileIcon />}
            label="전화 (휴대폰)"
            value="010-2823-8954"
            onPress={() => Linking.openURL('tel:010-2823-8954')}
          />
        </View>

        {/* 운영시간 */}
        <Text style={styles.sectionTitle}>운영시간</Text>
        <View style={styles.card}>
          <View style={styles.hoursRow}>
            <ClockIcon />
            <View style={styles.hoursInfo}>
              <View style={styles.hourLine}>
                <Text style={styles.hourDay}>평일</Text>
                <Text style={styles.hourTime}>10:00 ~ 18:00</Text>
              </View>
              <View style={styles.hourLine}>
                <Text style={styles.hourDay}>토요일</Text>
                <Text style={styles.hourTime}>10:00 ~ 14:00</Text>
              </View>
              <View style={styles.hourLine}>
                <Text style={styles.hourDayClosed}>일요일/공휴일</Text>
                <Text style={styles.hourTimeClosed}>휴무</Text>
              </View>
            </View>
          </View>
        </View>
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9e9282',
    marginBottom: 10,
    marginTop: 20,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: 'rgba(201,169,110,0.07)',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(201,169,110,0.18)',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#110E0B',
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#C9A96E15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactLabel: {
    fontSize: 12,
    color: '#9e9282',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  contactValue: {
    fontSize: 15,
    color: '#F5F0E8',
    fontWeight: '500',
  },
  hoursRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  hoursInfo: {
    flex: 1,
    gap: 10,
  },
  hourLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hourDay: {
    fontSize: 14,
    color: '#F5F0E8',
    fontWeight: '500',
  },
  hourTime: {
    fontSize: 14,
    color: '#C9A96E',
    fontWeight: '500',
  },
  hourDayClosed: {
    fontSize: 14,
    color: '#9e9282',
  },
  hourTimeClosed: {
    fontSize: 14,
    color: '#9e9282',
  },
});
