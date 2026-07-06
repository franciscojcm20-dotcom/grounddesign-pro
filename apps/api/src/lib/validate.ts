import type { FastifyReply } from 'fastify';
import { z } from 'zod';

/**
 * Valida `data` contra `schema`. Si falla, ya envía la respuesta 400 con un
 * mensaje legible y devuelve undefined — el caller solo necesita `if (!body) return;`.
 * Centraliza el firewall de esquema que antes no existía: los endpoints de
 * cálculo confiaban en comparaciones manuales (`x <= 0`) que un string o
 * `undefined` esquivan silenciosamente (`"abc" <= 0` es `false` en JS).
 */
function parse<S extends z.ZodTypeAny>(schema: S, data: unknown, reply: FastifyReply): z.infer<S> | undefined {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues
      .map(i => `${i.path.length ? i.path.join('.') : 'body'}: ${i.message}`)
      .join('; ');
    reply.code(400).send({ error: message });
    return undefined;
  }
  return result.data;
}

export function parseBody<S extends z.ZodTypeAny>(schema: S, req: { body: unknown }, reply: FastifyReply): z.infer<S> | undefined {
  return parse(schema, req.body, reply);
}

export function parseParams<S extends z.ZodTypeAny>(schema: S, req: { params: unknown }, reply: FastifyReply): z.infer<S> | undefined {
  return parse(schema, req.params, reply);
}

// ─── Primitivas reutilizables ─────────────────────────────────────────────────

export const num       = () => z.number().finite();
export const pos       = () => num().positive();
export const nonNeg    = () => num().nonnegative();
export const intMin1   = () => z.number().int().min(1);
export const intNonNeg = () => z.number().int().nonnegative();
export const peso      = z.union([z.literal(50), z.literal(70)]).optional();
export const uuidParam = z.object({ id: z.string().uuid() });

export const gelInputSchema = z.object({
  activo:         z.boolean().optional(),
  longVarillaGel: pos(),
  radioVarilla:   pos(),
  rhoGel:         pos(),
  radioConGel:    pos(),
}).optional();
