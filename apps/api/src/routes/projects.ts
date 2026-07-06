import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { sql } from '../db/client.ts';
import type { Project, CalcResult } from '../db/client.ts';
import { parseBody, parseParams, uuidParam } from '../lib/validate.ts';

const createProjectBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
});

const saveResultBodySchema = z.object({
  module: z.string().trim().min(1).max(100),
  inputs: z.unknown(),
  outputs: z.unknown(),
  norm: z.string().max(200).optional(),
}).refine(b => b.inputs !== undefined && b.inputs !== null, { message: 'inputs es requerido', path: ['inputs'] })
  .refine(b => b.outputs !== undefined && b.outputs !== null, { message: 'outputs es requerido', path: ['outputs'] });

export async function projectRoutes(app: FastifyInstance) {
  // All project routes require auth
  app.addHook('preHandler', app.authenticate);

  function userId(req: { user: unknown }): string {
    return (req.user as { sub: string }).sub;
  }

  // GET /api/v1/projects
  app.get('/', async (req) => {
    const rows = await sql<Project[]>`
      SELECT id, name, description, created_at, updated_at
      FROM projects WHERE user_id = ${userId(req)}
      ORDER BY updated_at DESC
    `;
    return { projects: rows };
  });

  // POST /api/v1/projects
  app.post('/', async (req, reply) => {
    const body = parseBody(createProjectBodySchema, req, reply);
    if (!body) return;
    const { name, description } = body;

    const [p] = await sql<Project[]>`
      INSERT INTO projects (user_id, name, description)
      VALUES (${userId(req)}, ${name}, ${description ?? null})
      RETURNING *
    `;
    return reply.code(201).send({ project: p });
  });

  // GET /api/v1/projects/:id
  app.get('/:id', async (req, reply) => {
    const params = parseParams(uuidParam, req, reply);
    if (!params) return;
    const [p] = await sql<Project[]>`
      SELECT * FROM projects WHERE id = ${params.id} AND user_id = ${userId(req)}
    `;
    if (!p) return reply.code(404).send({ error: 'Proyecto no encontrado' });

    const results = await sql<CalcResult[]>`
      SELECT id, module, inputs, outputs, norm, created_at
      FROM calc_results WHERE project_id = ${p.id}
      ORDER BY created_at DESC
    `;
    return { project: p, results };
  });

  // DELETE /api/v1/projects/:id
  app.delete('/:id', async (req, reply) => {
    const params = parseParams(uuidParam, req, reply);
    if (!params) return;
    const res = await sql`
      DELETE FROM projects WHERE id = ${params.id} AND user_id = ${userId(req)}
    `;
    if (res.count === 0) return reply.code(404).send({ error: 'Proyecto no encontrado' });
    return { ok: true };
  });

  // POST /api/v1/projects/:id/results
  app.post('/:id/results', async (req, reply) => {
    const params = parseParams(uuidParam, req, reply);
    if (!params) return;
    const [p] = await sql<Project[]>`SELECT id FROM projects WHERE id = ${params.id} AND user_id = ${userId(req)}`;
    if (!p) return reply.code(404).send({ error: 'Proyecto no encontrado' });

    const body = parseBody(saveResultBodySchema, req, reply);
    if (!body) return;
    const { module, inputs, outputs, norm } = body;

    const [r] = await sql<CalcResult[]>`
      INSERT INTO calc_results (project_id, module, inputs, outputs, norm)
      VALUES (${p.id}, ${module}, ${sql.json(inputs as Parameters<typeof sql.json>[0])}, ${sql.json(outputs as Parameters<typeof sql.json>[0])}, ${norm ?? null})
      RETURNING *
    `;

    // Update project timestamp
    await sql`UPDATE projects SET updated_at = now() WHERE id = ${p.id}`;

    return reply.code(201).send({ result: r });
  });
}
