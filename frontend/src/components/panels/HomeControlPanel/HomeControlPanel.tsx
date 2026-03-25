import { useHomeControl, useToggleDevice } from '../../../hooks/useHomeControl';
import { usePanelContext } from '../../PanelWrapper/PanelWrapper';
import type { HomeDevice } from '../../../types';
import styles from './HomeControlPanel.module.css';

const DEVICE_ICONS: Record<HomeDevice['type'], string> = {
  light: '💡',
  switch: '🔌',
  sensor: '🌡',
  climate: '❄️',
  cover: '🚪',
  unknown: '⚙️',
};

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
      <span className={styles.tileIcon}>{DEVICE_ICONS[device.type]}</span>
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
      <span className={styles.deviceIcon}>{DEVICE_ICONS[device.type]}</span>
      <span className={styles.deviceName}>{device.name}</span>
      <span className={[styles.dot, isOn ? styles.dotOn : ''].filter(Boolean).join(' ')} />
    </div>
  );
}

export default function HomeControlPanel() {
  const { data, error, isLoading } = useHomeControl();
  const { mutate: toggle } = useToggleDevice();
  const { isFocused } = usePanelContext();

  if (isLoading) return <span className={styles.meta}>Loading…</span>;
  if (error || !data) return <span className={styles.meta}>Unavailable</span>;

  const activeCount = data.devices.filter(
    (d) => d.state === 'on' || d.state === 'open',
  ).length;

  if (!isFocused) {
    return (
      <div className={styles.collapsedContainer}>
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
    );
  }

  return (
    <div className={styles.container}>
      {/* Active count — always visible */}
      <div className={styles.counter}>
        <span className={styles.count}>{activeCount}</span>
        <span className={styles.label}>active</span>
      </div>

      {/* Device list — full list in expanded view */}
      <div className={[styles.list, styles.listExpanded].join(' ')}>
        {data.devices.map((device) => (
          <DeviceRow key={device.id} device={device} onToggle={toggle} />
        ))}
      </div>
    </div>
  );
}
