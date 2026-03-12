import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Rect, Circle, Path, Text as SvgText } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useTaskContext } from "@/context/TaskContext";

const SW = Dimensions.get("window").width;

function getDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function fmt(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2,"0")}m`;
  return `${m}m`;
}
function fmtFull(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2,"0")}m`;
  return `0h ${String(m).padStart(2,"0")}m`;
}
function today() { return getDateStr(new Date()); }

// ----- Subcomponents -----

function StatBox({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 12, alignItems: "center", minHeight: 72 }}>
      <Text style={{ fontSize: 20, color: accent ?? colors.text, fontFamily: "Inter_700Bold" }}>{value}</Text>
      <Text style={{ fontSize: 10, color: colors.textMuted, fontFamily: "Inter_400Regular", textAlign: "center" }}>{label}</Text>
      {sub ? <Text style={{ fontSize: 10, color: colors.textSecondary, fontFamily: "Inter_500Medium", marginTop: 2 }}>{sub}</Text> : null}
    </View>
  );
}

function WeekBarChart({ taskId, color }: { taskId: string; color: string }) {
  const { colors } = useTheme();
  const { getRecordsForTask } = useTaskContext();
  const records = getRecordsForTask(taskId);
  const days = useMemo(() => {
    const result = []; const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const rec = records.find((r) => r.date === getDateStr(d));
      result.push({ label: ["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()], seconds: rec?.secondsSpent ?? 0, isToday: i === 0 });
    }
    return result;
  }, [records]);
  const maxS = Math.max(...days.map((d) => d.seconds), 1);
  const W = SW - 80, H = 90;
  const bW = Math.floor((W - 6 * 8) / 7), gap = (W - bW * 7) / 6;
  return (
    <Svg width={W} height={H + 24}>
      {days.map((day, i) => {
        const bH = day.seconds > 0 ? Math.max((day.seconds / maxS) * H, 6) : 4;
        const x = i * (bW + gap), y = H - bH;
        return (
          <React.Fragment key={i}>
            <Rect x={x} y={0} width={bW} height={H} rx={5} fill={colors.border} />
            <Rect x={x} y={y} width={bW} height={bH} rx={5} fill={day.isToday ? color : color + "88"} />
            <SvgText x={x + bW / 2} y={H + 18} textAnchor="middle" fill={day.isToday ? color : colors.textMuted} fontSize={10} fontWeight={day.isToday ? "700" : "400"}>{day.label}</SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

function HeatMap({ taskId, color }: { taskId: string; color: string }) {
  const { colors } = useTheme();
  const { getRecordsForTask, tasks } = useTaskContext();
  const records = getRecordsForTask(taskId);
  const task = tasks.find((t) => t.id === taskId);
  const targetS = (task?.targetMinutes ?? 60) * 60;

  const weeks = useMemo(() => {
    const grid: { date: string; seconds: number; level: number }[][] = [];
    const now = new Date();
    // Go back 12 weeks (84 days) and align to Sunday
    const start = new Date(now);
    start.setDate(start.getDate() - 83);
    start.setDate(start.getDate() - start.getDay()); // align to Sunday
    let week: { date: string; seconds: number; level: number }[] = [];
    for (let i = 0; i < 84; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      if (d > now) { week.push({ date: "", seconds: 0, level: -1 }); continue; }
      const ds = getDateStr(d);
      const rec = records.find((r) => r.date === ds);
      const s = rec?.secondsSpent ?? 0;
      const level = s === 0 ? 0 : s < targetS * 0.25 ? 1 : s < targetS * 0.5 ? 2 : s < targetS ? 3 : 4;
      week.push({ date: ds, seconds: s, level });
      if (week.length === 7) { grid.push(week); week = []; }
    }
    if (week.length > 0) grid.push(week);
    return grid;
  }, [records, targetS]);

  const cellSize = Math.min(Math.floor((SW - 80) / 12) - 2, 18);
  const levelColors = ["#1A1A1A", color + "44", color + "77", color + "AA", color];

  return (
    <View>
      <Svg width={(cellSize + 2) * 12 + 16} height={(cellSize + 2) * 7 + 16}>
        {weeks.map((week, wi) =>
          week.map((day, di) => (
            <Rect key={`${wi}-${di}`}
              x={16 + wi * (cellSize + 2)} y={di * (cellSize + 2) + 16}
              width={cellSize} height={cellSize} rx={3}
              fill={day.level === -1 ? "transparent" : levelColors[day.level]}
            />
          ))
        )}
        {["S","M","T","W","T","F","S"].map((l, i) => (
          <SvgText key={i} x={12} y={i * (cellSize + 2) + cellSize + 18} textAnchor="end" fill={colors.textMuted} fontSize={8}>{l}</SvgText>
        ))}
      </Svg>
      <View style={{ flexDirection: "row", gap: 4, alignItems: "center", marginTop: 4 }}>
        <Text style={{ fontSize: 9, color: colors.textMuted, fontFamily: "Inter_400Regular" }}>Less</Text>
        {levelColors.map((c, i) => <View key={i} style={{ width: cellSize, height: cellSize, borderRadius: 3, backgroundColor: c }} />)}
        <Text style={{ fontSize: 9, color: colors.textMuted, fontFamily: "Inter_400Regular" }}>More</Text>
      </View>
    </View>
  );
}

function LineChart({ taskId, color }: { taskId: string; color: string }) {
  const { colors } = useTheme();
  const { getRecordsForTask } = useTaskContext();
  const records = getRecordsForTask(taskId);
  const days = useMemo(() => {
    const result = []; const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const rec = records.find((r) => r.date === getDateStr(d));
      result.push({ seconds: rec?.secondsSpent ?? 0, isToday: i === 0 });
    }
    return result;
  }, [records]);
  const maxS = Math.max(...days.map((d) => d.seconds), 1);
  const W = SW - 80, H = 60;
  const stepX = W / (days.length - 1);
  const pts = days.map((d, i) => ({ x: i * stepX, y: H - (d.seconds / maxS) * H }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  return (
    <Svg width={W} height={H + 8}>
      <Path d={pathD} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={days[i].isToday ? 5 : 3} fill={days[i].isToday ? color : color + "88"} />)}
    </Svg>
  );
}

function StreakFlame({ count, color }: { count: number; color: string }) {
  return (
    <View style={{ alignItems: "center", gap: 2 }}>
      <Text style={{ fontSize: 28 }}>🔥</Text>
      <Text style={{ fontSize: 22, color, fontFamily: "Inter_700Bold" }}>{count}</Text>
      <Text style={{ fontSize: 10, color: "#888", fontFamily: "Inter_400Regular" }}>day streak</Text>
    </View>
  );
}

function TaskStatsCard({ taskId }: { taskId: string }) {
  const { colors } = useTheme();
  const { tasks, getRecordsForTask, getStreak, dailyRecords } = useTaskContext();
  const task = tasks.find((t) => t.id === taskId);
  const [chartTab, setChartTab] = useState<"week"|"trend"|"heatmap">("week");
  if (!task) return null;

  const records = getRecordsForTask(taskId);
  const streak = getStreak(taskId);
  const todayRec = records.find((r) => r.date === today());
  const todayS = todayRec?.secondsSpent ?? 0;
  const allS = records.reduce((s, r) => s + r.secondsSpent, 0);
  const activeDays = records.filter((r) => r.secondsSpent > 0).length;
  const avgS = activeDays > 0 ? Math.round(allS / activeDays) : 0;
  const completedDays = records.filter((r) => r.secondsSpent >= task.targetMinutes * 60).length;
  const completionRate = activeDays > 0 ? Math.round((completedDays / activeDays) * 100) : 0;
  const targetS = task.targetMinutes * 60;
  const todayProgress = targetS > 0 ? Math.min(todayS / targetS, 1) : 0;
  const bestDay = records.reduce((best, r) => r.secondsSpent > best ? r.secondsSpent : best, 0);

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, gap: 12 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: task.color }} />
        <Text style={{ flex: 1, fontSize: 16, color: colors.text, fontFamily: "Inter_700Bold" }}>{task.name}</Text>
        <StreakFlame count={streak} color={task.color} />
      </View>

      {/* Today's progress bar */}
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: "Inter_500Medium" }}>Today's Progress</Text>
          <Text style={{ fontSize: 11, color: task.color, fontFamily: "Inter_700Bold" }}>{Math.round(todayProgress * 100)}%</Text>
        </View>
        <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: "hidden" }}>
          <View style={{ height: "100%", width: `${todayProgress * 100}%`, backgroundColor: task.color, borderRadius: 4 }} />
        </View>
        <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: "Inter_400Regular" }}>{fmtFull(todayS)} / {fmtFull(targetS)}</Text>
      </View>

      {/* 4 stat boxes */}
      <View style={{ flexDirection: "row", gap: 6 }}>
        <StatBox label="Today" value={fmt(todayS)} accent={task.color} />
        <StatBox label="All Time" value={fmt(allS)} />
        <StatBox label="Avg/Day" value={fmt(avgS)} />
        <StatBox label="Best Day" value={fmt(bestDay)} />
      </View>

      {/* Completion row */}
      <View style={{ flexDirection: "row", gap: 6 }}>
        <StatBox label="Done Days" value={String(completedDays)} />
        <StatBox label="Rate" value={`${completionRate}%`} accent={completionRate > 70 ? "#1ABC9C" : completionRate > 40 ? "#F39C12" : "#E74C3C"} />
        <StatBox label="Active Days" value={String(activeDays)} />
        <StatBox label="Target" value={fmt(targetS)} />
      </View>

      {/* Chart tabs */}
      <View style={{ flexDirection: "row", gap: 6 }}>
        {(["week","trend","heatmap"] as const).map((tab) => (
          <TouchableOpacity key={tab} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: chartTab === tab ? task.color : colors.background }} onPress={() => setChartTab(tab)}>
            <Text style={{ fontSize: 12, color: chartTab === tab ? "#000" : colors.textSecondary, fontFamily: "Inter_600SemiBold" }}>{tab === "week" ? "This Week" : tab === "trend" ? "14-Day Trend" : "Heatmap"}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ alignItems: "flex-start" }}>
        {chartTab === "week" && <WeekBarChart taskId={taskId} color={task.color} />}
        {chartTab === "trend" && <LineChart taskId={taskId} color={task.color} />}
        {chartTab === "heatmap" && <HeatMap taskId={taskId} color={task.color} />}
      </View>

      {/* Best streak info */}
      {streak > 0 && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.background, borderRadius: 10, padding: 10 }}>
          <Text style={{ fontSize: 14 }}>🔥</Text>
          <Text style={{ fontSize: 13, color: colors.text, fontFamily: "Inter_500Medium", flex: 1 }}>
            You're on a <Text style={{ color: task.color, fontFamily: "Inter_700Bold" }}>{streak}-day</Text> streak. Keep it up!
          </Text>
        </View>
      )}
    </View>
  );
}

function OverallSummaryCard() {
  const { colors } = useTheme();
  const { tasks, dailyRecords, getTodayTasks } = useTaskContext();
  const todayStr = today();
  const todayTasks = getTodayTasks();
  const todayRecords = dailyRecords.filter((r) => r.date === todayStr);
  const totalFocusToday = todayRecords.reduce((s, r) => s + r.secondsSpent, 0);
  const completedToday = todayTasks.filter((t) => {
    const rec = todayRecords.find((r) => r.taskId === t.id);
    return rec && rec.secondsSpent >= t.targetMinutes * 60;
  }).length;
  const completionRate = todayTasks.length > 0 ? (completedToday / todayTasks.length) * 100 : 0;

  // Last 7 days total focus
  const weekData = useMemo(() => {
    const d = []; const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now); date.setDate(date.getDate() - i);
      const ds = getDateStr(date);
      const secs = dailyRecords.filter((r) => r.date === ds).reduce((s, r) => s + r.secondsSpent, 0);
      d.push({ secs, isToday: i === 0 });
    }
    return d;
  }, [dailyRecords]);
  const weekTotal = weekData.reduce((s, d) => s + d.secs, 0);
  const allTimeTotal = dailyRecords.reduce((s, r) => s + r.secondsSpent, 0);
  const maxStreak = Math.max(...tasks.map((t) => 0), 0); // placeholder

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 16, color: colors.text, fontFamily: "Inter_700Bold" }}>Today's Overview</Text>

      <View style={{ flexDirection: "row", gap: 1 }}>
        {[
          { value: fmtFull(totalFocusToday), label: "Total Focus", accent: colors.accent },
          { value: `${completedToday}/${todayTasks.length}`, label: "Completed", accent: colors.text },
          { value: `${completionRate.toFixed(2)}%`, label: "Rate", accent: completionRate > 70 ? "#1ABC9C" : completionRate > 30 ? "#F39C12" : colors.accent },
        ].map((item, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center", ...(i > 0 ? { borderLeftWidth: 1, borderLeftColor: colors.border } : {}) }}>
            <Text style={{ fontSize: 20, color: item.accent, fontFamily: "Inter_700Bold" }}>{item.value}</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: "Inter_400Regular" }}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: "hidden" }}>
        <View style={{ height: "100%", width: `${completionRate}%`, backgroundColor: colors.accent, borderRadius: 3 }} />
      </View>

      {/* Weekly summary */}
      <View style={{ flexDirection: "row", gap: 6 }}>
        <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 10, alignItems: "center" }}>
          <Text style={{ fontSize: 16, color: colors.accent, fontFamily: "Inter_700Bold" }}>{fmtFull(weekTotal)}</Text>
          <Text style={{ fontSize: 10, color: colors.textMuted, fontFamily: "Inter_400Regular" }}>This Week</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 10, alignItems: "center" }}>
          <Text style={{ fontSize: 16, color: colors.text, fontFamily: "Inter_700Bold" }}>{fmtFull(allTimeTotal)}</Text>
          <Text style={{ fontSize: 10, color: colors.textMuted, fontFamily: "Inter_400Regular" }}>All Time</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 10, alignItems: "center" }}>
          <Text style={{ fontSize: 16, color: colors.text, fontFamily: "Inter_700Bold" }}>{tasks.length}</Text>
          <Text style={{ fontSize: 10, color: colors.textMuted, fontFamily: "Inter_400Regular" }}>Total Tasks</Text>
        </View>
      </View>

      {/* Mini 7-day bar chart */}
      <View>
        <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "Inter_500Medium", marginBottom: 6 }}>Last 7 Days</Text>
        <View style={{ flexDirection: "row", alignItems: "flex-end", height: 40, gap: 4 }}>
          {weekData.map((d, i) => {
            const maxS = Math.max(...weekData.map((x) => x.secs), 1);
            const h = d.secs > 0 ? Math.max((d.secs / maxS) * 36, 4) : 4;
            const labels = ["Su","Mo","Tu","We","Th","Fr","Sa"];
            const dayLabel = labels[(new Date().getDay() - 6 + i + 7) % 7];
            return (
              <View key={i} style={{ flex: 1, alignItems: "center", gap: 2 }}>
                <View style={{ width: "100%", height: h, backgroundColor: d.isToday ? colors.accent : (d.secs > 0 ? colors.accent + "66" : colors.border), borderRadius: 3 }} />
                <Text style={{ fontSize: 8, color: d.isToday ? colors.accent : colors.textMuted, fontFamily: "Inter_500Medium" }}>{dayLabel}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { tasks } = useTaskContext();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: topPad }}>
      <View style={{ paddingHorizontal: 20, paddingVertical: 14 }}>
        <Text style={{ fontSize: 28, color: colors.text, fontFamily: "Inter_700Bold" }}>Statistics</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 }}>Your focus activity overview</Text>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 14, paddingBottom: Platform.OS === "android" ? 20 : 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <OverallSummaryCard />

        {tasks.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 60, gap: 12 }}>
            <Text style={{ fontSize: 40 }}>📊</Text>
            <Text style={{ fontSize: 18, color: colors.text, fontFamily: "Inter_600SemiBold" }}>No data yet</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, fontFamily: "Inter_400Regular", textAlign: "center" }}>Add tasks on the Home tab and start your first session to see stats here.</Text>
          </View>
        ) : (
          tasks.map((task) => <TaskStatsCard key={task.id} taskId={task.id} />)
        )}
      </ScrollView>
    </View>
  );
}
