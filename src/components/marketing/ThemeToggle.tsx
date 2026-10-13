"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./marketing.module.css";

type Theme = "light" | "dark";

const storageKey = "shineqr-marketing-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(storageKey);
    const initialTheme =
      savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    setTheme(initialTheme);
    document.documentElement.style.colorScheme = initialTheme;
    document.documentElement.dataset.marketingTheme = initialTheme;
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    window.localStorage.setItem(storageKey, nextTheme);
    document.documentElement.style.colorScheme = nextTheme;
    document.documentElement.dataset.marketingTheme = nextTheme;
  };

  return (
    <button
      type="button"
      className={styles.themeToggle}
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Koyu moda geç" : "Gündüz moduna geç"}
      aria-pressed={theme === "dark"}
      title={theme === "light" ? "Koyu mod" : "Gündüz modu"}
    >
      <Sun className={styles.themeSun} size={16} aria-hidden="true" />
      <Moon className={styles.themeMoon} size={16} aria-hidden="true" />
      <span className={styles.themeThumb} aria-hidden="true" />
    </button>
  );
}
