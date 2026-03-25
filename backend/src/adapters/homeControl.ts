import { config } from '../config';
import { cache } from '../cache';
import type { HomeControlData, HomeDevice } from '../types';

const CACHE_KEY = 'homeControl';

interface HassState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

const DISPLAY_DOMAINS = new Set(['light', 'switch', 'cover', 'climate']);

function entityType(entityId: string): HomeDevice['type'] {
  const domain = entityId.split('.')[0] ?? '';
  const map: Record<string, HomeDevice['type']> = {
    light: 'light',
    switch: 'switch',
    sensor: 'sensor',
    climate: 'climate',
    cover: 'cover',
  };
  return map[domain] ?? 'unknown';
}

export async function fetchHomeControl(): Promise<HomeControlData> {
  const cached = cache.get<HomeControlData>(CACHE_KEY);
  if (cached) return cached;

  if (!config.hass.url || !config.hass.token) {
    return mockHomeControlData();
  }

  const res = await fetch(`${config.hass.url}/api/states`, {
    headers: {
      Authorization: `Bearer ${config.hass.token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Home Assistant API returned HTTP ${res.status}`);
  }

  const states = (await res.json()) as HassState[];

  const devices: HomeDevice[] = states
    .filter((s) => DISPLAY_DOMAINS.has(s.entity_id.split('.')[0] ?? ''))
    .slice(0, 20)
    .map((s) => ({
      id: s.entity_id,
      name: String(s.attributes['friendly_name'] ?? s.entity_id),
      type: entityType(s.entity_id),
      state: s.state,
      available: s.state !== 'unavailable',
      attributes: s.attributes,
    }));

  const data: HomeControlData = { devices, updatedAt: new Date().toISOString() };
  cache.set(CACHE_KEY, data, config.hass.cacheTtl);
  return data;
}

export async function toggleDevice(entityId: string): Promise<void> {
  if (!config.hass.url || !config.hass.token) return;

  const domain = entityId.split('.')[0] ?? 'homeassistant';
  await fetch(`${config.hass.url}/api/services/${domain}/toggle`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.hass.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ entity_id: entityId }),
  });

  cache.invalidate(CACHE_KEY);
}

function mockHomeControlData(): HomeControlData {
  return {
    devices: [
      {
        id: 'light.living_room',
        name: 'Living Room',
        type: 'light',
        state: 'on',
        available: true,
        attributes: { brightness: 200 },
      },
      {
        id: 'light.bedroom',
        name: 'Bedroom',
        type: 'light',
        state: 'off',
        available: true,
        attributes: {},
      },
      {
        id: 'switch.coffee_maker',
        name: 'Coffee Maker',
        type: 'switch',
        state: 'off',
        available: true,
        attributes: {},
      },
      {
        id: 'cover.garage',
        name: 'Garage Door',
        type: 'cover',
        state: 'closed',
        available: true,
        attributes: {},
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}
