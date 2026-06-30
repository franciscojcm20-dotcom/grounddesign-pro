import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { sql } from '../db/client.ts';
import type { User } from '../db/client.ts';

export async function authRoutes(app: FastifyInstance) {

  // POST /api/v1/auth/register
  app.post('/register', async (req, reply) => {
    const { email, name, password } = req.body as { email: string; name: string; password: string };

    if (!email || !name || !password) return reply.code(400).send({ error: 'email, name y password son requeridos' });
    if (password.length < 8) return reply.code(400).send({ error: 'La contraseña debe tener al menos 8 caracteres' });

    const existing = await sql<User[]>`SELECT id FROM users WHERE email = ${email.toLowerCase()}`;
    if (existing.length > 0) return reply.code(409).send({ error: 'El correo ya está registrado' });

    const password_hash = await bcrypt.hash(password, 12);
    const [user] = await sql<User[]>`
      INSERT INTO users (email, name, password_hash)
      VALUES (${email.toLowerCase()}, ${name.trim()}, ${password_hash})
      RETURNING id, email, name, plan, created_at
    `;

    const token = app.jwt.sign({ sub: user.id, email: user.email, plan: user.plan }, { expiresIn: '7d' });
    reply.setCookie('token', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
    return { user: { id: user.id, email: user.email, name: user.name, plan: user.plan } };
  });

  // POST /api/v1/auth/login
  app.post('/login', async (req, reply) => {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) return reply.code(400).send({ error: 'email y password son requeridos' });

    const [user] = await sql<User[]>`SELECT * FROM users WHERE email = ${email.toLowerCase()}`;
    if (!user) return reply.code(401).send({ error: 'Credenciales inválidas' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return reply.code(401).send({ error: 'Credenciales inválidas' });

    const token = app.jwt.sign({ sub: user.id, email: user.email, plan: user.plan }, { expiresIn: '7d' });
    reply.setCookie('token', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
    return { user: { id: user.id, email: user.email, name: user.name, plan: user.plan } };
  });

  // POST /api/v1/auth/logout
  app.post('/logout', async (_req, reply) => {
    reply.clearCookie('token', { path: '/' });
    return { ok: true };
  });

  // POST /api/v1/auth/forgot-password
  app.post('/forgot-password', async (req, reply) => {
    const { email } = req.body as { email?: string };
    if (!email) return reply.code(400).send({ error: 'email es requerido' });
    // Always return 200 to avoid email enumeration — email sending is a future integration
    await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()} LIMIT 1`;
    return { ok: true, message: 'Si la cuenta existe, recibirás un correo con instrucciones.' };
  });

  // GET /api/v1/auth/me
  app.get('/me', { preHandler: [app.authenticate] }, async (req) => {
    const { sub } = req.user as { sub: string };
    const [user] = await sql<User[]>`SELECT id, email, name, plan, created_at FROM users WHERE id = ${sub}`;
    if (!user) throw { statusCode: 404, message: 'Usuario no encontrado' };
    return { user };
  });
}
