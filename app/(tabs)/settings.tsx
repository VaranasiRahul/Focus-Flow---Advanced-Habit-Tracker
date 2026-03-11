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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { useTaskContext } from "@/context/TaskContext";
import { router } from "expo-router";

function WidgetPreview() {
  return (
    <View style={styles.widgetSection}>
      <Text style={styles.sectionTitle}>Widget Preview</Text>
      <Text style={styles.sectionSubtitle}>
        Add the FocusTrack widget to your home screen to see today's pending tasks at a glance.
      </Text>
      <View style={styles.widgetPreviewCard}>
        <View style={styles.widgetCard}>
          <Text style={styles.widgetTitle}>FocusTrack</Text>
          <View style={styles.widgetRow}>
            <View>
              <Text style={styles.widgetTaskName}>Today's Focus</Text>
              <Text style={styles.widgetTime}>0h 00m</Text>
              <Text style={styles.widgetLabel}>Time Spent</Text>
            </View>
            <View style={[styles.widgetPlayBtn, { backgroundColor: Colors.accent }]}>
              <Feather name="play" size={16} color="#000" />
            </View>
          </View>
        </View>
      </View>
      <View style={styles.widgetNote}>
        <Feather name="info" size={14} color={Colors.textMuted} />
        <Text style={styles.widgetNoteText}>
          To add: Long press your home screen → Widgets → FocusTrack
        </Text>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { tasks, deleteTask } = useTaskContext();
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  function handleDeleteTask(task: any) {
    Alert.alert(
      "Delete Task",
      `Are you sure you want to delete "${task.name}"? This will remove all associated records.`,
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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 120 : 100 + insets.bottom },
        ]}
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
                <View
                  key={task.id}
                  style={[
                    styles.taskRow,
                    index < tasks.length - 1 && styles.taskRowBorder,
                  ]}
                >
                  <View style={[styles.taskColorBar, { backgroundColor: task.color }]} />
                  <View style={styles.taskRowInfo}>
                    <Text style={styles.taskRowName} numberOfLines={1}>
                      {task.name}
                    </Text>
                    <Text style={styles.taskRowMeta}>
                      {task.targetMinutes}m target · {task.isDaily ? "Daily" : "One-time"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteTask(task)}
                    style={styles.deleteBtn}
                  >
                    <Feather name="trash-2" size={16} color="#E74C3C" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <View style={styles.aboutRow}>
              <View style={[styles.settingIcon, { backgroundColor: `${Colors.accent}20` }]}>
                <Feather name="target" size={16} color={Colors.accent} />
              </View>
              <View style={styles.aboutInfo}>
                <Text style={styles.aboutAppName}>FocusTrack</Text>
                <Text style={styles.aboutVersion}>Version 1.0.0</Text>
              </View>
            </View>
            <View style={styles.aboutDivider} />
            <Text style={styles.aboutDescription}>
              A habit and focus tracker with Pomodoro timer, ambient sounds, and streak tracking. Your data is stored locally and never deleted automatically.
            </Text>
          </View>
        </View>
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
    gap: 20,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: {
    fontSize: 15,
    color: Colors.text,
    fontFamily: "Inter_500Medium",
  },
  widgetSection: {
    gap: 8,
  },
  widgetPreviewCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  widgetCard: {
    backgroundColor: "#1E1E2E",
    borderRadius: 16,
    padding: 16,
    width: 200,
  },
  widgetTitle: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_500Medium",
    marginBottom: 8,
  },
  widgetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  widgetTaskName: {
    fontSize: 13,
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
  },
  widgetTime: {
    fontSize: 22,
    color: Colors.text,
    fontFamily: "Inter_700Bold",
  },
  widgetLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  widgetPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  widgetNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
  },
  widgetNoteText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  taskRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  taskColorBar: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  taskRowInfo: {
    flex: 1,
  },
  taskRowName: {
    fontSize: 15,
    color: Colors.text,
    fontFamily: "Inter_500Medium",
  },
  taskRowMeta: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTasks: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  emptyTasksText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  aboutInfo: {},
  aboutAppName: {
    fontSize: 16,
    color: Colors.text,
    fontFamily: "Inter_700Bold",
  },
  aboutVersion: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  aboutDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  aboutDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    padding: 16,
    lineHeight: 20,
  },
});
