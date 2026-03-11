/**
 * FocusFlow Home Screen Widget
 *
 * This renders the actual Android home screen widget UI.
 * Uses ONLY react-native-android-widget components (no standard RN components).
 *
 * Widget shows:
 *  - App name
 *  - Today's first pending task name
 *  - Time spent on that task
 *  - Number of pending tasks remaining
 *  - A play button (tapping opens the app)
 */

import React from "react";
import {
  FlexWidget,
  TextWidget,
  ImageWidget,
} from "react-native-android-widget";

export interface FocusFlowWidgetProps {
  taskName: string;
  timeSpent: string;
  pendingCount: number;
  taskColor: string;
  completionPercent: number;
}

// Colors must be hex strings for Android widgets
const BG = "#0A0A0A";
const CARD = "#1A1A1A";
const ACCENT = "#A3CC00";
const TEXT = "#FFFFFF";
const TEXT_DIM = "#888888";
const TEXT_MUTED = "#555555";

export function FocusFlowWidget({
  taskName,
  timeSpent,
  pendingCount,
  taskColor,
  completionPercent,
}: FocusFlowWidgetProps) {
  const color = taskColor || ACCENT;
  const hasTask = !!taskName && taskName !== "";

  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "column",
        backgroundColor: CARD,
        borderRadius: 16,
        padding: 14,
        justifyContent: "space-between",
      }}
      clickAction="OPEN_APP"
    >
      {/* Header row */}
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <TextWidget
          text="FocusFlow"
          style={{
            fontSize: 11,
            color: TEXT_MUTED,
            fontStyle: "bold",
          }}
        />
        <FlexWidget
          style={{
            backgroundColor: hasTask ? color + "33" : "#33333333",
            borderRadius: 10,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <TextWidget
            text={`${pendingCount} pending`}
            style={{
              fontSize: 10,
              color: hasTask ? color : TEXT_MUTED,
              fontStyle: "bold",
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Task name */}
      <TextWidget
        text={hasTask ? taskName : "All done for today! 🎉"}
        style={{
          fontSize: hasTask ? 15 : 13,
          color: TEXT,
          fontStyle: "bold",
          maxLines: 2,
        }}
      />

      {/* Time spent */}
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          gap: 4,
          marginTop: 4,
        }}
      >
        <TextWidget
          text={timeSpent}
          style={{
            fontSize: 22,
            color: hasTask ? color : ACCENT,
            fontStyle: "bold",
          }}
        />
        <TextWidget
          text="spent"
          style={{
            fontSize: 11,
            color: TEXT_DIM,
          }}
        />
      </FlexWidget>

      {/* Progress bar */}
      <FlexWidget
        style={{
          height: 4,
          backgroundColor: "#2A2A2A",
          borderRadius: 2,
          marginTop: 8,
          overflow: "hidden",
        }}
      >
        <FlexWidget
          style={{
            height: "match_parent",
            width: `${Math.min(completionPercent, 100)}%`,
            backgroundColor: color,
            borderRadius: 2,
          }}
        />
      </FlexWidget>

      {/* Bottom row: tap hint */}
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 8,
        }}
      >
        <TextWidget
          text={hasTask ? "Tap to start" : "Tap to open app"}
          style={{
            fontSize: 10,
            color: TEXT_MUTED,
          }}
        />
        <FlexWidget
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: hasTask ? color : ACCENT,
            alignItems: "center",
            justifyContent: "center",
          }}
          clickAction="OPEN_APP"
        >
          <TextWidget
            text="▶"
            style={{
              fontSize: 12,
              color: "#000000",
              fontStyle: "bold",
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
