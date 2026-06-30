import type { FastifyInstance } from 'fastify';
import { computeConductor, onderdonkArea, CONDUCTOR_TABLE } from '@gdp/engines-math';

export async function routesConductor(app: FastifyInstance): Promise<void> {

  // GET /api/v1/conductor/table
  app.get('/table', async () => ({ table: CONDUCTOR_TABLE }));

  // POST /api/v1/conductor/size
  // Body: { iFalla, tFalla, tempAmbiente, tempMaxFusion, calibreSeleccionado? }
  app.post<{
    Body: {
      iFalla:              number;
      tFalla:              number;
      tempAmbiente:        number;
      tempMaxFusion:       number;
      calibreSeleccionado?: string;
    };
  }>('/size', async (req, reply) => {
    const { iFalla, tFalla, tempAmbiente, tempMaxFusion, calibreSeleccionado } = req.body;

    if (iFalla <= 0 || tFalla <= 0) {
      return reply.code(400).send({ error: 'iFalla y tFalla deben ser positivos' });
    }

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
  app.post<{
    Body: { Ifalla_kA: number; tFalla: number; tempAmbiente: number; tempMaxFusion: number };
  }>('/onderdonk', async (req) => {
    const result = onderdonkArea(req.body);
    return { ...result, norm: 'IEEE Std 80-2013 Ec. 37 (Onderdonk)' };
  });
}
