import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";

// Register Android widget background task at startup
if (Platform.OS === "android") {
  try {
    const { registerFocusFlowWidget } = require("@/widgets/widgetRegistry");
    registerFocusFlowWidget();
  } catch (_e) {
    // react-native-android-widget not available (Expo Go) - safe to ignore
  }
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isIOS = Platform.OS === "ios";
  const isAndroid = Platform.OS === "android";
  const isWeb = Platform.OS === "web";

  const tabBarStyle = isAndroid
    ? {
        backgroundColor: colors.tabBar,
        borderTopWidth: 1,
        borderTopColor: colors.border,
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
        backgroundColor: colors.tabBar,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        elevation: 0,
        height: 84,
        paddingBottom: insets.bottom,
      };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: "Inter_500Medium",
          marginBottom: isAndroid ? 4 : 0,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBar }]} />
          ) : null,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <Feather name="home" size={22} color={color} /> }} />
      <Tabs.Screen name="stats" options={{ title: "Stats", tabBarIcon: ({ color }) => <Feather name="bar-chart-2" size={22} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color }) => <Feather name="settings" size={22} color={color} /> }} />
    </Tabs>
  );
}
