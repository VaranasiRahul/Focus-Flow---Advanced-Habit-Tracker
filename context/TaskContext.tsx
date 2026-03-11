import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Refresh Android widget after data changes (safe no-op if widget not installed)
async function tryRefreshWidget() {
  if (Platform.OS !== "android") return;
  try {
    const { refreshWidget } = require("@/widgets/widgetRegistry");
    await refreshWidget();
  } catch (_e) {}
}

export interface Task {
  id: string;
  name: string;
  targetMinutes: number;
  isDaily: boolean;
  notificationTime: string;
  color: string;
  createdAt: string;
  usePomodoro: boolean;
  pomodoroLength: number;
  shortBreakLength: number;
  longBreakLength: number;
  reminderAlarm: boolean;
}

export interface DailyRecord {
  taskId: string;
  date: string;
  secondsSpent: number;
  pomodoroPartsCompleted: number;
}

interface TaskContextType {
  tasks: Task[];
  dailyRecords: DailyRecord[];
  isLoading: boolean;
  addTask: (task: Omit<Task, "id" | "createdAt">) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  getTodayRecord: (taskId: string) => DailyRecord | null;
  updateTodayTime: (taskId: string, secondsSpent: number, pomodoroPartsCompleted: number) => Promise<void>;
  getStreak: (taskId: string) => number;
  getTodayTasks: () => Task[];
  getRecordsForTask: (taskId: string) => DailyRecord[];
}

const TaskContext = createContext<TaskContextType | null>(null);

const TASKS_KEY = "@focustrack_tasks_v2";
const RECORDS_KEY = "@focustrack_records_v2";

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [tasksJson, recordsJson] = await Promise.all([
        AsyncStorage.getItem(TASKS_KEY),
        AsyncStorage.getItem(RECORDS_KEY),
      ]);
      if (tasksJson) setTasks(JSON.parse(tasksJson));
      if (recordsJson) setDailyRecords(JSON.parse(recordsJson));
    } catch (e) {
      console.error("Error loading data:", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveTasks(updated: Task[]) {
    setTasks(updated);
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(updated));
    tryRefreshWidget();
  }

  async function saveRecords(updated: DailyRecord[]) {
    setDailyRecords(updated);
    await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(updated));
    tryRefreshWidget();
  }

  const addTask = useCallback(async (taskData: Omit<Task, "id" | "createdAt">) => {
    const newTask: Task = {
      ...taskData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };
    await saveTasks([...tasks, newTask]);
  }, [tasks]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, ...updates } : t));
    await saveTasks(updated);
  }, [tasks]);

  const deleteTask = useCallback(async (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    await saveTasks(updated);
    const updatedRecords = dailyRecords.filter((r) => r.taskId !== id);
    await saveRecords(updatedRecords);
  }, [tasks, dailyRecords]);

  const getTodayRecord = useCallback((taskId: string): DailyRecord | null => {
    const today = getTodayString();
    return dailyRecords.find((r) => r.taskId === taskId && r.date === today) ?? null;
  }, [dailyRecords]);

  const updateTodayTime = useCallback(async (
    taskId: string,
    secondsSpent: number,
    pomodoroPartsCompleted: number
  ) => {
    const today = getTodayString();
    const existing = dailyRecords.find((r) => r.taskId === taskId && r.date === today);
    let updated: DailyRecord[];
    if (existing) {
      updated = dailyRecords.map((r) =>
        r.taskId === taskId && r.date === today
          ? { ...r, secondsSpent, pomodoroPartsCompleted }
          : r
      );
    } else {
      updated = [
        ...dailyRecords,
        { taskId, date: today, secondsSpent, pomodoroPartsCompleted },
      ];
    }
    await saveRecords(updated);
  }, [dailyRecords]);

  const getStreak = useCallback((taskId: string): number => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return 0;
    const targetSeconds = task.targetMinutes * 60;
    const taskRecords = dailyRecords
      .filter((r) => r.taskId === taskId && r.secondsSpent >= targetSeconds)
      .map((r) => r.date)
      .sort()
      .reverse();

    if (taskRecords.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    let checkDate = new Date(today);

    for (let i = 0; i < 365; i++) {
      const dateStr = getDateString(checkDate);
      if (taskRecords.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (i === 0) {
          checkDate.setDate(checkDate.getDate() - 1);
          const yesterdayStr = getDateString(checkDate);
          if (!taskRecords.includes(yesterdayStr)) break;
        } else {
          break;
        }
      }
    }
    return streak;
  }, [tasks, dailyRecords]);

  const getTodayTasks = useCallback((): Task[] => {
    const today = getTodayString();
    return tasks.filter((t) => {
      if (t.isDaily) return true;
      const taskDate = t.createdAt.split("T")[0];
      return taskDate === today;
    });
  }, [tasks]);

  const getRecordsForTask = useCallback((taskId: string): DailyRecord[] => {
    return dailyRecords.filter((r) => r.taskId === taskId);
  }, [dailyRecords]);

  return (
    <TaskContext.Provider
      value={{
        tasks,
        dailyRecords,
        isLoading,
        addTask,
        updateTask,
        deleteTask,
        getTodayRecord,
        updateTodayTime,
        getStreak,
        getTodayTasks,
        getRecordsForTask,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTaskContext must be used within TaskProvider");
  return ctx;
}
