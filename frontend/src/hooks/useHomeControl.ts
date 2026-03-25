import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { HomeControlData } from '../types';

async function fetchDevices(): Promise<HomeControlData> {
  const res = await fetch('/api/home/devices');
  if (!res.ok) throw new Error(`Home control fetch failed: ${res.status}`);
  return res.json() as Promise<HomeControlData>;
}

async function toggleDevice(entityId: string): Promise<void> {
  const res = await fetch(`/api/home/devices/${encodeURIComponent(entityId)}/toggle`, {
    method: 'POST',
  });
  if (!res.ok && res.status !== 204) throw new Error(`Toggle failed: ${res.status}`);
}

export function useHomeControl() {
  return useQuery({
    queryKey: ['homeControl'],
    queryFn: fetchDevices,
    refetchInterval: 30 * 1000,
    staleTime: 15 * 1000,
    retry: 2,
  });
}

export function useToggleDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleDevice,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['homeControl'] });
    },
  });
}
