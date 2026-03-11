/**
 * Widget Task Handler
 *
 * This runs as a headless React Native task (background, no UI).
 * It reads data from AsyncStorage and updates the Android widget.
 *
 * Triggered by:
 *  - Android system when widget is first added
 *  - Android system on a schedule (every 30 min via widgetInfo)
 *  - Manual refresh from within the app (call requestWidgetUpdate)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { WidgetTaskHandlerProps } from "react-native-android-widget";
import React from "react";
import { renderReactNativeAndroidWidget } from "react-native-android-widget";
import { FocusFlowWidget } from "./FocusFlowWidget";

const TASKS_KEY = "@focustrack_tasks_v2";
const RECORDS_KEY = "@focustrack_records_v2";

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

async function loadWidgetData() {
  try {
    const [tasksJson, recordsJson] = await Promise.all([
      AsyncStorage.getItem(TASKS_KEY),
      AsyncStorage.getItem(RECORDS_KEY),
    ]);

    const tasks = tasksJson ? JSON.parse(tasksJson) : [];
    const records = recordsJson ? JSON.parse(recordsJson) : [];
    const today = getTodayString();

    // Filter to today's tasks
    const todayTasks = tasks.filter((t: any) => {
      if (t.isDaily) return true;
      const taskDate = t.createdAt?.split("T")[0];
      return taskDate === today;
    });

    // Find pending tasks (not yet completed)
    const pendingTasks = todayTasks.filter((t: any) => {
      const record = records.find(
        (r: any) => r.taskId === t.id && r.date === today
      );
      const spent = record?.secondsSpent ?? 0;
      return spent < t.targetMinutes * 60;
    });

    const nextTask = pendingTasks[0];

    // Get time spent on next pending task
    let timeSpent = "0h 00m";
    let completionPercent = 0;
    let taskColor = "#A3CC00";

    if (nextTask) {
      const record = records.find(
        (r: any) => r.taskId === nextTask.id && r.date === today
      );
      const spent = record?.secondsSpent ?? 0;
      timeSpent = formatSeconds(spent);
      completionPercent = Math.round(
        (spent / (nextTask.targetMinutes * 60)) * 100
      );
      taskColor = nextTask.color ?? "#A3CC00";
    } else if (todayTasks.length > 0) {
      // All done
      const totalSpent = records
        .filter((r: any) => r.date === today)
        .reduce((sum: number, r: any) => sum + r.secondsSpent, 0);
      timeSpent = formatSeconds(totalSpent);
      completionPercent = 100;
    }

    return {
      taskName: nextTask?.name ?? "",
      timeSpent,
      pendingCount: pendingTasks.length,
      taskColor,
      completionPercent,
    };
  } catch (e) {
    console.error("Widget data load error:", e);
    return {
      taskName: "",
      timeSpent: "0h 00m",
      pendingCount: 0,
      taskColor: "#A3CC00",
      completionPercent: 0,
    };
  }
}

// This is the main task handler called by the Android widget system
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const widgetName = widgetInfo.widgetName;

  // Only handle our widget
  if (widgetName !== "FocusFlowWidget") return;

  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED": {
      const data = await loadWidgetData();
      props.renderWidget(
        React.createElement(FocusFlowWidget, {
          taskName: data.taskName,
          timeSpent: data.timeSpent,
          pendingCount: data.pendingCount,
          taskColor: data.taskColor,
          completionPercent: data.completionPercent,
        })
      );
      break;
    }

    case "WIDGET_DELETED":
      // Nothing to clean up
      break;

    case "WIDGET_CLICK": {
      // "OPEN_APP" click action - handled natively, opens main activity
      break;
    }

    default:
      break;
  }
}
