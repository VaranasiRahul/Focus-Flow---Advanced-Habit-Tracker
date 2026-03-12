import { registerRootComponent } from "expo";
import { AppRegistry, Platform } from "react-native";
import App from "./app/_layout";

// Register the main app
registerRootComponent(App);

// Register the Android widget headless task
// This MUST be in index.js to work when the app is not running
if (Platform.OS === "android") {
  try {
    const { widgetTaskHandler } = require("./widgets/widgetTaskHandler");
    AppRegistry.registerHeadlessTask("FocusFlowWidget", () => widgetTaskHandler);
  } catch (_e) {
    // react-native-android-widget not installed yet
  }
}
