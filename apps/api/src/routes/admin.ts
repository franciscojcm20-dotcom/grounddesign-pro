import type { FastifyInstance } from 'fastify';
import { sql } from '../db/client.ts';

// Allowlist explícita por variable de entorno — un email de registro no
// verifica propiedad del dominio, así que "termina en @empresa.com" no es
// una comprobación de autorización válida (cualquiera puede registrarse con
// cualquier email). Sin ADMIN_EMAILS configurado, nadie es admin (seguro por
// defecto), en vez de abrir el acceso cuando NODE_ENV no es 'production'.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

export async function adminRoutes(app: FastifyInstance) {

  // GET /api/v1/admin/stats — resumen general de la plataforma
  app.get('/stats', { preHandler: [app.authenticate] }, async (req, reply) => {
    const jwt = req.user as { sub: string; email: string };

    const isAdmin = ADMIN_EMAILS.includes(jwt.email.toLowerCase());
    if (!isAdmin) return reply.code(403).send({ error: 'Acceso denegado' });

    const [users, projects, calcs, planDist] = await Promise.all([
      sql<{ count: string }[]>`SELECT COUNT(*)::text AS count FROM users`,
      sql<{ count: string }[]>`SELECT COUNT(*)::text AS count FROM projects`,
      sql<{ count: string }[]>`SELECT COUNT(*)::text AS count FROM calc_results`,
      sql<{ plan: string; count: string }[]>`
        SELECT plan, COUNT(*)::text AS count FROM users GROUP BY plan ORDER BY count DESC
      `,
    ]);

    const recentUsers = await sql<{ id: string; email: string; name: string; plan: string; created_at: Date }[]>`
      SELECT id, email, name, plan, created_at FROM users ORDER BY created_at DESC LIMIT 10
    `;

    const moduleUsage = await sql<{ module: string; count: string }[]>`
      SELECT module, COUNT(*)::text AS count FROM calc_results GROUP BY module ORDER BY count DESC
    `;

    return {
      summary: {
        users:    Number(users[0]?.count   ?? 0),
        projects: Number(projects[0]?.count ?? 0),
        calcs:    Number(calcs[0]?.count    ?? 0),
      },
      planDistribution: planDist.map(r => ({ plan: r.plan, count: Number(r.count) })),
      recentUsers,
      moduleUsage: moduleUsage.map(r => ({ module: r.module, count: Number(r.count) })),
    };
  });
}
