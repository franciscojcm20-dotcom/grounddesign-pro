import type { FastifyInstance } from 'fastify';
import {
  wennerApparent,
  estimateTwoLayer,
  schlumbergerApparent,
  estimateTwoLayerSchlumberger,
  wennerApparentNLayer,
  theoreticalTwoLayerRho,
  type Reading,
} from '@gdp/engines-math';

export async function routesSoil(app: FastifyInstance): Promise<void> {

  // POST /api/v1/soil/wenner
  // Body: { readings: { a: number, r: number }[] }
  app.post<{ Body: { readings: Reading[] } }>('/wenner', async (req, reply) => {
    const { readings } = req.body;
    if (!Array.isArray(readings) || readings.length === 0) {
      return reply.code(400).send({ error: 'readings debe ser un array no vacío' });
    }
    const points = readings.map(({ a, r }) => ({
      a,
      r,
      rhoA: wennerApparent(a, r),
    }));
    const rhoAvg = points.reduce((s, p) => s + p.rhoA, 0) / points.length;
    const twoLayer = estimateTwoLayer(readings);

    return { points, rhoAvg, twoLayer, norm: 'IEEE Std 81-2012 Cl. 8.3' };
  });

  // POST /api/v1/soil/schlumberger
  // Body: { readings: { L: number, l: number, r: number }[] }
  app.post<{ Body: { readings: { L: number; l: number; r: number }[] } }>(
    '/schlumberger', async (req, reply) => {
      const { readings } = req.body;
      if (!Array.isArray(readings) || readings.length === 0) {
        return reply.code(400).send({ error: 'readings debe ser un array no vacío' });
      }
      const points = readings.map(({ L, l, r }) => ({
        L, l, r,
        rhoA: schlumbergerApparent(L, l, r),
      }));
      const rhoAvg = points.reduce((s, p) => s + p.rhoA, 0) / points.length;
      const twoLayer = estimateTwoLayerSchlumberger(readings);
      return { points, rhoAvg, twoLayer, norm: 'IEEE Std 81-2012 Cl. 8' };
    }
  );

  // POST /api/v1/soil/nlayer
  // Body: { spacings: number[], rhos: number[], hs: number[] }
  app.post<{ Body: { spacings: number[]; rhos: number[]; hs: number[] } }>(
    '/nlayer', async (req, reply) => {
      const { spacings, rhos, hs } = req.body;
      if (!Array.isArray(rhos) || rhos.length === 0) {
        return reply.code(400).send({ error: 'rhos no puede estar vacío' });
      }
      if (hs.length !== rhos.length - 1) {
        return reply.code(400).send({ error: 'hs debe tener longitud rhos.length − 1' });
      }
      const curve = (spacings ?? [1, 2, 4, 8, 16, 32]).map(a => ({
        a,
        rhoA: wennerApparentNLayer(a, rhos, hs),
      }));
      return { curve, rhos, hs, norm: 'Wait (1954), IEEE Std 81-2012' };
    }
  );

  // GET /api/v1/soil/pattern?k=10&tMin=0.1&tMax=50&pts=40
  // Curva patrón Orellana-Mooney para ratio k
  app.get<{ Querystring: { k: string; tMin?: string; tMax?: string; pts?: string } }>(
    '/pattern', async (req) => {
      const k    = Number(req.query.k ?? 10);
      const tMin = Number(req.query.tMin ?? 0.1);
      const tMax = Number(req.query.tMax ?? 50);
      const pts  = Math.min(Number(req.query.pts ?? 40), 200);
      const step = (tMax - tMin) / (pts - 1);
      const curve = Array.from({ length: pts }, (_, i) => {
        const t = tMin + i * step;
        return { t, ratio: theoreticalTwoLayerRho(t, k) };
      });
      return { k, curve };
    }
  );
}
