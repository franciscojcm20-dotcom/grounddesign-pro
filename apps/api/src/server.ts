import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';

import { routesSoil }      from './routes/soil.ts';
import { faultAnalysisRoutes } from './routes/faultAnalysis.ts';
import { routesGrid }      from './routes/grid.ts';
import { routesConductor } from './routes/conductor.ts';
import { routesVoltages }  from './routes/voltages.ts';
import { routesGpr }       from './routes/gpr.ts';
import { routesSafety }    from './routes/safety.ts';
import { authRoutes }      from './routes/auth.ts';
import { projectRoutes }   from './routes/projects.ts';
import { reportRoutes }    from './routes/report.ts';
import { adminRoutes }     from './routes/admin.ts';
import { billingRoutes }   from './routes/billing.ts';
import { valorizacionRoutes } from './routes/valorizacion.ts';

const PORT       = Number(process.env.PORT ?? 3001);
// 127.0.0.1 por defecto: evita exponer la API a la red local/externa. Solo se usa 0.0.0.0
// si se define HOST explícitamente (p. ej. en un contenedor Docker de producción).
const HOST       = process.env.HOST ?? '127.0.0.1';
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

const app = Fastify({ logger: { level: 'info' } });

const DEFAULT_WEB_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
await app.register(cors, {
  origin: process.env.WEB_URL ? [process.env.WEB_URL] : DEFAULT_WEB_ORIGINS,
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
await app.register(faultAnalysisRoutes, { prefix: '/api/v1/fault-analysis' });
await app.register(routesGrid,      { prefix: '/api/v1/grid' });
await app.register(routesConductor, { prefix: '/api/v1/conductor' });
await app.register(routesVoltages,  { prefix: '/api/v1/voltages' });
await app.register(routesGpr,       { prefix: '/api/v1/gpr' });
await app.register(routesSafety,    { prefix: '/api/v1/safety' });

// ─── Auth + Proyectos ─────────────────────────────────────────────────────────
await app.register(authRoutes,    { prefix: '/api/v1/auth' });
await app.register(projectRoutes, { prefix: '/api/v1/projects' });

// ─── Reporte PDF ──────────────────────────────────────────────────────────────
await app.register(reportRoutes, { prefix: '/api/v1/report' });

// ─── Cubicación y valorización económica ─────────────────────────────────────
await app.register(valorizacionRoutes, { prefix: '/api/v1/valorizacion' });

// ─── Admin ────────────────────────────────────────────────────────────────────
await app.register(adminRoutes, { prefix: '/api/v1/admin' });

// ─── Billing (Stripe) ─────────────────────────────────────────────────────────
await app.register(billingRoutes, { prefix: '/api/v1/billing' });

try {
  await app.listen({ port: PORT, host: HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
