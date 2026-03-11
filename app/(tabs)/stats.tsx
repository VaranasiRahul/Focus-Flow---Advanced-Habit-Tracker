import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Rect, Text as SvgText, Line } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useTaskContext } from "@/context/TaskContext";

const SCREEN_WIDTH = Dimensions.get("window").width;

function getDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m`;
}

function WeekBarChart({ taskId, color }: { taskId: string; color: string }) {
  const { getRecordsForTask } = useTaskContext();
  const records = getRecordsForTask(taskId);

  const days = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = getDateString(d);
      const record = records.find((r) => r.date === dateStr);
      result.push({
        label: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d.getDay()],
        seconds: record?.secondsSpent ?? 0,
        isToday: i === 0,
      });
    }
    return result;
  }, [records]);

  const maxSeconds = Math.max(...days.map((d) => d.seconds), 1);
  const chartW = SCREEN_WIDTH - 80;
  const chartH = 80;
  const barW = Math.floor((chartW - 6 * 6) / 7);
  const gap = (chartW - barW * 7) / 6;

  return (
    <Svg width={chartW} height={chartH + 20}>
      {days.map((day, i) => {
        const barH = Math.max((day.seconds / maxSeconds) * chartH, day.seconds > 0 ? 4 : 0);
        const x = i * (barW + gap);
        const y = chartH - barH;
        return (
          <React.Fragment key={i}>
            <Rect x={x} y={0} width={barW} height={chartH} rx={6} fill="#1E1E1E" />
            {barH > 0 && (
              <Rect x={x} y={y} width={barW} height={barH} rx={6} fill={day.isToday ? color : `${color}88`} />
            )}
            <SvgText
              x={x + barW / 2} y={chartH + 15}
              textAnchor="middle"
              fill={day.isToday ? Colors.text : Colors.textMuted}
              fontSize={10}
              fontWeight={day.isToday ? "700" : "400"}
            >
              {day.label}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

function StreakCalendar({ taskId, targetMinutes, color }: { taskId: string; targetMinutes: number; color: string }) {
  const { getRecordsForTask } = useTaskContext();
  const records = getRecordsForTask(taskId);
  const targetSeconds = targetMinutes * 60;

  const weeks = useMemo(() => {
    const today = new Date();
    const result: { date: string; achieved: boolean; future: boolean }[][] = [];
    let week: { date: string; achieved: boolean; future: boolean }[] = [];

    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = getDateString(d);
      const record = records.find((r) => r.date === dateStr);
      const achieved = record ? record.secondsSpent >= targetSeconds : false;
      const future = d > today;
      week.push({ date: dateStr, achieved, future });
      if (week.length === 7) {
        result.push(week);
        week = [];
      }
    }
    if (week.length > 0) result.push(week);
    return result;
  }, [records, targetSeconds]);

  return (
    <View style={calStyles.grid}>
      {weeks.map((week, wi) => (
        <View key={wi} style={calStyles.week}>
          {week.map((day, di) => (
            <View
              key={di}
              style={[
                calStyles.cell,
                day.achieved && { backgroundColor: color },
                !day.achieved && !day.future && { backgroundColor: "#1E1E1E" },
                day.future && { backgroundColor: "transparent" },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const calStyles = StyleSheet.create({
  grid: { flexDirection: "row", gap: 3 },
  week: { gap: 3 },
  cell: { width: 12, height: 12, borderRadius: 2 },
});

function TaskStatCard({ task }: { task: any }) {
  const { getTodayRecord, getStreak, getRecordsForTask } = useTaskContext();
  const todayRecord = getTodayRecord(task.id);
  const streak = getStreak(task.id);
  const allRecords = getRecordsForTask(task.id);
  const totalSeconds = allRecords.reduce((sum, r) => sum + r.secondsSpent, 0);
  const daysTracked = allRecords.filter((r) => r.secondsSpent > 0).length;
  const todaySeconds = todayRecord?.secondsSpent ?? 0;
  const progress = task.targetMinutes > 0 ? Math.min(todaySeconds / (task.targetMinutes * 60), 1) : 0;
  const avgSeconds = daysTracked > 0 ? Math.floor(totalSeconds / daysTracked) : 0;

  return (
    <View style={styles.taskStatCard}>
      <View style={styles.taskStatHeader}>
        <View style={[styles.taskColorDot, { backgroundColor: task.color }]} />
        <Text style={styles.taskStatName} numberOfLines={1}>{task.name}</Text>
        {streak > 0 && (
          <View style={styles.streakBadge}>
            <Feather name="zap" size={11} color="#FF6B35" />
            <Text style={styles.streakText}>{streak} day{streak !== 1 ? "s" : ""}</Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatSeconds(todaySeconds)}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatSeconds(totalSeconds)}</Text>
          <Text style={styles.statLabel}>All Time</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatSeconds(avgSeconds)}</Text>
          <Text style={styles.statLabel}>Avg/Day</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, streak > 0 && { color: "#FF6B35" }]}>
            {streak}
          </Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
      </View>

      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progress * 100}%` as any, backgroundColor: task.color }]} />
      </View>
      <Text style={styles.progressLabel}>{Math.round(progress * 100)}% of today's goal</Text>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>This Week</Text>
        <WeekBarChart taskId={task.id} color={task.color} />
      </View>

      <View style={styles.calendarContainer}>
        <Text style={styles.chartTitle}>Last 28 Days</Text>
        <StreakCalendar taskId={task.id} targetMinutes={task.targetMinutes} color={task.color} />
      </View>
    </View>
  );
}

function TodayOverview() {
  const { getTodayTasks, dailyRecords } = useTaskContext();
  const todayTasks = getTodayTasks();
  const today = getDateString(new Date());

  const totalSeconds = useMemo(() => {
    return dailyRecords.filter((r) => r.date === today).reduce((sum, r) => sum + r.secondsSpent, 0);
  }, [dailyRecords, today]);

  const completed = useMemo(() => {
    return todayTasks.filter((t) => {
      const record = dailyRecords.find((r) => r.taskId === t.id && r.date === today);
      return record && record.secondsSpent >= t.targetMinutes * 60;
    }).length;
  }, [todayTasks, dailyRecords, today]);

  const completionRate = todayTasks.length > 0 ? (completed / todayTasks.length) * 100 : 0;

  return (
    <View style={styles.overviewCard}>
      <Text style={styles.overviewTitle}>Today's Overview</Text>
      <View style={styles.overviewRow}>
        <View style={styles.overviewItem}>
          <Text style={styles.overviewValue}>{formatSeconds(totalSeconds)}</Text>
          <Text style={styles.overviewLabel}>Total Focus</Text>
        </View>
        <View style={styles.overviewDivider} />
        <View style={styles.overviewItem}>
          <Text style={styles.overviewValue}>{completed}/{todayTasks.length}</Text>
          <Text style={styles.overviewLabel}>Completed</Text>
        </View>
        <View style={styles.overviewDivider} />
        <View style={styles.overviewItem}>
          <Text style={[styles.overviewValue, { color: completionRate >= 100 ? "#1ABC9C" : Colors.accent }]}>
            {completionRate.toFixed(2)}%
          </Text>
          <Text style={styles.overviewLabel}>Rate</Text>
        </View>
      </View>
      {todayTasks.length > 0 && (
        <View style={styles.overviewBar}>
          <View style={[styles.overviewBarFill, { width: `${completionRate}%` as any }]} />
        </View>
      )}
    </View>
  );
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { tasks } = useTaskContext();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Statistics</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === "web" ? 120 : Platform.OS === "android" ? 20 : 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <TodayOverview />
        {tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="bar-chart-2" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptySubtitle}>Create tasks and start tracking to see your stats.</Text>
          </View>
        ) : (
          tasks.map((task) => <TaskStatCard key={task.id} task={task} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 24, color: Colors.text, fontFamily: "Inter_700Bold" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, gap: 16 },
  overviewCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 18, marginBottom: 4, gap: 14 },
  overviewTitle: { fontSize: 14, color: Colors.textSecondary, fontFamily: "Inter_500Medium" },
  overviewRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  overviewItem: { alignItems: "center" },
  overviewValue: { fontSize: 22, color: Colors.text, fontFamily: "Inter_700Bold" },
  overviewLabel: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_400Regular", marginTop: 2 },
  overviewDivider: { width: 1, height: 32, backgroundColor: Colors.border },
  overviewBar: { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: "hidden" },
  overviewBarFill: { height: "100%", backgroundColor: Colors.accent, borderRadius: 2 },
  taskStatCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 18, gap: 12 },
  taskStatHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  taskColorDot: { width: 10, height: 10, borderRadius: 5 },
  taskStatName: { flex: 1, fontSize: 15, color: Colors.text, fontFamily: "Inter_600SemiBold" },
  streakBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#FF6B3520", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 3 },
  streakText: { fontSize: 12, color: "#FF6B35", fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", gap: 8 },
  statItem: { flex: 1, backgroundColor: Colors.background, borderRadius: 10, padding: 10, alignItems: "center" },
  statValue: { fontSize: 14, color: Colors.text, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 9, color: Colors.textMuted, fontFamily: "Inter_400Regular", marginTop: 2 },
  progressBarBg: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 3 },
  progressLabel: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
  chartContainer: { gap: 8 },
  calendarContainer: { gap: 8 },
  chartTitle: { fontSize: 12, color: Colors.textSecondary, fontFamily: "Inter_500Medium" },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, color: Colors.text, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 20 },
});
