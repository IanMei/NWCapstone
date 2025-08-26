// src/components/ThemeSwitcher.tsx
import { useEffect, useState } from "react";

const themes = {
  default: {
    "--primary": "#729fd8",
    "--secondary": "#89b3d9",
    "--accent": "#f2a517",
    "--accent-dark": "#d8851d",
    "--bg-light": "#dabca4",
  },
  forest: {
    "--primary": "#1c595a",
    "--secondary": "#458d8c",
    "--accent": "#58a6a6",
    "--accent-dark": "#67734d",
    "--bg-light": "#d7d8ac",
  },
  earth: {
    "--primary": "#a6652d",
    "--secondary": "#742020",
    "--accent": "#d9a035",
    "--accent-dark": "#daae31",
    "--bg-light": "#b6bfaa",
  },
  rose: {
    "--primary": "#7b99bf",
    "--secondary": "#bf2c62",
    "--accent": "#f29bc5",
    "--accent-dark": "#5a0b2a",
    "--bg-light": "#b8d0ef",
  },

  // ===== Northwestern University palettes =====
  // Brand purple: #4E2A84
  northwestern_light: {
    "--primary": "#4E2A84",   // NU Purple
    "--secondary": "#6E4FA2", // lighter purple for secondary bars/buttons
    "--accent": "#A78BFA",    // vivid violet accent for CTAs
    "--accent-dark": "#3B1F5D", // deep purple for hover/active
    "--bg-light": "#F0E9F9",  // soft lavender page background
  },
  northwestern_dark: {
    "--primary": "#321B5A",   // dark base app bar
    "--secondary": "#4E2A84", // NU Purple for highlights
    "--accent": "#9B87F5",    // bright accent on dark
    "--accent-dark": "#7C3AED", // stronger hover/active
    "--bg-light": "#110A1F",  // near-black purple background
  },
} as const;

type ThemeKey = keyof typeof themes;
const THEME_STORAGE_KEY = "pixshare-theme";

function applyTheme(themeKey: ThemeKey) {
  const theme = themes[themeKey];
  for (const key in theme) {
    document.documentElement.style.setProperty(
      key as keyof typeof theme,
      theme[key as keyof typeof theme]
    );
  }
}

function formatLabel(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase()); // Title Case
}

const ThemeSwitcher = () => {
  const [current, setCurrent] = useState<ThemeKey>("default");

  useEffect(() => {
    // load persisted theme (or keep default)
    const saved = (localStorage.getItem(THEME_STORAGE_KEY) as ThemeKey) || "default";
    setCurrent(saved);
    applyTheme(saved);
  }, []);

  const changeTheme = (themeKey: ThemeKey) => {
    setCurrent(themeKey);
    applyTheme(themeKey);
    localStorage.setItem(THEME_STORAGE_KEY, themeKey);
  };

  return (
    <select
      value={current}
      onChange={(e) => changeTheme(e.target.value as ThemeKey)}
      className="rounded px-2 py-1 bg-white/90 text-black shadow-sm"
      title="Choose theme"
    >
      {Object.keys(themes).map((key) => (
        <option key={key} value={key}>
          {formatLabel(key)}
        </option>
      ))}
    </select>
  );
};

export default ThemeSwitcher;
