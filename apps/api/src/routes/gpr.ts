import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parseBody, pos, nonNeg, num, peso } from '../lib/validate.ts';

const gprBodySchema = z.object({
  Ig: pos(), Rg: pos(),
  Zf: num().optional(), // declarado por compatibilidad histórica del payload — no se usa en el cálculo (GPR = Sf·Ig·Rg)
  Sf: z.number().min(0).max(1),
  ts: pos(),
  bodyW: peso,
  Cs: nonNeg(),
  rhoS: nonNeg(),
});

export async function routesGpr(app: FastifyInstance): Promise<void> {

  // POST /api/v1/gpr
  app.post('/', async (req, reply) => {
    const body = parseBody(gprBodySchema, req, reply);
    if (!body) return;
    const { Ig, Rg, Sf, ts, bodyW = 70, Cs, rhoS } = body;

    // GPR = Sf * Ig * Rg  (IEEE 80-2013 Ec. 27)
    const GPR = Sf * Ig * Rg;

    // Corriente de toque y paso (IEEE 80-2013 Cl. 15)
    const Ib50 = 0.116 / Math.sqrt(ts);   // A — cuerpo 50 kg
    const Ib70 = 0.157 / Math.sqrt(ts);   // A — cuerpo 70 kg
    const Ib   = bodyW >= 70 ? Ib70 : Ib50;

    // Tensión de toque admisible (IEEE 80-2013 Ec. 32)
    const Etouch = (1000 + 1.5 * Cs * rhoS) * Ib;

    // Tensión de paso admisible (IEEE 80-2013 Ec. 33)
    const Estep  = (1000 + 6.0 * Cs * rhoS) * Ib;

    // Referencia de tensión de toque máxima ~ GPR/2 (simplificado)
    const EtouchMax = GPR / 2;

    const compliance = {
      gprUnder5kV: { pass: GPR <= 5000, limit: '≤ 5 kV', norm: 'IEEE 80-2013 Cl. 1' },
      touchSafe:   { pass: EtouchMax <= Etouch, limit: `≤ ${Etouch.toFixed(0)} V`, norm: 'IEEE 80-2013 Cl. 16' },
    };

    return {
      GPR,
      Ib, Ib50, Ib70,
      Etouch, Estep,
      EtouchMax,
      compliance,
      inputs: body,
      norm: 'IEEE Std 80-2013 Cl. 15-16',
    };
  });
}
