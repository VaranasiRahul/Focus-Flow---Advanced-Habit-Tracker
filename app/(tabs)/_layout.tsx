import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useEffect } from "react";
import { Colors } from "@/constants/colors";

// Register Android widget background task at startup
if (Platform.OS === "android") {
  try {
    const { registerFocusFlowWidget } = require("@/widgets/widgetRegistry");
    registerFocusFlowWidget();
  } catch (_e) {
    // react-native-android-widget not available (Expo Go) - safe to ignore
  }
}

// NOTE: NativeTabs (expo-glass-effect) is iOS 26+ only and crashes on Android.
// We use a single unified ClassicTabLayout that handles all platforms correctly.

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";
  const isAndroid = Platform.OS === "android";
  const isWeb = Platform.OS === "web";

  // Android: standard (non-absolute) tab bar so it doesn't overlap content
  // iOS: absolute + blur for glass effect
  // Web: absolute with explicit height
  const tabBarStyle = isAndroid
    ? {
        backgroundColor: Colors.tabBar,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        elevation: 8,
        height: 60 + insets.bottom,
        paddingBottom: insets.bottom,
        paddingTop: 6,
      }
    : isIOS
    ? {
        position: "absolute" as const,
        backgroundColor: "transparent",
        borderTopWidth: 0,
        elevation: 0,
        paddingBottom: insets.bottom,
      }
    : {
        position: "absolute" as const,
        backgroundColor: Colors.tabBar,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        elevation: 0,
        height: 84,
        paddingBottom: insets.bottom,
      };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: "Inter_500Medium",
          marginBottom: isAndroid ? 4 : 0,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: Colors.tabBar },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Feather name="home" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Stats",
          tabBarIcon: ({ color }) => (
            <Feather name="bar-chart-2" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <Feather name="settings" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
