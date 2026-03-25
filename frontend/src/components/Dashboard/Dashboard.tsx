import { useEffect, useState, type FC } from 'react';
import { usePanelConfig } from '../../hooks/usePanelConfig';
import { useDashboardStore } from '../../store/dashboardStore';
import PanelWrapper from '../PanelWrapper/PanelWrapper';
import WeatherPanel from '../panels/WeatherPanel/WeatherPanel';
import MailPanel from '../panels/MailPanel/MailPanel';
import HomeControlPanel from '../panels/HomeControlPanel/HomeControlPanel';
import NewsPanel from '../panels/NewsPanel/NewsPanel';
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
  custom: () => <div className={styles.placeholder}>Custom panel</div>,
};

function Clock() {
  const [now, setNow] = useState(new Date());
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
    </div>
  );
}

export default function Dashboard() {
  const { data: config, isLoading } = usePanelConfig();
  const { focusedPanelId, toggleFocusedPanel } = useDashboardStore();

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
    <div className={styles.root}>
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
