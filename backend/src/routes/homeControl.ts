import type { FastifyPluginAsync } from 'fastify';
import { fetchHomeControl, toggleDevice, setBrightness } from '../adapters/homeControl';

interface ToggleParams {
  entityId: string;
}

const homeControlRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/home/devices', async (_req, reply) => {
    try {
      return await fetchHomeControl();
    } catch (err) {
      fastify.log.error(err);
      reply.status(503);
      return { error: 'Home control data temporarily unavailable' };
    }
  });

  fastify.post<{ Params: ToggleParams }>(
    '/api/home/devices/:entityId/toggle',
    async (req, reply) => {
      try {
        // entity_id is already URL-decoded by Fastify
        await toggleDevice(req.params.entityId);
        reply.status(204);
        return;
      } catch (err) {
        fastify.log.error(err);
        reply.status(503);
        return { error: 'Toggle failed' };
      }
    },
  );

  fastify.post<{ Body: { brightness: number } }>(
    '/api/home/brightness',
    async (req, reply) => {
      const { brightness } = req.body;
      if (typeof brightness !== 'number' || brightness < 1 || brightness > 100) {
        reply.status(400);
        return { error: 'brightness must be a number between 1 and 100' };
      }
      try {
        await setBrightness(brightness);
        reply.status(204);
        return;
      } catch (err) {
        fastify.log.error(err);
        reply.status(503);
        return { error: 'Set brightness failed' };
      }
    },
  );
};

export default homeControlRoutes;
