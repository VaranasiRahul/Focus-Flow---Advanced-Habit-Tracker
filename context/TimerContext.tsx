import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { Task } from "./TaskContext";

export type TimerPhase = "focus" | "shortBreak" | "longBreak";

interface TimerContextType {
  activeTaskId: string | null;
  activeTask: Task | null;
  isRunning: boolean;
  timeRemaining: number;
  phaseDuration: number;
  currentPhase: TimerPhase;
  pomodoroCount: number;
  totalSecondsSpent: number;
  pomodoroPartsCompleted: number;
  startTask: (task: Task, initialSeconds?: number, initialParts?: number) => void;
  toggle: () => void;
  reset: () => void;
  skipPhase: () => void;
  stopTask: () => void;
}

const TimerContext = createContext<TimerContextType | null>(null);

function getPhaseDuration(task: Task, phase: TimerPhase): number {
  if (!task.usePomodoro) return task.targetMinutes * 60;
  if (phase === "focus") return task.pomodoroLength * 60;
  if (phase === "shortBreak") return task.shortBreakLength * 60;
  return task.longBreakLength * 60;
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [phaseDuration, setPhaseDuration] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<TimerPhase>("focus");
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [totalSecondsSpent, setTotalSecondsSpent] = useState(0);
  const [pomodoroPartsCompleted, setPomodoroPartsCompleted] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalSecondsRef = useRef(0);
  const pomodoroPartsRef = useRef(0);
  const pomodoroCountRef = useRef(0);
  const activeTaskRef = useRef<Task | null>(null);
  const currentPhaseRef = useRef<TimerPhase>("focus");

  useEffect(() => { totalSecondsRef.current = totalSecondsSpent; }, [totalSecondsSpent]);
  useEffect(() => { pomodoroPartsRef.current = pomodoroPartsCompleted; }, [pomodoroPartsCompleted]);
  useEffect(() => { pomodoroCountRef.current = pomodoroCount; }, [pomodoroCount]);
  useEffect(() => { activeTaskRef.current = activeTask; }, [activeTask]);
  useEffect(() => { currentPhaseRef.current = currentPhase; }, [currentPhase]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  function handlePhaseComplete() {
    const task = activeTaskRef.current;
    if (!task) return;
    const phase = currentPhaseRef.current;
    const count = pomodoroCountRef.current;

    if (phase === "focus") {
      const newParts = pomodoroPartsRef.current + 1;
      pomodoroPartsRef.current = newParts;
      setPomodoroPartsCompleted(newParts);
      const newCount = count + 1;
      pomodoroCountRef.current = newCount;
      setPomodoroCount(newCount);
      const nextPhase: TimerPhase = newCount % 4 === 0 ? "longBreak" : "shortBreak";
      currentPhaseRef.current = nextPhase;
      setCurrentPhase(nextPhase);
      const duration = getPhaseDuration(task, nextPhase);
      setTimeRemaining(duration);
      setPhaseDuration(duration);
    } else {
      currentPhaseRef.current = "focus";
      setCurrentPhase("focus");
      const duration = getPhaseDuration(task, "focus");
      setTimeRemaining(duration);
      setPhaseDuration(duration);
    }
  }

  // FIX: startTask now accepts initialSeconds so saved time is preserved on re-open
  const startTask = useCallback((task: Task, initialSeconds: number = 0, initialParts: number = 0) => {
    clearTimer();
    const duration = getPhaseDuration(task, "focus");
    setActiveTask(task);
    activeTaskRef.current = task;
    setIsRunning(false);
    setTimeRemaining(duration);
    setPhaseDuration(duration);
    setCurrentPhase("focus");
    currentPhaseRef.current = "focus";
    setPomodoroCount(0);
    pomodoroCountRef.current = 0;
    setTotalSecondsSpent(initialSeconds);
    totalSecondsRef.current = initialSeconds;
    setPomodoroPartsCompleted(initialParts);
    pomodoroPartsRef.current = initialParts;
  }, [clearTimer]);

  const stopTask = useCallback(() => {
    clearTimer();
    setActiveTask(null);
    activeTaskRef.current = null;
    setIsRunning(false);
    setTimeRemaining(0);
    setPhaseDuration(0);
    setCurrentPhase("focus");
    currentPhaseRef.current = "focus";
    setPomodoroCount(0);
    pomodoroCountRef.current = 0;
    setTotalSecondsSpent(0);
    totalSecondsRef.current = 0;
    setPomodoroPartsCompleted(0);
    pomodoroPartsRef.current = 0;
  }, [clearTimer]);

  useEffect(() => {
    if (isRunning && activeTask) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            clearTimer();
            setTimeout(handlePhaseComplete, 0);
            return 0;
          }
          return prev - 1;
        });
        if (currentPhaseRef.current === "focus") {
          setTotalSecondsSpent((s) => {
            const next = s + 1;
            totalSecondsRef.current = next;
            return next;
          });
        }
      }, 1000);
    } else {
      clearTimer();
    }
    return () => clearTimer();
  }, [isRunning, activeTask]);

  const toggle = useCallback(() => { setIsRunning((r) => !r); }, []);

  const reset = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    const task = activeTaskRef.current;
    if (task) {
      const duration = getPhaseDuration(task, "focus");
      setTimeRemaining(duration);
      setPhaseDuration(duration);
      currentPhaseRef.current = "focus";
      setCurrentPhase("focus");
      setPomodoroCount(0);
      pomodoroCountRef.current = 0;
    }
  }, [clearTimer]);

  const skipPhase = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    const task = activeTaskRef.current;
    if (!task) return;
    const phase = currentPhaseRef.current;
    const count = pomodoroCountRef.current;
    if (phase === "focus") {
      const newParts = pomodoroPartsRef.current + 1;
      pomodoroPartsRef.current = newParts;
      setPomodoroPartsCompleted(newParts);
      const newCount = count + 1;
      pomodoroCountRef.current = newCount;
      setPomodoroCount(newCount);
      const nextPhase: TimerPhase = newCount % 4 === 0 ? "longBreak" : "shortBreak";
      currentPhaseRef.current = nextPhase;
      setCurrentPhase(nextPhase);
      const duration = getPhaseDuration(task, nextPhase);
      setTimeRemaining(duration);
      setPhaseDuration(duration);
    } else {
      currentPhaseRef.current = "focus";
      setCurrentPhase("focus");
      const duration = getPhaseDuration(task, "focus");
      setTimeRemaining(duration);
      setPhaseDuration(duration);
    }
  }, [clearTimer]);

  return (
    <TimerContext.Provider
      value={{
        activeTaskId: activeTask?.id ?? null,
        activeTask,
        isRunning,
        timeRemaining,
        phaseDuration,
        currentPhase,
        pomodoroCount,
        totalSecondsSpent,
        pomodoroPartsCompleted,
        startTask,
        toggle,
        reset,
        skipPhase,
        stopTask,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used within TimerProvider");
  return ctx;
}
