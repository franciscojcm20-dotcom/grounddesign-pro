import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
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
  type GelInput,
} from '@gdp/engines-math';
import { getActionOrder, recordOutcomes, stepsToOutcomes } from '../learning/bandit.ts';
import { parseBody, gelInputSchema, pos, nonNeg, intMin1, intNonNeg } from '../lib/validate.ts';

const ORDER_MALLA    = ['add_rods', 'add_cond_l', 'add_cond_w', 'expand_largo', 'expand_ancho'];
const ORDER_ROD      = ['add_rod', 'extend_length', 'increase_spacing'];
const ORDER_STRIP    = ['extend_length', 'increase_depth', 'increase_section'];
const ORDER_RADIAL   = ['add_radial', 'extend_length', 'increase_depth'];
const ORDER_RING     = ['expand_perimeter', 'increase_depth', 'increase_section'];
const ORDER_COMBINED = ['add_rods', 'extend_rods', 'extend_ltotal', 'expand_area'];

const mallaBodySchema = z.object({
  largo: pos(), ancho: pos(),
  nConductoresL: intNonNeg(), nConductoresW: intNonNeg(), nVarillas: intNonNeg(),
  longVarilla: nonNeg(), profundidad: pos(), rho: pos(), iFalla: pos(),
  gel: gelInputSchema,
});
const mallaOptimizeBodySchema = mallaBodySchema.extend({ targetRg: pos() });

const gelBodySchema = z.object({
  activo: z.boolean().optional(),
  longVarillaGel: pos(), radioVarilla: pos(), rhoGel: pos(), radioConGel: pos(),
  rhoSuelo: pos(),
});

const sverakBodySchema = z.object({ rho: pos(), area: pos(), Ltotal: pos(), depth: pos() });

const rodBodySchema = z.object({
  rho: pos(), L: pos(), radius: pos(), n: intMin1(), spacing: pos(), iFalla: pos(), gel: gelInputSchema,
});
const rodOptimizeBodySchema = rodBodySchema.extend({ targetRg: pos() });

const stripBodySchema = z.object({
  rho: pos(), L: pos(), h: pos(), radius: pos(), iFalla: pos(), gel: gelInputSchema,
});
const stripOptimizeBodySchema = stripBodySchema.extend({ targetRg: pos() });

const radialBodySchema = z.object({
  rho: pos(), L: pos(), h: pos(), radius: pos(), n: intMin1(), iFalla: pos(), gel: gelInputSchema,
});
const radialOptimizeBodySchema = radialBodySchema.extend({ targetRg: pos() });

const ringBodySchema = z.object({
  rho: pos(), perimeter: pos(), h: pos(), radius: pos(), iFalla: pos(), gel: gelInputSchema,
});
const ringOptimizeBodySchema = ringBodySchema.extend({ targetRg: pos() });

const combinedBodySchema = z.object({
  rho: pos(), area: pos(), Ltotal: pos(), depth: pos(),
  nRods: intNonNeg(), rodLength: nonNeg(), rodRadius: nonNeg(), rodSpacing: nonNeg(), iFalla: pos(),
  gel: gelInputSchema,
});
const combinedOptimizeBodySchema = combinedBodySchema.extend({ targetRg: pos() });

export async function routesGrid(app: FastifyInstance): Promise<void> {

  // POST /api/v1/grid/resistance
  app.post('/resistance', async (req, reply) => {
    const body = parseBody(mallaBodySchema, req, reply);
    if (!body) return;
    const { gel, ...malla } = body;
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
  app.post('/resistance/optimize', async (req, reply) => {
    const body = parseBody(mallaOptimizeBodySchema, req, reply);
    if (!body) return;
    const { gel, targetRg, ...malla } = body;
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
  app.post('/gel', async (req, reply) => {
    const body = parseBody(gelBodySchema, req, reply);
    if (!body) return;
    const { rhoSuelo, ...gel } = body;
    const result = computeGel(gel, rhoSuelo);
    return { ...result, rhoSuelo, norm: 'Dwight (1936) / Sunde (1968)' };
  });

  // POST /api/v1/grid/sverak
  app.post('/sverak', async (req, reply) => {
    const body = parseBody(sverakBodySchema, req, reply);
    if (!body) return;
    const result = sverakGridResistance(body);
    return { ...result, norm: 'IEEE Std 80-2013 Ec. 52 (Sverak)' };
  });

  // Aplica el aditivo gel (si está activo) y retorna { gelInfo, rhoEfectiva }.
  function applyGel(gel: (GelInput & { activo?: boolean | undefined }) | undefined, rho: number) {
    if (!gel?.activo) return { gelInfo: null as { activo: boolean; rhoEff: number } | null, rhoEfectiva: rho };
    const gelResult = computeGel(gel, rho);
    return { gelInfo: { activo: true, rhoEff: gelResult.rhoEff }, rhoEfectiva: gelResult.rhoEff };
  }

  // POST /api/v1/grid/rod — N electrodos verticales en paralelo (Dwight + Sunde)
  app.post('/rod', async (req, reply) => {
    const body = parseBody(rodBodySchema, req, reply);
    if (!body) return;
    const { gel, ...p } = body;
    const { gelInfo, rhoEfectiva } = applyGel(gel, p.rho);
    const result = computeMultipleRods({ ...p, rho: rhoEfectiva });
    return { ...result, gelInfo, rhoUsado: rhoEfectiva, norm: 'Dwight (1936), Sunde (1949) — IEEE 80-2013 Annex B.1' };
  });

  // POST /api/v1/grid/strip — Conductor horizontal enterrado (Dwight)
  app.post('/strip', async (req, reply) => {
    const body = parseBody(stripBodySchema, req, reply);
    if (!body) return;
    const { gel, ...p } = body;
    const { gelInfo, rhoEfectiva } = applyGel(gel, p.rho);
    const result = computeHorizontalStrip({ ...p, rho: rhoEfectiva });
    return { ...result, gelInfo, rhoUsado: rhoEfectiva, norm: 'Dwight (1936) — IEEE 80-2013 Annex B.3' };
  });

  // POST /api/v1/grid/radial — Sistema radial / estrella (Laurent-Niemann)
  app.post('/radial', async (req, reply) => {
    const body = parseBody(radialBodySchema, req, reply);
    if (!body) return;
    const { gel, ...p } = body;
    const { gelInfo, rhoEfectiva } = applyGel(gel, p.rho);
    const result = computeRadialStar({ ...p, rho: rhoEfectiva });
    return { ...result, gelInfo, rhoUsado: rhoEfectiva, norm: 'Laurent (1952), Niemann (1952) — IEEE 80-2013 Annex B' };
  });

  // POST /api/v1/grid/ring — Anillo perimetral (Sunde)
  app.post('/ring', async (req, reply) => {
    const body = parseBody(ringBodySchema, req, reply);
    if (!body) return;
    const { gel, ...p } = body;
    const { gelInfo, rhoEfectiva } = applyGel(gel, p.rho);
    const result = computeRingLoop({ ...p, rho: rhoEfectiva });
    return { ...result, gelInfo, rhoUsado: rhoEfectiva, norm: 'Sunde (1949) — IEEE 80-2013 §14.3' };
  });

  // POST /api/v1/grid/combined — Malla + picas (Schwarz)
  app.post('/combined', async (req, reply) => {
    const body = parseBody(combinedBodySchema, req, reply);
    if (!body) return;
    const { gel, ...p } = body;
    const { gelInfo, rhoEfectiva } = applyGel(gel, p.rho);
    const result = computeCombinedGridRod({ ...p, rho: rhoEfectiva });
    return { ...result, gelInfo, rhoUsado: rhoEfectiva, norm: 'Schwarz (1954) — IEEE 80-2013 §14.5' };
  });

  // POST /api/v1/grid/rod/optimize
  app.post('/rod/optimize', async (req, reply) => {
    const body = parseBody(rodOptimizeBodySchema, req, reply);
    if (!body) return;
    const { gel, targetRg, ...p } = body;
    const { rhoEfectiva } = applyGel(gel, p.rho);
    const order = await getActionOrder('grid_rod', ORDER_ROD);
    const optimization = optimizeRodResistance({ ...p, rho: rhoEfectiva, targetRg }, order);
    await recordOutcomes('grid_rod', stepsToOutcomes(optimization.steps, optimization.initialRg));
    return { ...optimization, norm: 'Dwight/Sunde — motor de optimización propio (aprendizaje adaptativo activo)' };
  });

  // POST /api/v1/grid/strip/optimize
  app.post('/strip/optimize', async (req, reply) => {
    const body = parseBody(stripOptimizeBodySchema, req, reply);
    if (!body) return;
    const { gel, targetRg, ...p } = body;
    const { rhoEfectiva } = applyGel(gel, p.rho);
    const order = await getActionOrder('grid_strip', ORDER_STRIP);
    const optimization = optimizeStripResistance({ ...p, rho: rhoEfectiva, targetRg }, order);
    await recordOutcomes('grid_strip', stepsToOutcomes(optimization.steps, optimization.initialRg));
    return { ...optimization, norm: 'Dwight — motor de optimización propio (aprendizaje adaptativo activo)' };
  });

  // POST /api/v1/grid/radial/optimize
  app.post('/radial/optimize', async (req, reply) => {
    const body = parseBody(radialOptimizeBodySchema, req, reply);
    if (!body) return;
    const { gel, targetRg, ...p } = body;
    const { rhoEfectiva } = applyGel(gel, p.rho);
    const order = await getActionOrder('grid_radial', ORDER_RADIAL);
    const optimization = optimizeRadialResistance({ ...p, rho: rhoEfectiva, targetRg }, order);
    await recordOutcomes('grid_radial', stepsToOutcomes(optimization.steps, optimization.initialRg));
    return { ...optimization, norm: 'Laurent-Niemann — motor de optimización propio (aprendizaje adaptativo activo)' };
  });

  // POST /api/v1/grid/ring/optimize
  app.post('/ring/optimize', async (req, reply) => {
    const body = parseBody(ringOptimizeBodySchema, req, reply);
    if (!body) return;
    const { gel, targetRg, ...p } = body;
    const { rhoEfectiva } = applyGel(gel, p.rho);
    const order = await getActionOrder('grid_ring', ORDER_RING);
    const optimization = optimizeRingResistance({ ...p, rho: rhoEfectiva, targetRg }, order);
    await recordOutcomes('grid_ring', stepsToOutcomes(optimization.steps, optimization.initialRg));
    return { ...optimization, norm: 'Sunde — motor de optimización propio (aprendizaje adaptativo activo)' };
  });

  // POST /api/v1/grid/combined/optimize
  app.post('/combined/optimize', async (req, reply) => {
    const body = parseBody(combinedOptimizeBodySchema, req, reply);
    if (!body) return;
    const { gel, targetRg, ...p } = body;
    const { rhoEfectiva } = applyGel(gel, p.rho);
    const order = await getActionOrder('grid_combined', ORDER_COMBINED);
    const optimization = optimizeCombinedResistance({ ...p, rho: rhoEfectiva, targetRg }, order);
    await recordOutcomes('grid_combined', stepsToOutcomes(optimization.steps, optimization.initialRg));
    return { ...optimization, norm: 'Schwarz — motor de optimización propio (aprendizaje adaptativo activo)' };
  });
}
