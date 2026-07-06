import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  wennerApparent,
  estimateTwoLayer,
  schlumbergerApparent,
  estimateTwoLayerSchlumberger,
  wennerApparentNLayer,
  theoreticalTwoLayerRho,
  fitLayeredEarthModel,
  type RhoPoint,
} from '@gdp/engines-math';
import { parseBody, pos } from '../lib/validate.ts';

const readingSchema             = z.object({ a: pos(), r: pos() });
const schlumbergerReadingSchema = z.object({ L: pos(), l: pos(), r: pos() });

const wennerBodySchema       = z.object({ readings: z.array(readingSchema).min(1).max(500) });
const schlumbergerBodySchema = z.object({ readings: z.array(schlumbergerReadingSchema).min(1).max(500) });

const nlayerBodySchema = z.object({
  spacings: z.array(pos()).max(200).optional(),
  rhos:     z.array(pos()).min(1).max(20),
  hs:       z.array(pos()).max(19),
}).refine(b => b.hs.length === b.rhos.length - 1, {
  message: 'hs debe tener longitud rhos.length − 1', path: ['hs'],
});

const nlayerFitBodySchema = z.object({
  wenner:       z.array(readingSchema).max(500).optional(),
  schlumberger: z.array(schlumbergerReadingSchema).max(500).optional(),
});

export async function routesSoil(app: FastifyInstance): Promise<void> {

  // POST /api/v1/soil/wenner
  app.post('/wenner', async (req, reply) => {
    const body = parseBody(wennerBodySchema, req, reply);
    if (!body) return;
    const { readings } = body;
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
  app.post('/schlumberger', async (req, reply) => {
    const body = parseBody(schlumbergerBodySchema, req, reply);
    if (!body) return;
    const { readings } = body;
    const points = readings.map(({ L, l, r }) => ({
      L, l, r,
      rhoA: schlumbergerApparent(L, l, r),
    }));
    const rhoAvg = points.reduce((s, p) => s + p.rhoA, 0) / points.length;
    const twoLayer = estimateTwoLayerSchlumberger(readings);
    return { points, rhoAvg, twoLayer, norm: 'IEEE Std 81-2012 Cl. 8' };
  });

  // POST /api/v1/soil/nlayer
  app.post('/nlayer', async (req, reply) => {
    const body = parseBody(nlayerBodySchema, req, reply);
    if (!body) return;
    const { spacings, rhos, hs } = body;
    const curve = (spacings ?? [1, 2, 4, 8, 16, 32]).map(a => ({
      a,
      rhoA: wennerApparentNLayer(a, rhos, hs),
    }));
    return { curve, rhos, hs, norm: 'Wait (1954), IEEE Std 81-2012' };
  });

  // POST /api/v1/soil/nlayer/fit
  // El modelo de N capas NO se ingresa manualmente: se determina ajustando el
  // universo de curvas patrón (1 a 4 estratos) contra las lecturas reales de campo.
  app.post('/nlayer/fit', async (req, reply) => {
    const body = parseBody(nlayerFitBodySchema, req, reply);
    if (!body) return;
    const { wenner, schlumberger } = body;
    const points: RhoPoint[] = [];
    if (wenner) points.push(...wenner.map(({ a, r }) => ({ a, rho: wennerApparent(a, r) })));
    if (schlumberger) points.push(...schlumberger.map(({ L, l, r }) => ({ a: L / 2, rho: schlumbergerApparent(L, l, r) })));
    if (points.length < 3) {
      return reply.code(400).send({ error: 'Se necesitan al menos 3 lecturas de campo (Wenner y/o Schlumberger) para ajustar el modelo de N capas.' });
    }
    const fit = fitLayeredEarthModel(points);
    return { ...fit, measured: points, norm: 'Wait (1954) · Orellana & Mooney (1966) · IEEE Std 81-2012' };
  });

  // GET /api/v1/soil/pattern?k=10&tMin=0.1&tMax=50&pts=40
  // Curva patrón Orellana-Mooney para ratio k
  app.get<{ Querystring: { k: string; tMin?: string; tMax?: string; pts?: string } }>(
    '/pattern', async (req, reply) => {
      const k    = Number(req.query.k ?? 10);
      const tMin = Number(req.query.tMin ?? 0.1);
      const tMax = Number(req.query.tMax ?? 50);
      const pts  = Math.min(Number(req.query.pts ?? 40), 200);
      if (![k, tMin, tMax, pts].every(Number.isFinite) || pts < 2 || tMax <= tMin) {
        return reply.code(400).send({ error: 'Parámetros de query inválidos (k, tMin, tMax, pts deben ser numéricos y tMax > tMin)' });
      }
      const step = (tMax - tMin) / (pts - 1);
      const curve = Array.from({ length: pts }, (_, i) => {
        const t = tMin + i * step;
        return { t, ratio: theoreticalTwoLayerRho(t, k) };
      });
      return { k, curve };
    }
  );
}
