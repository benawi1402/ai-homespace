import { useQuery } from '@tanstack/react-query';
import type { CalendarData } from '../types';

async function fetchCalendar(): Promise<CalendarData> {
  const res = await fetch('/api/calendar/events');
  if (!res.ok) throw new Error(`Calendar fetch failed: ${res.status}`);
  return res.json() as Promise<CalendarData>;
}

export function useCalendar() {
  return useQuery({
    queryKey: ['calendar'],
    queryFn: fetchCalendar,
    refetchInterval: 5 * 60 * 1000,  // 5 minutes
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
}
