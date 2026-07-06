import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { computeValorizacion, estimateTrenchVolume, DEFAULT_PRECIOS_CLP, type PreciosUnitariosCLP } from '@gdp/engines-math';
import { parseBody, pos, nonNeg, intNonNeg } from '../lib/validate.ts';

const preciosSchema = z.object({
  conductorPorMetroPorMm2: pos(), varillaPorUnidad: pos(), conectorPorUnidad: pos(),
  gelPorKg: pos(), excavacionPorM3: pos(), manoObraPct: nonNeg(), imprevistosPct: nonNeg(),
}).partial();

const cubicacionBodySchema = z.object({
  conductorMetros: pos(), conductorSeccionMm2: pos(),
  varillasCantidad: intNonNeg(), varillaLongitudM: nonNeg(),
  conectoresCantidad: intNonNeg(), gelActivo: z.boolean(), gelKg: nonNeg(), zanjaM3: nonNeg(),
  precios: preciosSchema.optional(),
});

const estimarZanjaBodySchema = z.object({
  conductorMetros: pos(), anchoM: pos().optional(), profundidadM: pos().optional(),
});

export async function valorizacionRoutes(app: FastifyInstance): Promise<void> {

  // POST /api/v1/valorizacion — cubicación y valorización económica del sistema elegido
  app.post('/', async (req, reply) => {
    const body = parseBody(cubicacionBodySchema, req, reply);
    if (!body) return;
    const { precios, ...input } = body;
    const fullPrecios = { ...DEFAULT_PRECIOS_CLP, ...precios } as PreciosUnitariosCLP;
    const result = computeValorizacion(input, fullPrecios);
    return { ...result, precios: fullPrecios, norm: 'Cubicación propia — sin fuente de precios externa' };
  });

  // GET /api/v1/valorizacion/precios-default
  app.get('/precios-default', async () => DEFAULT_PRECIOS_CLP);

  // POST /api/v1/valorizacion/estimar-zanja
  app.post('/estimar-zanja', async (req, reply) => {
    const body = parseBody(estimarZanjaBodySchema, req, reply);
    if (!body) return;
    const { conductorMetros, anchoM, profundidadM } = body;
    return { zanjaM3: estimateTrenchVolume(conductorMetros, anchoM, profundidadM) };
  });
}
