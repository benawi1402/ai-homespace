import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config';
import weatherRoutes from './routes/weather';
import mailRoutes from './routes/mail';
import homeControlRoutes from './routes/homeControl';
import panelRoutes from './routes/panels';
import newsRoutes from './routes/news';
import calendarRoutes from './routes/calendar';

async function main() {
  const fastify = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'warn' : 'info',
    },
  });

  await fastify.register(cors, { origin: true });

  await fastify.register(weatherRoutes);
  await fastify.register(mailRoutes);
  await fastify.register(homeControlRoutes);
  await fastify.register(panelRoutes);
  await fastify.register(newsRoutes);
  await fastify.register(calendarRoutes);

  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main().catch(console.error);
