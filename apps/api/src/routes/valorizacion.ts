import type { FastifyInstance } from 'fastify';
import { computeValorizacion, estimateTrenchVolume, DEFAULT_PRECIOS_CLP, type CubicacionInput, type PreciosUnitariosCLP } from '@gdp/engines-math';

export async function valorizacionRoutes(app: FastifyInstance): Promise<void> {

  // POST /api/v1/valorizacion — cubicación y valorización económica del sistema elegido
  app.post<{ Body: CubicacionInput & { precios?: Partial<PreciosUnitariosCLP> } }>('/', async (req, reply) => {
    const { precios, ...input } = req.body;
    if (input.conductorMetros <= 0) return reply.code(400).send({ error: 'conductorMetros debe ser positivo' });
    const fullPrecios: PreciosUnitariosCLP = { ...DEFAULT_PRECIOS_CLP, ...precios };
    const result = computeValorizacion(input, fullPrecios);
    return { ...result, precios: fullPrecios, norm: 'Cubicación propia — sin fuente de precios externa' };
  });

  // GET /api/v1/valorizacion/precios-default
  app.get('/precios-default', async () => DEFAULT_PRECIOS_CLP);

  // POST /api/v1/valorizacion/estimar-zanja
  app.post<{ Body: { conductorMetros: number; anchoM?: number; profundidadM?: number } }>('/estimar-zanja', async (req) => {
    const { conductorMetros, anchoM, profundidadM } = req.body;
    return { zanjaM3: estimateTrenchVolume(conductorMetros, anchoM, profundidadM) };
  });
}
