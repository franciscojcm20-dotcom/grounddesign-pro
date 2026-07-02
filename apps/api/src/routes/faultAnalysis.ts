import type { FastifyInstance } from 'fastify';
import { computeFaultAnalysis, type FaultAnalysisInput } from '@gdp/engines-math';

export async function faultAnalysisRoutes(app: FastifyInstance): Promise<void> {

  // POST /api/v1/fault-analysis — determina y justifica la corriente de diseño oficial (Ig)
  app.post<{ Body: FaultAnalysisInput }>('/', async (req, reply) => {
    const p = req.body;
    if (!p.If || p.If <= 0) return reply.code(400).send({ error: 'If (corriente de falla) debe ser positiva' });
    if (!p.tFalla || p.tFalla <= 0) return reply.code(400).send({ error: 'tFalla debe ser positivo' });
    if (p.xr === undefined || p.xr < 0) return reply.code(400).send({ error: 'X/R debe ser un valor no negativo' });
    if (!p.splitFactor?.method) return reply.code(400).send({ error: 'splitFactor.method es requerido' });
    if (p.splitFactor.method === 'manual' && (p.splitFactor.manualValue === undefined))
      return reply.code(400).send({ error: 'splitFactor.manualValue es requerido para el método manual' });
    if (p.splitFactor.method === 'estimated' && (!p.splitFactor.nParallelPaths || p.splitFactor.nParallelPaths < 1))
      return reply.code(400).send({ error: 'splitFactor.nParallelPaths es requerido para el método estimado' });

    const result = computeFaultAnalysis(p);
    return { ...result, norm: 'IEEE Std 80-2013, Cláusula 15 — motor de análisis de falla propio' };
  });
}
