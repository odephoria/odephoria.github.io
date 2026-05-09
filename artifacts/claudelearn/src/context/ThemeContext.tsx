import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "dark", toggle: () => {} });

function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem("odephoria_theme") as Theme | null;
      const t = saved ?? "dark"; // default to dark
      applyTheme(t); // apply immediately, before first render
      return t;
    } catch { return "dark"; }
  });

  useEffect(() => { applyTheme(theme); }, [theme]);

  const toggle = () => {
    setTheme((t) => {
      const next = t === "light" ? "dark" : "light";
      applyTheme(next); // apply instantly, don't wait for useEffect
      try { localStorage.setItem("odephoria_theme", next); } catch {}
      return next;
    });
  };

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
