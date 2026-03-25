import { useQuery } from '@tanstack/react-query';
import type { DashboardConfig } from '../types';

async function fetchPanelConfig(): Promise<DashboardConfig> {
  const res = await fetch('/api/panels');
  if (!res.ok) throw new Error(`Panel config fetch failed: ${res.status}`);
  return res.json() as Promise<DashboardConfig>;
}

export function usePanelConfig() {
  return useQuery({
    queryKey: ['panels'],
    queryFn: fetchPanelConfig,
    staleTime: Infinity,
    retry: 3,
  });
}
