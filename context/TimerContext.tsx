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
  startTask: (task: Task) => void;
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

  useEffect(() => {
    totalSecondsRef.current = totalSecondsSpent;
  }, [totalSecondsSpent]);

  useEffect(() => {
    pomodoroPartsRef.current = pomodoroPartsCompleted;
  }, [pomodoroPartsCompleted]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTask = useCallback((task: Task) => {
    clearTimer();
    const duration = getPhaseDuration(task, "focus");
    setActiveTask(task);
    setIsRunning(false);
    setTimeRemaining(duration);
    setPhaseDuration(duration);
    setCurrentPhase("focus");
    setPomodoroCount(0);
    setTotalSecondsSpent(0);
    setPomodoroPartsCompleted(0);
    totalSecondsRef.current = 0;
    pomodoroPartsRef.current = 0;
  }, [clearTimer]);

  const stopTask = useCallback(() => {
    clearTimer();
    setActiveTask(null);
    setIsRunning(false);
    setTimeRemaining(0);
    setPhaseDuration(0);
    setCurrentPhase("focus");
    setPomodoroCount(0);
    setTotalSecondsSpent(0);
    setPomodoroPartsCompleted(0);
    totalSecondsRef.current = 0;
    pomodoroPartsRef.current = 0;
  }, [clearTimer]);

  useEffect(() => {
    if (isRunning && activeTask) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            clearTimer();
            handlePhaseComplete();
            return 0;
          }
          return prev - 1;
        });

        setCurrentPhase((phase) => {
          if (phase === "focus") {
            setTotalSecondsSpent((s) => {
              const next = s + 1;
              totalSecondsRef.current = next;
              return next;
            });
          }
          return phase;
        });
      }, 1000);
    } else {
      clearTimer();
    }

    return () => clearTimer();
  }, [isRunning, activeTask]);

  function handlePhaseComplete() {
    if (!activeTask) return;

    setCurrentPhase((phase) => {
      setPomodoroCount((count) => {
        if (phase === "focus") {
          const newParts = pomodoroPartsRef.current + 1;
          pomodoroPartsRef.current = newParts;
          setPomodoroPartsCompleted(newParts);

          const newCount = count + 1;
          const nextPhase = newCount % 4 === 0 ? "longBreak" : "shortBreak";
          const duration = getPhaseDuration(activeTask, nextPhase);
          setTimeRemaining(duration);
          setPhaseDuration(duration);
          return newCount;
        } else {
          const duration = getPhaseDuration(activeTask, "focus");
          setTimeRemaining(duration);
          setPhaseDuration(duration);
          return count;
        }
      });

      if (phase === "focus") {
        const newCount = pomodoroCount + 1;
        return newCount % 4 === 0 ? "longBreak" : "shortBreak";
      }
      return "focus";
    });
  }

  const toggle = useCallback(() => {
    setIsRunning((r) => !r);
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    if (activeTask) {
      const duration = getPhaseDuration(activeTask, "focus");
      setTimeRemaining(duration);
      setPhaseDuration(duration);
      setCurrentPhase("focus");
      setPomodoroCount(0);
      setTotalSecondsSpent(0);
      setPomodoroPartsCompleted(0);
      totalSecondsRef.current = 0;
      pomodoroPartsRef.current = 0;
    }
  }, [activeTask, clearTimer]);

  const skipPhase = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    if (!activeTask) return;

    setCurrentPhase((phase) => {
      setPomodoroCount((count) => {
        if (phase === "focus") {
          const newParts = pomodoroPartsRef.current + 1;
          pomodoroPartsRef.current = newParts;
          setPomodoroPartsCompleted(newParts);

          const newCount = count + 1;
          const nextPhase = newCount % 4 === 0 ? "longBreak" : "shortBreak";
          const duration = getPhaseDuration(activeTask, nextPhase);
          setTimeRemaining(duration);
          setPhaseDuration(duration);
          return newCount;
        } else {
          const duration = getPhaseDuration(activeTask, "focus");
          setTimeRemaining(duration);
          setPhaseDuration(duration);
          return count;
        }
      });

      if (phase === "focus") {
        const newCount = pomodoroCount + 1;
        return newCount % 4 === 0 ? "longBreak" : "shortBreak";
      }
      return "focus";
    });
  }, [activeTask, clearTimer, pomodoroCount]);

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
