import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';

import { routesSoil }      from './routes/soil.ts';
import { routesGrid }      from './routes/grid.ts';
import { routesConductor } from './routes/conductor.ts';
import { routesVoltages }  from './routes/voltages.ts';
import { routesGpr }       from './routes/gpr.ts';
import { authRoutes }      from './routes/auth.ts';
import { projectRoutes }   from './routes/projects.ts';
import { reportRoutes }    from './routes/report.ts';
import { adminRoutes }     from './routes/admin.ts';

const PORT       = Number(process.env.PORT ?? 3001);
const HOST       = process.env.HOST ?? '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

const app = Fastify({ logger: { level: 'info' } });

await app.register(cors, {
  origin: process.env.WEB_URL ?? 'http://localhost:3000',
  credentials: true,
});
await app.register(cookie);
await app.register(rateLimit, {
  global: true,
  max: 100,
  timeWindow: '1 minute',
  // Auth endpoints: stricter
  keyGenerator: (req) => req.ip,
});
await app.register(jwt, {
  secret: JWT_SECRET,
  cookie: { cookieName: 'token', signed: false },
});

app.decorate('authenticate', async function (req: Parameters<typeof app.authenticate>[0], reply: Parameters<typeof app.authenticate>[1]) {
  try {
    await req.jwtVerify();
  } catch {
    reply.code(401).send({ error: 'No autorizado' });
  }
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', async () => ({
  status: 'ok',
  version: '0.3.0',
  engines: '@gdp/engines-math@0.1.0',
  pdf: '@gdp/pdf-engine@0.1.0',
}));

// ─── Motores de cálculo ───────────────────────────────────────────────────────
await app.register(routesSoil,      { prefix: '/api/v1/soil' });
await app.register(routesGrid,      { prefix: '/api/v1/grid' });
await app.register(routesConductor, { prefix: '/api/v1/conductor' });
await app.register(routesVoltages,  { prefix: '/api/v1/voltages' });
await app.register(routesGpr,       { prefix: '/api/v1/gpr' });

// ─── Auth + Proyectos ─────────────────────────────────────────────────────────
await app.register(authRoutes,    { prefix: '/api/v1/auth' });
await app.register(projectRoutes, { prefix: '/api/v1/projects' });

// ─── Reporte PDF ──────────────────────────────────────────────────────────────
await app.register(reportRoutes, { prefix: '/api/v1/report' });

// ─── Admin ────────────────────────────────────────────────────────────────────
await app.register(adminRoutes, { prefix: '/api/v1/admin' });

try {
  await app.listen({ port: PORT, host: HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
