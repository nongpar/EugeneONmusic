import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';

const GOAL_STORAGE_KEY = '@eon_practice_goal';
const DEFAULT_GOAL_MINUTES = 60;

function getTodayString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** 목표 분(minutes) 불러오기 */
export async function loadGoalMinutes() {
  try {
    const saved = await AsyncStorage.getItem(GOAL_STORAGE_KEY);
    return saved ? Number(saved) : DEFAULT_GOAL_MINUTES;
  } catch {
    return DEFAULT_GOAL_MINUTES;
  }
}

export async function savePracticeSession(userId, durationSeconds) {
  if (!userId) return;
  const todayDateStr = getTodayString();
  const sessionsRef = collection(db, 'users', userId, 'practiceSessions');
  await addDoc(sessionsRef, {
    duration: durationSeconds,
    date: todayDateStr,
    createdAt: serverTimestamp(),
  });
}

export function usePracticeStats(userId) {
  const [stats, setStats] = useState({
    todaySeconds: 0,
    goalMinutes: DEFAULT_GOAL_MINUTES,
    todayProgress: 0,       // 0~1 (오늘 달성률)
    todayGoalMet: false,    // 오늘 목표 달성 여부
    streakDays: 0,
    goalStreakDays: 0,       // 목표 달성 기준 연속일
    totalDays: 0,
    totalHours: 0,
    weeklyData: [
      { day: '월', minutes: 0 },
      { day: '화', minutes: 0 },
      { day: '수', minutes: 0 },
      { day: '목', minutes: 0 },
      { day: '금', minutes: 0 },
      { day: '토', minutes: 0 },
      { day: '일', minutes: 0 },
    ],
    loading: true,
  });

  useEffect(() => {
    if (!userId) {
      setStats((prev) => ({ ...prev, loading: false }));
      return;
    }

    let goalMin = DEFAULT_GOAL_MINUTES;

    const sessionsRef = collection(db, 'users', userId, 'practiceSessions');
    const q = query(sessionsRef, orderBy('createdAt', 'desc'), limit(200));

    // 목표를 먼저 로드한 후 onSnapshot 시작
    loadGoalMinutes().then((gm) => { goalMin = gm; });

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // 매 스냅샷마다 최신 목표 반영
      goalMin = await loadGoalMinutes();
      const goalSeconds = goalMin * 60;

      const sessions = snapshot.docs.map((doc) => doc.data());
      const todayStr = getTodayString();

      // todaySeconds
      const todaySeconds = sessions
        .filter((s) => s.date === todayStr)
        .reduce((sum, s) => sum + (s.duration || 0), 0);

      // 오늘 달성률
      const todayProgress = goalSeconds > 0 ? Math.min(todaySeconds / goalSeconds, 1) : 0;
      const todayGoalMet = todaySeconds >= goalSeconds;

      // Aggregate duration per date
      const dateMap = {};
      sessions.forEach((s) => {
        if (!s.date) return;
        dateMap[s.date] = (dateMap[s.date] || 0) + (s.duration || 0);
      });

      const uniqueDates = Object.keys(dateMap).sort().reverse();

      // totalDays
      const totalDays = uniqueDates.length;

      // totalHours
      const totalSeconds = Object.values(dateMap).reduce((sum, d) => sum + d, 0);
      const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;

      // streakDays (연습한 날 기준)
      let streakDays = 0;
      if (uniqueDates.length > 0) {
        const dateSet = new Set(uniqueDates);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let cursor = new Date(today);
        if (!dateSet.has(formatDate(cursor))) {
          cursor.setDate(cursor.getDate() - 1);
        }

        while (dateSet.has(formatDate(cursor))) {
          streakDays++;
          cursor.setDate(cursor.getDate() - 1);
        }
      }

      // goalStreakDays (목표 달성 기준 연속일)
      let goalStreakDays = 0;
      if (uniqueDates.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let cursor = new Date(today);
        // 오늘 목표 미달성이면 어제부터 체크
        const todayDateKey = formatDate(cursor);
        if (!dateMap[todayDateKey] || dateMap[todayDateKey] < goalSeconds) {
          cursor.setDate(cursor.getDate() - 1);
        }

        while (true) {
          const dateKey = formatDate(cursor);
          const daySeconds = dateMap[dateKey] || 0;
          if (daySeconds >= goalSeconds) {
            goalStreakDays++;
            cursor.setDate(cursor.getDate() - 1);
          } else {
            break;
          }
        }
      }

      // weeklyData: current week Mon-Sun
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);

      const dayLabels = ['월', '화', '수', '목', '금', '토', '일'];
      const weeklyData = dayLabels.map((day, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = formatDate(d);
        const seconds = dateMap[dateStr] || 0;
        return { day, minutes: Math.round(seconds / 60) };
      });

      setStats({
        todaySeconds,
        goalMinutes: goalMin,
        todayProgress,
        todayGoalMet,
        streakDays,
        goalStreakDays,
        totalDays,
        totalHours,
        weeklyData,
        loading: false,
      });
    });

    return () => unsubscribe();
  }, [userId]);

  return stats;
}

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
