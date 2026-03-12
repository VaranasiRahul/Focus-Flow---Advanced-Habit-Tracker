import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal,
  Switch, Platform, Animated, Easing, Alert, useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Svg, { Path, Circle } from "react-native-svg";
import { Audio } from "expo-av";
import * as KeepAwake from "expo-keep-awake";
import * as Brightness from "expo-brightness";
import { useTheme } from "@/context/ThemeContext";
import { useTaskContext } from "@/context/TaskContext";
import { useTimer } from "@/context/TimerContext";

type AmbientKey = "rain" | "thunder" | "train" | "fire";

// FIX #3: Multiple fallback URLs for each sound + proper loop config
const AMBIENT_SOUNDS: Record<AmbientKey, { label: string; icon: string; urls: string[] }> = {
  rain: {
    label: "Rain", icon: "cloud-rain",
    urls: [
      "https://cdn.pixabay.com/audio/2022/08/23/audio_d16737843a.mp3",
      "https://www.soundjay.com/nature/rain-01.mp3",
      "https://assets.mixkit.co/active_storage/sfx/1247/1247-preview.mp3",
    ],
  },
  thunder: {
    label: "Thunder", icon: "cloud-lightning",
    urls: [
      "https://cdn.pixabay.com/audio/2022/03/10/audio_4ef3f8ede1.mp3",
      "https://www.soundjay.com/nature/thunder-1.mp3",
      "https://assets.mixkit.co/active_storage/sfx/1303/1303-preview.mp3",
    ],
  },
  train: {
    label: "Train", icon: "navigation",
    urls: [
      "https://cdn.pixabay.com/audio/2022/10/30/audio_945b0cd97e.mp3",
      "https://assets.mixkit.co/active_storage/sfx/1434/1434-preview.mp3",
    ],
  },
  fire: {
    label: "Fire", icon: "zap",
    urls: [
      "https://cdn.pixabay.com/audio/2022/11/22/audio_fbc1c23534.mp3",
      "https://assets.mixkit.co/active_storage/sfx/1223/1223-preview.mp3",
    ],
  },
};

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2,"0")}m`;
  return `0h ${String(m).padStart(2,"0")}m`;
}
function getDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function polarToCartesian(cx: number, cy: number, r: number, a: number) {
  const rad = ((a - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function arcPath(cx: number, cy: number, r: number, start: number, sweep: number): string {
  if (sweep <= 0) return "";
  if (sweep >= 359.99) sweep = 359.99;
  const s = polarToCartesian(cx, cy, r, start);
  const e = polarToCartesian(cx, cy, r, start + sweep);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${sweep > 180 ? "1" : "0"} 1 ${e.x} ${e.y}`;
}

function TimerArc({ progress, color, size = 240 }: { progress: number; color: string; size?: number }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 18;
  const totalSweep = 270, sweepAngle = Math.max(totalSweep * Math.min(progress, 1), 0);
  const bgPath = arcPath(cx, cy, r, 135, totalSweep);
  const fgPath = sweepAngle > 0 ? arcPath(cx, cy, r, 135, sweepAngle) : "";
  const dotPos = polarToCartesian(cx, cy, r, 135 + sweepAngle);
  return (
    <Svg width={size} height={size}>
      {bgPath ? <Path d={bgPath} stroke="#2A2A2A" strokeWidth={10} fill="none" strokeLinecap="round" /> : null}
      {fgPath ? <Path d={fgPath} stroke={color} strokeWidth={10} fill="none" strokeLinecap="round" /> : null}
      {sweepAngle > 0 ? <Circle cx={dotPos.x} cy={dotPos.y} r={8} fill={color} /> : null}
    </Svg>
  );
}

// Flip clock for fullscreen
function FlipDigit({ digit, color }: { digit: string; color: string }) {
  return (
    <View style={[flipStyles.tile, { borderColor: color + "33" }]}>
      <Text style={[flipStyles.tileText, { color }]}>{digit}</Text>
      <View style={flipStyles.tileLine} />
    </View>
  );
}
function FlipClock({ timeStr, color }: { timeStr: string; color: string }) {
  const parts = timeStr.split(":");
  const digits: string[] = [];
  parts.forEach((p) => { digits.push(p[0] ?? "0"); digits.push(p[1] ?? "0"); });
  const seps = parts.length === 3 ? [2, 5] : [2];
  return (
    <View style={flipStyles.clock}>
      {digits.map((d, i) => (
        <React.Fragment key={i}>
          {seps.includes(i) && (
            <View style={flipStyles.separator}>
              <View style={[flipStyles.dot, { backgroundColor: color }]} />
              <View style={[flipStyles.dot, { backgroundColor: color }]} />
            </View>
          )}
          <FlipDigit digit={d} color={color} />
        </React.Fragment>
      ))}
    </View>
  );
}

function WeekStrip({ taskId }: { taskId: string }) {
  const { colors } = useTheme();
  const { getRecordsForTask } = useTaskContext();
  const records = getRecordsForTask(taskId);
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const record = records.find((r) => r.date === getDateString(d));
    days.push({ label: d.toLocaleString("default", { month: "short" }), day: d.getDate(), time: record ? formatSeconds(record.secondsSpent) : "0:00", isToday: i === 0 });
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 12, marginBottom: 4, height: 72, flexGrow: 0, flexShrink: 0 }}>
      {days.map((d, i) => (
        <View key={i} style={[{ alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, marginRight: 4, borderRadius: 8, minWidth: 52, height: 64 }, d.isToday && { backgroundColor: colors.card }]}>
          <Text style={{ fontSize: 10, color: d.isToday ? colors.accent : colors.textMuted, fontFamily: "Inter_500Medium" }}>{d.label}</Text>
          <Text style={{ fontSize: 16, color: d.isToday ? colors.text : colors.textSecondary, fontFamily: "Inter_700Bold" }}>{d.day}</Text>
          <Text style={{ fontSize: 10, color: d.isToday ? colors.textSecondary : colors.textMuted, fontFamily: "Inter_400Regular" }}>{d.time}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function SettingsSheet({ visible, onClose, taskId }: { visible: boolean; onClose: () => void; taskId: string }) {
  const { colors } = useTheme();
  const { tasks, updateTask } = useTaskContext();
  const task = tasks.find((t) => t.id === taskId);
  const insets = useSafeAreaInsets();
  if (!task) return null;

  function adj(field: "pomodoroLength"|"shortBreakLength"|"longBreakLength"|"targetMinutes", delta: number) {
    if (!task) return;
    const ranges: Record<string, [number, number]> = { pomodoroLength: [5, 90], shortBreakLength: [1, 30], longBreakLength: [5, 60], targetMinutes: [5, 480] };
    const [mn, mx] = ranges[field];
    updateTask(taskId, { [field]: Math.min(Math.max((task[field] as number) + delta, mn), mx) });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const sessions = task.usePomodoro ? Math.ceil(task.targetMinutes / task.pomodoroLength) : 1;

  const S = makeSheetStyles(colors);
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={S.overlay}>
        <View style={[S.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={S.handle} />
          <Text style={S.title}>Task Settings</Text>
          <View style={S.row}><Text style={S.label}>Reminder Alarm</Text><Switch value={task.reminderAlarm} onValueChange={(v) => updateTask(taskId, { reminderAlarm: v })} trackColor={{ false: colors.border, true: colors.accent }} thumbColor={colors.text} /></View>
          <View style={S.row}><Text style={S.label}>Use Pomodoro</Text><Switch value={task.usePomodoro} onValueChange={(v) => updateTask(taskId, { usePomodoro: v })} trackColor={{ false: colors.border, true: colors.accent }} thumbColor={colors.text} /></View>
          <Text style={S.fieldLabel}>Daily Target</Text>
          <Stepper value={`${task.targetMinutes}m`} onMinus={() => adj("targetMinutes", -5)} onPlus={() => adj("targetMinutes", 5)} colors={colors} />
          {task.usePomodoro && (<>
            <Text style={S.fieldLabel}>Pomodoro Length</Text>
            <Stepper value={`${task.pomodoroLength}m`} onMinus={() => adj("pomodoroLength", -5)} onPlus={() => adj("pomodoroLength", 5)} colors={colors} />
            <Text style={S.fieldLabel}>Short Break</Text>
            <Stepper value={`${task.shortBreakLength}m`} onMinus={() => adj("shortBreakLength", -1)} onPlus={() => adj("shortBreakLength", 1)} colors={colors} />
            <Text style={S.fieldLabel}>Long Break</Text>
            <Stepper value={`${task.longBreakLength}m`} onMinus={() => adj("longBreakLength", -5)} onPlus={() => adj("longBreakLength", 5)} colors={colors} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.background, borderRadius: 10, padding: 10 }}>
              <Feather name="layers" size={13} color={colors.accent} />
              <Text style={{ fontSize: 12, color: colors.accent, fontFamily: "Inter_500Medium" }}>{sessions} focus session{sessions !== 1 ? "s" : ""} × {task.pomodoroLength}m</Text>
            </View>
          </>)}
          <TouchableOpacity style={[S.btn, { backgroundColor: colors.accent }]} onPress={onClose}><Text style={[S.btnText, { color: "#000" }]}>Done</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Stepper({ value, onMinus, onPlus, colors }: { value: string; onMinus: () => void; onPlus: () => void; colors: any }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.background, borderRadius: 12, padding: 4, gap: 8 }}>
      <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }} onPress={onMinus}><Feather name="minus" size={18} color="#000" /></TouchableOpacity>
      <Text style={{ flex: 1, fontSize: 20, color: colors.text, fontFamily: "Inter_700Bold", textAlign: "center" }}>{value}</Text>
      <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }} onPress={onPlus}><Feather name="plus" size={18} color="#000" /></TouchableOpacity>
    </View>
  );
}

function AmbientSheet({ visible, onClose, activeSound, onSelect, isLoading }: { visible: boolean; onClose: () => void; activeSound: AmbientKey | null; onSelect: (k: AmbientKey | null) => void; isLoading: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const S = makeSheetStyles(colors);
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={S.overlay}>
        <View style={[S.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={S.handle} />
          <Text style={S.title}>Ambient Sound</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingVertical: 8 }}>
            {([null, ...Object.keys(AMBIENT_SOUNDS)] as (AmbientKey | null)[]).map((key) => {
              const isActive = activeSound === key;
              const info = key ? AMBIENT_SOUNDS[key] : { label: "None", icon: "volume-x" };
              return (
                <TouchableOpacity key={String(key)} style={{ width: 76, alignItems: "center", gap: 6 }} onPress={() => { onSelect(key); onClose(); }}>
                  <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: isActive ? colors.accent : colors.background, alignItems: "center", justifyContent: "center", borderWidth: isActive ? 0 : 1, borderColor: colors.border }}>
                    {isLoading && isActive ? <Feather name="loader" size={24} color="#000" /> : <Feather name={info.icon as any} size={24} color={isActive ? "#000" : colors.textSecondary} />}
                  </View>
                  <Text style={{ fontSize: 12, color: isActive ? colors.accent : colors.textSecondary, fontFamily: "Inter_500Medium", textAlign: "center" }}>{info.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={[S.btn, { backgroundColor: colors.accent }]} onPress={onClose}><Text style={[S.btnText, { color: "#000" }]}>Close</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// FIX #2: Fullscreen landscape + AMOLED drift
function FullscreenTimer({ visible, onClose, color, taskName, activeSound, onSoundPress }: {
  visible: boolean; onClose: () => void; color: string; taskName: string; activeSound: AmbientKey | null; onSoundPress: () => void;
}) {
  const { isRunning, timeRemaining, phaseDuration, currentPhase, toggle, totalSecondsSpent, skipPhase } = useTimer();
  const insets = useSafeAreaInsets();
  // FIX: use useWindowDimensions so layout updates on orientation change
  const { width: W, height: H } = useWindowDimensions();
  const isLandscape = W > H;

  const driftX = useRef(new Animated.Value(0)).current;
  const driftY = useRef(new Animated.Value(0)).current;
  const [brightness, setBrightness] = useState(0.5);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!visible) return;
    KeepAwake.activateKeepAwakeAsync();
    // AMOLED drift animation — slow, continuous movement to prevent burn-in
    animRef.current = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(driftX, { toValue: 10, duration: 16000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(driftY, { toValue: 6, duration: 13000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(driftX, { toValue: -8, duration: 19000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(driftY, { toValue: -5, duration: 15000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(driftX, { toValue: 5, duration: 17000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(driftY, { toValue: 8, duration: 14000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(driftX, { toValue: 0, duration: 16000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(driftY, { toValue: 0, duration: 13000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    );
    animRef.current.start();
    return () => { animRef.current?.stop(); KeepAwake.deactivateKeepAwake(); };
  }, [visible]);

  async function setBright(delta: number) {
    const v = Math.min(Math.max(brightness + delta, 0.05), 1);
    setBrightness(v);
    if (Platform.OS !== "web") { try { await Brightness.setBrightnessAsync(v); } catch (_) {} }
  }

  const phaseLabel = currentPhase === "focus" ? "FOCUS" : currentPhase === "shortBreak" ? "SHORT BREAK" : "LONG BREAK";

  // FIX #2: Landscape vs portrait layout
  const topPad = (Platform.OS === "web" ? 40 : insets.top) + 8;
  const bottomPad = (Platform.OS === "web" ? 50 : insets.bottom) + 20;

  return (
    <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent supportedOrientations={["portrait", "landscape"]}>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        {/* Top bar */}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: topPad, zIndex: 10 }}>
          <TouchableOpacity style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }} onPress={onClose}>
            <Feather name="minimize-2" size={20} color="#555" />
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: "center", fontSize: 14, fontFamily: "Inter_500Medium", color: color + "CC" }} numberOfLines={1}>{taskName}</Text>
          <TouchableOpacity style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }} onPress={onSoundPress}>
            <Feather name="music" size={20} color={activeSound ? color : "#555"} />
          </TouchableOpacity>
        </View>

        {/* Center drifting content */}
        <Animated.View style={{ flex: 1, alignItems: "center", justifyContent: "center", transform: [{ translateX: driftX }, { translateY: driftY }] }}>
          {isLandscape ? (
            // LANDSCAPE: side-by-side layout
            <View style={{ flexDirection: "row", alignItems: "center", gap: 40 }}>
              <View style={{ alignItems: "center", gap: 12 }}>
                <Text style={{ fontSize: 12, color, fontFamily: "Inter_500Medium", letterSpacing: 3 }}>{phaseLabel}</Text>
                <FlipClock timeStr={formatTime(timeRemaining)} color={color} />
              </View>
              <View style={{ alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 13, color: "#555", fontFamily: "Inter_400Regular" }}>{isRunning ? "running" : "paused"}</Text>
                <Text style={{ fontSize: 16, color: "#333", fontFamily: "Inter_700Bold" }}>{formatSeconds(totalSecondsSpent)}</Text>
                <Text style={{ fontSize: 12, color: "#333", fontFamily: "Inter_400Regular" }}>elapsed today</Text>
              </View>
            </View>
          ) : (
            // PORTRAIT: stacked layout
            <View style={{ alignItems: "center", gap: 16 }}>
              <Text style={{ fontSize: 12, color, fontFamily: "Inter_500Medium", letterSpacing: 3 }}>{phaseLabel}</Text>
              <FlipClock timeStr={formatTime(timeRemaining)} color={color} />
              <Text style={{ fontSize: 14, color: "#444", fontFamily: "Inter_400Regular" }}>
                {isRunning ? "running" : "paused"} · {formatSeconds(totalSecondsSpent)} elapsed
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Bottom controls */}
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center", gap: 16, paddingHorizontal: 40, paddingBottom: bottomPad }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, width: "100%" }}>
            <Feather name="sun" size={13} color="#333" />
            <TouchableOpacity onPress={() => setBright(-0.15)} style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}><Feather name="minus" size={13} color="#555" /></TouchableOpacity>
            <View style={{ flex: 1, height: 4, backgroundColor: "#1A1A1A", borderRadius: 2, overflow: "hidden" }}>
              <View style={{ height: "100%", width: `${brightness * 100}%`, backgroundColor: color, borderRadius: 2 }} />
            </View>
            <TouchableOpacity onPress={() => setBright(0.15)} style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}><Feather name="plus" size={13} color="#555" /></TouchableOpacity>
            <Feather name="sun" size={18} color="#333" />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 24 }}>
            <TouchableOpacity style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: "#222", alignItems: "center", justifyContent: "center" }}
              onPress={() => { skipPhase(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
              <Feather name="skip-forward" size={22} color="#555" />
            </TouchableOpacity>
            {/* FIX #1: Play button uses accent color, not white */}
            <TouchableOpacity
              style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: color, alignItems: "center", justifyContent: "center", backgroundColor: color + "22" }}
              onPress={() => { toggle(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}>
              <Feather name={isRunning ? "pause" : "play"} size={32} color={color} />
            </TouchableOpacity>
            <View style={{ width: 52 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeSheetStyles(colors: any) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
    sheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, gap: 10 },
    handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
    title: { fontSize: 18, color: colors.text, fontFamily: "Inter_700Bold", marginBottom: 4 },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.background, borderRadius: 12, padding: 16 },
    label: { fontSize: 15, color: colors.text, fontFamily: "Inter_500Medium" },
    fieldLabel: { fontSize: 13, color: colors.textSecondary, fontFamily: "Inter_500Medium", marginTop: 4 },
    btn: { borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 8 },
    btnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  });
}

export default function TaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { tasks, getTodayRecord, updateTodayTime, getRecordsForTask } = useTaskContext();
  const { activeTaskId, isRunning, timeRemaining, phaseDuration, currentPhase, pomodoroCount, pomodoroPartsCompleted, totalSecondsSpent, startTask, toggle, reset, skipPhase } = useTimer();

  const task = tasks.find((t) => t.id === id);
  const [showSettings, setShowSettings] = useState(false);
  const [showAmbient, setShowAmbient] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [activeSound, setActiveSound] = useState<AmbientKey | null>(null);
  const [soundLoading, setSoundLoading] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestSecondsRef = useRef(0);
  const latestPartsRef = useRef(0);

  useEffect(() => { latestSecondsRef.current = totalSecondsSpent; }, [totalSecondsSpent]);
  useEffect(() => { latestPartsRef.current = pomodoroPartsCompleted; }, [pomodoroPartsCompleted]);

  useEffect(() => {
    if (!task) return;
    if (activeTaskId !== task.id) {
      const rec = getTodayRecord(task.id);
      startTask(task, rec?.secondsSpent ?? 0, rec?.pomodoroPartsCompleted ?? 0);
    }
  }, [task?.id]);

  useEffect(() => {
    if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    if (!task) return;
    saveIntervalRef.current = setInterval(() => {
      if (latestSecondsRef.current > 0) updateTodayTime(task.id, latestSecondsRef.current, latestPartsRef.current);
    }, 5000);
    return () => { if (saveIntervalRef.current) clearInterval(saveIntervalRef.current); };
  }, [task?.id]);

  useEffect(() => {
    const tid = id;
    return () => {
      if (tid && latestSecondsRef.current > 0) updateTodayTime(tid, latestSecondsRef.current, latestPartsRef.current);
    };
  }, []);

  useEffect(() => {
    return () => { soundRef.current?.unloadAsync(); soundRef.current = null; };
  }, []);

  // FIX #3: Try multiple URLs, ensure looping, configure audio mode properly
  const handleSoundSelect = useCallback(async (key: AmbientKey | null) => {
    if (soundRef.current) { await soundRef.current.unloadAsync(); soundRef.current = null; }
    setActiveSound(key);
    if (!key) return;
    setSoundLoading(true);
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
      });
      const urls = AMBIENT_SOUNDS[key].urls;
      let loaded = false;
      for (const url of urls) {
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: url },
            { isLooping: true, shouldPlay: true, volume: 0.75, progressUpdateIntervalMillis: 500 }
          );
          soundRef.current = sound;
          loaded = true;
          break;
        } catch (e) { continue; }
      }
      if (!loaded) throw new Error("All URLs failed");
    } catch (e) {
      Alert.alert("Sound unavailable", "Could not load ambient sound. Check your connection.");
      setActiveSound(null);
    } finally { setSoundLoading(false); }
  }, []);

  if (!task) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: colors.textSecondary, fontSize: 16, fontFamily: "Inter_400Regular" }}>Task not found.</Text>
      <TouchableOpacity onPress={() => router.back()}><Text style={{ color: colors.accent, marginTop: 12 }}>Go Back</Text></TouchableOpacity>
    </View>
  );

  const todayRecord = getTodayRecord(task.id);
  const todaySeconds = todayRecord?.secondsSpent ?? 0;
  const allRecords = getRecordsForTask(task.id);
  const allTimeSeconds = allRecords.reduce((s, r) => s + r.secondsSpent, 0);
  const targetSeconds = task.targetMinutes * 60;
  const displaySeconds = totalSecondsSpent > 0 ? totalSecondsSpent : todaySeconds;
  const todayProgress = targetSeconds > 0 ? Math.min(displaySeconds / targetSeconds, 1) : 0;
  const totalParts = task.usePomodoro ? Math.ceil(task.targetMinutes / task.pomodoroLength) : 1;
  const todayParts = todayRecord?.pomodoroPartsCompleted ?? 0;
  const timerProgress = phaseDuration > 0 ? timeRemaining / phaseDuration : 0;
  const phaseLabel = currentPhase === "focus" ? "Focus" : currentPhase === "shortBreak" ? "Short Break" : "Long Break";
  const phaseColor = currentPhase === "focus" ? task.color : currentPhase === "shortBreak" ? "#4A90E2" : "#9B59FF";
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: topPad }}>
      {/* Top bar */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 }}>
        <TouchableOpacity style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
          onPress={async () => { await updateTodayTime(task.id, latestSecondsRef.current, latestPartsRef.current); router.back(); }}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, color: colors.accent, fontFamily: "Inter_600SemiBold", textAlign: "center" }} numberOfLines={1}>{task.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <WeekStrip taskId={task.id} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 14, paddingBottom: Platform.OS === "android" ? 20 : 80 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {/* Stats card */}
        <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 15, color: colors.text, fontFamily: "Inter_600SemiBold" }}>{task.name}</Text>
          <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: "hidden", position: "relative" }}>
            <View style={{ height: "100%", width: `${todayProgress * 100}%`, backgroundColor: task.color, borderRadius: 4, position: "absolute", left: 0, top: 0 }} />
            <Text style={{ position: "absolute", right: 0, top: -14, fontSize: 11, fontFamily: "Inter_600SemiBold", color: task.color }}>{Math.round(todayProgress * 100)}%</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            {[["Spent Today", formatSeconds(displaySeconds)], ["Spent Total", formatSeconds(allTimeSeconds)], ["Parts Done", `${pomodoroPartsCompleted > 0 ? pomodoroPartsCompleted : todayParts}/${totalParts}`]].map(([l, v]) => (
              <View key={l} style={{ flex: 1, backgroundColor: colors.background, borderRadius: 10, padding: 10 }}>
                <Text style={{ fontSize: 10, color: colors.textMuted, fontFamily: "Inter_400Regular", marginBottom: 4 }}>{l}</Text>
                <Text style={{ fontSize: 15, color: colors.text, fontFamily: "Inter_700Bold" }}>{v}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Timer card */}
        <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, borderWidth: 2, borderColor: phaseColor, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: phaseColor }}>{pomodoroCount}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 4 }}>
              {[{ icon: "maximize-2", onPress: () => setShowFullscreen(true), active: false },
                { icon: "music", onPress: () => setShowAmbient(true), active: !!activeSound },
                { icon: "settings", onPress: () => setShowSettings(true), active: false }].map((btn) => (
                <TouchableOpacity key={btn.icon} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: colors.background }} onPress={btn.onPress}>
                  <Feather name={btn.icon as any} size={18} color={btn.active ? task.color : colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ alignItems: "center", justifyContent: "center", position: "relative", marginVertical: 8 }}>
            <TimerArc progress={timerProgress} color={phaseColor} size={240} />
            <View style={{ position: "absolute", alignItems: "center" }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: phaseColor, marginBottom: 4 }}>{isRunning ? phaseLabel : "paused"}</Text>
              <Text style={{ fontSize: 40, color: colors.text, fontFamily: "Inter_700Bold", letterSpacing: 2 }}>{formatTime(timeRemaining)}</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: "Inter_400Regular", marginTop: 4 }}>{formatTime(displaySeconds)}</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 8 }}>
            <TouchableOpacity style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: colors.background }}
              onPress={() => { reset(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
              <Feather name="rotate-ccw" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            {/* FIX #1: Play button uses phaseColor tint, not solid white */}
            <TouchableOpacity
              style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: phaseColor + "22", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: phaseColor }}
              onPress={() => { toggle(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}>
              <Feather name={isRunning ? "pause" : "play"} size={28} color={phaseColor} />
            </TouchableOpacity>
            <TouchableOpacity style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: colors.background }}
              onPress={() => { skipPhase(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
              <Feather name="skip-forward" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: phaseColor, position: "absolute", right: 16 }} />
          </View>
        </View>

        {/* Phase chips */}
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {(["focus","shortBreak","longBreak"] as const).map((phase, i) => {
            const labels = ["Focus","Short Break","Long Break"];
            const pColors = [task.color,"#4A90E2","#9B59FF"];
            const isActive = phase === currentPhase;
            return (
              <View key={phase} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: isActive ? pColors[i] : colors.border }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: pColors[i] }} />
                <Text style={{ fontSize: 12, color: isActive ? pColors[i] : colors.textSecondary, fontFamily: "Inter_500Medium" }}>{labels[i]}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <SettingsSheet visible={showSettings} onClose={() => setShowSettings(false)} taskId={task.id} />
      <AmbientSheet visible={showAmbient} onClose={() => setShowAmbient(false)} activeSound={activeSound} onSelect={handleSoundSelect} isLoading={soundLoading} />
      <FullscreenTimer visible={showFullscreen} onClose={() => setShowFullscreen(false)} color={phaseColor} taskName={task.name} activeSound={activeSound}
        onSoundPress={() => { setShowFullscreen(false); setTimeout(() => setShowAmbient(true), 300); }} />
    </View>
  );
}

const flipStyles = StyleSheet.create({
  clock: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#0D0D0D", borderRadius: 12, padding: 10 },
  tile: { width: 58, height: 78, backgroundColor: "#1A1A1A", borderRadius: 8, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1 },
  tileText: { fontSize: 44, fontFamily: "Inter_700Bold", lineHeight: 52 },
  tileLine: { position: "absolute", top: "50%", left: 0, right: 0, height: 1.5, backgroundColor: "#000", opacity: 0.6 },
  separator: { gap: 8, alignItems: "center", paddingBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, opacity: 0.9 },
});
