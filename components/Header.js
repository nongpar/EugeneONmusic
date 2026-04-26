import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { router } from 'expo-router';

function BellIcon({ size = 22, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.73 21a2 2 0 01-3.46 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export default function Header() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setUnreadCount(0);
      return;
    }

    const roomsQ = query(
      collection(db, 'chatRooms'),
      where('memberIds', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(roomsQ, (snapshot) => {
      let total = 0;
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        total += data.unread?.[user.uid] || 0;
      });
      setUnreadCount(total);
    }, () => {
      setUnreadCount(0);
    });

    return unsubscribe;
  }, [user?.uid]);

  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <View>
          <Text style={styles.logoText}>EON International</Text>
          <Text style={styles.logoAccent}>Music</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.notificationBtn}
        onPress={() => router.push('/notifications')}
        activeOpacity={0.7}
      >
        <BellIcon color={colors.accent} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: c.bg,
    borderBottomWidth: 0.5,
    borderBottomColor: c.borderSoft,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoImage: {
    width: 38,
    height: 38,
  },
  logoText: {
    fontSize: 14,
    fontWeight: '400',
    color: c.text,
    letterSpacing: 1.2,
  },
  logoAccent: {
    fontSize: 10,
    fontWeight: '400',
    color: c.accent,
    letterSpacing: 2,
  },
  notificationBtn: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: c.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
