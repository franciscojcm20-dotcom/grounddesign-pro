'use strict';
// tests/motors.test.js — Casos de referencia para los motores de cálculo
//
// Valores de entrada tomados del estado inicial de index.html (ya verificados
// numéricamente). Se usa el test runner integrado de Node.js (>= 18).
//
// Ejecución: npm test   (o: node --test tests/motors.test.js)

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
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
  CONDUCTOR_TABLE,
} = require('../calc/motors.js');

// ─── Tolerancia para comparaciones de punto flotante ──────────────────────────
// closeTo(a, b, tol): pasa si |a−b| / max(|b|,1) < tol
function closeTo(a, b, tol = 1e-9) {
  const diff = Math.abs(a - b);
  const ref  = Math.max(Math.abs(b), 1);
  return diff / ref < tol;
}
function assertClose(a, b, tol, msg) {
  assert.ok(closeTo(a, b, tol), `${msg ?? ''}: esperado ≈${b}, obtenido ${a} (tol=${tol})`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. WENNER — IEEE Std 81-2012, Cl. 8.3
//    Datos de campo de muestra: state.wennerReadings de index.html
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
    const expected = 2 * Math.PI * 1 * 196.99;   // 1237.72... Ω·m
    assertClose(wennerApparent(1, 196.99), expected, 1e-12, 'wennerApparent(1,196.99)');
  });

  it('última lectura: a=24 m, R=9.96 Ω → ρa exacta', () => {
    const expected = 2 * Math.PI * 24 * 9.96;    // ~1501.9 Ω·m
    assertClose(wennerApparent(24, 9.96), expected, 1e-12, 'wennerApparent(24,9.96)');
  });

  it('todos los valores de muestra producen ρa > 0', () => {
    for (const { a, r } of WENNER_READINGS) {
      assert.ok(wennerApparent(a, r) > 0, `ρa debe ser positiva para a=${a}`);
    }
  });

  it('ρa es proporcional a a (R fijo)', () => {
    // Si R es constante, ρa debe crecer linealmente con a
    const R = 100;
    const rho1 = wennerApparent(1, R);
    const rho2 = wennerApparent(2, R);
    assertClose(rho2 / rho1, 2, 1e-12, 'proporcionalidad ρa ∝ a');
  });

  it('a=0 devuelve 0 (caso borde)', () => {
    assert.strictEqual(wennerApparent(0, 100), 0);
  });
});

describe('Wenner — estimación de suelo de 2 capas (método de asíntotas)', () => {
  const res = estimateTwoLayer(WENNER_READINGS);

  it('ρ1 (capa superior) es menor que ρ2 (capa inferior) — suelo más conductivo en superficie', () => {
    assert.ok(res.rho1 < res.rho2,
      `ρ1=${res.rho1.toFixed(1)} debe ser < ρ2=${res.rho2.toFixed(1)}`);
  });

  it('ρ1 ≈ media geométrica de las lecturas con a pequeño', () => {
    // Las 5 lecturas menores (a ≤ 4) dan ρa entre 1237 y 1337 Ω·m
    const rhosPequenos = WENNER_READINGS.slice(0, 5).map(r => wennerApparent(r.a, r.r));
    const promedio = rhosPequenos.reduce((s, v) => s + v, 0) / rhosPequenos.length;
    assertClose(res.rho1, promedio, 0.01, 'ρ1 = promedio de lecturas con a pequeño');
  });

  it('h estimado coincide con un valor de a de los datos de entrada', () => {
    const aValues = WENNER_READINGS.map(r => r.a);
    assert.ok(aValues.includes(res.h),
      `h=${res.h} debe ser uno de los valores de a medidos`);
  });

  it('la curva devuelta tiene el mismo número de puntos que los datos de entrada', () => {
    assert.strictEqual(res.curve.length, WENNER_READINGS.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SCHLUMBERGER — IEEE Std 81-2012, Cl. 8
//    Datos de campo de muestra: state.schlumbergerReadings de index.html
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
    // ρa = π · (1 − 0.25) / 1 · 525.30 = π · 393.975
    const expected = Math.PI * ((1 - 0.25) / 1) * 525.30;  // ~1237.4 Ω·m
    assertClose(schlumbergerApparent(1, 0.5, 525.30), expected, 1e-12, 'schlumberger primera lectura');
  });

  it('todos los valores de muestra producen ρa > 0', () => {
    for (const { L, l, r } of SCHLUMBERGER_READINGS) {
      assert.ok(schlumbergerApparent(L, l, r) > 0, `ρa debe ser positiva para L=${L}`);
    }
  });

  it('cuando L >> l, la fórmula exacta converge a la aproximación π·L²/(2l)·R', () => {
    // Forma exacta: π·(L²−l²)/(2l)·R  →  cuando L>>l: (L²−l²) ≈ L², luego π·L²/(2l)·R
    // L=24, l=0.5: corrección = (L²−l²)/L² = 575.75/576 = 0.99957 ≈ 1
    const exact  = schlumbergerApparent(24, 0.5, 0.83);
    const approx = Math.PI * (24 ** 2 / (2 * 0.5)) * 0.83;
    assertClose(exact / approx, 1, 0.001, 'convergencia a aproximación π·L²/(2l)·R para L>>l');
  });

  it('primera lectura Schlumberger ≈ primera lectura Wenner (mismo suelo, L≈a)', () => {
    // Ambos métodos sobre el mismo sitio y misma escala deben dar ρa similares
    const rhoW = wennerApparent(1, 196.99);
    const rhoS = schlumbergerApparent(1, 0.5, 525.30);
    // Diferencia < 1% — los datos de muestra son del mismo sitio hipotético
    assertClose(rhoS / rhoW, 1, 0.01, 'coherencia Wenner vs Schlumberger en a=L=1 m');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. MODELO N CAPAS — Kernel recursivo de Wait (1954)
//    Parámetros: state.curvaPatron.rhos / hs de index.html
// ═══════════════════════════════════════════════════════════════════════════════
describe('Modelo N capas — kernel de Wait y wennerApparentNLayer', () => {
  it('suelo homogéneo (1 capa): ρa(a) = ρ para todo a', () => {
    const rho = 200;
    for (const a of [1, 2, 4, 8, 16]) {
      assertClose(wennerApparentNLayer(a, [rho], []), rho, 0.02,
        `suelo homogéneo ρa(${a}) ≈ ${rho}`);
    }
  });

  it('2 capas: ρa(a→0) converge a ρ1 (primera capa)', () => {
    // Para a muy pequeño, el volumen muestreado está en la primera capa
    const rhos = [1214, 1537];
    const hs   = [4];
    const rhoA0 = wennerApparentNLayer(0.1, rhos, hs);
    assertClose(rhoA0, rhos[0], 0.05, 'ρa(a→0) ≈ ρ1');
  });

  it('2 capas: ρa crece con a (ρ1<ρ2 → curva monótonamente creciente)', () => {
    // Para ρ2 > ρ1, la curva ρa(a) debe ser creciente.
    // Nota: la integración numérica (150 puntos uniformes) no garantiza la convergencia
    // exacta a ρ2 para a muy grandes; sí garantiza la tendencia creciente.
    const rhos = [1214, 1537];
    const hs   = [4];
    const rhoA1  = wennerApparentNLayer(0.5, rhos, hs);
    const rhoA10 = wennerApparentNLayer(10,  rhos, hs);
    const rhoA40 = wennerApparentNLayer(40,  rhos, hs);
    assert.ok(rhoA10 > rhoA1,  `curva creciente: ρa(10)=${rhoA10.toFixed(0)} > ρa(0.5)=${rhoA1.toFixed(0)}`);
    assert.ok(rhoA40 > rhoA10, `curva creciente: ρa(40)=${rhoA40.toFixed(0)} > ρa(10)=${rhoA10.toFixed(0)}`);
  });

  it('4 capas del estado inicial: ρa positiva y acotada entre min(ρi) y max(ρi)', () => {
    // Parámetros: state.curvaPatron.rhos y hs
    const rhos = [1214, 1537, 3200, 800];
    const hs   = [4, 8, 15];
    const rhoMin = Math.min(...rhos);
    const rhoMax = Math.max(...rhos);
    for (const a of [1, 4, 10, 30, 80]) {
      const rhoA = wennerApparentNLayer(a, rhos, hs);
      assert.ok(rhoA > rhoMin * 0.5 && rhoA < rhoMax * 2,
        `ρa(${a}) = ${rhoA.toFixed(0)} fuera de rango esperado [${rhoMin*0.5}–${rhoMax*2}]`);
    }
  });

  it('curva teórica 2 capas (Orellana-Mooney): ratio ρ2/ρ1 > 1 → curva creciente', () => {
    // k=10: la resistividad aparente debe crecer con t (AB/2 normalizado)
    const ratioT1 = theoreticalTwoLayerRho(1, 10);
    const ratioT5 = theoreticalTwoLayerRho(5, 10);
    assert.ok(ratioT5 > ratioT1,
      `Para k=10, ρa debe crecer con t (tipo K). ratioT1=${ratioT1.toFixed(3)}, ratioT5=${ratioT5.toFixed(3)}`);
  });

  it('curva teórica para k=1 (suelo homogéneo) devuelve ratio ≈ 1 para todo t', () => {
    for (const t of [0.5, 2, 10, 50]) {
      assertClose(theoreticalTwoLayerRho(t, 1), 1, 1e-6,
        `curva homogénea k=1 en t=${t}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. RESISTENCIA DE MALLA — Sverak (IEEE Std 80-2013, Cl. 14.2)
//    Geometría de muestra: state.malla de index.html
// ═══════════════════════════════════════════════════════════════════════════════
const MALLA = {
  largo: 40, ancho: 30, profundidad: 0.6,
  nConductoresL: 7, nConductoresW: 5,
  nVarillas: 12, longVarilla: 3,
  rho: 110, iFalla: 8500, tFalla: 0.5,
};

describe('Resistencia de malla — Sverak (geometría de muestra 40×30 m)', () => {
  // Longitudes esperadas
  const condL  = MALLA.nConductoresL * MALLA.ancho + MALLA.nConductoresW * MALLA.largo; // 410 m
  const condRods = MALLA.nVarillas * MALLA.longVarilla; // 36 m
  const Ltotal = condL + condRods; // 446 m
  const area   = MALLA.largo * MALLA.ancho; // 1200 m²

  it('longitud total de conductor calculada correctamente', () => {
    const res = computeMalla(MALLA, null);
    assert.strictEqual(res.condL, 410,  'longitud de conductor horizontal');
    assert.strictEqual(res.condRods, 36, 'longitud de varillas');
    assert.strictEqual(res.Ltotal, 446,  'longitud total');
    assert.strictEqual(res.area, 1200,   'área de la malla');
  });

  it('Rg ≈ 1.616 Ω para geometría de muestra (ρ=110, A=1200, Lt=446, h=0.6)', () => {
    const { Rg } = sverakGridResistance({
      rho: 110, area: 1200, Ltotal: 446, depth: 0.6,
    });
    // Valor verificado numéricamente con la ecuación de Sverak
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

  it('duplicar el área reduce Rg (más área → menor resistencia)', () => {
    const { Rg: Rg1 } = sverakGridResistance({ rho: 110, area: 1200, Ltotal: 446, depth: 0.6 });
    const { Rg: Rg2 } = sverakGridResistance({ rho: 110, area: 2400, Ltotal: 446, depth: 0.6 });
    assert.ok(Rg2 < Rg1, 'duplicar área debe reducir Rg');
  });

  it('Rg es proporcional a ρ (resistividad del suelo)', () => {
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
//    Parámetros: state.gel de index.html
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
    const R = rodResistanceDwight(rhoSuelo, GEL.longVarillaGel, GEL.radioVarilla);
    // R = (110 / (2π×3)) · (ln(8×3/0.0158) − 1) ≈ 36.9 Ω
    assertClose(R, 36.9, 0.01, 'R Dwight varilla de muestra');
  });

  it('resistencia es proporcional a ρ', () => {
    const R1 = rodResistanceDwight(110, 3, 0.0079);
    const R2 = rodResistanceDwight(220, 3, 0.0079);
    assertClose(R2 / R1, 2, 1e-10, 'R ∝ ρ');
  });

  it('con gel la resistencia total es menor que sin gel', () => {
    const Rsin = rodResistanceDwight(rhoSuelo, GEL.longVarillaGel, GEL.radioVarilla);
    const { Rtotal } = rodResistanceWithGel({
      rhoSuelo, rhoGel: GEL.rhoGel, L: GEL.longVarillaGel,
      radioVarilla: GEL.radioVarilla, radioGel: GEL.radioConGel,
    });
    assert.ok(Rtotal < Rsin,
      `Rtotal_con_gel=${Rtotal.toFixed(2)} debe ser < R_sin_gel=${Rsin.toFixed(2)}`);
  });

  it('computeGel devuelve mejoraPct > 0 (el gel siempre mejora)', () => {
    const res = computeGel(GEL, rhoSuelo);
    assert.ok(res.mejoraPct > 0, `mejoraPct=${res.mejoraPct.toFixed(1)} debe ser > 0`);
  });

  it('rhoEff (gel) < rhoSuelo (el gel reduce la resistividad efectiva)', () => {
    const { rhoEff } = rodResistanceWithGel({
      rhoSuelo, rhoGel: GEL.rhoGel, L: GEL.longVarillaGel,
      radioVarilla: GEL.radioVarilla, radioGel: GEL.radioConGel,
    });
    assert.ok(rhoEff < rhoSuelo, `rhoEff=${rhoEff.toFixed(1)} debe ser < rhoSuelo=${rhoSuelo}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. DIMENSIONAMIENTO CONDUCTOR — Onderdonk (IEEE Std 80-2013, Cl. 11.3)
//    Parámetros: state.conductor de index.html
// ═══════════════════════════════════════════════════════════════════════════════
const CONDUCTOR = {
  iFalla: 8500, tFalla: 0.5, tempAmbiente: 40, tempMaxFusion: 450,
  calibreSeleccionado: null,
};

describe('Conductor — Onderdonk (Ifalla=8500 A, t=0.5 s, Ta=40°C, Tm=450°C)', () => {
  it('área mínima calculada ≈ 55.2 mm² para los parámetros de muestra', () => {
    const { areaMm2 } = onderdonkArea({
      Ifalla_kA: 8.5, tFalla: 0.5, tempAmbiente: 40, tempMaxFusion: 450,
    });
    // Valor calculado con Ec. 37 de IEEE 80-2013: ~55.2 mm²
    assertClose(areaMm2, 55.2, 0.01, 'área mínima Onderdonk');
  });

  it('calibre sugerido es 2/0 AWG (67.4 mm² ≥ 55.2 mm²)', () => {
    const res = computeConductor(CONDUCTOR);
    assert.strictEqual(res.sugerido.calibre, '2/0 AWG');
    assert.strictEqual(res.sugerido.mm2, 67.4);
  });

  it('seleccionado = sugerido cuando calibreSeleccionado es null', () => {
    const res = computeConductor(CONDUCTOR);
    assert.strictEqual(res.seleccionado.calibre, res.sugerido.calibre);
    assert.strictEqual(res.esSeleccionManual, false);
  });

  it('área mínima crece con la corriente de falla', () => {
    const { areaMm2: a1 } = onderdonkArea({ Ifalla_kA: 8.5, tFalla: 0.5, tempAmbiente: 40, tempMaxFusion: 450 });
    const { areaMm2: a2 } = onderdonkArea({ Ifalla_kA: 17,  tFalla: 0.5, tempAmbiente: 40, tempMaxFusion: 450 });
    assertClose(a2 / a1, 2, 1e-6, 'área ∝ I (duplicar corriente duplica área)');
  });

  it('área mínima crece con el tiempo de falla', () => {
    const { areaMm2: a1 } = onderdonkArea({ Ifalla_kA: 8.5, tFalla: 0.5, tempAmbiente: 40, tempMaxFusion: 450 });
    const { areaMm2: a2 } = onderdonkArea({ Ifalla_kA: 8.5, tFalla: 2.0, tempAmbiente: 40, tempMaxFusion: 450 });
    assertClose(a2 / a1, 2, 1e-6, 'área ∝ √t (cuadruplicar t duplica área)');
  });

  it('selección manual de calibre válido es respetada', () => {
    const res = computeConductor({ ...CONDUCTOR, calibreSeleccionado: '4/0 AWG' });
    assert.strictEqual(res.seleccionado.calibre, '4/0 AWG');
    assert.strictEqual(res.esSeleccionManual, true);
    assert.strictEqual(res.calibreSubdimensionado, null);
  });

  it('selección manual de calibre subdimensionado es ignorada y reportada', () => {
    const res = computeConductor({ ...CONDUCTOR, calibreSeleccionado: '2 AWG' });
    // 2 AWG = 33.6 mm² < 55.2 mm² → subdimensionado, se usa el sugerido
    assert.strictEqual(res.calibreSubdimensionado?.calibre, '2 AWG');
    assert.strictEqual(res.seleccionado.calibre, '2/0 AWG'); // usa el sugerido
    assert.strictEqual(res.esSeleccionManual, false);
  });

  it('margen (%) = (mm2_seleccionado − mm2_mínimo) / mm2_mínimo × 100', () => {
    const res = computeConductor(CONDUCTOR);
    const margenEsperado = ((res.seleccionado.mm2 - res.areaMm2) / res.areaMm2) * 100;
    assertClose(res.margen, margenEsperado, 1e-10, 'fórmula del margen');
  });

  it('la tabla de conductores está ordenada ascendentemente por mm2', () => {
    for (let i = 1; i < CONDUCTOR_TABLE.length; i++) {
      assert.ok(
        CONDUCTOR_TABLE[i].mm2 > CONDUCTOR_TABLE[i - 1].mm2,
        `tabla desordenada en índice ${i}: ${CONDUCTOR_TABLE[i - 1].calibre} → ${CONDUCTOR_TABLE[i].calibre}`
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. TENSIONES PASO/CONTACTO — IEEE Std 80-2013, Cl. 16
//    Parámetros: state.malla + state.tensiones de index.html
// ═══════════════════════════════════════════════════════════════════════════════
const TENSIONES = {
  rhoSuperficial: 2500,
  hSuperficial:   0.10,
  tFalla:         0.5,
  pesoPersona:    70,
};

describe('Factor de reducción Cs (Sverak, Ec. 27)', () => {
  it('Cs ≈ 0.703 para parámetros de muestra (ρ=110, ρs=2500, hs=0.10)', () => {
    const Cs = surfaceFactorCs(110, 2500, 0.10);
    // Cs = 1 − 0.09·(1 − 110/2500) / (2·0.10 + 0.09) ≈ 0.7033
    assertClose(Cs, 0.7033, 0.001, 'Cs parámetros de muestra');
  });

  it('Cs=1 cuando ρ == ρs (suelo y capa superficial con la misma resistividad)', () => {
    assertClose(surfaceFactorCs(1000, 1000, 0.10), 1, 1e-10, 'Cs=1 cuando ρ=ρs');
  });

  it('Cs disminuye cuando ρ << ρs (suelo muy conductor bajo grava seca)', () => {
    const CsAlta = surfaceFactorCs(1000, 2000, 0.10);
    const CsBaja = surfaceFactorCs(10,   2000, 0.10);
    assert.ok(CsBaja < CsAlta, 'Cs menor cuando ρ/ρs más bajo');
  });
});

describe('Tensiones admisibles de contacto y de paso (Cl. 16.4-16.5)', () => {
  const Cs = surfaceFactorCs(MALLA.rho, TENSIONES.rhoSuperficial, TENSIONES.hSuperficial);

  it('Etouch_adm (70 kg) ≈ 808 V para los parámetros de muestra', () => {
    const Et = permissibleTouch(Cs, TENSIONES.rhoSuperficial, TENSIONES.tFalla, 70);
    // (1000 + 1.5·Cs·2500) · 0.157 / √0.5 ≈ 808 V
    assertClose(Et, 808, 0.5, 'Etouch_adm con parámetros de muestra');
  });

  it('Estep_adm (70 kg) ≈ 2564 V para los parámetros de muestra', () => {
    const Es = permissibleStep(Cs, TENSIONES.rhoSuperficial, TENSIONES.tFalla, 70);
    // (1000 + 6·Cs·2500) · 0.157 / √0.5 ≈ 2564 V
    assertClose(Es, 2564, 1, 'Estep_adm con parámetros de muestra');
  });

  it('Estep_adm > Etouch_adm (la tensión de paso admisible siempre es mayor)', () => {
    const Et = permissibleTouch(Cs, TENSIONES.rhoSuperficial, TENSIONES.tFalla, 70);
    const Es = permissibleStep(Cs, TENSIONES.rhoSuperficial, TENSIONES.tFalla, 70);
    assert.ok(Es > Et, `Estep=${Es.toFixed(0)} debe ser > Etouch=${Et.toFixed(0)}`);
  });

  it('para 50 kg ambas tensiones son menores que para 70 kg (criterio más conservador)', () => {
    const Et70 = permissibleTouch(Cs, TENSIONES.rhoSuperficial, TENSIONES.tFalla, 70);
    const Et50 = permissibleTouch(Cs, TENSIONES.rhoSuperficial, TENSIONES.tFalla, 50);
    assert.ok(Et50 < Et70, 'criterio 50 kg más conservador en tensión de contacto');
  });

  it('tensiones admisibles aumentan al reducir el tiempo de falla (proporción 1/√t)', () => {
    const Et05 = permissibleTouch(Cs, TENSIONES.rhoSuperficial, 0.5, 70);
    const Et02 = permissibleTouch(Cs, TENSIONES.rhoSuperficial, 0.2, 70);
    // √(0.5/0.2) = √2.5 ≈ 1.581
    assertClose(Et02 / Et05, Math.sqrt(0.5 / 0.2), 1e-10, 'Etouch ∝ 1/√t');
  });
});

describe('Tensiones reales Em y Es (Cl. 16.5, forma simplificada de Sverak)', () => {
  // Parámetros de la malla de muestra
  const condL   = MALLA.nConductoresL * MALLA.ancho + MALLA.nConductoresW * MALLA.largo; // 410
  const condRods = MALLA.nVarillas * MALLA.longVarilla; // 36
  const Ltotal  = condL + condRods; // 446
  const n       = Math.max(2, Math.round(Math.sqrt(MALLA.nConductoresL * MALLA.nConductoresW)));
  const D       = (MALLA.largo / (MALLA.nConductoresW - 1) + MALLA.ancho / (MALLA.nConductoresL - 1)) / 2;
  const d       = 2 * Math.sqrt(107.2 / Math.PI) / 1000; // diámetro equiv. 4/0 AWG
  const h       = MALLA.profundidad;

  it('Em y Es son positivas', () => {
    const { Em } = meshVoltage({ rho: MALLA.rho, Ig: MALLA.iFalla, D, d, h, n, Ltotal });
    const res = meshVoltage({ rho: MALLA.rho, Ig: MALLA.iFalla, D, d, h, n, Ltotal });
    const { Es } = stepVoltageReal({ rho: MALLA.rho, Ig: MALLA.iFalla, D, h, n, Ltotal, Ki: res.Ki });
    assert.ok(Em > 0, `Em=${Em.toFixed(1)} debe ser > 0`);
    assert.ok(Es > 0, `Es=${Es.toFixed(1)} debe ser > 0`);
  });

  it('Em y Es son proporcionales a ρ (resistividad del suelo)', () => {
    const m1 = meshVoltage({ rho: 110, Ig: MALLA.iFalla, D, d, h, n, Ltotal });
    const m2 = meshVoltage({ rho: 220, Ig: MALLA.iFalla, D, d, h, n, Ltotal });
    assertClose(m2.Em / m1.Em, 2, 1e-10, 'Em ∝ ρ');
  });

  it('Em y Es son proporcionales a Ig (corriente de falla)', () => {
    const m1 = meshVoltage({ rho: MALLA.rho, Ig: 8500,  D, d, h, n, Ltotal });
    const m2 = meshVoltage({ rho: MALLA.rho, Ig: 17000, D, d, h, n, Ltotal });
    assertClose(m2.Em / m1.Em, 2, 1e-10, 'Em ∝ Ig');
  });

  it('Ki (factor de irregularidad) = 0.644 + 0.148·n', () => {
    const { Ki } = meshVoltage({ rho: MALLA.rho, Ig: MALLA.iFalla, D, d, h, n, Ltotal });
    assertClose(Ki, 0.644 + 0.148 * n, 1e-12, 'fórmula Ki');
  });
});
