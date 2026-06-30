import type { FastifyInstance } from 'fastify';
import {
  sverakGridResistance,
  computeMalla,
  computeGel,
  type MallaInput,
  type GelInput,
} from '@gdp/engines-math';

export async function routesGrid(app: FastifyInstance): Promise<void> {

  // POST /api/v1/grid/resistance
  // Body: MallaInput + optional gel
  app.post<{
    Body: MallaInput & {
      gel?: GelInput & { activo?: boolean };
    };
  }>('/resistance', async (req, reply) => {
    const { gel, ...mallaFields } = req.body;

    const malla: MallaInput = mallaFields;

    if (malla.largo <= 0 || malla.ancho <= 0) {
      return reply.code(400).send({ error: 'largo y ancho deben ser positivos' });
    }

    let gelInfo: { activo: boolean; rhoEff: number } | null = null;

    if (gel?.activo) {
      const gelResult = computeGel(gel, malla.rho);
      gelInfo = { activo: true, rhoEff: gelResult.rhoEff };
    }

    const result = computeMalla(malla, gelInfo);

    const compliance = {
      rg1ohm: { pass: result.Rg <= 1,   limit: '≤ 1 Ω',  norm: 'IEEE 80-2013 Cl. 1' },
      rg5ohm: { pass: result.Rg <= 5,   limit: '≤ 5 Ω',  norm: 'typical utility' },
    };

    return { ...result, gelInfo, compliance, norm: 'IEEE Std 80-2013 Cl. 14.2' };
  });

  // POST /api/v1/grid/gel
  // Body: GelInput + rhoSuelo
  app.post<{ Body: GelInput & { rhoSuelo: number } }>('/gel', async (req, reply) => {
    const { rhoSuelo, ...gel } = req.body;
    if (rhoSuelo <= 0) {
      return reply.code(400).send({ error: 'rhoSuelo debe ser positivo' });
    }
    const result = computeGel(gel, rhoSuelo);
    return { ...result, rhoSuelo, norm: 'Dwight (1936) / Sunde (1968)' };
  });

  // POST /api/v1/grid/sverak
  // Body: { rho, area, Ltotal, depth }
  app.post<{ Body: { rho: number; area: number; Ltotal: number; depth: number } }>(
    '/sverak', async (req) => {
      const result = sverakGridResistance(req.body);
      return { ...result, norm: 'IEEE Std 80-2013 Ec. 52 (Sverak)' };
    }
  );
}
