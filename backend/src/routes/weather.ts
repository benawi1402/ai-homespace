import type { FastifyPluginAsync } from 'fastify';
import { fetchWeather } from '../adapters/weather';

const weatherRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/weather', async (_req, reply) => {
    try {
      return await fetchWeather();
    } catch (err) {
      fastify.log.error(err);
      reply.status(503);
      return { error: 'Weather data temporarily unavailable' };
    }
  });
};

export default weatherRoutes;
