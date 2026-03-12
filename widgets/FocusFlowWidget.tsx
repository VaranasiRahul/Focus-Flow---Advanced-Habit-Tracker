/**
 * FocusFlow Android Home Screen Widget
 * 
 * Uses react-native-android-widget FlexWidget/TextWidget primitives.
 * All values passed as props from the headless task handler.
 */
import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";

export interface FocusFlowWidgetProps {
  taskName: string;
  timeSpent: string;
  pendingCount: number;
  taskColor: string;
  completionPercent: number;
}

export function FocusFlowWidget({ taskName, timeSpent, pendingCount, taskColor, completionPercent }: FocusFlowWidgetProps) {
  const hasTask = taskName !== "";
  const color = taskColor || "#A3CC00";
  const pct = Math.min(Math.max(completionPercent, 0), 100);

  return (
    <FlexWidget
      style={{ height: "match_parent", width: "match_parent", flexDirection: "column", backgroundColor: "#161616", borderRadius: 20, padding: 14 }}
      clickAction="OPEN_APP"
    >
      {/* Top: app name + badge */}
      <FlexWidget style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <TextWidget text="FocusFlow" style={{ fontSize: 10, color: "#666666", fontStyle: "bold" }} />
        <FlexWidget style={{ backgroundColor: color + "44", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
          <TextWidget text={`${pendingCount} task${pendingCount !== 1 ? "s" : ""}`} style={{ fontSize: 10, color, fontStyle: "bold" }} />
        </FlexWidget>
      </FlexWidget>

      {/* Task name */}
      <TextWidget
        text={hasTask ? taskName : "All done for today! 🎉"}
        style={{ fontSize: hasTask ? 16 : 13, color: "#FFFFFF", fontStyle: "bold", maxLines: 2 }}
      />

      {/* Time */}
      <FlexWidget style={{ flexDirection: "row", alignItems: "baseline", gap: 5, marginTop: 6 }}>
        <TextWidget text={timeSpent} style={{ fontSize: 26, color, fontStyle: "bold" }} />
        <TextWidget text=" focused" style={{ fontSize: 11, color: "#888888" }} />
      </FlexWidget>

      {/* Progress bar background */}
      <FlexWidget style={{ height: 5, backgroundColor: "#2A2A2A", borderRadius: 3, marginTop: 10, overflow: "hidden" }}>
        {/* Progress fill — width as percentage string */}
        <FlexWidget style={{ height: "match_parent", width: `${pct}%`, backgroundColor: color, borderRadius: 3 }} />
      </FlexWidget>

      {/* Bottom row */}
      <FlexWidget style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        <TextWidget text={hasTask ? `${pct}% complete` : "Great work!"} style={{ fontSize: 10, color: "#555555" }} />
        <FlexWidget
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: color, alignItems: "center", justifyContent: "center" }}
          clickAction="OPEN_APP"
        >
          <TextWidget text="▶" style={{ fontSize: 12, color: "#000000", fontStyle: "bold" }} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
