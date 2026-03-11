import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useTaskContext } from "@/context/TaskContext";

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
  const chartWidth = 260;
  const chartHeight = 80;
  const barWidth = 26;
  const gap = (chartWidth - barWidth * 7) / 6;

  return (
    <Svg width={chartWidth} height={chartHeight + 20}>
      {days.map((day, i) => {
        const barHeight = Math.max((day.seconds / maxSeconds) * chartHeight, day.seconds > 0 ? 4 : 0);
        const x = i * (barWidth + gap);
        const y = chartHeight - barHeight;
        return (
          <React.Fragment key={i}>
            <Rect
              x={x}
              y={0}
              width={barWidth}
              height={chartHeight}
              rx={6}
              fill="#2A2A2A"
            />
            {barHeight > 0 && (
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={6}
                fill={day.isToday ? color : `${color}88`}
              />
            )}
            <SvgText
              x={x + barWidth / 2}
              y={chartHeight + 15}
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

function TaskStatCard({ task }: { task: any }) {
  const { getTodayRecord, getStreak, getRecordsForTask } = useTaskContext();
  const todayRecord = getTodayRecord(task.id);
  const streak = getStreak(task.id);
  const allRecords = getRecordsForTask(task.id);
  const totalSeconds = allRecords.reduce((sum, r) => sum + r.secondsSpent, 0);
  const todaySeconds = todayRecord?.secondsSpent ?? 0;
  const progress = task.targetMinutes > 0
    ? Math.min(todaySeconds / (task.targetMinutes * 60), 1)
    : 0;

  return (
    <View style={styles.taskStatCard}>
      <View style={styles.taskStatHeader}>
        <View style={[styles.taskColorDot, { backgroundColor: task.color }]} />
        <Text style={styles.taskStatName} numberOfLines={1}>{task.name}</Text>
        {streak > 0 && (
          <View style={styles.streakBadge}>
            <Feather name="zap" size={11} color="#FF6B35" />
            <Text style={styles.streakText}>{streak}</Text>
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
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: streak > 0 ? "#FF6B35" : Colors.textSecondary }]}>
            {streak} day{streak !== 1 ? "s" : ""}
          </Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
      </View>

      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${progress * 100}%` as any,
              backgroundColor: task.color,
            },
          ]}
        />
      </View>
      <Text style={styles.progressLabel}>
        {Math.round(progress * 100)}% of today's goal
      </Text>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>This Week</Text>
        <WeekBarChart taskId={task.id} color={task.color} />
      </View>
    </View>
  );
}

function TodayOverview() {
  const { getTodayTasks, dailyRecords } = useTaskContext();
  const todayTasks = getTodayTasks();
  const today = getDateString(new Date());

  const totalSeconds = useMemo(() => {
    return dailyRecords
      .filter((r) => r.date === today)
      .reduce((sum, r) => sum + r.secondsSpent, 0);
  }, [dailyRecords, today]);

  const completed = useMemo(() => {
    return todayTasks.filter((t) => {
      const record = dailyRecords.find((r) => r.taskId === t.id && r.date === today);
      return record && record.secondsSpent >= t.targetMinutes * 60;
    }).length;
  }, [todayTasks, dailyRecords, today]);

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
          <Text style={[styles.overviewValue, { color: Colors.accent }]}>
            {todayTasks.length > 0 ? Math.round((completed / todayTasks.length) * 100) : 0}%
          </Text>
          <Text style={styles.overviewLabel}>Rate</Text>
        </View>
      </View>
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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 120 : 100 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <TodayOverview />

        {tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="bar-chart-2" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptySubtitle}>
              Create tasks and start tracking to see your stats.
            </Text>
          </View>
        ) : (
          tasks.map((task) => <TaskStatCard key={task.id} task={task} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 24,
    color: Colors.text,
    fontFamily: "Inter_700Bold",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  overviewCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 4,
  },
  overviewTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
    marginBottom: 14,
  },
  overviewRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  overviewItem: {
    alignItems: "center",
  },
  overviewValue: {
    fontSize: 22,
    color: Colors.text,
    fontFamily: "Inter_700Bold",
  },
  overviewLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  overviewDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  taskStatCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
  },
  taskStatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  taskColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  taskStatName: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF6B3520",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  streakText: {
    fontSize: 12,
    color: "#FF6B35",
    fontFamily: "Inter_700Bold",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  statItem: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  statValue: {
    fontSize: 15,
    color: Colors.text,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: "flex-start",
  },
  chartTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
    marginBottom: 10,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
