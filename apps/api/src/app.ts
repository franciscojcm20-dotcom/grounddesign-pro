import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';

import { initSentry, captureException } from './lib/sentry.ts';

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

/**
 * Construye la instancia de Fastify con todos los plugins y rutas registradas,
 * sin escuchar en ningún puerto — separado de server.ts para poder importarla
 * en tests (vía app.inject()) sin abrir un socket real.
 */
export async function buildApp(): Promise<FastifyInstance> {
  initSentry();

  const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
  const HOST       = process.env.HOST ?? '127.0.0.1';

  // El fallback de JWT_SECRET es público (está en este archivo) — si el proceso
  // escucha más allá de localhost sin haber configurado JWT_SECRET, cualquiera
  // podría forjar tokens válidos. Se rehúsa a arrancar en ese caso en vez de
  // exponerse en silencio con un secreto conocido.
  if (HOST !== '127.0.0.1' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET debe configurarse explícitamente cuando HOST no es 127.0.0.1 (despliegue expuesto).');
  }

  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
      // Cada línea de log ya trae reqId (correlación por request); se agrega
      // el entorno para poder filtrar en CloudWatch cuando hay más de un
      // ambiente (prod/staging) escribiendo al mismo log group.
      base: { environment: process.env.NODE_ENV ?? 'development' },
    },
  });

  // Reporta a Sentry (si está configurado) además del log habitual de Fastify —
  // no reemplaza la respuesta de error, solo la observa. Nunca se envía el body
  // del request (podría contener contraseñas u otros datos sensibles), solo
  // método, ruta e id de request para poder correlacionar con los logs.
  app.addHook('onError', async (req, _reply, error) => {
    captureException(error, { method: req.method, url: req.url, reqId: req.id });
  });

  const DEFAULT_WEB_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  await app.register(cors, {
    origin: process.env.WEB_URL ? [process.env.WEB_URL] : DEFAULT_WEB_ORIGINS,
    credentials: true,
  });
  await app.register(cookie);

  // Preserva el cuerpo crudo (Buffer) en req.rawBody además de parsear el JSON
  // normalmente — lo necesita el webhook de Stripe (billing.ts) para verificar
  // la firma HMAC contra los bytes exactos recibidos, no contra el objeto ya
  // parseado/re-serializado (que no coincidiría byte a byte con lo que Stripe firmó).
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    (req as unknown as { rawBody?: Buffer }).rawBody = body as Buffer;
    if ((body as Buffer).length === 0) { done(null, undefined); return; }
    try {
      done(null, JSON.parse((body as Buffer).toString('utf8')));
    } catch (err) {
      done(err as Error, undefined);
    }
  });
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

  return app;
}
