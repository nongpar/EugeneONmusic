import { View, Text, StyleSheet } from 'react-native';

const TODAY_INDEX = (() => {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
})();

function formatTime(mins) {
  if (mins === 0) return '0분';
  if (mins < 60) return `${mins}분`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

export default function WeeklyChart({ weeklyData }) {
  const data = weeklyData || [
    { day: '월', minutes: 0 },
    { day: '화', minutes: 0 },
    { day: '수', minutes: 0 },
    { day: '목', minutes: 0 },
    { day: '금', minutes: 0 },
    { day: '토', minutes: 0 },
    { day: '일', minutes: 0 },
  ];

  const maxMinutes = Math.max(...data.map((d) => d.minutes), 1);
  const totalMinutes = data.reduce((sum, d) => sum + d.minutes, 0);
  const streak = data.filter((d, i) => i <= TODAY_INDEX && d.minutes > 0).length;
  const hasData = totalMinutes > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>이번 주 연습</Text>
        <Text style={styles.totalTime}>{hasData ? formatTime(totalMinutes) : '-'}</Text>
      </View>

      <View style={styles.chartArea}>
        {data.map((item, index) => {
          const heightPercent = maxMinutes > 0 ? (item.minutes / maxMinutes) * 100 : 0;
          const isToday = index === TODAY_INDEX;
          const hasPractice = item.minutes > 0;

          return (
            <View key={item.day} style={styles.barColumn}>
              <Text style={styles.barValue}>
                {hasPractice ? formatTime(item.minutes) : ''}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(heightPercent, 4)}%`,
                      backgroundColor: isToday
                        ? '#C9A96E'
                        : hasPractice
                        ? 'rgba(201,169,110,0.4)'
                        : 'rgba(201,169,110,0.07)',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.dayLabel, isToday && styles.todayLabel]}>
                {item.day}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{hasData ? formatTime(totalMinutes) : '-'}</Text>
          <Text style={styles.statLabel}>총 연습</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{streak > 0 ? `${streak}일` : '-'}</Text>
          <Text style={styles.statLabel}>연속</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {hasData ? formatTime(Math.round(totalMinutes / 7)) : '-'}
          </Text>
          <Text style={styles.statLabel}>일 평균</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(201,169,110,0.07)',
    borderRadius: 4,
    padding: 20,
    gap: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(201,169,110,0.15)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '400',
    color: '#F5F0E8',
    letterSpacing: 0.3,
  },
  totalTime: {
    fontSize: 15,
    fontWeight: '400',
    color: '#C9A96E',
  },
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    gap: 6,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    gap: 4,
  },
  barValue: {
    fontSize: 9,
    color: '#9e9282',
    height: 14,
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '65%',
    borderRadius: 2,
    minHeight: 4,
  },
  dayLabel: {
    fontSize: 12,
    color: '#9e9282',
    marginTop: 4,
  },
  todayLabel: {
    color: '#C9A96E',
    fontWeight: '400',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#0C0A08',
    borderRadius: 4,
    paddingVertical: 14,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '300',
    color: '#F5F0E8',
  },
  statLabel: {
    fontSize: 12,
    color: '#9e9282',
  },
  divider: {
    width: 0.5,
    height: 30,
    backgroundColor: 'rgba(201,169,110,0.18)',
  },
});
