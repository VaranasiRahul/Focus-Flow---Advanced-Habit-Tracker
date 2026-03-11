import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  Platform,
  Pressable,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Path } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { useTaskContext, Task } from "@/context/TaskContext";
import { useTimer } from "@/context/TimerContext";

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `0h ${String(m).padStart(2, "0")}m`;
}

function CircularProgress({ progress, color, size = 56 }: { progress: number; color: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(progress, 1));
  const center = size / 2;

  return (
    <Svg width={size} height={size}>
      <Circle cx={center} cy={center} r={radius} stroke="#2A2A2A" strokeWidth={4} fill="none" />
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={color}
        strokeWidth={4}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${center}, ${center}`}
      />
      <Text
        x={center}
        y={center + 4}
        textAnchor="middle"
        fill={progress > 0 ? color : Colors.textSecondary}
        fontSize={10}
        fontWeight="600"
      >
        {Math.round(progress * 100)}%
      </Text>
    </Svg>
  );
}

function DateStrip() {
  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  const dayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateStrip}>
      {days.map((d, idx) => {
        const isToday = idx === 6;
        return (
          <View key={idx} style={[styles.dateItem, isToday && styles.dateItemActive]}>
            <Text style={[styles.dateMonth, isToday && styles.dateTextActive]}>
              {d.toLocaleString("default", { month: "short" })}
            </Text>
            <Text style={[styles.dateDay, isToday && styles.dateTextActive]}>
              {d.getDate()}
            </Text>
            <Text style={[styles.dateTime, isToday && styles.dateTextActive]}>0:00</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (task: Omit<Task, "id" | "createdAt">) => void;
}

function AddTaskModal({ visible, onClose, onAdd }: AddTaskModalProps) {
  const [name, setName] = useState("");
  const [targetMinutes, setTargetMinutes] = useState("60");
  const [isDaily, setIsDaily] = useState(true);
  const [notificationTime, setNotificationTime] = useState("09:00");
  const [colorIndex, setColorIndex] = useState(0);
  const insets = useSafeAreaInsets();

  function handleAdd() {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter a task name.");
      return;
    }
    const mins = parseInt(targetMinutes, 10);
    if (isNaN(mins) || mins < 1) {
      Alert.alert("Invalid duration", "Please enter a valid duration in minutes.");
      return;
    }
    onAdd({
      name: name.trim(),
      targetMinutes: mins,
      isDaily,
      notificationTime,
      color: Colors.taskColors[colorIndex],
      usePomodoro: true,
      pomodoroLength: 25,
      shortBreakLength: 5,
      longBreakLength: 20,
      reminderAlarm: true,
    });
    setName("");
    setTargetMinutes("60");
    setIsDaily(true);
    setNotificationTime("09:00");
    setColorIndex(0);
    onClose();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>New Task</Text>

          <Text style={styles.inputLabel}>Task Name</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Study Python"
            placeholderTextColor={Colors.textMuted}
            autoFocus
          />

          <Text style={styles.inputLabel}>Target Duration (minutes)</Text>
          <TextInput
            style={styles.textInput}
            value={targetMinutes}
            onChangeText={setTargetMinutes}
            keyboardType="number-pad"
            placeholder="60"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.inputLabel}>Schedule</Text>
          <View style={styles.radioRow}>
            <TouchableOpacity
              style={[styles.radioBtn, isDaily && styles.radioBtnActive]}
              onPress={() => setIsDaily(true)}
            >
              <View style={[styles.radioCircle, isDaily && styles.radioCircleActive]}>
                {isDaily && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.radioText, isDaily && styles.radioTextActive]}>Every day</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radioBtn, !isDaily && styles.radioBtnActive]}
              onPress={() => setIsDaily(false)}
            >
              <View style={[styles.radioCircle, !isDaily && styles.radioCircleActive]}>
                {!isDaily && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.radioText, !isDaily && styles.radioTextActive]}>Today only</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Notification Time</Text>
          <TextInput
            style={styles.textInput}
            value={notificationTime}
            onChangeText={setNotificationTime}
            placeholder="09:00"
            placeholderTextColor={Colors.textMuted}
            keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
          />

          <Text style={styles.inputLabel}>Color</Text>
          <View style={styles.colorRow}>
            {Colors.taskColors.map((c, i) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c }, i === colorIndex && styles.colorDotSelected]}
                onPress={() => setColorIndex(i)}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
            <Text style={styles.addButtonText}>Create Task</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function TaskCard({ task }: { task: Task }) {
  const { getTodayRecord } = useTaskContext();
  const { startTask, activeTaskId } = useTimer();
  const record = getTodayRecord(task.id);
  const secondsSpent = record?.secondsSpent ?? 0;
  const targetSeconds = task.targetMinutes * 60;
  const progress = targetSeconds > 0 ? secondsSpent / targetSeconds : 0;
  const pomoParts = record?.pomodoroPartsCompleted ?? 0;
  const totalParts = task.usePomodoro
    ? Math.floor(task.targetMinutes / task.pomodoroLength)
    : 1;
  const isActive = activeTaskId === task.id;

  function handlePlay() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startTask(task);
    router.push({ pathname: "/task/[id]", params: { id: task.id } });
  }

  return (
    <TouchableOpacity
      style={styles.taskCard}
      onPress={handlePlay}
      activeOpacity={0.8}
    >
      <View style={styles.taskCardLeft}>
        <CircularProgress progress={progress} color={task.color} size={56} />
      </View>
      <View style={styles.taskCardCenter}>
        <Text style={styles.taskName} numberOfLines={1}>{task.name}</Text>
        <Text style={styles.taskTime}>{formatSeconds(secondsSpent)}</Text>
        <Text style={styles.taskParts}>
          {pomoParts}/{totalParts} parts done
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.playButton, { backgroundColor: task.color }]}
        onPress={handlePlay}
      >
        <Feather name="play" size={20} color="#000" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { tasks, dailyRecords, getTodayTasks } = useTaskContext();
  const { addTask } = useTaskContext();
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "due">("all");

  const todayTasks = getTodayTasks();

  const today = getTodayString();
  const completedToday = useMemo(() => {
    return todayTasks.filter((t) => {
      const record = dailyRecords.find((r) => r.taskId === t.id && r.date === today);
      return record && record.secondsSpent >= t.targetMinutes * 60;
    }).length;
  }, [todayTasks, dailyRecords, today]);

  const totalSecondsToday = useMemo(() => {
    return dailyRecords
      .filter((r) => r.date === today)
      .reduce((sum, r) => sum + r.secondsSpent, 0);
  }, [dailyRecords, today]);

  const dueTasks = todayTasks.filter((t) => {
    const record = dailyRecords.find((r) => r.taskId === t.id && r.date === today);
    return !record || record.secondsSpent < t.targetMinutes * 60;
  });

  const displayTasks = filter === "all" ? todayTasks : dueTasks;

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.appBadge}>
            <Text style={styles.appBadgeText}>FocusTrack</Text>
            <Feather name="chevron-down" size={14} color={Colors.text} />
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon}>
            <Feather name="calendar" size={20} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAddModal(true);
            }}
          >
            <Feather name="plus" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <DateStrip />

      <View style={styles.filterRow}>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterBtn, filter === "all" && styles.filterBtnActive]}
            onPress={() => setFilter("all")}
          >
            <Text style={[styles.filterBtnText, filter === "all" && styles.filterBtnTextActive]}>
              All ({todayTasks.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, filter === "due" && styles.filterBtnActive]}
            onPress={() => setFilter("due")}
          >
            <Text style={[styles.filterBtnText, filter === "due" && styles.filterBtnTextActive]}>
              Due ({dueTasks.length})
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.statsBadges}>
          <View style={styles.statBadge}>
            <Text style={styles.statBadgeLabel}>Completed</Text>
            <Text style={styles.statBadgeValue}>
              {todayTasks.length > 0
                ? `${Math.round((completedToday / todayTasks.length) * 100)}%`
                : "0%"}
            </Text>
          </View>
          <View style={styles.statBadge}>
            <Text style={styles.statBadgeLabel}>Time Spent</Text>
            <Text style={styles.statBadgeValue}>{formatSeconds(totalSecondsToday)}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.taskList}
        contentContainerStyle={[
          styles.taskListContent,
          { paddingBottom: Platform.OS === "web" ? 120 : 100 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {displayTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="check-circle" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {filter === "due" ? "All done for today!" : "No tasks yet"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {filter === "due"
                ? "You've completed all your tasks."
                : "Tap + to add your first task."}
            </Text>
          </View>
        ) : (
          displayTasks.map((task) => <TaskCard key={task.id} task={task} />)
        )}
      </ScrollView>

      <AddTaskModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addTask}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {},
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },
  appBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 4,
  },
  appBadgeText: {
    color: "#000",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.card,
    borderRadius: 20,
  },
  dateStrip: {
    marginHorizontal: 16,
    marginBottom: 4,
  },
  dateItem: {
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 4,
    borderRadius: 8,
    minWidth: 52,
  },
  dateItemActive: {
    backgroundColor: Colors.card,
  },
  dateMonth: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  dateDay: {
    fontSize: 18,
    color: Colors.textSecondary,
    fontFamily: "Inter_700Bold",
  },
  dateTime: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  dateTextActive: {
    color: Colors.text,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    gap: 8,
  },
  filterButtons: {
    flexDirection: "row",
    gap: 6,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.card,
  },
  filterBtnActive: {
    backgroundColor: Colors.accent,
  },
  filterBtnText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
  },
  filterBtnTextActive: {
    color: "#000",
  },
  statsBadges: {
    flexDirection: "row",
    gap: 6,
    marginLeft: "auto",
  },
  statBadge: {
    backgroundColor: Colors.card,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: "center",
  },
  statBadgeLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  statBadgeValue: {
    fontSize: 11,
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
  },
  taskList: {
    flex: 1,
  },
  taskListContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  taskCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  taskCardLeft: {},
  taskCardCenter: {
    flex: 1,
  },
  taskName: {
    fontSize: 16,
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 3,
  },
  taskTime: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  taskParts: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    color: Colors.text,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
    marginTop: 8,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  radioRow: {
    flexDirection: "row",
    gap: 12,
  },
  radioBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  radioBtnActive: {
    borderColor: Colors.accent,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: {
    borderColor: Colors.accent,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  radioText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  radioTextActive: {
    color: Colors.accent,
  },
  colorRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: Colors.text,
  },
  addButton: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  addButtonText: {
    fontSize: 16,
    color: "#000",
    fontFamily: "Inter_700Bold",
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 10,
  },
  cancelButtonText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
  },
});
