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
    .filter((s) => {
      if (!DISPLAY_DOMAINS.has(s.entity_id.split('.')[0] ?? '')) return false;
      // Exclude Hue rooms / zones (group entities from the Hue integration)
      if (s.attributes['is_hue_group'] === true) return false;
      // Exclude generic HA light groups (their attributes contain an entity_id array of children)
      if (Array.isArray(s.attributes['entity_id'])) return false;
      // Exclude the Hue bridge itself
      const name = String(s.attributes['friendly_name'] ?? s.entity_id).toLowerCase();
      if (name.includes('bridge') || s.entity_id.toLowerCase().includes('bridge')) return false;
      return true;
    })
    .slice(0, 20)
    .map((s) => ({
      id: s.entity_id,
      name: String(s.attributes['friendly_name'] ?? s.entity_id),
      type: entityType(s.entity_id),
      state: s.state,
      available: s.state !== 'unavailable',
      attributes: s.attributes,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const data: HomeControlData = { devices, updatedAt: new Date().toISOString() };
  cache.set(CACHE_KEY, data, config.hass.cacheTtl);
  return data;
}

export async function toggleDevice(entityId: string): Promise<void> {
  if (!config.hass.url || !config.hass.token) return;

  // Use homeassistant.toggle — works universally across all domains
  await fetch(`${config.hass.url}/api/services/homeassistant/toggle`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.hass.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ entity_id: entityId }),
  });

  cache.invalidate(CACHE_KEY);
}

/**
 * Set brightness (1–100%) on all lights that are currently ON.
 * Lights that are OFF are intentionally skipped.
 */
export async function setBrightness(brightnessPercent: number): Promise<void> {
  if (!config.hass.url || !config.hass.token) return;

  const data = await fetchHomeControl();
  const onLights = data.devices.filter(
    (d) => d.type === 'light' && d.state === 'on' && d.available,
  );

  if (onLights.length === 0) return;

  const pct = Math.max(1, Math.min(100, Math.round(brightnessPercent)));

  await Promise.all(
    onLights.map((light) =>
      fetch(`${config.hass.url}/api/services/light/turn_on`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.hass.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entity_id: light.id, brightness_pct: pct }),
      }),
    ),
  );

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
