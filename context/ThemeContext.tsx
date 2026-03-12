import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { THEMES, ThemeName, ThemeColors } from "@/constants/colors";

const THEME_KEY = "@focusflow_theme_v1";

interface ThemeContextType {
  themeName: ThemeName;
  colors: ThemeColors;
  setTheme: (name: ThemeName) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  themeName: "dark",
  colors: THEMES.dark,
  setTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>("dark");

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored && stored in THEMES) setThemeName(stored as ThemeName);
    });
  }, []);

  async function setTheme(name: ThemeName) {
    setThemeName(name);
    await AsyncStorage.setItem(THEME_KEY, name);
  }

  return (
    <ThemeContext.Provider value={{ themeName, colors: THEMES[themeName], setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
