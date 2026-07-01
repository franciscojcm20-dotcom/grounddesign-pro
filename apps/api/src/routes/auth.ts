import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { sql } from '../db/client.ts';
import type { User } from '../db/client.ts';
import { sendPasswordReset, sendWelcome } from '../lib/mailer.ts';

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

    // Fire-and-forget welcome email
    sendWelcome({ to: user.email, name: user.name }).catch(err =>
      app.log.warn({ err }, 'welcome email failed')
    );

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

    const [user] = await sql<User[]>`SELECT id FROM users WHERE email = ${email.toLowerCase()} LIMIT 1`;
    if (user) {
      // Generate a secure random token, store its hash (avoid token leakage in DB breach)
      const rawToken  = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await sql`
        INSERT INTO password_reset_tokens (user_id, token_hash)
        VALUES (${user.id}, ${tokenHash})
      `;

      // Send email (fire-and-forget; always return 200 to prevent enumeration)
      sendPasswordReset({ to: user.email, name: user.name, token: rawToken }).catch(err =>
        app.log.warn({ err }, 'password-reset email failed')
      );
    }

    // Always 200 — prevent email enumeration
    return { ok: true, message: 'Si la cuenta existe, recibirás un correo con instrucciones.' };
  });

  // POST /api/v1/auth/reset-password
  app.post('/reset-password', async (req, reply) => {
    const { token, password } = req.body as { token?: string; password?: string };
    if (!token || !password) return reply.code(400).send({ error: 'token y password son requeridos' });
    if (password.length < 8) return reply.code(400).send({ error: 'La contraseña debe tener al menos 8 caracteres' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const [record] = await sql<{ id: string; user_id: string; expires_at: Date; used_at: Date | null }[]>`
      SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ${tokenHash}
    `;

    if (!record) return reply.code(400).send({ error: 'Token inválido o expirado' });
    if (record.used_at) return reply.code(400).send({ error: 'Este enlace ya fue utilizado' });
    if (new Date(record.expires_at) < new Date()) return reply.code(400).send({ error: 'El enlace ha expirado' });

    const password_hash = await bcrypt.hash(password, 12);
    await sql`UPDATE users SET password_hash = ${password_hash} WHERE id = ${record.user_id}`;
    await sql`UPDATE password_reset_tokens SET used_at = now() WHERE id = ${record.id}`;

    return { ok: true, message: 'Contraseña actualizada correctamente' };
  });

  // GET /api/v1/auth/me
  app.get('/me', { preHandler: [app.authenticate] }, async (req) => {
    const { sub } = req.user as { sub: string };
    const [user] = await sql<User[]>`SELECT id, email, name, plan, created_at FROM users WHERE id = ${sub}`;
    if (!user) throw { statusCode: 404, message: 'Usuario no encontrado' };
    return { user };
  });
}
