import { createContext, useContext, type ReactNode, type KeyboardEvent } from 'react';
import type { PanelConfig } from '../../types';
import styles from './PanelWrapper.module.css';

/* ── Panel context ───────────────────────────────────────────────────────────
 * Lets child panel components react to the expanded state
 * without needing to know their own panel ID.
 */
export const PanelContext = createContext({ isFocused: false });
export const usePanelContext = () => useContext(PanelContext);

interface PanelWrapperProps {
  panel: PanelConfig;
  isFocused: boolean;
  isDimmed: boolean;
  onClick: () => void;
  children: ReactNode;
}

export default function PanelWrapper({
  panel,
  isFocused,
  isDimmed,
  onClick,
  children,
}: PanelWrapperProps) {
  const flexGrow = isFocused ? (panel.flexExpanded ?? 3) : 1;

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  }

  return (
    <PanelContext.Provider value={{ isFocused }}>
      <div
        className={[
          styles.panel,
          isFocused ? styles.focused : '',
          isDimmed ? styles.dimmed : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ flex: `${flexGrow} 1 0%` }}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isFocused}
        aria-label={`${panel.title} panel${isFocused ? ', expanded' : ''}`}
      >
        <div className={styles.header}>
          <span className={styles.title}>{panel.title}</span>
          {isFocused && (
            <button
              className={styles.closeButton}
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              aria-label="Collapse panel"
            >
              ✕
            </button>
          )}
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </PanelContext.Provider>
  );
}
