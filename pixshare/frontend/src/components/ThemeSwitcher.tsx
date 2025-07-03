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
};

const ThemeSwitcher = () => {
  const changeTheme = (themeKey: keyof typeof themes) => {
    const theme = themes[themeKey];
    for (const key in theme) {
      document.documentElement.style.setProperty(key, theme[key]);
    }
  };

  return (
    <select
      onChange={(e) => changeTheme(e.target.value as keyof typeof themes)}
      defaultValue="default"
      className="rounded px-2 py-1 text-black"
    >
      {Object.keys(themes).map((theme) => (
        <option key={theme} value={theme}>
          {theme.charAt(0).toUpperCase() + theme.slice(1)}
        </option>
      ))}
    </select>
  );
};

export default ThemeSwitcher;
