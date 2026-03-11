/**
 * Widget Registry
 *
 * Call registerWidgetTaskHandler() once at app startup (in _layout.tsx).
 * This registers the background task so Android can wake up the JS engine
 * to update the widget even when the app is not running.
 *
 * Also exports requestWidgetUpdate() which you call after saving data
 * to immediately refresh the widget with latest task data.
 */

import { registerWidgetTaskHandler } from "react-native-android-widget";
import { requestWidgetUpdate } from "react-native-android-widget";
import { widgetTaskHandler } from "./widgetTaskHandler";

export function registerFocusFlowWidget() {
  registerWidgetTaskHandler(widgetTaskHandler);
}

/**
 * Call this after updating task time, completing a task, or adding a task.
 * It tells Android to re-render the widget with fresh data.
 */
export async function refreshWidget() {
  try {
    await requestWidgetUpdate({
      widgetName: "FocusFlowWidget",
      renderWidget: () => {},  // handler will re-render with fresh data
      if_no_widget: "do-nothing",
    });
  } catch (e) {
    // Widget not added to home screen yet — that's fine
  }
}
