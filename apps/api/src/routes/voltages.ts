import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  surfaceFactorCs,
  permissibleTouch,
  permissibleStep,
  meshVoltage,
  stepVoltageReal,
  optimizeVoltages,
  type VoltagesOptimizeInput,
} from '@gdp/engines-math';
import { getActionOrder, recordOutcomes, stepsToOutcomes } from '../learning/bandit.ts';
import { parseBody, pos, nonNeg, intMin1, peso } from '../lib/validate.ts';

const ORDER_VOLTAGES = ['improve_surface_rho', 'thicken_surface', 'extend_ltotal', 'increase_depth', 'increase_spacing'];

const permissibleBodySchema = z.object({
  rho: pos(), rhoSuperficial: pos(), hSuperficial: nonNeg(), tFalla: pos(), peso,
});

const realBodySchema = z.object({
  rho: pos(), Ig: pos(), D: pos(), d: pos(), h: pos(), n: intMin1(), Ltotal: pos(),
  rhoSuperficial: pos(), hSuperficial: nonNeg(), tFalla: pos(), peso,
});

const optimizeBodySchema = z.object({
  rho: pos(), Ig: pos(), D: pos(), d: pos(), h: pos(), n: intMin1(), Ltotal: pos(),
  rhoSuperficial: pos(), hSuperficial: nonNeg(), tFalla: pos(), peso,
  maxRhoSuperficial: pos().optional(), maxHSuperficial: pos().optional(),
  maxLtotal: pos().optional(), maxD: pos().optional(), maxH: pos().optional(),
});

export async function routesVoltages(app: FastifyInstance): Promise<void> {

  // POST /api/v1/voltages/permissible
  app.post('/permissible', async (req, reply) => {
    const body = parseBody(permissibleBodySchema, req, reply);
    if (!body) return;
    const { rho, rhoSuperficial, hSuperficial, tFalla, peso = 70 } = body;
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
  app.post('/real', async (req, reply) => {
    const body = parseBody(realBodySchema, req, reply);
    if (!body) return;
    const { rhoSuperficial, hSuperficial, tFalla, peso = 70, ...meshParams } = body;

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

  // POST /api/v1/voltages/optimize
  app.post('/optimize', async (req, reply) => {
    const body = parseBody(optimizeBodySchema, req, reply);
    if (!body) return;
    const order = await getActionOrder('voltages', ORDER_VOLTAGES);
    const optimization = optimizeVoltages(body as VoltagesOptimizeInput, order);
    await recordOutcomes('voltages', stepsToOutcomes(optimization.steps, optimization.initialRatio));
    return { ...optimization, norm: 'IEEE Std 80-2013 Cl. 16.5 — motor de optimización propio (aprendizaje adaptativo activo)' };
  });
}
