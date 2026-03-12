import AsyncStorage from "@react-native-async-storage/async-storage";
import { WidgetTaskHandlerProps } from "react-native-android-widget";
import React from "react";
import { FocusFlowWidget } from "./FocusFlowWidget";

const TASKS_KEY = "@focustrack_tasks_v2";
const RECORDS_KEY = "@focustrack_records_v2";

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function fmtSecs(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return `${h}h ${String(m).padStart(2,"0")}m`;
}

async function getWidgetData() {
  try {
    const [tj, rj] = await Promise.all([AsyncStorage.getItem(TASKS_KEY), AsyncStorage.getItem(RECORDS_KEY)]);
    const tasks = tj ? JSON.parse(tj) : [];
    const records = rj ? JSON.parse(rj) : [];
    const today = getToday();

    const todayTasks = tasks.filter((t: any) => t.isDaily || t.createdAt?.startsWith(today));
    const pending = todayTasks.filter((t: any) => {
      const rec = records.find((r: any) => r.taskId === t.id && r.date === today);
      return !rec || rec.secondsSpent < t.targetMinutes * 60;
    });

    const next = pending[0];
    if (!next) {
      const totalSpent = records.filter((r: any) => r.date === today).reduce((s: number, r: any) => s + r.secondsSpent, 0);
      return { taskName: "", timeSpent: fmtSecs(totalSpent), pendingCount: 0, taskColor: "#A3CC00", completionPercent: 100 };
    }

    const rec = records.find((r: any) => r.taskId === next.id && r.date === today);
    const spent = rec?.secondsSpent ?? 0;
    const pct = Math.round((spent / (next.targetMinutes * 60)) * 100);
    return { taskName: next.name, timeSpent: fmtSecs(spent), pendingCount: pending.length, taskColor: next.color ?? "#A3CC00", completionPercent: pct };
  } catch (_e) {
    return { taskName: "", timeSpent: "0h 00m", pendingCount: 0, taskColor: "#A3CC00", completionPercent: 0 };
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetInfo.widgetName !== "FocusFlowWidget") return;

  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED": {
      const data = await getWidgetData();
      props.renderWidget(React.createElement(FocusFlowWidget, data));
      break;
    }
    default: break;
  }
}
