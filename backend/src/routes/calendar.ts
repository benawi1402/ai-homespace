import type { FastifyPluginAsync } from 'fastify';
import { fetchCalendar } from '../adapters/calendar';

const calendarRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/calendar/events', async (_req, reply) => {
    try {
      return await fetchCalendar();
    } catch (err) {
      fastify.log.error(err, 'Calendar fetch failed');
      reply.status(502);
      return { error: 'Failed to fetch calendar events' };
    }
  });
};

export default calendarRoutes;
