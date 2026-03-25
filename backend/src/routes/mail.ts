import type { FastifyPluginAsync } from 'fastify';
import { fetchMail } from '../adapters/mail';

const mailRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/mail', async (_req, reply) => {
    try {
      return await fetchMail();
    } catch (err) {
      fastify.log.error(err);
      reply.status(503);
      return { error: 'Mail data temporarily unavailable' };
    }
  });
};

export default mailRoutes;
