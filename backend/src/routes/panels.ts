import type { FastifyPluginAsync } from 'fastify';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from '../config';
import type { DashboardConfig, PanelConfig } from '../types';

/**
 * Returns true when the integration backing this panel type has enough
 * credentials to be useful. Panels whose backing service is not configured
 * are hidden (enabled:false) in the GET response without touching the
 * persisted config — they reappear automatically once credentials are added.
 */
function isAvailable(type: PanelConfig['type']): boolean {
  switch (type) {
    case 'weather':
      return Boolean(config.weather.apiKey);
    case 'mail':
      return Boolean(config.mail.host && config.mail.user);
    case 'home-control':
      return Boolean(config.hass.url && config.hass.token);
    case 'news':
      return true; // public RSS feeds — no credentials required
    case 'custom':
      return true;
  }
}

const configPath = () => join(config.dataDir, 'panels.json');

const defaultConfig: DashboardConfig = {
  panels: [
    { id: 'weather', type: 'weather', title: 'Weather', order: 0, enabled: true, flexExpanded: 3 },
    { id: 'mail', type: 'mail', title: 'Mail', order: 1, enabled: true, flexExpanded: 4 },
    {
      id: 'home-control',
      type: 'home-control',
      title: 'Home',
      order: 2,
      enabled: true,
      flexExpanded: 3,
    },
    { id: 'news', type: 'news', title: 'News', order: 3, enabled: true, flexExpanded: 5 },
  ],
};

async function loadConfig(): Promise<DashboardConfig> {
  try {
    const raw = await readFile(configPath(), 'utf-8');
    return JSON.parse(raw) as DashboardConfig;
  } catch {
    return defaultConfig;
  }
}

async function saveConfig(cfg: DashboardConfig): Promise<void> {
  await mkdir(config.dataDir, { recursive: true });
  await writeFile(configPath(), JSON.stringify(cfg, null, 2), 'utf-8');
}

const panelRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/panels', async () => {
    const cfg = await loadConfig();
    // Overlay availability: panels whose integration has no credentials are
    // returned as disabled so the frontend hides them. The persisted value
    // is not modified, so they re-enable automatically when credentials are set.
    const panels = cfg.panels.map((p) =>
      isAvailable(p.type) ? p : { ...p, enabled: false },
    );
    return { ...cfg, panels };
  });

  fastify.put<{ Body: DashboardConfig }>('/api/panels', async (req, reply) => {
    await saveConfig(req.body);
    reply.status(204);
    return;
  });

  fastify.patch<{ Params: { id: string }; Body: Partial<PanelConfig> }>(
    '/api/panels/:id',
    async (req, reply) => {
      const cfg = await loadConfig();
      const panel = cfg.panels.find((p) => p.id === req.params.id);
      if (!panel) {
        reply.status(404);
        return { error: 'Panel not found' };
      }
      Object.assign(panel, req.body);
      await saveConfig(cfg);
      return panel;
    },
  );
};

export default panelRoutes;
