import { useEffect, useState, type FC } from 'react';
import { usePanelConfig } from '../../hooks/usePanelConfig';
import { useDashboardStore } from '../../store/dashboardStore';
import { useTheme, THEME_META, THEMES, type Theme } from '../../hooks/useTheme';
import PanelWrapper from '../PanelWrapper/PanelWrapper';
import WeatherPanel from '../panels/WeatherPanel/WeatherPanel';
import MailPanel from '../panels/MailPanel/MailPanel';
import HomeControlPanel from '../panels/HomeControlPanel/HomeControlPanel';
import NewsPanel from '../panels/NewsPanel/NewsPanel';
import CalendarPanel from '../panels/CalendarPanel/CalendarPanel';
import type { PanelConfig } from '../../types';
import styles from './Dashboard.module.css';

/* ── Panel registry ──────────────────────────────────────────────────────────
 * Maps a panel type string to its component.
 * Adding a new panel type = one entry here + a component.
 */
const PANEL_COMPONENTS: Record<PanelConfig['type'], FC> = {
  weather: WeatherPanel,
  mail: MailPanel,
  'home-control': HomeControlPanel,
  news: NewsPanel,
  calendar: CalendarPanel,
  custom: () => <div className={styles.placeholder}>Custom panel</div>,
};

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === 'space') return (
    <svg width="1em" height="1em" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="3.5" fill="#c8a96e" />
      <ellipse cx="8" cy="8" rx="7" ry="2.3" fill="none" stroke="#e0c97a" strokeWidth="1.3" transform="rotate(-25 8 8)" />
    </svg>
  );
  if (theme === 'dark') return (
    <svg width="1em" height="1em" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M13 9.5A5.5 5.5 0 1 1 6.5 3a4 4 0 1 0 6.5 6.5z" fill="#f5e06a" />
    </svg>
  );
  return (
    <svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="3" fill="#f9c120" />
      <g stroke="#f9c120" strokeWidth="1.4" strokeLinecap="round">
        <line x1="8" y1="1" x2="8" y2="3.5" />
        <line x1="8" y1="12.5" x2="8" y2="15" />
        <line x1="1" y1="8" x2="3.5" y2="8" />
        <line x1="12.5" y1="8" x2="15" y2="8" />
        <line x1="3.1" y1="3.1" x2="4.9" y2="4.9" />
        <line x1="11.1" y1="11.1" x2="12.9" y2="12.9" />
        <line x1="12.9" y1="3.1" x2="11.1" y2="4.9" />
        <line x1="4.9" y1="11.1" x2="3.1" y2="12.9" />
      </g>
    </svg>
  );
}

function Clock() {
  const [now, setNow] = useState(new Date());
  const { theme, cycleTheme } = useTheme();
  const nextTheme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.clock}>
      <span className={styles.clockTime}>
        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
      <span className={styles.clockSep}>·</span>
      <span className={styles.clockDate}>
        {now.toLocaleDateString([], {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </span>
      <button
        className={styles.themeBtn}
        onClick={(e) => { e.stopPropagation(); cycleTheme(); }}
        aria-label={`Switch to ${THEME_META[nextTheme].label} theme`}
        title={`Switch to ${THEME_META[nextTheme].label} theme`}
      >
        <ThemeIcon theme={theme} />
      </button>
      <button
        className={styles.reloadBtn}
        onClick={() => window.location.reload()}
        aria-label="Reload page"
      >
        ↻
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { data: config, isLoading } = usePanelConfig();
  const { focusedPanelId, toggleFocusedPanel, setFocusedPanel } = useDashboardStore();

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <span>Loading dashboard…</span>
      </div>
    );
  }

  const panels = (config?.panels ?? [])
    .filter((p) => p.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <div className={styles.root} onClick={() => setFocusedPanel(null)}>
      <Clock />
      <div className={styles.panels}>
        {panels.map((panel) => {
          const Component = PANEL_COMPONENTS[panel.type];
          const isFocused = focusedPanelId === panel.id;
          const isDimmed = focusedPanelId !== null && !isFocused;
          return (
            <PanelWrapper
              key={panel.id}
              panel={panel}
              isFocused={isFocused}
              isDimmed={isDimmed}
              onClick={() => toggleFocusedPanel(panel.id)}
            >
              <Component />
            </PanelWrapper>
          );
        })}
      </div>
    </div>
  );
}
