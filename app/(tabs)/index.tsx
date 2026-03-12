import React, { useState, useMemo, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Switch, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import { useTheme } from "@/context/ThemeContext";
import { useTaskContext, Task } from "@/context/TaskContext";
import { useTimer } from "@/context/TimerContext";

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function formatSeconds(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2,"0")}m`;
  return `0h ${String(m).padStart(2,"0")}m`;
}
function getDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function CircularProgress({ progress, color, size = 56 }: { progress: number; color: string; size?: number }) {
  const r = (size - 8) / 2, c = size / 2, circ = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size}>
      <Circle cx={c} cy={c} r={r} stroke="#2A2A2A" strokeWidth={4} fill="none" />
      <Circle cx={c} cy={c} r={r} stroke={color} strokeWidth={4} fill="none" strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.min(progress, 1))} strokeLinecap="round" rotation="-90" origin={`${c}, ${c}`} />
      <SvgText x={c} y={c + 4} textAnchor="middle" fill={progress > 0 ? color : "#555"} fontSize={10} fontWeight="600">{Math.round(progress * 100)}%</SvgText>
    </Svg>
  );
}

// ISSUE #4 FIX: Calendar modal showing past 30 days per task
function CalendarModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const { tasks, dailyRecords } = useTaskContext();
  const insets = useSafeAreaInsets();
  const today = new Date();

  const last30 = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const dateStr = getDateStr(d);
      const dayRecords = dailyRecords.filter((r) => r.date === dateStr);
      const totalSecs = dayRecords.reduce((s, r) => s + r.secondsSpent, 0);
      const tasksDone = dayRecords.filter((r) => {
        const t = tasks.find((t) => t.id === r.taskId);
        return t && r.secondsSpent >= t.targetMinutes * 60;
      }).length;
      days.push({ date: dateStr, label: d.getDate(), month: d.toLocaleString("default", { month: "short" }), dow: ["S","M","T","W","T","F","S"][d.getDay()], totalSecs, tasksDone, isToday: i === 0 });
    }
    return days;
  }, [dailyRecords, tasks]);

  const maxSecs = Math.max(...last30.map((d) => d.totalSecs), 1);

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: insets.bottom + 20, maxHeight: "85%" }}>
          <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 }} />
          <Text style={{ fontSize: 20, color: colors.text, fontFamily: "Inter_700Bold", marginBottom: 4 }}>Activity History</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: "Inter_400Regular", marginBottom: 20 }}>Last 30 days of focus time</Text>

          {/* Bar chart */}
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: 80, marginBottom: 6 }}>
            {last30.map((day, i) => {
              const h = day.totalSecs > 0 ? Math.max((day.totalSecs / maxSecs) * 72, 4) : 0;
              return (
                <View key={i} style={{ flex: 1, alignItems: "center" }}>
                  <View style={{ width: "100%", height: h, backgroundColor: day.isToday ? colors.accent : (day.totalSecs > 0 ? colors.accent + "66" : colors.border), borderRadius: 3 }} />
                </View>
              );
            })}
          </View>
          {/* Week labels */}
          <View style={{ flexDirection: "row", gap: 3, marginBottom: 20 }}>
            {last30.map((day, i) => (
              <Text key={i} style={{ flex: 1, fontSize: 6, color: day.isToday ? colors.accent : colors.textMuted, textAlign: "center", fontFamily: "Inter_500Medium" }}>
                {day.dow}
              </Text>
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {tasks.length === 0 ? (
              <Text style={{ color: colors.textMuted, textAlign: "center", fontFamily: "Inter_400Regular" }}>No tasks yet</Text>
            ) : tasks.map((task) => {
              const taskRecords = last30.map((day) => {
                const rec = dailyRecords.find((r) => r.taskId === task.id && r.date === day.date);
                return { ...day, secs: rec?.secondsSpent ?? 0, done: rec ? rec.secondsSpent >= task.targetMinutes * 60 : false };
              });
              const totalSecs = taskRecords.reduce((s, r) => s + r.secs, 0);
              const doneDays = taskRecords.filter((r) => r.done).length;
              return (
                <View key={task.id} style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: task.color }} />
                    <Text style={{ flex: 1, fontSize: 14, color: colors.text, fontFamily: "Inter_600SemiBold" }}>{task.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "Inter_400Regular" }}>{doneDays} days · {formatSeconds(totalSecs)}</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 3 }}>
                    {taskRecords.map((day, i) => (
                      <View key={i} style={{ flex: 1, height: 20, borderRadius: 3, backgroundColor: day.done ? task.color : (day.secs > 0 ? task.color + "55" : colors.border), alignItems: "center", justifyContent: "center" }}>
                        {day.isToday && <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#fff" }} />}
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={{ backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 8 }} onPress={onClose}>
            <Text style={{ fontSize: 16, color: "#000", fontFamily: "Inter_700Bold" }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ISSUE #5 FIX: Project/group badge selector
const BADGE_OPTIONS = ["All Projects", "Work", "Study", "Personal", "Health", "Creative", "Side Project"];

function BadgeSelector({ visible, onClose, current, onSelect }: { visible: boolean; onClose: () => void; current: string; onSelect: (s: string) => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: insets.bottom + 20 }}>
          <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 }} />
          <Text style={{ fontSize: 18, color: colors.text, fontFamily: "Inter_700Bold", marginBottom: 16 }}>Select Project View</Text>
          {BADGE_OPTIONS.map((opt) => (
            <TouchableOpacity key={opt} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}
              onPress={() => { onSelect(opt); onClose(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
              <Text style={{ fontSize: 16, color: opt === current ? colors.accent : colors.text, fontFamily: opt === current ? "Inter_700Bold" : "Inter_500Medium" }}>{opt}</Text>
              {opt === current && <Feather name="check" size={18} color={colors.accent} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

function DateStrip() {
  const { colors } = useTheme();
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); days.push(d); }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: 16, marginBottom: 4, height: 72, flexGrow: 0, flexShrink: 0 }}>
      {days.map((d, idx) => {
        const isToday = idx === 6;
        return (
          <View key={idx} style={{ alignItems: "center", paddingHorizontal: 10, paddingVertical: 8, marginRight: 4, borderRadius: 8, minWidth: 52, height: 64, ...(isToday ? { backgroundColor: colors.card } : {}) }}>
            <Text style={{ fontSize: 10, color: isToday ? colors.text : colors.textSecondary, fontFamily: "Inter_500Medium" }}>{d.toLocaleString("default", { month: "short" })}</Text>
            <Text style={{ fontSize: 18, color: isToday ? colors.text : colors.textSecondary, fontFamily: "Inter_700Bold" }}>{d.getDate()}</Text>
            <Text style={{ fontSize: 10, color: isToday ? colors.textSecondary : colors.textMuted, fontFamily: "Inter_400Regular" }}>0:00</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

function AddTaskModal({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: (t: Omit<Task,"id"|"createdAt">) => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(""); const [targetMinutes, setTargetMinutes] = useState("60");
  const [isDaily, setIsDaily] = useState(true); const [notificationTime, setNotificationTime] = useState("09:00");
  const [colorIndex, setColorIndex] = useState(0); const [usePomodoro, setUsePomodoro] = useState(true);
  const [pomodoroLength, setPomodoroLength] = useState(25);

  function handleAdd() {
    if (!name.trim()) { Alert.alert("Name required","Please enter a task name."); return; }
    const mins = parseInt(targetMinutes, 10);
    if (isNaN(mins) || mins < 1) { Alert.alert("Invalid duration","Please enter a valid duration."); return; }
    onAdd({ name: name.trim(), targetMinutes: mins, isDaily, notificationTime, color: colors.taskColors[colorIndex], usePomodoro, pomodoroLength, shortBreakLength: 5, longBreakLength: 20, reminderAlarm: true });
    setName(""); setTargetMinutes("60"); setIsDaily(true); setNotificationTime("09:00"); setColorIndex(0); setUsePomodoro(true); setPomodoroLength(25);
    onClose(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
  const sessions = usePomodoro ? Math.ceil(parseInt(targetMinutes,10) / pomodoroLength) || 0 : 1;
  const C = colors;
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 16, gap: 8 }}>
          <View style={{ width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 8 }} />
          <Text style={{ fontSize: 20, color: C.text, fontFamily: "Inter_700Bold", marginBottom: 8 }}>New Task</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
            {[["Task Name","text",name,setName,"e.g. Study Python"],["Target (minutes)","number-pad",targetMinutes,setTargetMinutes,"60"]].map(([l,kb,v,sv,ph]) => (
              <View key={l as string}>
                <Text style={{ fontSize: 13, color: C.textSecondary, fontFamily: "Inter_500Medium", marginTop: 8, marginBottom: 4 }}>{l as string}</Text>
                <TextInput style={{ backgroundColor: C.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text, fontFamily: "Inter_400Regular", borderWidth: 1, borderColor: C.border }}
                  value={v as string} onChangeText={sv as any} keyboardType={kb as any} placeholder={ph as string} placeholderTextColor={C.textMuted} autoFocus={l === "Task Name"} />
              </View>
            ))}
            <Text style={{ fontSize: 13, color: C.textSecondary, fontFamily: "Inter_500Medium", marginTop: 8, marginBottom: 4 }}>Schedule</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {[["Every day",true],["Today only",false]].map(([label,val]) => (
                <TouchableOpacity key={label as string} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: isDaily === val ? C.accent : C.border }}
                  onPress={() => setIsDaily(val as boolean)}>
                  <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: isDaily === val ? C.accent : C.textMuted, alignItems: "center", justifyContent: "center" }}>
                    {isDaily === val && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent }} />}
                  </View>
                  <Text style={{ fontSize: 14, color: isDaily === val ? C.accent : C.textSecondary, fontFamily: "Inter_500Medium" }}>{label as string}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 13, color: C.textSecondary, fontFamily: "Inter_500Medium", marginTop: 8, marginBottom: 4 }}>Notification Time</Text>
            <TextInput style={{ backgroundColor: C.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text, fontFamily: "Inter_400Regular", borderWidth: 1, borderColor: C.border }}
              value={notificationTime} onChangeText={setNotificationTime} placeholder="09:00" placeholderTextColor={C.textMuted} keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <Text style={{ fontSize: 13, color: C.textSecondary, fontFamily: "Inter_500Medium" }}>Use Pomodoro</Text>
              <Switch value={usePomodoro} onValueChange={setUsePomodoro} trackColor={{ false: C.border, true: C.accent }} thumbColor={C.text} />
            </View>
            {usePomodoro && (
              <>
                <Text style={{ fontSize: 13, color: C.textSecondary, fontFamily: "Inter_500Medium", marginTop: 8, marginBottom: 4 }}>Block Length (minutes)</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.background, borderRadius: 12, padding: 8, borderWidth: 1, borderColor: C.border }}>
                  <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" }} onPress={() => setPomodoroLength(Math.max(5, pomodoroLength - 5))}><Feather name="minus" size={16} color="#000" /></TouchableOpacity>
                  <Text style={{ flex: 1, textAlign: "center", fontSize: 18, color: C.text, fontFamily: "Inter_700Bold" }}>{pomodoroLength}m</Text>
                  <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" }} onPress={() => setPomodoroLength(Math.min(90, pomodoroLength + 5))}><Feather name="plus" size={16} color="#000" /></TouchableOpacity>
                </View>
                {!isNaN(parseInt(targetMinutes)) && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.background, borderRadius: 8, padding: 8, marginTop: 6, borderWidth: 1, borderColor: C.accent + "44" }}>
                    <Feather name="layers" size={12} color={C.accent} />
                    <Text style={{ fontSize: 12, color: C.accent, fontFamily: "Inter_400Regular" }}>{sessions} session{sessions !== 1 ? "s" : ""} × {pomodoroLength}m</Text>
                  </View>
                )}
              </>
            )}
            <Text style={{ fontSize: 13, color: C.textSecondary, fontFamily: "Inter_500Medium", marginTop: 8, marginBottom: 4 }}>Color</Text>
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              {C.taskColors.map((c, i) => (
                <TouchableOpacity key={c} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c, ...(i === colorIndex ? { borderWidth: 3, borderColor: C.text } : {}) }} onPress={() => setColorIndex(i)} />
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity style={{ backgroundColor: C.accent, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 12 }} onPress={handleAdd}>
            <Text style={{ fontSize: 16, color: "#000", fontFamily: "Inter_700Bold" }}>Create Task</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ alignItems: "center", paddingVertical: 10 }} onPress={onClose}>
            <Text style={{ fontSize: 15, color: C.textSecondary, fontFamily: "Inter_500Medium" }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function TaskCard({ task }: { task: Task }) {
  const { colors } = useTheme();
  const { getTodayRecord, getStreak } = useTaskContext();
  const record = getTodayRecord(task.id);
  const secondsSpent = record?.secondsSpent ?? 0;
  const targetSeconds = task.targetMinutes * 60;
  const progress = targetSeconds > 0 ? secondsSpent / targetSeconds : 0;
  const pomoParts = record?.pomodoroPartsCompleted ?? 0;
  const totalParts = task.usePomodoro ? Math.ceil(task.targetMinutes / task.pomodoroLength) : 1;
  const streak = getStreak(task.id);
  const isComplete = secondsSpent >= targetSeconds && targetSeconds > 0;
  const [expanded, setExpanded] = useState(false);

  function handlePlay() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/task/[id]", params: { id: task.id } });
  }

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 16, overflow: "hidden", ...(isComplete ? { borderWidth: 1, borderColor: "#1ABC9C33" } : {}) }}>
      <View style={{ padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
        <CircularProgress progress={progress} color={task.color} size={56} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <Text style={{ fontSize: 16, color: colors.text, fontFamily: "Inter_600SemiBold", flex: 1 }} numberOfLines={1}>{task.name}</Text>
            {streak > 0 && <View style={{ flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "#FF6B3520", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}><Feather name="zap" size={10} color="#FF6B35" /><Text style={{ fontSize: 10, color: "#FF6B35", fontFamily: "Inter_700Bold" }}>{streak}</Text></View>}
            {isComplete && <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#1ABC9C20", alignItems: "center", justifyContent: "center" }}><Feather name="check" size={10} color="#1ABC9C" /></View>}
          </View>
          <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: "Inter_400Regular", marginBottom: 4 }}>{formatSeconds(secondsSpent)}</Text>
          <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 3 }} onPress={() => { setExpanded((e) => !e); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
            <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: "Inter_400Regular" }}>Details</Text>
            <Feather name={expanded ? "chevron-up" : "chevron-down"} size={12} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: task.color, alignItems: "center", justifyContent: "center" }} onPress={handlePlay}>
          <Feather name="play" size={20} color="#000" />
        </TouchableOpacity>
      </View>
      {expanded && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 14, borderTopWidth: 1, borderTopColor: colors.border }}>
          <View style={{ flexDirection: "row", gap: 8, paddingTop: 12, marginBottom: 10 }}>
            {[["Target",formatSeconds(targetSeconds)],["Parts",`${pomoParts}/${totalParts}`],["Streak",`${streak}d`],["Type",task.isDaily?"Daily":"Today"]].map(([l,v]) => (
              <View key={l} style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 9, color: colors.textMuted, fontFamily: "Inter_400Regular", marginBottom: 3 }}>{l}</Text>
                <Text style={{ fontSize: 12, color: l === "Streak" && streak > 0 ? "#FF6B35" : colors.textSecondary, fontFamily: "Inter_600SemiBold" }}>{v}</Text>
              </View>
            ))}
          </View>
          {task.usePomodoro && <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.background, borderRadius: 8, padding: 8, marginBottom: 10 }}>
            <Feather name="clock" size={12} color={task.color} />
            <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: "Inter_400Regular" }}>{task.pomodoroLength}m focus · {task.shortBreakLength}m short · {task.longBreakLength}m long break</Text>
          </View>}
          <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: task.color, borderRadius: 10, paddingVertical: 8 }} onPress={handlePlay}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: task.color }}>Open Timer</Text>
            <Feather name="arrow-right" size={13} color={task.color} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { tasks, dailyRecords, getTodayTasks, addTask } = useTaskContext();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [currentBadge, setCurrentBadge] = useState("All Projects");
  const [filter, setFilter] = useState<"all"|"due">("all");
  const todayTasks = getTodayTasks();
  const today = getTodayString();

  const completedToday = useMemo(() => todayTasks.filter((t) => {
    const r = dailyRecords.find((r) => r.taskId === t.id && r.date === today);
    return r && r.secondsSpent >= t.targetMinutes * 60;
  }).length, [todayTasks, dailyRecords, today]);

  const totalSecondsToday = useMemo(() => dailyRecords.filter((r) => r.date === today).reduce((s, r) => s + r.secondsSpent, 0), [dailyRecords, today]);
  const dueTasks = todayTasks.filter((t) => { const r = dailyRecords.find((r) => r.taskId === t.id && r.date === today); return !r || r.secondsSpent < t.targetMinutes * 60; });
  const displayTasks = filter === "all" ? todayTasks : dueTasks;
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: topPadding }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        {/* ISSUE #5 FIX: Badge is tappable */}
        <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, gap: 4 }} onPress={() => setShowBadge(true)}>
          <Text style={{ color: "#000", fontSize: 14, fontFamily: "Inter_700Bold" }}>{currentBadge}</Text>
          <Feather name="chevron-down" size={14} color="#000" />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {/* ISSUE #4 FIX: Calendar button opens history */}
          <TouchableOpacity style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, borderRadius: 20 }} onPress={() => setShowCalendar(true)}>
            <Feather name="calendar" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, borderRadius: 20 }} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAddModal(true); }}>
            <Feather name="plus" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <DateStrip />

      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginTop: 8, marginBottom: 12, gap: 8 }}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {([["all",todayTasks.length],["due",dueTasks.length]] as const).map(([f,count]) => (
            <TouchableOpacity key={f} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: filter === f ? colors.accent : colors.card }} onPress={() => setFilter(f)}>
              <Text style={{ fontSize: 13, color: filter === f ? "#000" : colors.textSecondary, fontFamily: "Inter_600SemiBold" }}>{f === "all" ? "All" : "Due"} ({count})</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 6, marginLeft: "auto" }}>
          {[["Completed", todayTasks.length > 0 ? `${Math.round((completedToday/todayTasks.length)*100).toFixed(2)}%` : "0.00%"],["Time Spent", formatSeconds(totalSecondsToday)]].map(([l,v]) => (
            <View key={l} style={{ backgroundColor: colors.card, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignItems: "center" }}>
              <Text style={{ fontSize: 9, color: colors.textMuted, fontFamily: "Inter_400Regular" }}>{l}</Text>
              <Text style={{ fontSize: 11, color: colors.text, fontFamily: "Inter_600SemiBold" }}>{v}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: Platform.OS === "android" ? 20 : 100 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {displayTasks.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 60, gap: 12 }}>
            <Feather name="check-circle" size={48} color={colors.textMuted} />
            <Text style={{ fontSize: 18, color: colors.text, fontFamily: "Inter_600SemiBold" }}>{filter === "due" ? "All done for today!" : "No tasks yet"}</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, fontFamily: "Inter_400Regular", textAlign: "center" }}>{filter === "due" ? "Great work!" : "Tap + to add your first task."}</Text>
            {filter === "all" && <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 8 }} onPress={() => setShowAddModal(true)}>
              <Feather name="plus" size={18} color="#000" /><Text style={{ fontSize: 15, color: "#000", fontFamily: "Inter_700Bold" }}>Add First Task</Text>
            </TouchableOpacity>}
          </View>
        ) : displayTasks.map((task) => <TaskCard key={task.id} task={task} />)}
      </ScrollView>

      <AddTaskModal visible={showAddModal} onClose={() => setShowAddModal(false)} onAdd={addTask} />
      <CalendarModal visible={showCalendar} onClose={() => setShowCalendar(false)} />
      <BadgeSelector visible={showBadge} onClose={() => setShowBadge(false)} current={currentBadge} onSelect={setCurrentBadge} />
    </View>
  );
}
