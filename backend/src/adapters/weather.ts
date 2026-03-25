import { config } from '../config';
import { cache } from '../cache';
import type { WeatherData, ForecastDay } from '../types';

const CACHE_KEY = 'weather';

interface OWMCurrentResponse {
  name: string;
  main: { temp: number; feels_like: number; humidity: number };
  weather: Array<{ description: string; icon: string }>;
  wind: { speed: number };
}

interface OWMForecastItem {
  dt: number;
  main: { temp_min: number; temp_max: number };
  weather: Array<{ description: string; icon: string }>;
  dt_txt: string;
}

interface OWMForecastResponse {
  list: OWMForecastItem[];
}

/** Aggregate 3-hourly OWM entries into per-day min/max, skipping today. */
function aggregateForecast(items: OWMForecastItem[]): ForecastDay[] {
  const todayStr = new Date().toISOString().slice(0, 10);
  const byDay = new Map<string, { mins: number[]; maxs: number[]; desc: string; icon: string }>();

  for (const item of items) {
    const dateStr = item.dt_txt.slice(0, 10);
    if (dateStr === todayStr) continue;

    const entry = byDay.get(dateStr);
    if (!entry) {
      byDay.set(dateStr, {
        mins: [item.main.temp_min],
        maxs: [item.main.temp_max],
        // Use midday entry (12:00) for representative description when available
        desc: item.weather[0]?.description ?? '',
        icon: item.weather[0]?.icon ?? '',
      });
    } else {
      entry.mins.push(item.main.temp_min);
      entry.maxs.push(item.main.temp_max);
      if (item.dt_txt.includes('12:00')) {
        entry.desc = item.weather[0]?.description ?? entry.desc;
        entry.icon = item.weather[0]?.icon ?? entry.icon;
      }
    }
  }

  return Array.from(byDay.entries())
    .slice(0, 3)
    .map(([date, v]) => ({
      date,
      tempMin: Math.round(Math.min(...v.mins)),
      tempMax: Math.round(Math.max(...v.maxs)),
      description: v.desc,
      icon: v.icon,
    }));
}

export async function fetchWeather(): Promise<WeatherData> {
  const cached = cache.get<WeatherData>(CACHE_KEY);
  if (cached) return cached;

  if (!config.weather.apiKey) {
    return mockWeatherData();
  }

  const base =
    `?q=${encodeURIComponent(config.weather.city)}` +
    `&units=${config.weather.units}` +
    `&appid=${config.weather.apiKey}`;

  const [currentRes, forecastRes] = await Promise.all([
    fetch(`https://api.openweathermap.org/data/2.5/weather${base}`),
    fetch(`https://api.openweathermap.org/data/2.5/forecast${base}`),
  ]);

  if (!currentRes.ok) throw new Error(`Weather API returned HTTP ${currentRes.status}`);
  if (!forecastRes.ok) throw new Error(`Forecast API returned HTTP ${forecastRes.status}`);

  const raw = (await currentRes.json()) as OWMCurrentResponse;
  const rawForecast = (await forecastRes.json()) as OWMForecastResponse;

  const data: WeatherData = {
    city: raw.name,
    temperature: Math.round(raw.main.temp),
    feelsLike: Math.round(raw.main.feels_like),
    humidity: raw.main.humidity,
    description: raw.weather[0]?.description ?? '',
    icon: raw.weather[0]?.icon ?? '',
    windSpeed: raw.wind.speed,
    forecast: aggregateForecast(rawForecast.list),
    updatedAt: new Date().toISOString(),
  };

  cache.set(CACHE_KEY, data, config.weather.cacheTtl);
  return data;
}

function mockWeatherData(): WeatherData {
  const today = new Date();
  const nextDay = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  return {
    city: config.weather.city || 'Home',
    temperature: 18,
    feelsLike: 16,
    humidity: 65,
    description: 'partly cloudy',
    icon: '02d',
    windSpeed: 3.5,
    forecast: [
      { date: nextDay(1), tempMin: 12, tempMax: 19, description: 'light rain', icon: '10d' },
      { date: nextDay(2), tempMin: 10, tempMax: 16, description: 'overcast clouds', icon: '04d' },
      { date: nextDay(3), tempMin: 13, tempMax: 21, description: 'clear sky', icon: '01d' },
    ],
    updatedAt: new Date().toISOString(),
  };
}
