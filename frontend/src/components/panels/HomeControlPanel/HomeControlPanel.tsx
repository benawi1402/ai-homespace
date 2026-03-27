import { useEffect, useState } from 'react';
import { useHomeControl, useToggleDevice, useSetBrightness } from '../../../hooks/useHomeControl';
import { usePanelContext } from '../../PanelWrapper/PanelWrapper';
import type { HomeDevice } from '../../../types';
import styles from './HomeControlPanel.module.css';

function DeviceIcon({ type }: { type: HomeDevice['type'] }) {
  switch (type) {
    case 'light': return (
      <svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 2a4 4 0 0 1 2.5 7.1c-.4.3-.5.7-.5 1.2V11H6v-.7c0-.5-.2-.9-.5-1.2A4 4 0 0 1 8 2z" />
        <line x1="6.5" y1="13" x2="9.5" y2="13" />
        <line x1="7.5" y1="14.5" x2="8.5" y2="14.5" />
      </svg>
    );
    case 'switch': return (
      <svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
        <circle cx="8" cy="9" r="5" />
        <line x1="8" y1="2" x2="8" y2="7" strokeWidth={1.8} />
      </svg>
    );
    case 'sensor': return (
      <svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
        <rect x="6.5" y="1.5" width="3" height="8.5" rx="1.5" />
        <circle cx="8" cy="13" r="2.2" />
        <line x1="8" y1="7" x2="8" y2="10" />
      </svg>
    );
    case 'climate': return (
      <svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
        <line x1="8" y1="1" x2="8" y2="15" />
        <line x1="1" y1="8" x2="15" y2="8" />
        <line x1="3.1" y1="3.1" x2="12.9" y2="12.9" />
        <line x1="12.9" y1="3.1" x2="3.1" y2="12.9" />
        <polyline points="5.5,1.5 8,3.5 10.5,1.5" />
        <polyline points="5.5,14.5 8,12.5 10.5,14.5" />
        <polyline points="1.5,5.5 3.5,8 1.5,10.5" />
        <polyline points="14.5,5.5 12.5,8 14.5,10.5" />
      </svg>
    );
    case 'cover': return (
      <svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
        <rect x="3" y="1" width="10" height="14" rx="1" />
        <circle cx="11.5" cy="8" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    );
    default: return (
      <svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
        <circle cx="8" cy="8" r="6" />
        <circle cx="8" cy="8" r="2.5" />
        <line x1="8" y1="2" x2="8" y2="5.5" />
        <line x1="8" y1="10.5" x2="8" y2="14" />
        <line x1="2" y1="8" x2="5.5" y2="8" />
        <line x1="10.5" y1="8" x2="14" y2="8" />
      </svg>
    );
  }
}

function BrightnessIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
      <circle cx="8" cy="8" r="3" />
      <line x1="8" y1="1" x2="8" y2="3.5" />
      <line x1="8" y1="12.5" x2="8" y2="15" />
      <line x1="1" y1="8" x2="3.5" y2="8" />
      <line x1="12.5" y1="8" x2="15" y2="8" />
      <line x1="3.1" y1="3.1" x2="4.9" y2="4.9" />
      <line x1="11.1" y1="11.1" x2="12.9" y2="12.9" />
      <line x1="12.9" y1="3.1" x2="11.1" y2="4.9" />
      <line x1="4.9" y1="11.1" x2="3.1" y2="12.9" />
    </svg>
  );
}

function BrightnessSlider({ devices, onSet }: { devices: HomeDevice[]; onSet: (v: number) => void }) {
  const onLights = devices.filter((d) => d.type === 'light' && d.state === 'on' && d.available);

  const avgBrightness = onLights.length > 0
    ? Math.round(
        onLights.reduce((sum, d) => {
          const b = typeof d.attributes['brightness'] === 'number'
            ? (d.attributes['brightness'] as number)
            : 255;
          return sum + (b / 255) * 100;
        }, 0) / onLights.length,
      )
    : 50;

  const [value, setValue] = useState(avgBrightness);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) setValue(avgBrightness);
  }, [avgBrightness, dragging]);

  const disabled = onLights.length === 0;

  return (
    <div
      className={[styles.brightnessRow, disabled ? styles.brightnessDisabled : ''].filter(Boolean).join(' ')}
      onClick={(e) => e.stopPropagation()}
    >
      <BrightnessIcon />
      <input
        type="range"
        min={1}
        max={100}
        value={value}
        disabled={disabled}
        className={styles.brightnessSlider}
        style={{ '--slider-pct': `${value}%` } as React.CSSProperties}
        onChange={(e) => { setDragging(true); setValue(Number(e.target.value)); }}
        onPointerUp={(e) => { setDragging(false); onSet(Number((e.target as HTMLInputElement).value)); }}
        aria-label="Brightness"
      />
      <span className={styles.brightnessValue}>{disabled ? '—' : `${value}%`}</span>
    </div>
  );
}

interface DeviceTileProps {
  device: HomeDevice;
  onToggle: (id: string) => void;
}

function DeviceTile({ device, onToggle }: DeviceTileProps) {
  const isOn = device.state === 'on' || device.state === 'open';

  return (
    <div
      className={[
        styles.tile,
        isOn ? styles.tileOn : '',
        !device.available ? styles.unavailable : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={(e) => {
        e.stopPropagation();
        if (device.available) onToggle(device.id);
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && device.available) {
          e.stopPropagation();
          onToggle(device.id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${device.name}: ${device.state}`}
      aria-pressed={isOn}
    >
      <span className={styles.tileIcon}><DeviceIcon type={device.type} /></span>
      <span className={styles.tileName}>{device.name}</span>
      <span className={[styles.dot, isOn ? styles.dotOn : ''].filter(Boolean).join(' ')} />
    </div>
  );
}

function DeviceRow({ device, onToggle }: DeviceTileProps) {
  const isOn = device.state === 'on' || device.state === 'open';

  return (
    <div
      className={[
        styles.device,
        isOn ? styles.on : '',
        !device.available ? styles.unavailable : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={(e) => {
        e.stopPropagation();
        if (device.available) onToggle(device.id);
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && device.available) {
          e.stopPropagation();
          onToggle(device.id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${device.name}: ${device.state}`}
      aria-pressed={isOn}
    >
      <span className={styles.deviceIcon}><DeviceIcon type={device.type} /></span>
      <span className={styles.deviceName}>{device.name}</span>
      <span className={[styles.dot, isOn ? styles.dotOn : ''].filter(Boolean).join(' ')} />
    </div>
  );
}

export default function HomeControlPanel() {
  const { data, error, isLoading } = useHomeControl();
  const { mutate: toggle } = useToggleDevice();
  const { mutate: setBrightness } = useSetBrightness();
  const { isFocused } = usePanelContext();

  if (isLoading) return <span className={styles.meta}>Loading…</span>;
  if (error || !data) return <span className={styles.meta}>Unavailable</span>;

  const activeCount = data.devices.filter(
    (d) => d.state === 'on' || d.state === 'open',
  ).length;

  if (!isFocused) {
    return (
      <div className={styles.collapsedContainer}>
        <div className={styles.collapsedTop}>
          <div className={styles.counter}>
            <span className={styles.count}>{activeCount}</span>
            <span className={styles.label}>active</span>
          </div>
          <div className={styles.tileGrid}>
            {data.devices.slice(0, 8).map((device) => (
              <DeviceTile key={device.id} device={device} onToggle={toggle} />
            ))}
          </div>
        </div>
        <BrightnessSlider devices={data.devices} onSet={setBrightness} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.containerTop}>
        {/* Active count */}
        <div className={styles.counter}>
          <span className={styles.count}>{activeCount}</span>
          <span className={styles.label}>active</span>
        </div>

        {/* Device list */}
        <div className={[styles.list, styles.listExpanded].join(' ')}>
          {data.devices.map((device) => (
            <DeviceRow key={device.id} device={device} onToggle={toggle} />
          ))}
        </div>
      </div>

      <BrightnessSlider devices={data.devices} onSet={setBrightness} />
    </div>
  );
}
