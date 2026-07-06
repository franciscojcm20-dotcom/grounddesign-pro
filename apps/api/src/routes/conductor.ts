import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { computeConductor, onderdonkArea, CONDUCTOR_TABLE } from '@gdp/engines-math';
import { parseBody, pos, num } from '../lib/validate.ts';

const sizeBodySchema = z.object({
  iFalla: pos(), tFalla: pos(), tempAmbiente: num(), tempMaxFusion: num(),
  calibreSeleccionado: z.string().max(20).optional(),
});
const onderdonkBodySchema = z.object({
  Ifalla_kA: pos(), tFalla: pos(), tempAmbiente: num(), tempMaxFusion: num(),
});

export async function routesConductor(app: FastifyInstance): Promise<void> {

  // GET /api/v1/conductor/table
  app.get('/table', async () => ({ table: CONDUCTOR_TABLE }));

  // POST /api/v1/conductor/size
  // Body: { iFalla, tFalla, tempAmbiente, tempMaxFusion, calibreSeleccionado? }
  app.post('/size', async (req, reply) => {
    const body = parseBody(sizeBodySchema, req, reply);
    if (!body) return;
    const { iFalla, tFalla, tempAmbiente, tempMaxFusion, calibreSeleccionado } = body;

    const input = calibreSeleccionado
      ? { iFalla, tFalla, tempAmbiente, tempMaxFusion, calibreSeleccionado }
      : { iFalla, tFalla, tempAmbiente, tempMaxFusion };

    const result = computeConductor(input);

    const compliance = {
      pass: result.calibreSubdimensionado === null,
      sugerido:   result.sugerido.calibre,
      seleccionado: result.seleccionado.calibre,
      margenPct: Number(result.margen.toFixed(1)),
      ...(result.calibreSubdimensionado && {
        advertencia: `${result.calibreSubdimensionado.calibre} (${result.calibreSubdimensionado.mm2} mm²) está subdimensionado — se usa ${result.sugerido.calibre}`,
      }),
    };

    return { ...result, compliance, norm: 'IEEE Std 80-2013 Cl. 11.3 (Onderdonk)' };
  });

  // POST /api/v1/conductor/onderdonk
  // Body: { Ifalla_kA, tFalla, tempAmbiente, tempMaxFusion }
  app.post('/onderdonk', async (req, reply) => {
    const body = parseBody(onderdonkBodySchema, req, reply);
    if (!body) return;
    const result = onderdonkArea(body);
    return { ...result, norm: 'IEEE Std 80-2013 Ec. 37 (Onderdonk)' };
  });
}
