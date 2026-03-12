export type ThemeName = "dark" | "midnight" | "forest" | "ocean" | "ember" | "purple";

export interface ThemeColors {
  background: string;
  card: string;
  cardAlt: string;
  border: string;
  accent: string;
  accentDim: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  tabBar: string;
  taskColors: string[];
}

export const THEMES: Record<ThemeName, ThemeColors> = {
  dark: {
    background: "#0A0A0A", card: "#1A1A1A", cardAlt: "#222222",
    border: "#2A2A2A", accent: "#A3CC00", accentDim: "#7A9900",
    text: "#FFFFFF", textSecondary: "#888888", textMuted: "#555555",
    tabBar: "#111111",
    taskColors: ["#A3CC00","#4A90E2","#00C5C5","#9B59FF","#FF6B35","#E74C3C","#F39C12","#1ABC9C"],
  },
  midnight: {
    background: "#050510", card: "#0D0D1F", cardAlt: "#131326",
    border: "#1E1E3A", accent: "#7C6FFF", accentDim: "#5548CC",
    text: "#E8E8FF", textSecondary: "#7777AA", textMuted: "#44446A",
    tabBar: "#080818",
    taskColors: ["#7C6FFF","#FF6B9D","#00D4FF","#FFB347","#7FFF00","#FF4B77","#00E5CC","#FFD700"],
  },
  forest: {
    background: "#060C06", card: "#0F1A0F", cardAlt: "#141F14",
    border: "#1E2E1E", accent: "#4CAF50", accentDim: "#388E3C",
    text: "#E8F5E9", textSecondary: "#6A9E6A", textMuted: "#3D5A3D",
    tabBar: "#080E08",
    taskColors: ["#4CAF50","#8BC34A","#CDDC39","#FFC107","#FF9800","#00BCD4","#9C27B0","#FF5722"],
  },
  ocean: {
    background: "#020810", card: "#071525", cardAlt: "#0C1D30",
    border: "#102540", accent: "#00BCD4", accentDim: "#0097A7",
    text: "#E0F7FA", textSecondary: "#5BA8B5", textMuted: "#2E6470",
    tabBar: "#040C18",
    taskColors: ["#00BCD4","#03A9F4","#1976D2","#00E5FF","#40C4FF","#18FFFF","#64FFDA","#B2EBF2"],
  },
  ember: {
    background: "#0C0600", card: "#1A0E00", cardAlt: "#221200",
    border: "#2E1800", accent: "#FF6D00", accentDim: "#E65100",
    text: "#FFF3E0", textSecondary: "#A0714A", textMuted: "#5C3A1E",
    tabBar: "#100800",
    taskColors: ["#FF6D00","#FF3D00","#FFAB40","#FFD740","#FF6E40","#FFCA28","#FF5252","#FF8A65"],
  },
  purple: {
    background: "#08040F", card: "#130A1E", cardAlt: "#1A0F28",
    border: "#261540", accent: "#CE93D8", accentDim: "#AB47BC",
    text: "#F3E5F5", textSecondary: "#9066A0", textMuted: "#533360",
    tabBar: "#0A0614",
    taskColors: ["#CE93D8","#FF80AB","#B39DDB","#80DEEA","#FFCC02","#F48FB1","#80CBC4","#FFAB40"],
  },
};

export const THEME_LABELS: Record<ThemeName, string> = {
  dark: "⬛ Obsidian",
  midnight: "🌙 Midnight",
  forest: "🌲 Forest",
  ocean: "🌊 Ocean",
  ember: "🔥 Ember",
  purple: "💜 Purple Haze",
};

// Default export for backwards compatibility — overridden by ThemeContext at runtime
export const Colors: ThemeColors = THEMES.dark;
export default Colors;
