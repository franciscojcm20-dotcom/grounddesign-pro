// tests/motors.test.ts — Casos de referencia para @gdp/engines-math
//
// Valores tomados del estado inicial de index.html (verificados numéricamente).
// Ejecución: node --test --experimental-strip-types tests/motors.test.ts

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  wennerApparent,
  estimateTwoLayer,
  schlumbergerApparent,
  theoreticalTwoLayerRho,
  wennerApparentNLayer,
  rodResistanceDwight,
  rodResistanceWithGel,
  computeGel,
  sverakGridResistance,
  computeMalla,
  surfaceFactorCs,
  permissibleTouch,
  permissibleStep,
  meshVoltage,
  stepVoltageReal,
  onderdonkArea,
  computeConductor,
  applyMinConductorSection,
  CONDUCTOR_TABLE,
  computeMultipleRods,
  NORMATIVE_PROFILES,
  getNormativeProfile,
  evaluateRgCompliance,
  fitLayeredEarthModel,
} from '../src/index.ts';

// ─── Tolerancia para comparaciones de punto flotante ─────────────────────────
function closeTo(a: number, b: number, tol = 1e-9): boolean {
  return Math.abs(a - b) / Math.max(Math.abs(b), 1) < tol;
}
function assertClose(a: number, b: number, tol: number, msg?: string): void {
  assert.ok(closeTo(a, b, tol), `${msg ?? ''}: esperado ≈${b}, obtenido ${a} (tol=${tol})`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. WENNER — IEEE Std 81-2012, Cl. 8.3
// ═══════════════════════════════════════════════════════════════════════════════
const WENNER_READINGS = [
  { a:  1,   r: 196.99 },
  { a:  1.5, r: 133.27 },
  { a:  2,   r: 101.37 },
  { a:  3,   r:  69.34 },
  { a:  4,   r:  53.18 },
  { a:  6,   r:  36.72 },
  { a:  8,   r:  28.22 },
  { a: 12,   r:  19.36 },
  { a: 16,   r:  14.74 },
  { a: 24,   r:   9.96 },
];

describe('Wenner — resistividad aparente (ρa = 2πaR)', () => {
  it('primera lectura: a=1 m, R=196.99 Ω → ρa exacta', () => {
    assertClose(wennerApparent(1, 196.99), 2 * Math.PI * 1 * 196.99, 1e-12, 'wennerApparent(1,196.99)');
  });

  it('última lectura: a=24 m, R=9.96 Ω → ρa exacta', () => {
    assertClose(wennerApparent(24, 9.96), 2 * Math.PI * 24 * 9.96, 1e-12, 'wennerApparent(24,9.96)');
  });

  it('todos los valores de muestra producen ρa > 0', () => {
    for (const { a, r } of WENNER_READINGS) {
      assert.ok(wennerApparent(a, r) > 0, `ρa debe ser positiva para a=${a}`);
    }
  });

  it('ρa es proporcional a a (R fijo)', () => {
    assertClose(wennerApparent(2, 100) / wennerApparent(1, 100), 2, 1e-12, 'proporcionalidad ρa ∝ a');
  });

  it('a=0 devuelve 0 (caso borde)', () => {
    assert.strictEqual(wennerApparent(0, 100), 0);
  });
});

describe('Wenner — estimación de suelo de 2 capas (método de asíntotas)', () => {
  const res = estimateTwoLayer(WENNER_READINGS);

  it('ρ1 (capa superior) es menor que ρ2 (capa inferior)', () => {
    assert.ok(res.rho1 < res.rho2, `ρ1=${res.rho1.toFixed(1)} debe ser < ρ2=${res.rho2.toFixed(1)}`);
  });

  it('ρ1 ≈ media de las lecturas con a pequeño', () => {
    const rhosPequenos = WENNER_READINGS.slice(0, 5).map(r => wennerApparent(r.a, r.r));
    const promedio = rhosPequenos.reduce((s, v) => s + v, 0) / rhosPequenos.length;
    assertClose(res.rho1, promedio, 0.01, 'ρ1 = promedio de lecturas con a pequeño');
  });

  it('h estimado coincide con un valor de a de los datos de entrada', () => {
    const aValues = WENNER_READINGS.map(r => r.a);
    assert.ok(aValues.includes(res.h), `h=${res.h} debe ser uno de los valores de a medidos`);
  });

  it('la curva devuelta tiene el mismo número de puntos que los datos de entrada', () => {
    assert.strictEqual(res.curve.length, WENNER_READINGS.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SCHLUMBERGER — IEEE Std 81-2012, Cl. 8
// ═══════════════════════════════════════════════════════════════════════════════
const SCHLUMBERGER_READINGS = [
  { L:  1,   l: 0.5, r: 525.30 },
  { L:  1.5, l: 0.5, r: 199.91 },
  { L:  2,   l: 0.5, r: 108.12 },
  { L:  3,   l: 0.5, r:  47.55 },
  { L:  4,   l: 0.5, r:  27.01 },
  { L:  6,   l: 0.5, r:  12.33 },
  { L:  8,   l: 0.5, r:   7.08 },
  { L: 12,   l: 0.5, r:   3.23 },
  { L: 16,   l: 0.5, r:   1.84 },
  { L: 24,   l: 0.5, r:   0.83 },
];

describe('Schlumberger — resistividad aparente (forma exacta Telford)', () => {
  it('primera lectura: L=1, l=0.5, R=525.30 → ρa exacta', () => {
    assertClose(
      schlumbergerApparent(1, 0.5, 525.30),
      Math.PI * ((1 - 0.25) / 1) * 525.30,
      1e-12, 'schlumberger primera lectura'
    );
  });

  it('todos los valores de muestra producen ρa > 0', () => {
    for (const { L, l, r } of SCHLUMBERGER_READINGS) {
      assert.ok(schlumbergerApparent(L, l, r) > 0, `ρa debe ser positiva para L=${L}`);
    }
  });

  it('cuando L >> l, la fórmula exacta converge a la aproximación π·L²/(2l)·R', () => {
    const exact  = schlumbergerApparent(24, 0.5, 0.83);
    const approx = Math.PI * (24 ** 2 / (2 * 0.5)) * 0.83;
    assertClose(exact / approx, 1, 0.001, 'convergencia a aproximación π·L²/(2l)·R para L>>l');
  });

  it('primera lectura Schlumberger ≈ primera lectura Wenner (mismo suelo, L≈a)', () => {
    const rhoW = wennerApparent(1, 196.99);
    const rhoS = schlumbergerApparent(1, 0.5, 525.30);
    assertClose(rhoS / rhoW, 1, 0.01, 'coherencia Wenner vs Schlumberger en a=L=1 m');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. MODELO N CAPAS — Kernel recursivo de Wait (1954)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Modelo N capas — kernel de Wait y wennerApparentNLayer', () => {
  it('suelo homogéneo (1 capa): ρa(a) = ρ para todo a', () => {
    const rho = 200;
    for (const a of [1, 2, 4, 8, 16]) {
      assertClose(wennerApparentNLayer(a, [rho], []), rho, 0.02, `suelo homogéneo ρa(${a}) ≈ ${rho}`);
    }
  });

  it('2 capas: ρa(a→0) converge a ρ1 (primera capa)', () => {
    assertClose(wennerApparentNLayer(0.1, [1214, 1537], [4]), 1214, 0.05, 'ρa(a→0) ≈ ρ1');
  });

  it('2 capas: ρa crece con a (ρ1<ρ2 → curva monótonamente creciente)', () => {
    const rhos = [1214, 1537];
    const hs   = [4];
    const rhoA1  = wennerApparentNLayer(0.5, rhos, hs);
    const rhoA10 = wennerApparentNLayer(10,  rhos, hs);
    const rhoA40 = wennerApparentNLayer(40,  rhos, hs);
    assert.ok(rhoA10 > rhoA1,  `curva creciente: ρa(10) > ρa(0.5)`);
    assert.ok(rhoA40 > rhoA10, `curva creciente: ρa(40) > ρa(10)`);
  });

  it('4 capas del estado inicial: ρa positiva y acotada entre min(ρi) y max(ρi)', () => {
    const rhos = [1214, 1537, 3200, 800];
    const hs   = [4, 8, 15];
    const rhoMin = Math.min(...rhos);
    const rhoMax = Math.max(...rhos);
    for (const a of [1, 4, 10, 30, 80]) {
      const rhoA = wennerApparentNLayer(a, rhos, hs);
      assert.ok(rhoA > rhoMin * 0.5 && rhoA < rhoMax * 2, `ρa(${a}) fuera de rango esperado`);
    }
  });

  it('curva teórica 2 capas (Orellana-Mooney): ratio ρ2/ρ1 > 1 → curva creciente', () => {
    assert.ok(theoreticalTwoLayerRho(5, 10) > theoreticalTwoLayerRho(1, 10), 'Para k=10, ρa debe crecer con t');
  });

  it('curva teórica para k=1 (suelo homogéneo) devuelve ratio ≈ 1 para todo t', () => {
    for (const t of [0.5, 2, 10, 50]) {
      assertClose(theoreticalTwoLayerRho(t, 1), 1, 1e-6, `curva homogénea k=1 en t=${t}`);
    }
  });
});

describe('Ajuste automático de modelo de suelo N capas (inversión, sin capas manuales)', () => {
  const SPACINGS = [0.5, 1, 2, 4, 8, 16, 32, 64];

  it('recupera un suelo homogéneo sintético como 1 capa (sin agregar estratos ficticios)', () => {
    const rho = 300;
    const measured = SPACINGS.map(a => ({ a, rho: wennerApparentNLayer(a, [rho], []) }));
    const { best } = fitLayeredEarthModel(measured);
    assert.strictEqual(best.nLayers, 1, `debería preferir 1 capa para un suelo homogéneo, obtuvo ${best.nLayers}`);
    assertClose(best.rhos[0]!, rho, 0.05, 'ρ recuperada del suelo homogéneo');
  });

  it('recupera un modelo sintético de 2 capas conocido (ρ1, ρ2, h) dentro de tolerancia razonable', () => {
    const trueRhos = [1214, 1537];
    const trueHs = [4];
    const measured = SPACINGS.map(a => ({ a, rho: wennerApparentNLayer(a, trueRhos, trueHs) }));
    const { best } = fitLayeredEarthModel(measured);
    assert.ok(best.nLayers <= 2, `no debería sobreajustar más allá de 2 capas para datos limpios de 2 capas, obtuvo ${best.nLayers}`);
    assert.ok(best.rmsError < 0.03, `el ajuste debería tener bajo error para datos sintéticos limpios (rmsError=${best.rmsError})`);
  });

  it('el candidato de cada nLayers reproduce su propia curva con error ≈ 0 (el ajuste local converge)', () => {
    const measured = SPACINGS.map(a => ({ a, rho: wennerApparentNLayer(a, [1214, 1537, 3200], [4, 8]) }));
    const { candidates } = fitLayeredEarthModel(measured);
    const c3 = candidates.find(c => c.nLayers === 3)!;
    assert.ok(c3.rmsError < 0.02, `el candidato de 3 capas debería ajustar casi perfectamente datos sintéticos de 3 capas (rmsError=${c3.rmsError})`);
  });

  it('devuelve un candidato por cada nLayers de 1 a 4, todos con curva del mismo largo que las mediciones', () => {
    const measured = SPACINGS.map(a => ({ a, rho: wennerApparentNLayer(a, [1214, 1537], [4]) }));
    const { candidates } = fitLayeredEarthModel(measured);
    assert.deepStrictEqual(candidates.map(c => c.nLayers), [1, 2, 3, 4]);
    for (const c of candidates) assert.strictEqual(c.curve.length, SPACINGS.length);
  });

  it('la parsimonia evita preferir 4 capas cuando 2 capas ya explican bien los datos', () => {
    const measured = SPACINGS.map(a => ({ a, rho: wennerApparentNLayer(a, [1214, 1537], [4]) }));
    const { best } = fitLayeredEarthModel(measured);
    assert.ok(best.nLayers <= 2, `no debería preferir 4 capas para datos generados con 2, obtuvo ${best.nLayers}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. RESISTENCIA DE MALLA — Sverak (IEEE Std 80-2013, Cl. 14.2)
// ═══════════════════════════════════════════════════════════════════════════════
const MALLA = {
  largo: 40, ancho: 30, profundidad: 0.6,
  nConductoresL: 7, nConductoresW: 5,
  nVarillas: 12, longVarilla: 3,
  rho: 110, iFalla: 8500, tFalla: 0.5,
};

describe('Perfiles normativos (IEEE/RETIE/REBT/NBR)', () => {
  it('hay al menos un perfil por cada norma esperada', () => {
    const ids = NORMATIVE_PROFILES.map(p => p.id);
    for (const expected of ['ieee80-sec-ric', 'retie-co', 'rebt-es', 'nbr-br']) {
      assert.ok(ids.includes(expected), `falta perfil ${expected}`);
    }
  });

  it('todos los perfiles tienen rgCritical <= rgGeneral', () => {
    for (const p of NORMATIVE_PROFILES) {
      assert.ok(p.rgCritical <= p.rgGeneral, `${p.id}: rgCritical=${p.rgCritical} > rgGeneral=${p.rgGeneral}`);
    }
  });

  it('getNormativeProfile devuelve el perfil por id y cae al default si no existe', () => {
    const retie = getNormativeProfile('retie-co');
    assert.strictEqual(retie.country, 'Colombia');
    const fallback = getNormativeProfile('no-existe');
    assert.strictEqual(fallback.id, NORMATIVE_PROFILES[0]!.id);
  });

  it('evaluateRgCompliance respeta los umbrales del perfil seleccionado', () => {
    const rebt = getNormativeProfile('rebt-es'); // rgCritical=15, rgGeneral=37
    assert.deepStrictEqual(evaluateRgCompliance(10, rebt), { rgCritical: true, rgGeneral: true });
    assert.deepStrictEqual(evaluateRgCompliance(20, rebt), { rgCritical: false, rgGeneral: true });
    assert.deepStrictEqual(evaluateRgCompliance(40, rebt), { rgCritical: false, rgGeneral: false });
  });
});

describe('Electrodos múltiples en paralelo — Sunde (resistencia mutua)', () => {
  const base = { rho: 150, L: 3, radius: 0.00465, n: 12, iFalla: 8500 };

  it('Rm es siempre no-negativa, incluso con s >= 2L (rango antes roto)', () => {
    for (const spacing of [1, 2, 3, 4.5, 6, 9, 12]) {
      const { Rm } = computeMultipleRods({ ...base, spacing });
      assert.ok(Rm >= 0, `Rm=${Rm} negativa con spacing=${spacing}`);
    }
  });

  it('Rn (n picas) es siempre no-negativa y no supera R1 de una sola pica', () => {
    for (const spacing of [1, 2, 3, 4.5, 6, 9, 12]) {
      const { Rn, R1 } = computeMultipleRods({ ...base, spacing });
      assert.ok(Rn >= 0, `Rn=${Rn} negativa con spacing=${spacing}`);
      assert.ok(Rn <= R1, `Rn=${Rn} > R1=${R1} con spacing=${spacing}`);
    }
  });

  it('Rm decrece monótonamente a medida que aumenta la separación', () => {
    const spacings = [1, 2, 3, 4.5, 6, 9, 12];
    const Rms = spacings.map(spacing => computeMultipleRods({ ...base, spacing }).Rm);
    for (let i = 1; i < Rms.length; i++) {
      assert.ok(Rms[i] < Rms[i - 1], `Rm no decrece de s=${spacings[i - 1]} a s=${spacings[i]}`);
    }
  });

  it('n=1 devuelve Rn = R1 (sin acoplamiento mutuo)', () => {
    const { Rn, R1 } = computeMultipleRods({ ...base, n: 1, spacing: 6 });
    assert.strictEqual(Rn, R1);
  });
});

describe('Resistencia de malla — Sverak (geometría de muestra 40×30 m)', () => {
  it('longitud total de conductor calculada correctamente', () => {
    const res = computeMalla(MALLA, null);
    assert.strictEqual(res.condL, 410);
    assert.strictEqual(res.condRods, 36);
    assert.strictEqual(res.Ltotal, 446);
    assert.strictEqual(res.area, 1200);
  });

  it('Rg ≈ 1.616 Ω para geometría de muestra (ρ=110, A=1200, Lt=446, h=0.6)', () => {
    const { Rg } = sverakGridResistance({ rho: 110, area: 1200, Ltotal: 446, depth: 0.6 });
    assertClose(Rg, 1.616, 0.005, 'Rg Sverak con parámetros de muestra');
  });

  it('Rg es positiva y acotada', () => {
    const res = computeMalla(MALLA, null);
    assert.ok(res.Rg > 0 && res.Rg < 100, `Rg=${res.Rg} fuera de rango razonable`);
  });

  it('GPR = Rg × iFalla', () => {
    const res = computeMalla(MALLA, null);
    assertClose(res.gpr, res.Rg * MALLA.iFalla, 1e-10, 'GPR = Rg * iFalla');
  });

  it('duplicar el área reduce Rg', () => {
    const { Rg: Rg1 } = sverakGridResistance({ rho: 110, area: 1200, Ltotal: 446, depth: 0.6 });
    const { Rg: Rg2 } = sverakGridResistance({ rho: 110, area: 2400, Ltotal: 446, depth: 0.6 });
    assert.ok(Rg2 < Rg1, 'duplicar área debe reducir Rg');
  });

  it('Rg es proporcional a ρ', () => {
    const { Rg: Rg1 } = sverakGridResistance({ rho: 110, area: 1200, Ltotal: 446, depth: 0.6 });
    const { Rg: Rg2 } = sverakGridResistance({ rho: 220, area: 1200, Ltotal: 446, depth: 0.6 });
    assertClose(Rg2 / Rg1, 2, 1e-10, 'Rg es proporcional a ρ');
  });

  it('con gel inactivo, rhoUsado = malla.rho', () => {
    const res = computeMalla(MALLA, { activo: false, rhoEff: 50 });
    assert.strictEqual(res.rhoUsado, MALLA.rho);
  });

  it('con gel activo, rhoUsado = rhoEff del gel', () => {
    const res = computeMalla(MALLA, { activo: true, rhoEff: 50 });
    assert.strictEqual(res.rhoUsado, 50);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. ADITIVO GEL QUÍMICO — Dwight/Sunde
// ═══════════════════════════════════════════════════════════════════════════════
const GEL = {
  activo: false,
  rhoGel: 0.3,
  radioVarilla: 0.0079,
  radioConGel: 0.075,
  longVarillaGel: 3,
};

describe('Aditivo gel — Dwight/Sunde (varilla 5/8" × 3 m, ρ_suelo=110 Ω·m)', () => {
  const rhoSuelo = 110;

  it('resistencia sin gel es positiva y > 1 Ω', () => {
    const R = rodResistanceDwight(rhoSuelo, GEL.longVarillaGel, GEL.radioVarilla);
    assert.ok(R > 1, `R sin gel = ${R.toFixed(2)} Ω debe ser > 1 Ω`);
  });

  it('resistencia sin gel ≈ 36.9 Ω (valor de referencia Dwight)', () => {
    assertClose(rodResistanceDwight(rhoSuelo, GEL.longVarillaGel, GEL.radioVarilla), 36.9, 0.01, 'R Dwight');
  });

  it('resistencia es proporcional a ρ', () => {
    assertClose(rodResistanceDwight(220, 3, 0.0079) / rodResistanceDwight(110, 3, 0.0079), 2, 1e-10, 'R ∝ ρ');
  });

  it('con gel la resistencia total es menor que sin gel', () => {
    const Rsin = rodResistanceDwight(rhoSuelo, GEL.longVarillaGel, GEL.radioVarilla);
    const { Rtotal } = rodResistanceWithGel({
      rhoSuelo, rhoGel: GEL.rhoGel, L: GEL.longVarillaGel,
      radioVarilla: GEL.radioVarilla, radioGel: GEL.radioConGel,
    });
    assert.ok(Rtotal < Rsin, `Rtotal_con_gel < R_sin_gel`);
  });

  it('computeGel devuelve mejoraPct > 0', () => {
    assert.ok(computeGel(GEL, rhoSuelo).mejoraPct > 0, 'mejoraPct debe ser > 0');
  });

  it('rhoEff (gel) < rhoSuelo', () => {
    const { rhoEff } = rodResistanceWithGel({
      rhoSuelo, rhoGel: GEL.rhoGel, L: GEL.longVarillaGel,
      radioVarilla: GEL.radioVarilla, radioGel: GEL.radioConGel,
    });
    assert.ok(rhoEff < rhoSuelo, `rhoEff=${rhoEff.toFixed(1)} < rhoSuelo`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. DIMENSIONAMIENTO CONDUCTOR — Onderdonk (IEEE Std 80-2013, Cl. 11.3)
// ═══════════════════════════════════════════════════════════════════════════════
const CONDUCTOR = {
  iFalla: 8500, tFalla: 0.5, tempAmbiente: 40, tempMaxFusion: 450,
  calibreSeleccionado: undefined,
};

describe('Conductor — Onderdonk (Ifalla=8500 A, t=0.5 s, Ta=40°C, Tm=450°C)', () => {
  it('área mínima calculada ≈ 55.2 mm² para los parámetros de muestra', () => {
    assertClose(
      onderdonkArea({ Ifalla_kA: 8.5, tFalla: 0.5, tempAmbiente: 40, tempMaxFusion: 450 }).areaMm2,
      55.2, 0.01, 'área mínima Onderdonk'
    );
  });

  it('calibre sugerido es 2/0 AWG (67.4 mm² ≥ 55.2 mm²)', () => {
    const res = computeConductor(CONDUCTOR);
    assert.strictEqual(res.sugerido.calibre, '2/0 AWG');
    assert.strictEqual(res.sugerido.mm2, 67.4);
  });

  it('seleccionado = sugerido cuando calibreSeleccionado es undefined', () => {
    const res = computeConductor(CONDUCTOR);
    assert.strictEqual(res.seleccionado.calibre, res.sugerido.calibre);
    assert.strictEqual(res.esSeleccionManual, false);
  });

  it('área mínima crece con la corriente de falla', () => {
    const a1 = onderdonkArea({ Ifalla_kA: 8.5, tFalla: 0.5, tempAmbiente: 40, tempMaxFusion: 450 }).areaMm2;
    const a2 = onderdonkArea({ Ifalla_kA: 17,  tFalla: 0.5, tempAmbiente: 40, tempMaxFusion: 450 }).areaMm2;
    assertClose(a2 / a1, 2, 1e-6, 'área ∝ I');
  });

  it('área mínima crece con el tiempo de falla', () => {
    const a1 = onderdonkArea({ Ifalla_kA: 8.5, tFalla: 0.5, tempAmbiente: 40, tempMaxFusion: 450 }).areaMm2;
    const a2 = onderdonkArea({ Ifalla_kA: 8.5, tFalla: 2.0, tempAmbiente: 40, tempMaxFusion: 450 }).areaMm2;
    assertClose(a2 / a1, 2, 1e-6, 'área ∝ √t');
  });

  it('selección manual de calibre válido es respetada', () => {
    const res = computeConductor({ ...CONDUCTOR, calibreSeleccionado: '4/0 AWG' });
    assert.strictEqual(res.seleccionado.calibre, '4/0 AWG');
    assert.strictEqual(res.esSeleccionManual, true);
    assert.strictEqual(res.calibreSubdimensionado, null);
  });

  it('selección manual de calibre subdimensionado es ignorada y reportada', () => {
    const res = computeConductor({ ...CONDUCTOR, calibreSeleccionado: '2 AWG' });
    assert.strictEqual(res.calibreSubdimensionado?.calibre, '2 AWG');
    assert.strictEqual(res.seleccionado.calibre, '2/0 AWG');
    assert.strictEqual(res.esSeleccionManual, false);
  });

  it('margen (%) = (mm2_seleccionado − mm2_mínimo) / mm2_mínimo × 100', () => {
    const res = computeConductor(CONDUCTOR);
    assertClose(res.margen, ((res.seleccionado.mm2 - res.areaMm2) / res.areaMm2) * 100, 1e-10, 'fórmula del margen');
  });

  it('applyMinConductorSection sube el calibre cuando el mínimo normativo supera el térmico', () => {
    const res = computeConductor(CONDUCTOR); // sugerido = 2/0 AWG (67.4 mm²)
    const bumped = applyMinConductorSection(res, 100);
    assert.ok(bumped.seleccionado.mm2 >= 100, `debería subir a ≥100 mm², obtuvo ${bumped.seleccionado.mm2}`);
    assert.strictEqual(bumped.esSeleccionManual, false);
  });

  it('applyMinConductorSection no cambia nada si el térmico ya supera el mínimo normativo', () => {
    const res = computeConductor(CONDUCTOR); // 67.4 mm²
    const unchanged = applyMinConductorSection(res, 50);
    assert.strictEqual(unchanged.seleccionado.calibre, res.seleccionado.calibre);
  });

  it('applyMinConductorSection es no-op sin mínimo definido', () => {
    const res = computeConductor(CONDUCTOR);
    const unchanged = applyMinConductorSection(res, undefined);
    assert.strictEqual(unchanged, res);
  });

  it('la tabla de conductores está ordenada ascendentemente por mm2', () => {
    for (let i = 1; i < CONDUCTOR_TABLE.length; i++) {
      assert.ok(
        CONDUCTOR_TABLE[i]!.mm2 > CONDUCTOR_TABLE[i - 1]!.mm2,
        `tabla desordenada en índice ${i}`
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. TENSIONES PASO/CONTACTO — IEEE Std 80-2013, Cl. 16
// ═══════════════════════════════════════════════════════════════════════════════
const TENSIONES = {
  rhoSuperficial: 2500,
  hSuperficial:   0.10,
  tFalla:         0.5,
  pesoPersona:    70 as 50 | 70,
};

describe('Factor de reducción Cs (Sverak, Ec. 27)', () => {
  it('Cs ≈ 0.703 para parámetros de muestra (ρ=110, ρs=2500, hs=0.10)', () => {
    assertClose(surfaceFactorCs(110, 2500, 0.10), 0.7033, 0.001, 'Cs parámetros de muestra');
  });

  it('Cs=1 cuando ρ == ρs', () => {
    assertClose(surfaceFactorCs(1000, 1000, 0.10), 1, 1e-10, 'Cs=1 cuando ρ=ρs');
  });

  it('Cs disminuye cuando ρ << ρs', () => {
    assert.ok(
      surfaceFactorCs(10, 2000, 0.10) < surfaceFactorCs(1000, 2000, 0.10),
      'Cs menor cuando ρ/ρs más bajo'
    );
  });
});

describe('Tensiones admisibles de contacto y de paso (Cl. 16.4-16.5)', () => {
  const Cs = surfaceFactorCs(MALLA.rho, TENSIONES.rhoSuperficial, TENSIONES.hSuperficial);

  it('Etouch_adm (70 kg) ≈ 808 V para los parámetros de muestra', () => {
    assertClose(permissibleTouch(Cs, TENSIONES.rhoSuperficial, TENSIONES.tFalla, 70), 808, 0.5, 'Etouch_adm');
  });

  it('Estep_adm (70 kg) ≈ 2564 V para los parámetros de muestra', () => {
    assertClose(permissibleStep(Cs, TENSIONES.rhoSuperficial, TENSIONES.tFalla, 70), 2564, 1, 'Estep_adm');
  });

  it('Estep_adm > Etouch_adm', () => {
    const Et = permissibleTouch(Cs, TENSIONES.rhoSuperficial, TENSIONES.tFalla, 70);
    const Es = permissibleStep(Cs, TENSIONES.rhoSuperficial, TENSIONES.tFalla, 70);
    assert.ok(Es > Et, `Estep > Etouch`);
  });

  it('para 50 kg ambas tensiones son menores que para 70 kg', () => {
    assert.ok(
      permissibleTouch(Cs, TENSIONES.rhoSuperficial, TENSIONES.tFalla, 50) <
      permissibleTouch(Cs, TENSIONES.rhoSuperficial, TENSIONES.tFalla, 70),
      'criterio 50 kg más conservador'
    );
  });

  it('tensiones admisibles aumentan al reducir el tiempo de falla (proporción 1/√t)', () => {
    const Et05 = permissibleTouch(Cs, TENSIONES.rhoSuperficial, 0.5, 70);
    const Et02 = permissibleTouch(Cs, TENSIONES.rhoSuperficial, 0.2, 70);
    assertClose(Et02 / Et05, Math.sqrt(0.5 / 0.2), 1e-10, 'Etouch ∝ 1/√t');
  });
});

describe('Tensiones reales Em y Es (Cl. 16.5, forma simplificada de Sverak)', () => {
  const condL   = MALLA.nConductoresL * MALLA.ancho + MALLA.nConductoresW * MALLA.largo;
  const condRods = MALLA.nVarillas * MALLA.longVarilla;
  const Ltotal  = condL + condRods;
  const n       = Math.max(2, Math.round(Math.sqrt(MALLA.nConductoresL * MALLA.nConductoresW)));
  const D       = (MALLA.largo / (MALLA.nConductoresW - 1) + MALLA.ancho / (MALLA.nConductoresL - 1)) / 2;
  const d       = 2 * Math.sqrt(107.2 / Math.PI) / 1000;
  const h       = MALLA.profundidad;

  it('Em y Es son positivas', () => {
    const res = meshVoltage({ rho: MALLA.rho, Ig: MALLA.iFalla, D, d, h, n, Ltotal });
    const { Es } = stepVoltageReal({ rho: MALLA.rho, Ig: MALLA.iFalla, D, h, n, Ltotal, Ki: res.Ki });
    assert.ok(res.Em > 0, `Em > 0`);
    assert.ok(Es > 0, `Es > 0`);
  });

  it('Em y Es son proporcionales a ρ', () => {
    const m1 = meshVoltage({ rho: 110, Ig: MALLA.iFalla, D, d, h, n, Ltotal });
    const m2 = meshVoltage({ rho: 220, Ig: MALLA.iFalla, D, d, h, n, Ltotal });
    assertClose(m2.Em / m1.Em, 2, 1e-10, 'Em ∝ ρ');
  });

  it('Em y Es son proporcionales a Ig', () => {
    const m1 = meshVoltage({ rho: MALLA.rho, Ig: 8500,  D, d, h, n, Ltotal });
    const m2 = meshVoltage({ rho: MALLA.rho, Ig: 17000, D, d, h, n, Ltotal });
    assertClose(m2.Em / m1.Em, 2, 1e-10, 'Em ∝ Ig');
  });

  it('Ki (factor de irregularidad) = 0.644 + 0.148·n', () => {
    const { Ki } = meshVoltage({ rho: MALLA.rho, Ig: MALLA.iFalla, D, d, h, n, Ltotal });
    assertClose(Ki, 0.644 + 0.148 * n, 1e-12, 'fórmula Ki');
  });
});
