import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import { sql } from '../db/client.ts';
import type { User } from '../db/client.ts';
import { sendPasswordReset, sendWelcome } from '../lib/mailer.ts';
import { parseBody } from '../lib/validate.ts';
import { COUNTRY_OPTIONS, NORMATIVE_PROFILES, getProfileForCountry } from '@gdp/engines-math';

// bcrypt trunca/ignora bytes más allá de 72 — limitar el largo evita además
// que un cliente fuerce un hash costoso sobre un string arbitrariamente grande.
const passwordSchema = z.string().min(8).max(72);
const emailSchema    = z.string().trim().toLowerCase().email().max(254);
const countryCodeSchema = z.enum(COUNTRY_OPTIONS.map(c => c.code) as [string, ...string[]]);
const normativeProfileIdSchema = z.enum(NORMATIVE_PROFILES.map(p => p.id) as [string, ...string[]]);

// Shape de usuario expuesto a la persona usuaria (camelCase), tal como lo
// devuelven las consultas con alias — distinto del shape crudo de la tabla (User).
interface PublicUser {
  id: string;
  email: string;
  name: string;
  plan: 'community' | 'individual' | 'professional';
  created_at: Date;
  countryCode: string | null;
  normativeProfileId: string | null;
  rgRelaxedConditionsMet: boolean;
  designerTitle: string | null;
  designerLicense: string | null;
  designerCompany: string | null;
  designerLogo: string | null;
}

// Identificación profesional del proyectista — el logo viaja como data URL PNG/JPEG
// con tope de 700 KB codificado (≈500 KB de imagen); string vacío limpia el campo.
const designerLogoSchema = z.string().max(700_000).refine(
  v => v === '' || /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v),
  { message: 'El logo debe ser una imagen PNG o JPEG en formato data URL base64' },
);

const registerBodySchema = z.object({
  email: emailSchema, name: z.string().trim().min(1).max(200), password: passwordSchema,
  countryCode: countryCodeSchema.optional(),
});
const loginBodySchema = z.object({ email: emailSchema, password: z.string().min(1).max(200) });
const forgotPasswordBodySchema = z.object({ email: emailSchema });
const resetPasswordBodySchema = z.object({ token: z.string().min(1).max(256), password: passwordSchema });
const updateMeBodySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  currentPassword: z.string().max(200).optional(),
  newPassword: passwordSchema.optional(),
  countryCode: countryCodeSchema.optional(),
  normativeProfileId: normativeProfileIdSchema.optional(),
  rgRelaxedConditionsMet: z.boolean().optional(),
  designerTitle: z.string().trim().max(200).optional(),
  designerLicense: z.string().trim().max(200).optional(),
  designerCompany: z.string().trim().max(200).optional(),
  designerLogo: designerLogoSchema.optional(),
});

export async function authRoutes(app: FastifyInstance) {

  // POST /api/v1/auth/register
  app.post('/register', async (req, reply) => {
    const body = parseBody(registerBodySchema, req, reply);
    if (!body) return;
    const { email, name, password, countryCode } = body;

    const existing = await sql<User[]>`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) return reply.code(409).send({ error: 'El correo ya está registrado' });

    // El país fija el perfil normativo por defecto de la cuenta (norma nacional
    // verificada si existe, o la norma internacional madre IEEE 80/81 si no) —
    // queda editable después en Configuración.
    const normativeProfileId = getProfileForCountry(countryCode).id;

    const password_hash = await bcrypt.hash(password, 12);
    const [user] = await sql<PublicUser[]>`
      INSERT INTO users (email, name, password_hash, country_code, normative_profile_id)
      VALUES (${email}, ${name}, ${password_hash}, ${countryCode ?? null}, ${normativeProfileId})
      RETURNING id, email, name, plan, created_at,
        country_code AS "countryCode", normative_profile_id AS "normativeProfileId",
        rg_relaxed_conditions_met AS "rgRelaxedConditionsMet",
        designer_title AS "designerTitle", designer_license AS "designerLicense",
        designer_company AS "designerCompany", designer_logo AS "designerLogo"
    `;
    if (!user) return reply.code(500).send({ error: 'No se pudo crear el usuario' });

    const token = app.jwt.sign({ sub: user.id, email: user.email, plan: user.plan }, { expiresIn: '7d' });
    reply.setCookie('token', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });

    // Fire-and-forget welcome email
    sendWelcome({ to: user.email, name: user.name }).catch(err =>
      app.log.warn({ err }, 'welcome email failed')
    );

    return { user };
  });

  // POST /api/v1/auth/login
  app.post('/login', async (req, reply) => {
    const body = parseBody(loginBodySchema, req, reply);
    if (!body) return;
    const { email, password } = body;

    const [user] = await sql<User[]>`SELECT * FROM users WHERE email = ${email}`;
    if (!user) return reply.code(401).send({ error: 'Credenciales inválidas' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return reply.code(401).send({ error: 'Credenciales inválidas' });

    const token = app.jwt.sign({ sub: user.id, email: user.email, plan: user.plan }, { expiresIn: '7d' });
    reply.setCookie('token', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
    return {
      user: {
        id: user.id, email: user.email, name: user.name, plan: user.plan,
        countryCode: user.country_code, normativeProfileId: user.normative_profile_id,
        rgRelaxedConditionsMet: user.rg_relaxed_conditions_met,
        designerTitle: user.designer_title, designerLicense: user.designer_license,
        designerCompany: user.designer_company, designerLogo: user.designer_logo,
      },
    };
  });

  // POST /api/v1/auth/logout
  app.post('/logout', async (_req, reply) => {
    reply.clearCookie('token', { path: '/' });
    return { ok: true };
  });

  // POST /api/v1/auth/forgot-password
  app.post('/forgot-password', async (req, reply) => {
    const body = parseBody(forgotPasswordBodySchema, req, reply);
    if (!body) return;
    const { email } = body;

    const [user] = await sql<User[]>`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
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
    const body = parseBody(resetPasswordBodySchema, req, reply);
    if (!body) return;
    const { token, password } = body;

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
    const [user] = await sql<PublicUser[]>`
      SELECT id, email, name, plan, created_at,
        country_code AS "countryCode", normative_profile_id AS "normativeProfileId",
        rg_relaxed_conditions_met AS "rgRelaxedConditionsMet",
        designer_title AS "designerTitle", designer_license AS "designerLicense",
        designer_company AS "designerCompany", designer_logo AS "designerLogo"
      FROM users WHERE id = ${sub}
    `;
    if (!user) throw { statusCode: 404, message: 'Usuario no encontrado' };
    return { user };
  });

  // PUT /api/v1/auth/me — update name, password, país y/o preferencias normativas
  app.put('/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = parseBody(updateMeBodySchema, req, reply);
    if (!body) return;
    const { name, currentPassword, newPassword, countryCode, normativeProfileId, rgRelaxedConditionsMet,
      designerTitle, designerLicense, designerCompany, designerLogo } = body;

    const [user] = await sql<User[]>`SELECT * FROM users WHERE id = ${sub}`;
    if (!user) return reply.code(404).send({ error: 'Usuario no encontrado' });

    // Update name
    if (name && name !== user.name) {
      await sql`UPDATE users SET name = ${name} WHERE id = ${sub}`;
    }

    // Update password
    if (newPassword) {
      if (!currentPassword) return reply.code(400).send({ error: 'Se requiere la contraseña actual' });
      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) return reply.code(401).send({ error: 'Contraseña actual incorrecta' });
      const hash = await bcrypt.hash(newPassword, 12);
      await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${sub}`;
    }

    // Update país (y, si no se especifica un perfil normativo explícito, reasigna
    // el perfil por defecto de ese país — norma nacional verificada o IEEE 80/81)
    if (countryCode !== undefined) {
      await sql`UPDATE users SET country_code = ${countryCode} WHERE id = ${sub}`;
      if (normativeProfileId === undefined) {
        await sql`UPDATE users SET normative_profile_id = ${getProfileForCountry(countryCode).id} WHERE id = ${sub}`;
      }
    }

    // Update perfil normativo (override manual, independiente del país)
    if (normativeProfileId !== undefined) {
      await sql`UPDATE users SET normative_profile_id = ${normativeProfileId} WHERE id = ${sub}`;
    }

    // Update declaración de condiciones de relajación (ej. RIC N°06 Cl. 6.2.1/6.2.2)
    if (rgRelaxedConditionsMet !== undefined) {
      await sql`UPDATE users SET rg_relaxed_conditions_met = ${rgRelaxedConditionsMet} WHERE id = ${sub}`;
    }

    // Update identificación profesional del proyectista (string vacío limpia el campo)
    if (designerTitle !== undefined)   await sql`UPDATE users SET designer_title   = ${designerTitle   || null} WHERE id = ${sub}`;
    if (designerLicense !== undefined) await sql`UPDATE users SET designer_license = ${designerLicense || null} WHERE id = ${sub}`;
    if (designerCompany !== undefined) await sql`UPDATE users SET designer_company = ${designerCompany || null} WHERE id = ${sub}`;
    if (designerLogo !== undefined)    await sql`UPDATE users SET designer_logo    = ${designerLogo    || null} WHERE id = ${sub}`;

    const [updated] = await sql<PublicUser[]>`
      SELECT id, email, name, plan, created_at,
        country_code AS "countryCode", normative_profile_id AS "normativeProfileId",
        rg_relaxed_conditions_met AS "rgRelaxedConditionsMet",
        designer_title AS "designerTitle", designer_license AS "designerLicense",
        designer_company AS "designerCompany", designer_logo AS "designerLogo"
      FROM users WHERE id = ${sub}
    `;
    return { ok: true, user: updated };
  });
}
