import type { FastifyInstance } from 'fastify';
import {
  sverakGridResistance,
  computeMalla,
  computeGel,
  computeMultipleRods,
  computeHorizontalStrip,
  computeRadialStar,
  computeRingLoop,
  computeCombinedGridRod,
  type MallaInput,
  type GelInput,
  type MultipleRodsInput,
  type HorizontalStripInput,
  type RadialStarInput,
  type RingLoopInput,
  type CombinedGridRodInput,
} from '@gdp/engines-math';

export async function routesGrid(app: FastifyInstance): Promise<void> {

  // POST /api/v1/grid/resistance
  app.post<{
    Body: MallaInput & { gel?: GelInput & { activo?: boolean } };
  }>('/resistance', async (req, reply) => {
    const { gel, ...mallaFields } = req.body;
    const malla: MallaInput = mallaFields;
    if (malla.largo <= 0 || malla.ancho <= 0)
      return reply.code(400).send({ error: 'largo y ancho deben ser positivos' });
    let gelInfo: { activo: boolean; rhoEff: number } | null = null;
    if (gel?.activo) {
      const gelResult = computeGel(gel, malla.rho);
      gelInfo = { activo: true, rhoEff: gelResult.rhoEff };
    }
    const result = computeMalla(malla, gelInfo);
    const compliance = {
      rg1ohm: { pass: result.Rg <= 1, limit: '≤ 1 Ω', norm: 'IEEE 80-2013 Cl. 1' },
      rg5ohm: { pass: result.Rg <= 5, limit: '≤ 5 Ω', norm: 'typical utility' },
    };
    return { ...result, gelInfo, compliance, norm: 'IEEE Std 80-2013 Cl. 14.2' };
  });

  // POST /api/v1/grid/gel
  app.post<{ Body: GelInput & { rhoSuelo: number } }>('/gel', async (req, reply) => {
    const { rhoSuelo, ...gel } = req.body;
    if (rhoSuelo <= 0) return reply.code(400).send({ error: 'rhoSuelo debe ser positivo' });
    const result = computeGel(gel, rhoSuelo);
    return { ...result, rhoSuelo, norm: 'Dwight (1936) / Sunde (1968)' };
  });

  // POST /api/v1/grid/sverak
  app.post<{ Body: { rho: number; area: number; Ltotal: number; depth: number } }>(
    '/sverak', async (req) => {
      const result = sverakGridResistance(req.body);
      return { ...result, norm: 'IEEE Std 80-2013 Ec. 52 (Sverak)' };
    }
  );

  // POST /api/v1/grid/rod — N electrodos verticales en paralelo (Dwight + Sunde)
  app.post<{ Body: MultipleRodsInput }>('/rod', async (req, reply) => {
    const p = req.body;
    if (p.n < 1 || p.L <= 0) return reply.code(400).send({ error: 'Parámetros inválidos' });
    const result = computeMultipleRods(p);
    return { ...result, norm: 'Dwight (1936), Sunde (1949) — IEEE 80-2013 Annex B.1' };
  });

  // POST /api/v1/grid/strip — Conductor horizontal enterrado (Dwight)
  app.post<{ Body: HorizontalStripInput }>('/strip', async (req, reply) => {
    const p = req.body;
    if (p.L <= 0 || p.h <= 0) return reply.code(400).send({ error: 'Parámetros inválidos' });
    const result = computeHorizontalStrip(p);
    return { ...result, norm: 'Dwight (1936) — IEEE 80-2013 Annex B.3' };
  });

  // POST /api/v1/grid/radial — Sistema radial / estrella (Laurent-Niemann)
  app.post<{ Body: RadialStarInput }>('/radial', async (req, reply) => {
    const p = req.body;
    if (p.n < 1 || p.L <= 0) return reply.code(400).send({ error: 'Parámetros inválidos' });
    const result = computeRadialStar(p);
    return { ...result, norm: 'Laurent (1952), Niemann (1952) — IEEE 80-2013 Annex B' };
  });

  // POST /api/v1/grid/ring — Anillo perimetral (Sunde)
  app.post<{ Body: RingLoopInput }>('/ring', async (req, reply) => {
    const p = req.body;
    if (p.perimeter <= 0 || p.h <= 0) return reply.code(400).send({ error: 'Parámetros inválidos' });
    const result = computeRingLoop(p);
    return { ...result, norm: 'Sunde (1949) — IEEE 80-2013 §14.3' };
  });

  // POST /api/v1/grid/combined — Malla + picas (Schwarz)
  app.post<{ Body: CombinedGridRodInput }>('/combined', async (req, reply) => {
    const p = req.body;
    if (p.area <= 0 || p.nRods < 0) return reply.code(400).send({ error: 'Parámetros inválidos' });
    const result = computeCombinedGridRod(p);
    return { ...result, norm: 'Schwarz (1954) — IEEE 80-2013 §14.5' };
  });
}
