import Fastify from 'fastify';
import cors from '@fastify/cors';

import { routesSoil }      from './routes/soil.ts';
import { routesGrid }      from './routes/grid.ts';
import { routesConductor } from './routes/conductor.ts';
import { routesVoltages }  from './routes/voltages.ts';

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '0.0.0.0';

const app = Fastify({ logger: { level: 'info' } });

await app.register(cors, { origin: true });

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', async () => ({
  status: 'ok',
  version: '0.1.0',
  engines: '@gdp/engines-math@0.1.0',
}));

// ─── Motores de cálculo ───────────────────────────────────────────────────────
await app.register(routesSoil,      { prefix: '/api/v1/soil' });
await app.register(routesGrid,      { prefix: '/api/v1/grid' });
await app.register(routesConductor, { prefix: '/api/v1/conductor' });
await app.register(routesVoltages,  { prefix: '/api/v1/voltages' });

try {
  await app.listen({ port: PORT, host: HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
