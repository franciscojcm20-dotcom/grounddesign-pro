import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  surfaceFactorCs,
  permissibleTouch,
  permissibleStep,
  meshVoltage,
  stepVoltageReal,
} from '@gdp/engines-math';
import { parseBody, pos, nonNeg, intMin1, peso } from '../lib/validate.ts';

const safetyVerifyBodySchema = z.object({
  rho: pos(), rhoSuperficial: pos(), hSuperficial: nonNeg(),
  Ig: pos(), D: pos(), d: pos(), h: pos(), n: intMin1(), Ltotal: pos(),
  tFalla: pos(), peso,
});

export async function routesSafety(app: FastifyInstance): Promise<void> {

  // POST /api/v1/safety/verify
  // Verifies personnel safety (touch/step voltage vs. IEEE 80 tolerable
  // limits) for a given grid design. This closes the loop between grid
  // sizing (Rg, GPR) and whether the resulting voltages are actually safe
  // for a person standing near/on the grid during a fault.
  app.post('/verify', async (req, reply) => {
    const body = parseBody(safetyVerifyBodySchema, req, reply);
    if (!body) return;
    const { rho, rhoSuperficial, hSuperficial, Ig, D, d, h, n, Ltotal, tFalla, peso = 70 } = body;

    const Cs = surfaceFactorCs(rho, rhoSuperficial, hSuperficial);
    const eTouchTolerable = permissibleTouch(Cs, rhoSuperficial, tFalla, peso);
    const eStepTolerable  = permissibleStep(Cs, rhoSuperficial, tFalla, peso);

    const mesh = meshVoltage({ rho, Ig, D, d, h, n, Ltotal });
    const step = stepVoltageReal({ rho, Ig, D, h, n, Ltotal, Ki: mesh.Ki });

    const passTouch = mesh.Em <= eTouchTolerable;
    const passStep  = step.Es <= eStepTolerable;

    return {
      Cs,
      touch: { real: mesh.Em, tolerable: eTouchTolerable, pass: passTouch, factors: { Km: mesh.Km, Ki: mesh.Ki, Kh: mesh.Kh } },
      step:  { real: step.Es, tolerable: eStepTolerable,  pass: passStep,  factors: { Ks: step.Ks } },
      overallPass: passTouch && passStep,
      peso,
      norm: 'IEEE Std 80-2013 Cl. 16 (tensiones reales) / Cl. 8.3 (límites tolerables)',
    };
  });
}
