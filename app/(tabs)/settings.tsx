import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Switch,
  Modal,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { useTaskContext, Task } from "@/context/TaskContext";

interface EditTaskModalProps {
  task: Task | null;
  visible: boolean;
  onClose: () => void;
}

function EditTaskModal({ task, visible, onClose }: EditTaskModalProps) {
  const { updateTask } = useTaskContext();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(task?.name ?? "");
  const [targetMinutes, setTargetMinutes] = useState(String(task?.targetMinutes ?? 60));
  const [colorIndex, setColorIndex] = useState(
    task ? Math.max(Colors.taskColors.indexOf(task.color), 0) : 0
  );
  const [isDaily, setIsDaily] = useState(task?.isDaily ?? true);
  const [notificationTime, setNotificationTime] = useState(task?.notificationTime ?? "09:00");

  React.useEffect(() => {
    if (task) {
      setName(task.name);
      setTargetMinutes(String(task.targetMinutes));
      setColorIndex(Math.max(Colors.taskColors.indexOf(task.color), 0));
      setIsDaily(task.isDaily);
      setNotificationTime(task.notificationTime);
    }
  }, [task]);

  function handleSave() {
    if (!task) return;
    if (!name.trim()) { Alert.alert("Name required", "Please enter a task name."); return; }
    const mins = parseInt(targetMinutes, 10);
    if (isNaN(mins) || mins < 1) { Alert.alert("Invalid duration", "Please enter a valid duration in minutes."); return; }
    updateTask(task.id, {
      name: name.trim(),
      targetMinutes: mins,
      color: Colors.taskColors[colorIndex],
      isDaily,
      notificationTime,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Edit Task</Text>
          <Text style={styles.inputLabel}>Task Name</Text>
          <TextInput
            style={styles.textInput} value={name} onChangeText={setName}
            placeholder="Task name" placeholderTextColor={Colors.textMuted}
          />
          <Text style={styles.inputLabel}>Target Duration (minutes)</Text>
          <TextInput
            style={styles.textInput} value={targetMinutes} onChangeText={setTargetMinutes}
            keyboardType="number-pad" placeholderTextColor={Colors.textMuted}
          />
          <Text style={styles.inputLabel}>Schedule</Text>
          <View style={styles.radioRow}>
            <TouchableOpacity style={[styles.radioBtn, isDaily && styles.radioBtnActive]} onPress={() => setIsDaily(true)}>
              <View style={[styles.radioCircle, isDaily && styles.radioCircleActive]}>
                {isDaily && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.radioText, isDaily && styles.radioTextActive]}>Every day</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.radioBtn, !isDaily && styles.radioBtnActive]} onPress={() => setIsDaily(false)}>
              <View style={[styles.radioCircle, !isDaily && styles.radioCircleActive]}>
                {!isDaily && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.radioText, !isDaily && styles.radioTextActive]}>Today only</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.inputLabel}>Notification Time</Text>
          <TextInput
            style={styles.textInput} value={notificationTime} onChangeText={setNotificationTime}
            placeholder="09:00" placeholderTextColor={Colors.textMuted}
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
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function WidgetPreview() {
  const { getTodayTasks, getTodayRecord } = useTaskContext();
  const todayTasks = getTodayTasks();
  const pendingTasks = todayTasks.filter((t) => {
    const record = getTodayRecord(t.id);
    return !record || record.secondsSpent < t.targetMinutes * 60;
  });
  const nextTask = pendingTasks[0];

  return (
    <View style={styles.widgetSection}>
      <Text style={styles.sectionTitle}>Widget Preview</Text>
      <Text style={styles.sectionSubtitle}>
        Add the FocusFlow widget to your home screen to see today's pending tasks at a glance.
      </Text>
      <View style={styles.widgetPreviewCard}>
        <View style={styles.widgetCard}>
          <Text style={styles.widgetTitle}>FocusFlow</Text>
          <View style={styles.widgetRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.widgetTaskName} numberOfLines={1}>
                {nextTask ? nextTask.name : "All done!"}
              </Text>
              <Text style={styles.widgetTime}>
                {pendingTasks.length > 0 ? `${pendingTasks.length} pending` : "0 pending"}
              </Text>
              <Text style={styles.widgetLabel}>Today's Tasks</Text>
            </View>
            <View style={[styles.widgetPlayBtn, { backgroundColor: nextTask ? nextTask.color : Colors.accent }]}>
              <Feather name={pendingTasks.length > 0 ? "play" : "check"} size={16} color="#000" />
            </View>
          </View>
        </View>
      </View>
      <View style={styles.widgetNote}>
        <Feather name="info" size={14} color={Colors.textMuted} />
        <Text style={styles.widgetNoteText}>
          To add: Long press your home screen → Widgets → FocusFlow
        </Text>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { tasks, deleteTask } = useTaskContext();
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  function handleDeleteTask(task: Task) {
    Alert.alert(
      "Delete Task",
      `Are you sure you want to delete "${task.name}"? All records will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteTask(task.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === "web" ? 120 : Platform.OS === "android" ? 20 : 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <WidgetPreview />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Preferences</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: "#4A90E220" }]}>
                  <Feather name="zap" size={16} color="#4A90E2" />
                </View>
                <Text style={styles.settingLabel}>Haptic Feedback</Text>
              </View>
              <Switch
                value={hapticEnabled}
                onValueChange={setHapticEnabled}
                trackColor={{ false: Colors.border, true: Colors.accent }}
                thumbColor={Colors.text}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manage Tasks</Text>
          {tasks.length === 0 ? (
            <View style={styles.emptyTasks}>
              <Text style={styles.emptyTasksText}>No tasks created yet.</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {tasks.map((task, index) => (
                <View key={task.id} style={[styles.taskRow, index < tasks.length - 1 && styles.taskRowBorder]}>
                  <View style={[styles.taskColorBar, { backgroundColor: task.color }]} />
                  <View style={styles.taskRowInfo}>
                    <Text style={styles.taskRowName} numberOfLines={1}>{task.name}</Text>
                    <Text style={styles.taskRowMeta}>
                      {task.targetMinutes}m · {task.isDaily ? "Daily" : "One-time"} · {task.notificationTime}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setEditingTask(task)}
                    style={styles.editBtn}
                  >
                    <Feather name="edit-2" size={15} color={Colors.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteTask(task)} style={styles.deleteBtn}>
                    <Feather name="trash-2" size={15} color="#E74C3C" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Feather name="database" size={16} color={Colors.textSecondary} />
              <Text style={styles.infoText}>
                All data is stored locally on your device using AsyncStorage and is never automatically deleted.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <View style={styles.aboutRow}>
              <View style={[styles.settingIcon, { backgroundColor: `${Colors.accent}20` }]}>
                <Feather name="target" size={16} color={Colors.accent} />
              </View>
              <View style={styles.aboutInfo}>
                <Text style={styles.aboutAppName}>FocusFlow</Text>
                <Text style={styles.aboutVersion}>Version 1.0.0</Text>
              </View>
            </View>
            <View style={styles.aboutDivider} />
            <Text style={styles.aboutDescription}>
              A habit and focus tracker with Pomodoro timer, ambient sounds, streak tracking, and analytics. Your data is stored locally and never deleted automatically.
            </Text>
          </View>
        </View>
      </ScrollView>

      <EditTaskModal
        task={editingTask}
        visible={editingTask !== null}
        onClose={() => setEditingTask(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 24, color: Colors.text, fontFamily: "Inter_700Bold" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, gap: 20 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, color: Colors.textSecondary, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  sectionSubtitle: { fontSize: 13, color: Colors.textMuted, fontFamily: "Inter_400Regular", marginBottom: 8 },
  card: { backgroundColor: Colors.card, borderRadius: 16, overflow: "hidden" },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  settingIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  settingLabel: { fontSize: 15, color: Colors.text, fontFamily: "Inter_500Medium" },
  widgetSection: { gap: 8 },
  widgetPreviewCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 20, alignItems: "center" },
  widgetCard: { backgroundColor: "#1A1A2E", borderRadius: 16, padding: 16, width: 200 },
  widgetTitle: { fontSize: 10, color: Colors.textMuted, fontFamily: "Inter_500Medium", marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" },
  widgetRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  widgetTaskName: { fontSize: 13, color: Colors.text, fontFamily: "Inter_600SemiBold" },
  widgetTime: { fontSize: 20, color: Colors.text, fontFamily: "Inter_700Bold" },
  widgetLabel: { fontSize: 9, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
  widgetPlayBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  widgetNote: { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: Colors.card, borderRadius: 12, padding: 12 },
  widgetNoteText: { flex: 1, fontSize: 12, color: Colors.textMuted, fontFamily: "Inter_400Regular", lineHeight: 18 },
  taskRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  taskRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  taskColorBar: { width: 4, height: 36, borderRadius: 2 },
  taskRowInfo: { flex: 1 },
  taskRowName: { fontSize: 15, color: Colors.text, fontFamily: "Inter_500Medium" },
  taskRowMeta: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_400Regular", marginTop: 2 },
  editBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  deleteBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  emptyTasks: { backgroundColor: Colors.card, borderRadius: 16, padding: 20, alignItems: "center" },
  emptyTasksText: { fontSize: 14, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16 },
  infoText: { flex: 1, fontSize: 13, color: Colors.textSecondary, fontFamily: "Inter_400Regular", lineHeight: 20 },
  aboutRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  aboutInfo: {},
  aboutAppName: { fontSize: 16, color: Colors.text, fontFamily: "Inter_700Bold" },
  aboutVersion: { fontSize: 12, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
  aboutDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
  aboutDescription: { fontSize: 13, color: Colors.textSecondary, fontFamily: "Inter_400Regular", padding: 16, lineHeight: 20 },
  // Edit modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, gap: 8 },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  modalTitle: { fontSize: 20, color: Colors.text, fontFamily: "Inter_700Bold", marginBottom: 8 },
  inputLabel: { fontSize: 13, color: Colors.textSecondary, fontFamily: "Inter_500Medium", marginTop: 8, marginBottom: 4 },
  textInput: { backgroundColor: Colors.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, fontFamily: "Inter_400Regular", borderWidth: 1, borderColor: Colors.border },
  radioRow: { flexDirection: "row", gap: 12 },
  radioBtn: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  radioBtnActive: { borderColor: Colors.accent },
  radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.textMuted, alignItems: "center", justifyContent: "center" },
  radioCircleActive: { borderColor: Colors.accent },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent },
  radioText: { fontSize: 14, color: Colors.textSecondary, fontFamily: "Inter_500Medium" },
  radioTextActive: { color: Colors.accent },
  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
  colorDotSelected: { borderWidth: 3, borderColor: Colors.text },
  saveButton: { backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  saveButtonText: { fontSize: 16, color: "#000", fontFamily: "Inter_700Bold" },
  cancelButton: { alignItems: "center", paddingVertical: 10 },
  cancelButtonText: { fontSize: 15, color: Colors.textSecondary, fontFamily: "Inter_500Medium" },
});
