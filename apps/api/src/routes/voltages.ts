import type { FastifyInstance } from 'fastify';
import {
  surfaceFactorCs,
  permissibleTouch,
  permissibleStep,
  meshVoltage,
  stepVoltageReal,
} from '@gdp/engines-math';

export async function routesVoltages(app: FastifyInstance): Promise<void> {

  // POST /api/v1/voltages/permissible
  // Body: { rho, rhoSuperficial, hSuperficial, tFalla, peso }
  app.post<{
    Body: {
      rho:             number;
      rhoSuperficial:  number;
      hSuperficial:    number;
      tFalla:          number;
      peso?:           50 | 70;
    };
  }>('/permissible', async (req) => {
    const { rho, rhoSuperficial, hSuperficial, tFalla, peso = 70 } = req.body;
    const Cs        = surfaceFactorCs(rho, rhoSuperficial, hSuperficial);
    const eTouch    = permissibleTouch(Cs, rhoSuperficial, tFalla, peso);
    const eStep     = permissibleStep(Cs, rhoSuperficial, tFalla, peso);
    return {
      Cs,
      eTouch_V: Number(eTouch.toFixed(1)),
      eStep_V:  Number(eStep.toFixed(1)),
      peso_kg:  peso,
      norm:     'IEEE Std 80-2013 Cl. 16.4–16.5',
    };
  });

  // POST /api/v1/voltages/real
  // Body: { rho, Ig, D, d, h, n, Ltotal, rhoSuperficial, hSuperficial, tFalla, peso? }
  app.post<{
    Body: {
      rho:            number;
      Ig:             number;
      D:              number;
      d:              number;
      h:              number;
      n:              number;
      Ltotal:         number;
      rhoSuperficial: number;
      hSuperficial:   number;
      tFalla:         number;
      peso?:          50 | 70;
    };
  }>('/real', async (req) => {
    const { rhoSuperficial, hSuperficial, tFalla, peso = 70, ...meshParams } = req.body;

    const mesh  = meshVoltage(meshParams);
    const step  = stepVoltageReal({ ...meshParams, Ki: mesh.Ki });
    const Cs    = surfaceFactorCs(meshParams.rho, rhoSuperficial, hSuperficial);
    const eTouchAdm = permissibleTouch(Cs, rhoSuperficial, tFalla, peso);
    const eStepAdm  = permissibleStep(Cs, rhoSuperficial, tFalla, peso);

    const compliance = {
      touch: {
        real_V: Number(mesh.Em.toFixed(1)),
        adm_V:  Number(eTouchAdm.toFixed(1)),
        pass:   mesh.Em <= eTouchAdm,
      },
      step: {
        real_V: Number(step.Es.toFixed(1)),
        adm_V:  Number(eStepAdm.toFixed(1)),
        pass:   step.Es <= eStepAdm,
      },
    };

    return {
      mesh,
      step,
      Cs,
      eTouchAdm_V: Number(eTouchAdm.toFixed(1)),
      eStepAdm_V:  Number(eStepAdm.toFixed(1)),
      compliance,
      norm: 'IEEE Std 80-2013 Cl. 16.5',
    };
  });
}
