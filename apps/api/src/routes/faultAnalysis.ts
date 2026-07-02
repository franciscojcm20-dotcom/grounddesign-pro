import type { FastifyInstance } from 'fastify';
import { computeFaultAnalysis, computeShortCircuit, type FaultAnalysisInput, type ShortCircuitInput } from '@gdp/engines-math';

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

  // POST /api/v1/fault-analysis/short-circuit — modelado del sistema (red + transformador)
  // para calcular If en vez de asumirla, por componentes simétricas (IEC 60909 simplificado)
  app.post<{ Body: ShortCircuitInput }>('/short-circuit', async (req, reply) => {
    const p = req.body;
    if (!p.fuente) return reply.code(400).send({ error: 'fuente es requerida' });
    if (!p.fuente.un || p.fuente.un <= 0) return reply.code(400).send({ error: 'fuente.un debe ser positivo' });
    if (!p.fuente.ikss3 || p.fuente.ikss3 <= 0) return reply.code(400).send({ error: 'fuente.ikss3 debe ser positivo' });
    if (p.fuente.xr === undefined || p.fuente.xr < 0) return reply.code(400).send({ error: 'fuente.xr debe ser un valor no negativo' });
    if (p.transformador?.activo) {
      if (!p.transformador.sn || p.transformador.sn <= 0) return reply.code(400).send({ error: 'transformador.sn debe ser positivo' });
      if (!p.transformador.un || p.transformador.un <= 0) return reply.code(400).send({ error: 'transformador.un debe ser positivo' });
      if (!p.transformador.vcc || p.transformador.vcc <= 0) return reply.code(400).send({ error: 'transformador.vcc debe ser positivo' });
      if (p.transformador.xr === undefined || p.transformador.xr < 0) return reply.code(400).send({ error: 'transformador.xr debe ser un valor no negativo' });
    }
    if (p.tipoFalla !== 'trifasica' && p.tipoFalla !== 'monofasica_tierra')
      return reply.code(400).send({ error: 'tipoFalla debe ser "trifasica" o "monofasica_tierra"' });

    const result = computeShortCircuit(p);
    return { ...result, norm: 'IEC 60909 (método simplificado de la impedancia equivalente) + componentes simétricas de Fortescue — motor de modelado propio' };
  });
}
