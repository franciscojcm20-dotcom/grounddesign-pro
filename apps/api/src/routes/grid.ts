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
  optimizeMallaResistance,
  optimizeRodResistance,
  optimizeStripResistance,
  optimizeRadialResistance,
  optimizeRingResistance,
  optimizeCombinedResistance,
  type MallaInput,
  type GelInput,
  type MultipleRodsInput,
  type HorizontalStripInput,
  type RadialStarInput,
  type RingLoopInput,
  type CombinedGridRodInput,
} from '@gdp/engines-math';
import { getActionOrder, recordOutcomes, stepsToOutcomes } from '../learning/bandit.ts';

const ORDER_MALLA    = ['add_rods', 'add_cond_l', 'add_cond_w', 'expand_largo', 'expand_ancho'];
const ORDER_ROD      = ['add_rod', 'extend_length', 'increase_spacing'];
const ORDER_STRIP    = ['extend_length', 'increase_depth', 'increase_section'];
const ORDER_RADIAL   = ['add_radial', 'extend_length', 'increase_depth'];
const ORDER_RING     = ['expand_perimeter', 'increase_depth', 'increase_section'];
const ORDER_COMBINED = ['add_rods', 'extend_rods', 'extend_ltotal', 'expand_area'];

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

  // POST /api/v1/grid/resistance/optimize
  app.post<{
    Body: MallaInput & { gel?: GelInput & { activo?: boolean }; targetRg: number };
  }>('/resistance/optimize', async (req, reply) => {
    const { gel, targetRg, ...mallaFields } = req.body;
    const malla: MallaInput = mallaFields;
    if (malla.largo <= 0 || malla.ancho <= 0)
      return reply.code(400).send({ error: 'largo y ancho deben ser positivos' });
    if (!targetRg || targetRg <= 0)
      return reply.code(400).send({ error: 'targetRg debe ser positivo' });
    let gelInfo: { activo: boolean; rhoEff: number } | null = null;
    if (gel?.activo) {
      const gelResult = computeGel(gel, malla.rho);
      gelInfo = { activo: true, rhoEff: gelResult.rhoEff };
    }
    const order = await getActionOrder('grid_resistance', ORDER_MALLA);
    const optimization = optimizeMallaResistance({ ...malla, targetRg }, gelInfo, order);
    await recordOutcomes('grid_resistance', stepsToOutcomes(optimization.steps, optimization.initialRg));
    return { ...optimization, norm: 'IEEE Std 80-2013 Cl. 14.2 — motor de optimización propio (aprendizaje adaptativo activo)' };
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

  // Aplica el aditivo gel (si está activo) y retorna { gelInfo, rhoEfectiva }.
  function applyGel(gel: (GelInput & { activo?: boolean }) | undefined, rho: number) {
    if (!gel?.activo) return { gelInfo: null as { activo: boolean; rhoEff: number } | null, rhoEfectiva: rho };
    const gelResult = computeGel(gel, rho);
    return { gelInfo: { activo: true, rhoEff: gelResult.rhoEff }, rhoEfectiva: gelResult.rhoEff };
  }

  // POST /api/v1/grid/rod — N electrodos verticales en paralelo (Dwight + Sunde)
  app.post<{ Body: MultipleRodsInput & { gel?: GelInput & { activo?: boolean } } }>('/rod', async (req, reply) => {
    const { gel, ...p } = req.body;
    if (p.n < 1 || p.L <= 0) return reply.code(400).send({ error: 'Parámetros inválidos' });
    const { gelInfo, rhoEfectiva } = applyGel(gel, p.rho);
    const result = computeMultipleRods({ ...p, rho: rhoEfectiva });
    return { ...result, gelInfo, rhoUsado: rhoEfectiva, norm: 'Dwight (1936), Sunde (1949) — IEEE 80-2013 Annex B.1' };
  });

  // POST /api/v1/grid/strip — Conductor horizontal enterrado (Dwight)
  app.post<{ Body: HorizontalStripInput & { gel?: GelInput & { activo?: boolean } } }>('/strip', async (req, reply) => {
    const { gel, ...p } = req.body;
    if (p.L <= 0 || p.h <= 0) return reply.code(400).send({ error: 'Parámetros inválidos' });
    const { gelInfo, rhoEfectiva } = applyGel(gel, p.rho);
    const result = computeHorizontalStrip({ ...p, rho: rhoEfectiva });
    return { ...result, gelInfo, rhoUsado: rhoEfectiva, norm: 'Dwight (1936) — IEEE 80-2013 Annex B.3' };
  });

  // POST /api/v1/grid/radial — Sistema radial / estrella (Laurent-Niemann)
  app.post<{ Body: RadialStarInput & { gel?: GelInput & { activo?: boolean } } }>('/radial', async (req, reply) => {
    const { gel, ...p } = req.body;
    if (p.n < 1 || p.L <= 0) return reply.code(400).send({ error: 'Parámetros inválidos' });
    const { gelInfo, rhoEfectiva } = applyGel(gel, p.rho);
    const result = computeRadialStar({ ...p, rho: rhoEfectiva });
    return { ...result, gelInfo, rhoUsado: rhoEfectiva, norm: 'Laurent (1952), Niemann (1952) — IEEE 80-2013 Annex B' };
  });

  // POST /api/v1/grid/ring — Anillo perimetral (Sunde)
  app.post<{ Body: RingLoopInput & { gel?: GelInput & { activo?: boolean } } }>('/ring', async (req, reply) => {
    const { gel, ...p } = req.body;
    if (p.perimeter <= 0 || p.h <= 0) return reply.code(400).send({ error: 'Parámetros inválidos' });
    const { gelInfo, rhoEfectiva } = applyGel(gel, p.rho);
    const result = computeRingLoop({ ...p, rho: rhoEfectiva });
    return { ...result, gelInfo, rhoUsado: rhoEfectiva, norm: 'Sunde (1949) — IEEE 80-2013 §14.3' };
  });

  // POST /api/v1/grid/combined — Malla + picas (Schwarz)
  app.post<{ Body: CombinedGridRodInput & { gel?: GelInput & { activo?: boolean } } }>('/combined', async (req, reply) => {
    const { gel, ...p } = req.body;
    if (p.area <= 0 || p.nRods < 0) return reply.code(400).send({ error: 'Parámetros inválidos' });
    const { gelInfo, rhoEfectiva } = applyGel(gel, p.rho);
    const result = computeCombinedGridRod({ ...p, rho: rhoEfectiva });
    return { ...result, gelInfo, rhoUsado: rhoEfectiva, norm: 'Schwarz (1954) — IEEE 80-2013 §14.5' };
  });

  // POST /api/v1/grid/rod/optimize
  app.post<{ Body: MultipleRodsInput & { gel?: GelInput & { activo?: boolean }; targetRg: number } }>('/rod/optimize', async (req, reply) => {
    const { gel, targetRg, ...p } = req.body;
    if (p.n < 1 || p.L <= 0) return reply.code(400).send({ error: 'Parámetros inválidos' });
    if (!targetRg || targetRg <= 0) return reply.code(400).send({ error: 'targetRg debe ser positivo' });
    const { rhoEfectiva } = applyGel(gel, p.rho);
    const order = await getActionOrder('grid_rod', ORDER_ROD);
    const optimization = optimizeRodResistance({ ...p, rho: rhoEfectiva, targetRg }, order);
    await recordOutcomes('grid_rod', stepsToOutcomes(optimization.steps, optimization.initialRg));
    return { ...optimization, norm: 'Dwight/Sunde — motor de optimización propio (aprendizaje adaptativo activo)' };
  });

  // POST /api/v1/grid/strip/optimize
  app.post<{ Body: HorizontalStripInput & { gel?: GelInput & { activo?: boolean }; targetRg: number } }>('/strip/optimize', async (req, reply) => {
    const { gel, targetRg, ...p } = req.body;
    if (p.L <= 0 || p.h <= 0) return reply.code(400).send({ error: 'Parámetros inválidos' });
    if (!targetRg || targetRg <= 0) return reply.code(400).send({ error: 'targetRg debe ser positivo' });
    const { rhoEfectiva } = applyGel(gel, p.rho);
    const order = await getActionOrder('grid_strip', ORDER_STRIP);
    const optimization = optimizeStripResistance({ ...p, rho: rhoEfectiva, targetRg }, order);
    await recordOutcomes('grid_strip', stepsToOutcomes(optimization.steps, optimization.initialRg));
    return { ...optimization, norm: 'Dwight — motor de optimización propio (aprendizaje adaptativo activo)' };
  });

  // POST /api/v1/grid/radial/optimize
  app.post<{ Body: RadialStarInput & { gel?: GelInput & { activo?: boolean }; targetRg: number } }>('/radial/optimize', async (req, reply) => {
    const { gel, targetRg, ...p } = req.body;
    if (p.n < 1 || p.L <= 0) return reply.code(400).send({ error: 'Parámetros inválidos' });
    if (!targetRg || targetRg <= 0) return reply.code(400).send({ error: 'targetRg debe ser positivo' });
    const { rhoEfectiva } = applyGel(gel, p.rho);
    const order = await getActionOrder('grid_radial', ORDER_RADIAL);
    const optimization = optimizeRadialResistance({ ...p, rho: rhoEfectiva, targetRg }, order);
    await recordOutcomes('grid_radial', stepsToOutcomes(optimization.steps, optimization.initialRg));
    return { ...optimization, norm: 'Laurent-Niemann — motor de optimización propio (aprendizaje adaptativo activo)' };
  });

  // POST /api/v1/grid/ring/optimize
  app.post<{ Body: RingLoopInput & { gel?: GelInput & { activo?: boolean }; targetRg: number } }>('/ring/optimize', async (req, reply) => {
    const { gel, targetRg, ...p } = req.body;
    if (p.perimeter <= 0 || p.h <= 0) return reply.code(400).send({ error: 'Parámetros inválidos' });
    if (!targetRg || targetRg <= 0) return reply.code(400).send({ error: 'targetRg debe ser positivo' });
    const { rhoEfectiva } = applyGel(gel, p.rho);
    const order = await getActionOrder('grid_ring', ORDER_RING);
    const optimization = optimizeRingResistance({ ...p, rho: rhoEfectiva, targetRg }, order);
    await recordOutcomes('grid_ring', stepsToOutcomes(optimization.steps, optimization.initialRg));
    return { ...optimization, norm: 'Sunde — motor de optimización propio (aprendizaje adaptativo activo)' };
  });

  // POST /api/v1/grid/combined/optimize
  app.post<{ Body: CombinedGridRodInput & { gel?: GelInput & { activo?: boolean }; targetRg: number } }>('/combined/optimize', async (req, reply) => {
    const { gel, targetRg, ...p } = req.body;
    if (p.area <= 0 || p.nRods < 0) return reply.code(400).send({ error: 'Parámetros inválidos' });
    if (!targetRg || targetRg <= 0) return reply.code(400).send({ error: 'targetRg debe ser positivo' });
    const { rhoEfectiva } = applyGel(gel, p.rho);
    const order = await getActionOrder('grid_combined', ORDER_COMBINED);
    const optimization = optimizeCombinedResistance({ ...p, rho: rhoEfectiva, targetRg }, order);
    await recordOutcomes('grid_combined', stepsToOutcomes(optimization.steps, optimization.initialRg));
    return { ...optimization, norm: 'Schwarz — motor de optimización propio (aprendizaje adaptativo activo)' };
  });
}
