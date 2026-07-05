import type { FastifyInstance } from 'fastify';
import {
  surfaceFactorCs,
  permissibleTouch,
  permissibleStep,
  meshVoltage,
  stepVoltageReal,
} from '@gdp/engines-math';

interface SafetyVerifyBody {
  // Soil / surface treatment
  rho:            number; // Ω·m — native soil resistivity
  rhoSuperficial: number; // Ω·m — surface layer (e.g. crushed rock)
  hSuperficial:   number; // m   — surface layer thickness

  // Grid / mesh geometry (from the grid-resistance design already computed)
  Ig:     number; // A — grid fault/discharge current
  D:      number; // m — typical mesh spacing
  d:      number; // m — conductor diameter
  h:      number; // m — burial depth
  n:      number; // — number of parallel mesh conductors
  Ltotal: number; // m — total buried conductor length

  // Exposure / physiology
  tFalla: number;      // s — fault/exposure clearing time
  peso?:  50 | 70;     // kg — body weight class (IEEE 80 Cl. 8.3)
}

export async function routesSafety(app: FastifyInstance): Promise<void> {

  // POST /api/v1/safety/verify
  // Verifies personnel safety (touch/step voltage vs. IEEE 80 tolerable
  // limits) for a given grid design. This closes the loop between grid
  // sizing (Rg, GPR) and whether the resulting voltages are actually safe
  // for a person standing near/on the grid during a fault.
  app.post<{ Body: SafetyVerifyBody }>('/verify', async (req, reply) => {
    const { rho, rhoSuperficial, hSuperficial, Ig, D, d, h, n, Ltotal, tFalla, peso = 70 } = req.body;

    if (rho <= 0 || Ig <= 0 || Ltotal <= 0 || tFalla <= 0) {
      return reply.code(400).send({ error: 'rho, Ig, Ltotal y tFalla deben ser positivos' });
    }

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
