// tests/api.test.ts — Pruebas de integración de @gdp/api (auth, proyectos, admin, billing)
//
// Usa una base de datos Postgres real (DATABASE_URL) vía Fastify app.inject(),
// sin abrir un socket HTTP. Cada corrida usa un email único para no chocar con
// datos existentes; el usuario de prueba (y sus proyectos, por ON DELETE CASCADE)
// se eliminan al final.
//
// Ejecución: DATABASE_URL=postgres://... node --experimental-strip-types --test tests/api.test.ts

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

// ADMIN_EMAILS se lee una sola vez al importar admin.ts — debe fijarse ANTES
// de construir la app por primera vez.
const RUN_ID = Date.now();
const ADMIN_EMAIL = `admin-test-${RUN_ID}@example.com`;
const USER_EMAIL  = `user-test-${RUN_ID}@example.com`;
process.env.ADMIN_EMAILS = ADMIN_EMAIL;

const { buildApp } = await import('../src/app.ts');
const { sql } = await import('../src/db/client.ts');

const app = await buildApp();

function setCookieToken(res: { headers: Record<string, string | string[] | undefined> }): string {
  const raw = res.headers['set-cookie'];
  const cookieStr = Array.isArray(raw) ? raw[0] : raw;
  const match = /token=([^;]+)/.exec(cookieStr ?? '');
  if (!match) throw new Error('No se encontró la cookie "token" en la respuesta');
  return `token=${match[1]}`;
}

after(async () => {
  await sql`DELETE FROM users WHERE email IN (${ADMIN_EMAIL}, ${USER_EMAIL})`;
  await sql.end();
  await app.close();
});

describe('Auth — registro, login, sesión', () => {
  let userCookie: string;

  it('POST /register con datos válidos crea el usuario y fija la cookie', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/auth/register',
      payload: { email: USER_EMAIL, name: 'Usuario de prueba', password: 'TestPass1234' },
    });
    assert.strictEqual(res.statusCode, 200);
    const body = res.json() as { user: { email: string; name: string } };
    assert.strictEqual(body.user.email, USER_EMAIL);
    assert.strictEqual(body.user.name, 'Usuario de prueba');
    assert.ok(!('password_hash' in body.user), 'la respuesta no debe incluir el hash de la contraseña');
    userCookie = setCookieToken(res);
  });

  it('POST /register con el mismo email devuelve 409 (correo ya registrado)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/auth/register',
      payload: { email: USER_EMAIL, name: 'Otro nombre', password: 'OtraPass1234' },
    });
    assert.strictEqual(res.statusCode, 409);
  });

  it('POST /register con contraseña corta devuelve 400', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/auth/register',
      payload: { email: `short-${RUN_ID}@example.com`, name: 'X', password: '1234567' },
    });
    assert.strictEqual(res.statusCode, 400);
  });

  it('POST /login con credenciales correctas devuelve 200', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: USER_EMAIL, password: 'TestPass1234' },
    });
    assert.strictEqual(res.statusCode, 200);
  });

  it('POST /login con contraseña incorrecta devuelve 401', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: USER_EMAIL, password: 'ContraseñaMala' },
    });
    assert.strictEqual(res.statusCode, 401);
  });

  it('GET /me sin cookie devuelve 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/auth/me' });
    assert.strictEqual(res.statusCode, 401);
  });

  it('GET /me con cookie válida devuelve el usuario', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/v1/auth/me',
      headers: { cookie: userCookie },
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual((res.json() as { user: { email: string } }).user.email, USER_EMAIL);
  });

  it('POST /logout limpia la cookie y devuelve ok', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/logout' });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual((res.json() as { ok: boolean }).ok, true);
  });
});

describe('Proyectos — requieren autenticación, aislados por usuario', () => {
  let userCookie: string;
  let projectId: string;

  before(async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: USER_EMAIL, password: 'TestPass1234' },
    });
    userCookie = setCookieToken(res);
  });

  it('GET /projects sin autenticación devuelve 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/projects' });
    assert.strictEqual(res.statusCode, 401);
  });

  it('POST /projects crea un proyecto del usuario autenticado', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/projects',
      headers: { cookie: userCookie },
      payload: { name: `Proyecto QA ${RUN_ID}`, description: 'Creado por tests de integración' },
    });
    assert.strictEqual(res.statusCode, 201);
    const body = res.json() as { project: { id: string; name: string } };
    assert.strictEqual(body.project.name, `Proyecto QA ${RUN_ID}`);
    projectId = body.project.id;
  });

  it('GET /projects incluye el proyecto recién creado', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/projects', headers: { cookie: userCookie } });
    assert.strictEqual(res.statusCode, 200);
    const body = res.json() as { projects: { id: string }[] };
    assert.ok(body.projects.some(p => p.id === projectId));
  });

  it('GET /projects/:id devuelve el proyecto con sus resultados (vacíos)', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/projects/${projectId}`, headers: { cookie: userCookie } });
    assert.strictEqual(res.statusCode, 200);
    const body = res.json() as { project: { id: string }; results: unknown[] };
    assert.strictEqual(body.project.id, projectId);
    assert.deepStrictEqual(body.results, []);
  });

  it('POST /projects/:id/results guarda un cálculo en el proyecto', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/v1/projects/${projectId}/results`,
      headers: { cookie: userCookie },
      payload: { module: 'rod', inputs: { n: 4 }, outputs: { Rn: 12.3 }, norm: 'IEEE 80-2013' },
    });
    assert.strictEqual(res.statusCode, 201);
  });

  it('DELETE /projects/:id elimina el proyecto', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/api/v1/projects/${projectId}`, headers: { cookie: userCookie } });
    assert.strictEqual(res.statusCode, 200);
  });

  it('GET /projects/:id tras eliminarlo devuelve 404', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/projects/${projectId}`, headers: { cookie: userCookie } });
    assert.strictEqual(res.statusCode, 404);
  });
});

describe('Admin — allowlist explícita por ADMIN_EMAILS (regresión del bypass de dominio)', () => {
  it('GET /admin/stats deniega a un usuario autenticado que no está en ADMIN_EMAILS', async () => {
    const login = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: USER_EMAIL, password: 'TestPass1234' },
    });
    const cookie = setCookieToken(login);
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/stats', headers: { cookie } });
    assert.strictEqual(res.statusCode, 403);
  });

  it('GET /admin/stats permite a un usuario cuyo email está en ADMIN_EMAILS', async () => {
    await app.inject({
      method: 'POST', url: '/api/v1/auth/register',
      payload: { email: ADMIN_EMAIL, name: 'Admin de prueba', password: 'AdminPass1234' },
    });
    const login = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: ADMIN_EMAIL, password: 'AdminPass1234' },
    });
    const cookie = setCookieToken(login);
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/stats', headers: { cookie } });
    assert.strictEqual(res.statusCode, 200);
    const body = res.json() as { summary: { users: number } };
    assert.ok(body.summary.users >= 1);
  });

  it('GET /admin/stats sin autenticación devuelve 401 (antes que la comprobación de admin)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/stats' });
    assert.strictEqual(res.statusCode, 401);
  });
});

describe('Billing — Stripe (planes públicos, checkout protegido, webhook firmado)', () => {
  it('GET /billing/plans es público y devuelve los 3 planes', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/billing/plans' });
    assert.strictEqual(res.statusCode, 200);
    const body = res.json() as { plans: { id: string }[] };
    assert.deepStrictEqual(body.plans.map(p => p.id), ['community', 'individual', 'professional']);
  });

  it('POST /billing/checkout sin autenticación devuelve 401', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/billing/checkout',
      payload: { plan: 'individual' },
    });
    assert.strictEqual(res.statusCode, 401);
  });

  it('POST /billing/webhook sin header stripe-signature devuelve 400', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/billing/webhook',
      payload: { type: 'checkout.session.completed' },
    });
    // 503 si STRIPE_WEBHOOK_SECRET no está configurado en el entorno de pruebas,
    // 400 si lo está pero falta la firma — ambos son el rechazo correcto, nunca 200.
    assert.ok([400, 503].includes(res.statusCode), `esperaba 400 o 503, obtuvo ${res.statusCode}`);
  });

  it('POST /billing/webhook con firma inválida es rechazado (nunca 200 sin verificar)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/billing/webhook',
      headers: { 'stripe-signature': 'firma-invalida-de-prueba' },
      payload: { type: 'checkout.session.completed', data: { object: {} } },
    });
    assert.notStrictEqual(res.statusCode, 200);
  });
});

describe('Validación de esquema (zod) — firewall de tipos en endpoints de cálculo', () => {
  let userCookie: string;

  before(async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: USER_EMAIL, password: 'TestPass1234' },
    });
    userCookie = setCookieToken(res);
  });

  it('POST /soil/wenner con "r" como string devuelve 400 en vez de propagar NaN a rhoA (200)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/soil/wenner',
      payload: { readings: [{ a: 1, r: 'no-es-un-numero' }] },
    });
    assert.strictEqual(res.statusCode, 400);
    assert.match((res.json() as { error: string }).error, /r/);
  });

  it('POST /soil/wenner con readings vacío devuelve 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/soil/wenner', payload: { readings: [] } });
    assert.strictEqual(res.statusCode, 400);
  });

  it('POST /grid/rod sin el campo "n" devuelve 400 (antes: undefined pasaba al motor sin control)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/grid/rod',
      payload: { rho: 100, L: 2.4, radius: 0.008, spacing: 3, iFalla: 8000 },
    });
    assert.strictEqual(res.statusCode, 400);
  });

  it('POST /grid/rod con rho negativo devuelve 400 (antes: "rho<=0" nunca se validaba en este endpoint)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/grid/rod',
      payload: { rho: -100, L: 2.4, radius: 0.008, n: 4, spacing: 3, iFalla: 8000 },
    });
    assert.strictEqual(res.statusCode, 400);
  });

  it('POST /fault-analysis con tipoFalla fuera del enum es rechazado', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/fault-analysis/short-circuit',
      payload: { fuente: { un: 13.2, ikss3: 8, xr: 5 }, tipoFalla: 'DROP TABLE users' },
    });
    assert.strictEqual(res.statusCode, 400);
  });

  it('POST /fault-analysis con splitFactor.method="manual" sin manualValue es rechazado', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/fault-analysis',
      payload: { If: 8000, tFalla: 0.5, xr: 20, splitFactor: { method: 'manual' } },
    });
    assert.strictEqual(res.statusCode, 400);
  });

  it('GET /projects/:id con un id no-UUID devuelve 400 (antes: 500 de Postgres por sintaxis de uuid inválida)', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/v1/projects/no-es-un-uuid',
      headers: { cookie: userCookie },
    });
    assert.strictEqual(res.statusCode, 400);
  });

  it('POST /auth/register con email inválido devuelve 400', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/auth/register',
      payload: { email: 'no-es-un-email', name: 'X', password: 'TestPass1234' },
    });
    assert.strictEqual(res.statusCode, 400);
  });

  it('un payload válido sigue funcionando end-to-end tras agregar la validación (sin regresión)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/grid/rod',
      payload: { rho: 100, L: 2.4, radius: 0.008, n: 4, spacing: 3, iFalla: 8000 },
    });
    assert.strictEqual(res.statusCode, 200);
    const body = res.json() as { Rn: number };
    assert.ok(body.Rn > 0);
  });
});
