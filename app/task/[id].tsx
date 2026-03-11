import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Switch,
  Platform,
  Animated,
  Easing,
  Alert,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Svg, { Path, Circle } from "react-native-svg";
import { Audio } from "expo-av";
import * as KeepAwake from "expo-keep-awake";
import * as Brightness from "expo-brightness";
import { Colors } from "@/constants/colors";
import { useTaskContext } from "@/context/TaskContext";
import { useTimer } from "@/context/TimerContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type AmbientKey = "rain" | "thunder" | "train" | "fire";

const AMBIENT_SOUNDS: Record<AmbientKey, { label: string; icon: string; url: string }> = {
  rain: {
    label: "Rain",
    icon: "cloud-rain",
    url: "https://cdn.pixabay.com/audio/2022/08/23/audio_d16737843a.mp3",
  },
  thunder: {
    label: "Thunder",
    icon: "cloud-lightning",
    url: "https://cdn.pixabay.com/audio/2022/03/10/audio_4ef3f8ede1.mp3",
  },
  train: {
    label: "Train",
    icon: "navigation",
    url: "https://cdn.pixabay.com/audio/2022/10/30/audio_945b0cd97e.mp3",
  },
  fire: {
    label: "Fire",
    icon: "zap",
    url: "https://cdn.pixabay.com/audio/2022/11/22/audio_fbc1c23534.mp3",
  },
};

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `0h ${String(m).padStart(2, "0")}m`;
}

function getDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, sweepAngle: number): string {
  if (sweepAngle <= 0) return "";
  if (sweepAngle >= 359.99) sweepAngle = 359.99;
  const endAngle = startAngle + sweepAngle;
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const large = sweepAngle > 180 ? "1" : "0";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

function TimerArc({ progress, color, size = 240 }: { progress: number; color: string; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 18;
  const startAngle = 135;
  const totalSweep = 270;
  const sweepAngle = Math.max(totalSweep * Math.min(progress, 1), 0);
  const bgPath = arcPath(cx, cy, r, startAngle, totalSweep);
  const fgPath = sweepAngle > 0 ? arcPath(cx, cy, r, startAngle, sweepAngle) : "";
  const dotAngle = startAngle + sweepAngle;
  const dotPos = polarToCartesian(cx, cy, r, dotAngle);
  return (
    <Svg width={size} height={size}>
      {bgPath ? <Path d={bgPath} stroke="#2A2A2A" strokeWidth={10} fill="none" strokeLinecap="round" /> : null}
      {fgPath ? <Path d={fgPath} stroke={color} strokeWidth={10} fill="none" strokeLinecap="round" /> : null}
      {sweepAngle > 0 ? <Circle cx={dotPos.x} cy={dotPos.y} r={8} fill={color} /> : null}
    </Svg>
  );
}

// Flip clock digit tile
function FlipDigit({ digit }: { digit: string }) {
  return (
    <View style={flipStyles.tile}>
      <Text style={flipStyles.tileText}>{digit}</Text>
      <View style={flipStyles.tileLine} />
    </View>
  );
}

function FlipClock({ timeStr, color }: { timeStr: string; color: string }) {
  const parts = timeStr.split(":");
  const digits: string[] = [];
  parts.forEach((part) => {
    digits.push(part[0] ?? "0");
    digits.push(part[1] ?? "0");
  });
  const separators = parts.length === 3 ? [2, 5] : [2];

  return (
    <View style={[flipStyles.clock, { borderColor: color + "33" }]}>
      {digits.map((d, i) => (
        <React.Fragment key={i}>
          {separators.includes(i) && (
            <View style={flipStyles.separator}>
              <View style={[flipStyles.dot, { backgroundColor: color }]} />
              <View style={[flipStyles.dot, { backgroundColor: color }]} />
            </View>
          )}
          <FlipDigit digit={d} />
        </React.Fragment>
      ))}
    </View>
  );
}

function WeekStrip({ taskId }: { taskId: string }) {
  const { getRecordsForTask } = useTaskContext();
  const records = getRecordsForTask(taskId);
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = getDateString(d);
    const record = records.find((r) => r.date === dateStr);
    days.push({
      label: d.toLocaleString("default", { month: "short" }),
      day: d.getDate(),
      time: record ? formatSeconds(record.secondsSpent) : "0:00",
      isToday: i === 0,
    });
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekStrip}>
      {days.map((d, i) => (
        <View key={i} style={[styles.dayItem, d.isToday && styles.dayItemActive]}>
          <Text style={[styles.dayLabel, d.isToday && styles.dayLabelActive]}>{d.label}</Text>
          <Text style={[styles.dayNum, d.isToday && styles.dayNumActive]}>{d.day}</Text>
          <Text style={[styles.dayTime, d.isToday && styles.dayTimeActive]}>{d.time}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

interface SettingsSheetProps { visible: boolean; onClose: () => void; taskId: string; }
function SettingsSheet({ visible, onClose, taskId }: SettingsSheetProps) {
  const { tasks, updateTask } = useTaskContext();
  const task = tasks.find((t) => t.id === taskId);
  const insets = useSafeAreaInsets();
  if (!task) return null;

  function adjustPomodoro(field: "pomodoroLength" | "shortBreakLength" | "longBreakLength", delta: number) {
    if (!task) return;
    const min = field === "shortBreakLength" ? 1 : 5;
    const max = field === "longBreakLength" ? 60 : 90;
    const newVal = Math.min(Math.max((task[field] as number) + delta, min), max);
    updateTask(taskId, { [field]: newVal });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function adjustTarget(delta: number) {
    if (!task) return;
    const newVal = Math.min(Math.max(task.targetMinutes + delta, 5), 480);
    updateTask(taskId, { targetMinutes: newVal });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const sessions = task.usePomodoro
    ? Math.ceil(task.targetMinutes / task.pomodoroLength)
    : 1;

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.sheetOverlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Task Settings</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Reminder Alarm</Text>
            <Switch
              value={task.reminderAlarm}
              onValueChange={(v) => updateTask(taskId, { reminderAlarm: v })}
              trackColor={{ false: Colors.border, true: Colors.accent }}
              thumbColor={Colors.text}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Use Pomodoro</Text>
            <Switch
              value={task.usePomodoro}
              onValueChange={(v) => updateTask(taskId, { usePomodoro: v })}
              trackColor={{ false: Colors.border, true: Colors.accent }}
              thumbColor={Colors.text}
            />
          </View>

          <Text style={styles.fieldLabel}>Daily Target</Text>
          <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustTarget(-5)}>
              <Feather name="minus" size={18} color="#000" />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{task.targetMinutes}m</Text>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustTarget(5)}>
              <Feather name="plus" size={18} color="#000" />
            </TouchableOpacity>
          </View>

          {task.usePomodoro && (
            <>
              <Text style={styles.fieldLabel}>Pomodoro Length</Text>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustPomodoro("pomodoroLength", -5)}>
                  <Feather name="minus" size={18} color="#000" />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{task.pomodoroLength}m</Text>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustPomodoro("pomodoroLength", 5)}>
                  <Feather name="plus" size={18} color="#000" />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Short Break Length</Text>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustPomodoro("shortBreakLength", -1)}>
                  <Feather name="minus" size={18} color="#000" />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{task.shortBreakLength}m</Text>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustPomodoro("shortBreakLength", 1)}>
                  <Feather name="plus" size={18} color="#000" />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Long Break Length</Text>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustPomodoro("longBreakLength", -5)}>
                  <Feather name="minus" size={18} color="#000" />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{task.longBreakLength}m</Text>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustPomodoro("longBreakLength", 5)}>
                  <Feather name="plus" size={18} color="#000" />
                </TouchableOpacity>
              </View>

              <View style={styles.sessionsSummary}>
                <Feather name="layers" size={14} color={Colors.accent} />
                <Text style={styles.sessionsSummaryText}>
                  {sessions} focus session{sessions !== 1 ? "s" : ""} of {task.pomodoroLength}m each
                </Text>
              </View>
            </>
          )}

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

interface AmbientSheetProps {
  visible: boolean;
  onClose: () => void;
  activeSound: AmbientKey | null;
  onSelect: (key: AmbientKey | null) => void;
  isLoading: boolean;
}
function AmbientSheet({ visible, onClose, activeSound, onSelect, isLoading }: AmbientSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.sheetOverlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Ambient Sound</Text>
          <View style={styles.soundGrid}>
            <TouchableOpacity
              style={[styles.soundItem, activeSound === null && styles.soundItemActive]}
              onPress={() => { onSelect(null); onClose(); }}
            >
              <View style={[styles.soundIcon, activeSound === null && styles.soundIconActive]}>
                <Feather name="volume-x" size={24} color={activeSound === null ? "#000" : Colors.textSecondary} />
              </View>
              <Text style={[styles.soundLabel, activeSound === null && styles.soundLabelActive]}>None</Text>
            </TouchableOpacity>
            {(Object.keys(AMBIENT_SOUNDS) as AmbientKey[]).map((key) => {
              const sound = AMBIENT_SOUNDS[key];
              const isActive = activeSound === key;
              const isLoadingThis = isLoading && isActive;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.soundItem, isActive && styles.soundItemActive]}
                  onPress={() => { onSelect(key); onClose(); }}
                >
                  <View style={[styles.soundIcon, isActive && styles.soundIconActive]}>
                    {isLoadingThis ? (
                      <Feather name="loader" size={24} color="#000" />
                    ) : (
                      <Feather name={sound.icon as any} size={24} color={isActive ? "#000" : Colors.textSecondary} />
                    )}
                  </View>
                  <Text style={[styles.soundLabel, isActive && styles.soundLabelActive]}>{sound.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

interface FullscreenTimerProps {
  visible: boolean;
  onClose: () => void;
  color: string;
  taskName: string;
  activeSound: AmbientKey | null;
  onSoundPress: () => void;
}
function FullscreenTimer({ visible, onClose, color, taskName, activeSound, onSoundPress }: FullscreenTimerProps) {
  const { isRunning, timeRemaining, phaseDuration, currentPhase, toggle, totalSecondsSpent, skipPhase } = useTimer();
  const insets = useSafeAreaInsets();
  const driftX = useRef(new Animated.Value(0)).current;
  const driftY = useRef(new Animated.Value(0)).current;
  const [brightness, setBrightness] = useState(0.5);

  useEffect(() => {
    if (!visible) return;
    KeepAwake.activateKeepAwakeAsync();
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(driftX, { toValue: 8, duration: 15000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(driftY, { toValue: 5, duration: 12000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(driftX, { toValue: -6, duration: 18000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(driftY, { toValue: -4, duration: 14000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(driftX, { toValue: 4, duration: 16000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(driftY, { toValue: 7, duration: 13000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(driftX, { toValue: 0, duration: 15000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(driftY, { toValue: 0, duration: 12000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => {
      anim.stop();
      KeepAwake.deactivateKeepAwake();
    };
  }, [visible]);

  async function handleBrightnessChange(delta: number) {
    const newVal = Math.min(Math.max(brightness + delta, 0.05), 1);
    setBrightness(newVal);
    if (Platform.OS !== "web") {
      try { await Brightness.setBrightnessAsync(newVal); } catch (_e) {}
    }
  }

  const phaseLabel =
    currentPhase === "focus" ? "FOCUS" : currentPhase === "shortBreak" ? "SHORT BREAK" : "LONG BREAK";
  const progress = phaseDuration > 0 ? timeRemaining / phaseDuration : 0;

  return (
    <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent>
      <View style={styles.fullscreenBg}>
        {/* Top controls */}
        <View style={[styles.fullscreenTopBar, { paddingTop: (Platform.OS === "web" ? 40 : insets.top) + 8 }]}>
          <TouchableOpacity style={styles.fullscreenTopBtn} onPress={onClose}>
            <Feather name="minimize-2" size={20} color="#555" />
          </TouchableOpacity>
          <Text style={[styles.fullscreenTaskName, { color: color + "CC" }]} numberOfLines={1}>
            {taskName}
          </Text>
          <TouchableOpacity style={styles.fullscreenTopBtn} onPress={onSoundPress}>
            <Feather name="music" size={20} color={activeSound ? color : "#555"} />
          </TouchableOpacity>
        </View>

        {/* Drifting timer content */}
        <Animated.View style={[styles.fullscreenContent, { transform: [{ translateX: driftX }, { translateY: driftY }] }]}>
          <Text style={[styles.fullscreenPhase, { color }]}>{phaseLabel}</Text>
          <FlipClock timeStr={formatTime(timeRemaining)} color={color} />
          <Text style={styles.fullscreenStatus}>
            {isRunning ? "running" : "paused"}
            {" · "}
            {formatTime(phaseDuration - timeRemaining)} elapsed
          </Text>
        </Animated.View>

        {/* Bottom controls */}
        <View style={[styles.fullscreenControls, { paddingBottom: (Platform.OS === "web" ? 50 : insets.bottom) + 20 }]}>
          <View style={styles.brightnessRow}>
            <Feather name="sun" size={14} color="#444" />
            <TouchableOpacity style={styles.brightnessBtn} onPress={() => handleBrightnessChange(-0.1)}>
              <Feather name="minus" size={14} color="#666" />
            </TouchableOpacity>
            <View style={styles.brightnessBar}>
              <View style={[styles.brightnessFill, { width: `${brightness * 100}%`, backgroundColor: color }]} />
            </View>
            <TouchableOpacity style={styles.brightnessBtn} onPress={() => handleBrightnessChange(0.1)}>
              <Feather name="plus" size={14} color="#666" />
            </TouchableOpacity>
            <Feather name="sun" size={20} color="#444" />
          </View>

          <View style={styles.fullscreenButtonRow}>
            <TouchableOpacity
              style={styles.fullscreenSkipBtn}
              onPress={() => { skipPhase(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Feather name="skip-forward" size={22} color="#555" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fullscreenPlayBtn, { borderColor: color }]}
              onPress={() => { toggle(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            >
              <Feather name={isRunning ? "pause" : "play"} size={32} color={color} />
            </TouchableOpacity>
            <View style={{ width: 52 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function TaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { tasks, getTodayRecord, updateTodayTime, getRecordsForTask } = useTaskContext();
  const {
    activeTaskId,
    isRunning,
    timeRemaining,
    phaseDuration,
    currentPhase,
    pomodoroCount,
    pomodoroPartsCompleted,
    totalSecondsSpent,
    startTask,
    toggle,
    reset,
    skipPhase,
  } = useTimer();

  const task = tasks.find((t) => t.id === id);
  const [showSettings, setShowSettings] = useState(false);
  const [showAmbient, setShowAmbient] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [activeSound, setActiveSound] = useState<AmbientKey | null>(null);
  const [soundLoading, setSoundLoading] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refs to capture latest values for cleanup (fixes stale closure bug)
  const latestSecondsRef = useRef(0);
  const latestPartsRef = useRef(0);
  const taskIdRef = useRef(id);

  useEffect(() => { latestSecondsRef.current = totalSecondsSpent; }, [totalSecondsSpent]);
  useEffect(() => { latestPartsRef.current = pomodoroPartsCompleted; }, [pomodoroPartsCompleted]);

  // FIX: Initialize timer with saved seconds so time is preserved on re-open
  useEffect(() => {
    if (!task) return;
    if (activeTaskId !== task.id) {
      const savedRecord = getTodayRecord(task.id);
      const savedSeconds = savedRecord?.secondsSpent ?? 0;
      const savedParts = savedRecord?.pomodoroPartsCompleted ?? 0;
      startTask(task, savedSeconds, savedParts);
    }
  }, [task?.id]);

  // Periodic save every 5 seconds while running
  useEffect(() => {
    if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    if (!task) return;
    saveIntervalRef.current = setInterval(() => {
      if (latestSecondsRef.current > 0) {
        updateTodayTime(task.id, latestSecondsRef.current, latestPartsRef.current);
      }
    }, 5000);
    return () => {
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [task?.id]);

  // FIX: Cleanup on unmount saves latest values via refs (not stale closure)
  useEffect(() => {
    return () => {
      const seconds = latestSecondsRef.current;
      const parts = latestPartsRef.current;
      const tId = taskIdRef.current;
      if (tId && seconds > 0) {
        updateTodayTime(tId, seconds, parts);
      }
    };
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, []);

  const handleSoundSelect = useCallback(async (key: AmbientKey | null) => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setActiveSound(key);
    if (!key) return;
    setSoundLoading(true);
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: AMBIENT_SOUNDS[key].url },
        { isLooping: true, shouldPlay: true, volume: 0.7 }
      );
      soundRef.current = sound;
    } catch (e) {
      Alert.alert("Sound unavailable", "Could not load ambient sound. Check your connection.");
      setActiveSound(null);
    } finally {
      setSoundLoading(false);
    }
  }, []);

  if (!task) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Task not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: Colors.accent, marginTop: 12 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const todayRecord = getTodayRecord(task.id);
  const todaySeconds = todayRecord?.secondsSpent ?? 0;
  const allRecords = getRecordsForTask(task.id);
  const allTimeSeconds = allRecords.reduce((sum, r) => sum + r.secondsSpent, 0);
  const targetSeconds = task.targetMinutes * 60;

  // Use in-session seconds if running, otherwise use saved
  const displaySeconds = totalSecondsSpent > 0 ? totalSecondsSpent : todaySeconds;
  const todayProgress = targetSeconds > 0 ? Math.min(displaySeconds / targetSeconds, 1) : 0;
  const totalParts = task.usePomodoro ? Math.ceil(task.targetMinutes / task.pomodoroLength) : 1;
  const todayParts = todayRecord?.pomodoroPartsCompleted ?? 0;
  const timerProgress = phaseDuration > 0 ? timeRemaining / phaseDuration : 0;
  const phaseLabel = currentPhase === "focus" ? "Focus" : currentPhase === "shortBreak" ? "Short Break" : "Long Break";
  const phaseColor = currentPhase === "focus" ? task.color : currentPhase === "shortBreak" ? "#4A90E2" : "#9B59FF";
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={async () => {
            await updateTodayTime(task.id, latestSecondsRef.current, latestPartsRef.current);
            router.back();
          }}
        >
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{task.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <WeekStrip taskId={task.id} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === "web" ? 100 : 80 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>{task.name}</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${todayProgress * 100}%`, backgroundColor: task.color }]} />
            <Text style={[styles.progressPct, { color: task.color }]}>{Math.round(todayProgress * 100)}%</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>Spent Today</Text>
              <Text style={styles.statBoxValue}>{formatSeconds(displaySeconds)}</Text>
            </View>
            <View style={styles.statBox}>
              {/* FIX: Show all-time total, not just target */}
              <Text style={styles.statBoxLabel}>Spent Total</Text>
              <Text style={styles.statBoxValue}>{formatSeconds(allTimeSeconds + (totalSecondsSpent - todaySeconds))}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>Parts Done</Text>
              <Text style={styles.statBoxValue}>
                {pomodoroPartsCompleted > 0 ? pomodoroPartsCompleted : todayParts}/{totalParts}
              </Text>
            </View>
          </View>
        </View>

        {/* Timer card */}
        <View style={styles.timerCard}>
          <View style={styles.timerTopBar}>
            <View style={[styles.pomoBadge, { borderColor: phaseColor }]}>
              <Text style={[styles.pomoBadgeText, { color: phaseColor }]}>{pomodoroCount}</Text>
            </View>
            <View style={styles.timerActions}>
              <TouchableOpacity style={styles.timerActionBtn} onPress={() => setShowFullscreen(true)}>
                <Feather name="maximize-2" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.timerActionBtn} onPress={() => setShowAmbient(true)}>
                <Feather name="music" size={18} color={activeSound ? task.color : Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.timerActionBtn} onPress={() => setShowSettings(true)}>
                <Feather name="settings" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.timerArcContainer}>
            <TimerArc progress={timerProgress} color={phaseColor} size={240} />
            <View style={styles.timerCenter}>
              <Text style={[styles.timerPhaseLabel, { color: phaseColor }]}>
                {isRunning ? phaseLabel : "paused"}
              </Text>
              <Text style={styles.timerDisplay}>{formatTime(timeRemaining)}</Text>
              <Text style={styles.timerElapsed}>{formatTime(displaySeconds)}</Text>
            </View>
          </View>

          <View style={styles.timerControls}>
            <TouchableOpacity style={styles.controlBtn} onPress={() => { reset(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
              <Feather name="rotate-ccw" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.playPauseBtn, { borderColor: phaseColor }]}
              onPress={() => { toggle(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            >
              <Feather name={isRunning ? "pause" : "play"} size={28} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} onPress={() => { skipPhase(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
              <Feather name="skip-forward" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
            <View style={[styles.dotIndicator, { backgroundColor: phaseColor }]} />
          </View>
        </View>

        {/* Phase chips */}
        <View style={styles.phaseInfoRow}>
          {(["focus", "shortBreak", "longBreak"] as const).map((phase, i) => {
            const labels = ["Focus", "Short Break", "Long Break"];
            const phaseColors = [task.color, "#4A90E2", "#9B59FF"];
            const isActive = phase === currentPhase;
            return (
              <View key={phase} style={[styles.phaseChip, isActive && { borderColor: phaseColors[i] }]}>
                <View style={[styles.phaseChipDot, { backgroundColor: phaseColors[i] }]} />
                <Text style={[styles.phaseChipText, isActive && { color: phaseColors[i] }]}>{labels[i]}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <SettingsSheet visible={showSettings} onClose={() => setShowSettings(false)} taskId={task.id} />
      <AmbientSheet
        visible={showAmbient}
        onClose={() => setShowAmbient(false)}
        activeSound={activeSound}
        onSelect={handleSoundSelect}
        isLoading={soundLoading}
      />
      <FullscreenTimer
        visible={showFullscreen}
        onClose={() => setShowFullscreen(false)}
        color={phaseColor}
        taskName={task.name}
        activeSound={activeSound}
        onSoundPress={() => {
          setShowFullscreen(false);
          setTimeout(() => setShowAmbient(true), 300);
        }}
      />
    </View>
  );
}

const flipStyles = StyleSheet.create({
  clock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  tile: {
    width: 62,
    height: 82,
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  tileText: {
    fontSize: 48,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    lineHeight: 56,
  },
  tileLine: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: "#000",
    opacity: 0.5,
  },
  separator: {
    gap: 8,
    alignItems: "center",
    paddingBottom: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    opacity: 0.9,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, fontSize: 17, color: Colors.accent, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  weekStrip: { paddingHorizontal: 12, marginBottom: 4, flexGrow: 0, flexShrink: 0, height: 72 },
  dayItem: { alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, marginRight: 4, borderRadius: 8, minWidth: 52, height: 64 },
  dayItemActive: { backgroundColor: Colors.card },
  dayLabel: { fontSize: 10, color: Colors.textMuted, fontFamily: "Inter_500Medium" },
  dayLabelActive: { color: Colors.accent },
  dayNum: { fontSize: 16, color: Colors.textSecondary, fontFamily: "Inter_700Bold" },
  dayNumActive: { color: Colors.text },
  dayTime: { fontSize: 10, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
  dayTimeActive: { color: Colors.textSecondary },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, gap: 14 },
  statsCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, gap: 12 },
  statsTitle: { fontSize: 15, color: Colors.text, fontFamily: "Inter_600SemiBold" },
  progressBarBg: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: "hidden", position: "relative" },
  progressBarFill: { height: "100%", borderRadius: 4, position: "absolute", left: 0, top: 0 },
  progressPct: { position: "absolute", right: 0, top: -14, fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  statBox: { flex: 1, backgroundColor: Colors.background, borderRadius: 10, padding: 10 },
  statBoxLabel: { fontSize: 10, color: Colors.textMuted, fontFamily: "Inter_400Regular", marginBottom: 4 },
  statBoxValue: { fontSize: 15, color: Colors.text, fontFamily: "Inter_700Bold" },
  timerCard: { backgroundColor: Colors.card, borderRadius: 20, padding: 16 },
  timerTopBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  pomoBadge: { width: 32, height: 32, borderRadius: 8, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  pomoBadgeText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  timerActions: { flexDirection: "row", gap: 4 },
  timerActionBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: Colors.background },
  timerArcContainer: { alignItems: "center", justifyContent: "center", position: "relative", marginVertical: 8 },
  timerCenter: { position: "absolute", alignItems: "center" },
  timerPhaseLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 4 },
  timerDisplay: { fontSize: 40, color: Colors.text, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  timerElapsed: { fontSize: 13, color: Colors.textSecondary, fontFamily: "Inter_400Regular", marginTop: 4 },
  timerControls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 8 },
  controlBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: Colors.background },
  playPauseBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.text, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  dotIndicator: { width: 12, height: 12, borderRadius: 6, position: "absolute", right: 16 },
  phaseInfoRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  phaseChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.card, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  phaseChipDot: { width: 8, height: 8, borderRadius: 4 },
  phaseChipText: { fontSize: 12, color: Colors.textSecondary, fontFamily: "Inter_500Medium" },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, gap: 10 },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  sheetTitle: { fontSize: 18, color: Colors.text, fontFamily: "Inter_700Bold", marginBottom: 4 },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.background, borderRadius: 12, padding: 16 },
  settingLabel: { fontSize: 15, color: Colors.text, fontFamily: "Inter_500Medium" },
  fieldLabel: { fontSize: 13, color: Colors.textSecondary, fontFamily: "Inter_500Medium", marginTop: 4 },
  stepper: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.background, borderRadius: 12, padding: 4, gap: 8 },
  stepperBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.accent, alignItems: "center", justifyContent: "center" },
  stepperValue: { flex: 1, fontSize: 20, color: Colors.text, fontFamily: "Inter_700Bold", textAlign: "center" },
  sessionsSummary: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.background, borderRadius: 10, padding: 12 },
  sessionsSummaryText: { fontSize: 13, color: Colors.accent, fontFamily: "Inter_500Medium" },
  doneBtn: { backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  doneBtnText: { fontSize: 16, color: "#000", fontFamily: "Inter_700Bold" },
  soundGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "flex-start", paddingVertical: 8 },
  soundItem: { width: 76, alignItems: "center", gap: 6 },
  soundItemActive: {},
  soundIcon: { width: 64, height: 64, borderRadius: 16, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center" },
  soundIconActive: { backgroundColor: Colors.accent },
  soundLabel: { fontSize: 12, color: Colors.textSecondary, fontFamily: "Inter_500Medium", textAlign: "center" },
  soundLabelActive: { color: Colors.accent },
  // Fullscreen
  fullscreenBg: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  fullscreenTopBar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 },
  fullscreenTopBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  fullscreenTaskName: { flex: 1, textAlign: "center", fontSize: 14, fontFamily: "Inter_500Medium" },
  fullscreenContent: { alignItems: "center", gap: 20 },
  fullscreenPhase: { fontSize: 13, fontFamily: "Inter_500Medium", letterSpacing: 3, textTransform: "uppercase" },
  fullscreenStatus: { fontSize: 14, color: "#444", fontFamily: "Inter_400Regular", letterSpacing: 1 },
  fullscreenControls: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center", gap: 20, paddingHorizontal: 40 },
  brightnessRow: { flexDirection: "row", alignItems: "center", gap: 8, width: "100%" },
  brightnessBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  brightnessBar: { flex: 1, height: 4, backgroundColor: "#222", borderRadius: 2, overflow: "hidden" },
  brightnessFill: { height: "100%", borderRadius: 2 },
  fullscreenButtonRow: { flexDirection: "row", alignItems: "center", gap: 24 },
  fullscreenSkipBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: "#333", alignItems: "center", justifyContent: "center" },
  fullscreenPlayBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  notFound: { flex: 1, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center" },
  notFoundText: { fontSize: 16, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },
});
