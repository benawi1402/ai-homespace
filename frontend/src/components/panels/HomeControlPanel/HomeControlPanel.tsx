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

interface DeviceRowProps {
  device: HomeDevice;
  onToggle: (id: string) => void;
}

function DeviceRow({ device, onToggle }: DeviceRowProps) {
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

  const visibleDevices = isFocused ? data.devices : data.devices.slice(0, 4);

  return (
    <div className={styles.container}>
      {/* Active count — always visible */}
      <div className={styles.counter}>
        <span className={styles.count}>{activeCount}</span>
        <span className={styles.label}>active</span>
      </div>

      {/* Device list */}
      <div className={[styles.list, isFocused ? styles.listExpanded : ''].filter(Boolean).join(' ')}>
        {visibleDevices.map((device) => (
          <DeviceRow key={device.id} device={device} onToggle={toggle} />
        ))}
      </div>
    </div>
  );
}
