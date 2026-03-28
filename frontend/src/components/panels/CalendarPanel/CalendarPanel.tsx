import { useCalendar } from '../../../hooks/useCalendar';
import { usePanelContext } from '../../PanelWrapper/PanelWrapper';
import type { CalendarEvent } from '../../../types';
import styles from './CalendarPanel.module.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function eventDateStr(event: CalendarEvent): string {
  return event.allDay ? event.start : event.start.slice(0, 10);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function dayLabel(dateStr: string): string {
  const today = todayStr();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  if (dateStr === today) return 'Today';
  if (dateStr === tomorrowStr) return 'Tomorrow';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EventRow({ event, compact }: { event: CalendarEvent; compact?: boolean }) {
  return (
    <div className={[styles.eventRow, compact ? styles.eventRowCompact : ''].filter(Boolean).join(' ')}>
      <span className={styles.colorDot} style={{ background: event.color }} />
      <span className={styles.eventTime}>
        {event.allDay ? 'All day' : formatTime(event.start)}
      </span>
      <span className={styles.eventTitle}>{event.title}</span>
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export default function CalendarPanel() {
  const { data, error, isLoading } = useCalendar();
  const { isFocused } = usePanelContext();

  if (isLoading) return <span className={styles.meta}>Loading…</span>;
  if (error || !data) return <span className={styles.meta}>Unavailable</span>;

  const today = todayStr();

  // ── Collapsed view: upcoming events grouped by day ────────────────────────
  if (!isFocused) {
    // Group all events by day, take the first 5 days that have events
    const previewGrouped = new Map<string, CalendarEvent[]>();
    for (const event of data.events) {
      const d = eventDateStr(event);
      if (!previewGrouped.has(d)) previewGrouped.set(d, []);
      previewGrouped.get(d)!.push(event);
    }
    const previewDays = Array.from(previewGrouped.keys()).sort().slice(0, 5);

    return (
      <div className={styles.collapsed}>
        <div className={styles.collapsedHeader}>
          <span className={styles.dateLabel}>
            {new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}
          </span>
          <span className={styles.eventCount}>
            {data.events.length} upcoming
          </span>
        </div>
        {previewDays.length === 0 ? (
          <span className={styles.empty}>No upcoming events</span>
        ) : (
          <div className={styles.previewList}>
            {previewDays.map((day) => (
              <div key={day} className={styles.previewGroup}>
                <span className={[styles.previewDayLabel, day === today ? styles.previewDayLabelToday : ''].filter(Boolean).join(' ')}>
                  {dayLabel(day)}
                </span>
                <div className={styles.eventList}>
                  {previewGrouped.get(day)!.map((e) => (
                    <EventRow key={e.id} event={e} compact />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Expanded view: events grouped by day (90 days / ~3 months) ──────────────
  const grouped = new Map<string, CalendarEvent[]>();
  for (const event of data.events) {
    const d = eventDateStr(event);
    if (!grouped.has(d)) grouped.set(d, []);
    grouped.get(d)!.push(event);
  }

  const sortedDays = Array.from(grouped.keys()).sort();

  return (
    <div className={styles.expanded}>
      {sortedDays.length === 0 && (
        <span className={styles.empty}>No upcoming events</span>
      )}
      {sortedDays.map((day) => (
        <div key={day} className={styles.dayGroup}>
          <div className={[styles.dayHeader, day === today ? styles.dayHeaderToday : ''].filter(Boolean).join(' ')}>
            {dayLabel(day)}
          </div>
          <div className={styles.dayEvents}>
            {grouped.get(day)!.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
