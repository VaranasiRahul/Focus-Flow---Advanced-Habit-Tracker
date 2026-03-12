import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Switch, Modal, TextInput, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/context/ThemeContext";
import { useTaskContext, Task } from "@/context/TaskContext";
import { THEMES, THEME_LABELS, ThemeName } from "@/constants/colors";

// ---- Edit Task Modal ----
function EditTaskModal({ task, visible, onClose }: { task: Task | null; visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const { updateTask } = useTaskContext();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(task?.name ?? "");
  const [targetMins, setTargetMins] = useState(String(task?.targetMinutes ?? 60));
  const [colorIdx, setColorIdx] = useState(colors.taskColors.indexOf(task?.color ?? colors.accent));
  const [isDaily, setIsDaily] = useState(task?.isDaily ?? true);
  const [notifTime, setNotifTime] = useState(task?.notificationTime ?? "09:00");

  React.useEffect(() => {
    if (task) {
      setName(task.name); setTargetMins(String(task.targetMinutes));
      setColorIdx(Math.max(colors.taskColors.indexOf(task.color), 0));
      setIsDaily(task.isDaily); setNotifTime(task.notificationTime);
    }
  }, [task]);

  function handleSave() {
    if (!task || !name.trim()) return;
    const mins = parseInt(targetMins, 10);
    if (isNaN(mins) || mins < 1) { Alert.alert("Invalid duration"); return; }
    updateTask(task.id, { name: name.trim(), targetMinutes: mins, color: colors.taskColors[Math.max(colorIdx, 0)], isDaily, notificationTime: notifTime });
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: insets.bottom + 16 }}>
          <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 }} />
          <Text style={{ fontSize: 18, color: colors.text, fontFamily: "Inter_700Bold", marginBottom: 16 }}>Edit Task</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "Inter_500Medium", marginBottom: 4 }}>Name</Text>
          <TextInput style={{ backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}
            value={name} onChangeText={setName} />
          <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "Inter_500Medium", marginBottom: 4 }}>Target (minutes)</Text>
          <TextInput style={{ backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}
            value={targetMins} onChangeText={setTargetMins} keyboardType="number-pad" />
          <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "Inter_500Medium", marginBottom: 8 }}>Color</Text>
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            {colors.taskColors.map((c, i) => (
              <TouchableOpacity key={c} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c, ...(i === colorIdx ? { borderWidth: 3, borderColor: "#fff" } : {}) }} onPress={() => setColorIdx(i)} />
            ))}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={{ fontSize: 14, color: colors.text, fontFamily: "Inter_500Medium" }}>Daily Task</Text>
            <Switch value={isDaily} onValueChange={setIsDaily} trackColor={{ false: colors.border, true: colors.accent }} thumbColor={colors.text} />
          </View>
          <TouchableOpacity style={{ backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 14, alignItems: "center" }} onPress={handleSave}>
            <Text style={{ fontSize: 16, color: "#000", fontFamily: "Inter_700Bold" }}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ alignItems: "center", paddingVertical: 10 }} onPress={onClose}>
            <Text style={{ fontSize: 15, color: colors.textSecondary, fontFamily: "Inter_500Medium" }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ---- Theme Picker ----
function ThemePicker() {
  const { colors, themeName, setTheme } = useTheme();
  const themeKeys = Object.keys(THEMES) as ThemeName[];

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 }}>Theme</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {themeKeys.map((key) => {
          const theme = THEMES[key];
          const isActive = themeName === key;
          return (
            <TouchableOpacity key={key}
              style={{ width: (Platform.OS === "web" ? 280 : (350 / 2 - 20)), flexGrow: 1, borderRadius: 14, overflow: "hidden", borderWidth: 2, borderColor: isActive ? theme.accent : "transparent" }}
              onPress={() => { setTheme(key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
              {/* Theme mini-preview */}
              <View style={{ backgroundColor: theme.background, padding: 12, gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    {[theme.accent, theme.card, theme.border].map((c, i) => (
                      <View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c }} />
                    ))}
                  </View>
                  {isActive && <Feather name="check-circle" size={14} color={theme.accent} />}
                </View>
                <View style={{ height: 4, backgroundColor: theme.card, borderRadius: 2, overflow: "hidden" }}>
                  <View style={{ height: "100%", width: "65%", backgroundColor: theme.accent, borderRadius: 2 }} />
                </View>
                <View style={{ flexDirection: "row", gap: 4 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: theme.accent }} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ height: 4, width: "80%", backgroundColor: theme.text + "66", borderRadius: 2 }} />
                    <View style={{ height: 3, width: "50%", backgroundColor: theme.textMuted, borderRadius: 2 }} />
                  </View>
                </View>
              </View>
              <View style={{ backgroundColor: theme.card, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ fontSize: 12, color: isActive ? theme.accent : theme.text, fontFamily: "Inter_700Bold" }}>
                  {THEME_LABELS[key]}
                </Text>
                <Text style={{ fontSize: 10, color: theme.textSecondary, fontFamily: "Inter_400Regular" }}>
                  {key === "dark" ? "AMOLED black" : key === "midnight" ? "Deep violet" : key === "forest" ? "Lush green" : key === "ocean" ? "Deep cyan" : key === "ember" ? "Warm orange" : "Soft purple"}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={{ backgroundColor: colors.card, borderRadius: 10, padding: 12, flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
        <Feather name="info" size={14} color={colors.textMuted} style={{ marginTop: 2 }} />
        <Text style={{ flex: 1, fontSize: 12, color: colors.textMuted, fontFamily: "Inter_400Regular" }}>
          All themes are dark/AMOLED-optimized to save battery on OLED displays. Light mode is not included by design.
        </Text>
      </View>
    </View>
  );
}

// ---- Row helpers ----
function SettingRow({ icon, label, right, onPress, colors }: { icon: string; label: string; right?: React.ReactNode; onPress?: () => void; colors: any }) {
  const Inner = (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.background, borderRadius: 14, padding: 14, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
          <Feather name={icon as any} size={16} color={colors.textSecondary} />
        </View>
        <Text style={{ fontSize: 15, color: colors.text, fontFamily: "Inter_500Medium" }}>{label}</Text>
      </View>
      {right ?? <Feather name="chevron-right" size={16} color={colors.textMuted} />}
    </View>
  );
  return onPress ? <TouchableOpacity onPress={onPress}>{Inner}</TouchableOpacity> : Inner;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, themeName } = useTheme();
  const { tasks, deleteTask, dailyRecords } = useTaskContext();
  const [editTask, setEditTask] = useState<Task | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const totalSecs = dailyRecords.reduce((s, r) => s + r.secondsSpent, 0);
  const h = Math.floor(totalSecs / 3600), m = Math.floor((totalSecs % 3600) / 60);
  const totalFmt = h > 0 ? `${h}h ${String(m).padStart(2,"0")}m` : `${m}m`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: topPad }}>
      <View style={{ paddingHorizontal: 20, paddingVertical: 14 }}>
        <Text style={{ fontSize: 28, color: colors.text, fontFamily: "Inter_700Bold" }}>Settings</Text>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 20, paddingBottom: Platform.OS === "android" ? 20 : 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- THEMES ---- */}
        <ThemePicker />

        {/* ---- APP STATS SUMMARY ---- */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 }}>Your Stats</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[["Tasks", String(tasks.length), "layers"], ["Total Focus", totalFmt, "clock"], ["Sessions", String(dailyRecords.length), "activity"]].map(([l, v, icon]) => (
              <View key={l} style={{ flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 12, alignItems: "center", gap: 4 }}>
                <Feather name={icon as any} size={18} color={colors.accent} />
                <Text style={{ fontSize: 16, color: colors.text, fontFamily: "Inter_700Bold" }}>{v}</Text>
                <Text style={{ fontSize: 10, color: colors.textMuted, fontFamily: "Inter_400Regular" }}>{l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ---- WIDGET PREVIEW ---- */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 }}>Home Screen Widget</Text>
          <View style={{ backgroundColor: "#1A2000", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.accent + "44" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: "Inter_700Bold" }}>FocusFlow</Text>
              <View style={{ backgroundColor: colors.accent + "33", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, color: colors.accent, fontFamily: "Inter_700Bold" }}>{tasks.length} pending</Text>
              </View>
            </View>
            <Text style={{ fontSize: 15, color: colors.text, fontFamily: "Inter_700Bold", marginBottom: 4 }}>{tasks[0]?.name ?? "No tasks today"}</Text>
            <Text style={{ fontSize: 24, color: colors.accent, fontFamily: "Inter_700Bold" }}>0h 00m <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "Inter_400Regular" }}>spent</Text></Text>
            <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
              <View style={{ height: "100%", width: "0%", backgroundColor: colors.accent, borderRadius: 2 }} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
              <Text style={{ fontSize: 10, color: colors.textMuted, fontFamily: "Inter_400Regular" }}>Tap to start</Text>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 12, color: "#000" }}>▶</Text>
              </View>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: colors.textMuted, fontFamily: "Inter_400Regular" }}>
            Widget requires EAS Build (not Expo Go). See WIDGET_SETUP.md for instructions.
          </Text>
        </View>

        {/* ---- MANAGE TASKS ---- */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 }}>Manage Tasks</Text>
          {tasks.length === 0 ? (
            <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 20, alignItems: "center" }}>
              <Text style={{ color: colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 14 }}>No tasks yet. Add one from the Home tab.</Text>
            </View>
          ) : tasks.map((task) => (
            <View key={task.id} style={{ backgroundColor: colors.card, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: task.color }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, color: colors.text, fontFamily: "Inter_600SemiBold" }}>{task.name}</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "Inter_400Regular" }}>{task.targetMinutes}m target · {task.isDaily ? "Daily" : "One-time"}</Text>
              </View>
              <TouchableOpacity style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: colors.background }}
                onPress={() => setEditTask(task)}><Feather name="edit-2" size={16} color={colors.accent} /></TouchableOpacity>
              <TouchableOpacity style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#E74C3C22" }}
                onPress={() => Alert.alert("Delete Task", `Delete "${task.name}"? This removes all its history.`, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => deleteTask(task.id) },
                ])}><Feather name="trash-2" size={16} color="#E74C3C" /></TouchableOpacity>
            </View>
          ))}
        </View>

        {/* ---- APP PREFERENCES ---- */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 }}>App Preferences</Text>
          <SettingRow icon="bell" label="Notifications" colors={colors} />
          <SettingRow icon="moon" label="Always dark" right={<Switch value={true} trackColor={{ false: colors.border, true: colors.accent }} thumbColor={colors.text} />} colors={colors} />
          <SettingRow icon="volume-2" label="Sound Effects" right={<Switch value={true} trackColor={{ false: colors.border, true: colors.accent }} thumbColor={colors.text} />} colors={colors} />
        </View>

        {/* ---- DATA & PRIVACY ---- */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 }}>Data & Privacy</Text>
          <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 14, gap: 8 }}>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
              <Feather name="shield" size={14} color={colors.accent} style={{ marginTop: 2 }} />
              <Text style={{ flex: 1, fontSize: 13, color: colors.textSecondary, fontFamily: "Inter_400Regular" }}>All data is stored locally on your device using AsyncStorage. Nothing is uploaded to any server.</Text>
            </View>
          </View>
          <SettingRow icon="download" label="Export Data" colors={colors} onPress={() => Alert.alert("Export", "Export as JSON coming soon.")} />
          <SettingRow icon="trash" label="Clear All Data" colors={colors} onPress={() => Alert.alert("Clear All Data", "This will delete all tasks and history permanently.", [{ text: "Cancel", style: "cancel" }, { text: "Clear", style: "destructive" }])} />
        </View>

        {/* ---- ABOUT ---- */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 }}>About</Text>
          <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 16, gap: 6 }}>
            {[["App", "FocusFlow"], ["Version", "1.0.0"], ["Theme", THEME_LABELS[themeName]], ["Platform", Platform.OS]].map(([l, v]) => (
              <View key={l} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 14, color: colors.textSecondary, fontFamily: "Inter_400Regular" }}>{l}</Text>
                <Text style={{ fontSize: 14, color: colors.text, fontFamily: "Inter_500Medium" }}>{v}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <EditTaskModal task={editTask} visible={!!editTask} onClose={() => setEditTask(null)} />
    </View>
  );
}
