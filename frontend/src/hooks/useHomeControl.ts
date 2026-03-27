import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { HomeControlData } from '../types';

async function setBrightnessLevel(brightness: number): Promise<void> {
  const res = await fetch('/api/home/brightness', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brightness }),
  });
  if (!res.ok && res.status !== 204) throw new Error(`Set brightness failed: ${res.status}`);
}

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
    // Optimistically flip the device state so the UI responds immediately
    onMutate: async (entityId: string) => {
      await queryClient.cancelQueries({ queryKey: ['homeControl'] });
      const previous = queryClient.getQueryData<HomeControlData>(['homeControl']);
      queryClient.setQueryData<HomeControlData>(['homeControl'], (old) => {
        if (!old) return old;
        return {
          ...old,
          devices: old.devices.map((d) => {
            if (d.id !== entityId) return d;
            const isOn = d.state === 'on' || d.state === 'open';
            const nextState = isOn
              ? d.type === 'cover' ? 'closed' : 'off'
              : d.type === 'cover' ? 'open' : 'on';
            return { ...d, state: nextState };
          }),
        };
      });
      return { previous };
    },
    // Roll back on error
    onError: (_err, _entityId, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['homeControl'], context.previous);
      }
    },
    // Delay the confirmatory refetch: HA processes the toggle asynchronously
    // (~500-800ms). Refetching immediately returns the old state and clobbers
    // the correct optimistic update. 1.5s gives HA time to settle.
    onSettled: () => {
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['homeControl'] });
      }, 1500);
    },
  });
}

export function useSetBrightness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setBrightnessLevel,
    // Optimistically write the new brightness into the cache so the slider
    // never jumps back while waiting for HA to catch up.
    onMutate: async (brightness: number) => {
      await queryClient.cancelQueries({ queryKey: ['homeControl'] });
      const previous = queryClient.getQueryData<HomeControlData>(['homeControl']);
      queryClient.setQueryData<HomeControlData>(['homeControl'], (old) => {
        if (!old) return old;
        return {
          ...old,
          devices: old.devices.map((d) => {
            if (d.type !== 'light' || d.state !== 'on' || !d.available) return d;
            return {
              ...d,
              attributes: {
                ...d.attributes,
                // HA stores brightness as 0-255; convert from percentage
                brightness: Math.round((brightness / 100) * 255),
              },
            };
          }),
        };
      });
      return { previous };
    },
    onError: (_err, _brightness, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['homeControl'], context.previous);
      }
    },
    // Give lamps more time to report their new state before refetching.
    // Zigbee/Z-Wave lamps can take 3-6s to update in HA.
    onSettled: () => {
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['homeControl'] });
      }, 8000);
    },
  });
}
