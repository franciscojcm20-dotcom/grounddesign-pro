import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { computeFaultAnalysis, computeShortCircuit, type FaultAnalysisInput, type ShortCircuitInput } from '@gdp/engines-math';
import { parseBody, pos, nonNeg, num, intMin1 } from '../lib/validate.ts';

const splitFactorSchema = z.object({
  method: z.enum(['manual', 'conservative', 'estimated']),
  manualValue: z.number().min(0).max(1).optional(),
  nParallelPaths: intMin1().optional(),
}).refine(s => s.method !== 'manual' || s.manualValue !== undefined, {
  message: 'splitFactor.manualValue es requerido para el método manual', path: ['manualValue'],
}).refine(s => s.method !== 'estimated' || (s.nParallelPaths !== undefined && s.nParallelPaths >= 1), {
  message: 'splitFactor.nParallelPaths es requerido para el método estimado', path: ['nParallelPaths'],
});

const faultAnalysisBodySchema = z.object({
  If: pos(), tFalla: pos(), xr: nonNeg(), freq: pos().optional(), splitFactor: splitFactorSchema,
});

const sourceImpedanceSchema = z.object({
  un: pos(), ikss3: pos(), xr: nonNeg(), ik1: pos().optional(), c: pos().optional(),
});

const transformadorSchema = z.object({
  activo: z.boolean(),
  sn: num().optional(), un: num().optional(), vcc: num().optional(), xr: num().optional(),
  z0Factor: num().optional(),
})
  .refine(t => !t.activo || (t.sn !== undefined && t.sn > 0), { message: 'transformador.sn debe ser positivo', path: ['sn'] })
  .refine(t => !t.activo || (t.un !== undefined && t.un > 0), { message: 'transformador.un debe ser positivo', path: ['un'] })
  .refine(t => !t.activo || (t.vcc !== undefined && t.vcc > 0), { message: 'transformador.vcc debe ser positivo', path: ['vcc'] })
  .refine(t => !t.activo || (t.xr !== undefined && t.xr >= 0), { message: 'transformador.xr debe ser un valor no negativo', path: ['xr'] });

const lineaSchema = z.object({
  nombre: z.string().max(120).optional(),
  tipo: z.enum(['linea_aerea', 'cable']),
  longitudKm: nonNeg(),
  rOhmKm: nonNeg(),
  xOhmKm: nonNeg(),
  r0OhmKm: nonNeg().optional(),
  x0OhmKm: nonNeg().optional(),
});

const shortCircuitBodySchema = z.object({
  fuente: sourceImpedanceSchema,
  transformador: transformadorSchema.optional(),
  lineas: z.array(lineaSchema).max(20).optional(),
  tipoFalla: z.enum(['trifasica', 'monofasica_tierra']),
  zn: num().optional(),
  aterramiento: z.enum(['solido', 'resistencia', 'reactancia', 'aislado', 'desconocido']).optional(),
  c: pos().optional(),
});

export async function faultAnalysisRoutes(app: FastifyInstance): Promise<void> {

  // POST /api/v1/fault-analysis — determina y justifica la corriente de diseño oficial (Ig)
  app.post('/', async (req, reply) => {
    const body = parseBody(faultAnalysisBodySchema, req, reply);
    if (!body) return;
    // El JSON del body nunca tiene una clave presente con valor `undefined` (JSON no
    // lo permite) — cuando zod marca un campo opcional ausente, la clave simplemente
    // no existe en el objeto en runtime. El cast es seguro; exactOptionalPropertyTypes
    // es más estricto de lo que zod puede expresar en su tipo inferido.
    const result = computeFaultAnalysis(body as FaultAnalysisInput);
    return { ...result, norm: 'IEEE Std 80-2013, Cláusula 15 — motor de análisis de falla propio' };
  });

  // POST /api/v1/fault-analysis/short-circuit — modelado del sistema (red + transformador)
  // para calcular If en vez de asumirla, por componentes simétricas (IEC 60909 simplificado)
  app.post('/short-circuit', async (req, reply) => {
    const body = parseBody(shortCircuitBodySchema, req, reply);
    if (!body) return;
    const result = computeShortCircuit(body as ShortCircuitInput);
    return { ...result, norm: 'IEC 60909 (método simplificado de la impedancia equivalente) + componentes simétricas de Fortescue — motor de modelado propio' };
  });
}
