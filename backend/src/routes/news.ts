import type { FastifyPluginAsync } from 'fastify';
import { fetchNews, saveDislikes } from '../adapters/news';
import type { DislikeEntry } from '../adapters/news';

const newsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/news', async () => {
    return fetchNews();
  });

  fastify.post<{ Body: Omit<DislikeEntry, 'dislikedAt'> }>(
    '/api/news/dislike',
    async (req, reply) => {
      const { id, title, synopsis } = req.body;
      if (!id || !title) {
        reply.status(400);
        return { error: 'id and title are required' };
      }
      await saveDislikes({
        id,
        title,
        synopsis: synopsis ?? '',
        dislikedAt: new Date().toISOString(),
      });
      reply.status(204);
    },
  );
};

export default newsRoutes;
