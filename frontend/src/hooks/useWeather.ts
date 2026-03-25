import { useQuery } from '@tanstack/react-query';
import type { WeatherData } from '../types';

async function fetchWeather(): Promise<WeatherData> {
  const res = await fetch('/api/weather');
  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
  return res.json() as Promise<WeatherData>;
}

export function useWeather() {
  return useQuery({
    queryKey: ['weather'],
    queryFn: fetchWeather,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
}
