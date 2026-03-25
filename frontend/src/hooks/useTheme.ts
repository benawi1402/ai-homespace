import { useEffect, useState } from 'react';

export type Theme = 'space' | 'dark' | 'light';

export const THEMES: Theme[] = ['space', 'dark', 'light'];

export const THEME_META: Record<Theme, { label: string }> = {
  space: { label: 'Space' },
  dark:  { label: 'Dark'  },
  light: { label: 'Light' },
};

const STORAGE_KEY = 'homespace-theme';

export function getStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (v && THEMES.includes(v)) return v;
  } catch { /* no localStorage */ }
  return 'space';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const t = getStoredTheme();
    // Apply immediately so the initial paint is already themed
    document.documentElement.setAttribute('data-theme', t);
    return t;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  const cycleTheme = () =>
    setTheme((prev) => THEMES[(THEMES.indexOf(prev) + 1) % THEMES.length]);

  return { theme, cycleTheme };
}
