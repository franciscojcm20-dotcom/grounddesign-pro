'use strict';
// calc/motors.js — Motores de cálculo puros extraídos de index.html
//
// Normas de referencia con cálculo real implementado:
//   IEEE Std 80-2013 — Guide for Safety in AC Substation Grounding
//   IEEE Std 81-2012 — Guide for Measuring Earth Resistivity

// ─── WENNER (IEEE Std 81-2012, Cl. 8.3) ──────────────────────────────────────
// ρa = 2 · π · a · R
function wennerApparent(a, R) {
  return 2 * Math.PI * a * R;
}

// Estimación de 2 capas a partir de la curva ρa(a): método de asíntotas.
function estimateTwoLayer(readings) {
  const sorted = [...readings].sort((x, y) => x.a - y.a);
  const rhos = sorted.map(r => ({ a: r.a, rho: wennerApparent(r.a, r.r) }));
  const n = rhos.length;
  const halfLow  = rhos.slice(0, Math.ceil(n / 2));
  const halfHigh = rhos.slice(Math.floor(n / 2));
  const rho1 = halfLow.reduce((s, x) => s + x.rho, 0) / halfLow.length;
  const rho2 = halfHigh.reduce((s, x) => s + x.rho, 0) / halfHigh.length;
  const target = Math.sqrt(rho1 * rho2);
  let hEstimate = sorted[Math.floor(n / 2)].a;
  let minDiff = Infinity;
  for (const pt of rhos) {
    const diff = Math.abs(pt.rho - target);
    if (diff < minDiff) { minDiff = diff; hEstimate = pt.a; }
  }
  return { rho1, rho2, h: hEstimate, curve: rhos };
}

// ─── SCHLUMBERGER (IEEE Std 81-2012, Cl. 8) ──────────────────────────────────
// ρa = π · (L² − l²) / (2l) · R  (forma exacta, Telford et al.)
function schlumbergerApparent(L, l, R) {
  return Math.PI * ((L * L - l * l) / (2 * l)) * R;
}

// ─── CURVAS PATRÓN ORELLANA-MOONEY / N CAPAS (Wait, 1954) ────────────────────

// Función de resistividad aparente teórica de 2 capas (Stefanescu/Wenner):
// ρa/ρ1 = 1 + 2·Σ[ Kr^n · t / sqrt(t² + (2n)²) ]
function theoreticalTwoLayerRho(t, k, nTerms = 60) {
  const Kr = (k - 1) / (k + 1);
  let sum = 0;
  for (let n = 1; n <= nTerms; n++) {
    const kn = Math.pow(Kr, n);
    sum += kn / Math.sqrt(1 + Math.pow(2 * n / t, 2));
  }
  return 1 + 2 * sum;
}

// Función de Bessel J1(x) — Abramowitz & Stegun 9.4.1
function besselJ1(x) {
  if (Math.abs(x) < 1e-10) return 0;
  if (Math.abs(x) <= 3) {
    const t = x / 3;
    return x * (0.5 - 0.56249985 * t ** 2 + 0.21093573 * t ** 4 - 0.03954289 * t ** 6
               + 0.00443319 * t ** 8 - 0.00031761 * t ** 10 + 0.00001109 * t ** 12);
  }
  const t = 3 / x;
  const f = 0.79788456 - 0.00000077 * t - 0.00552740 * t ** 2 - 0.00009512 * t ** 3
            + 0.00137237 * t ** 4 - 0.00072805 * t ** 5 + 0.00014476 * t ** 6;
  const g = -0.04166397 * t - 0.00003954 * t ** 2 + 0.00262573 * t ** 3
            - 0.00054125 * t ** 4 - 0.00029333 * t ** 5 + 0.00013558 * t ** 6;
  return Math.sqrt(1 / Math.PI / Math.max(x, 1e-9))
    * (f * Math.cos(x - 3 * Math.PI / 4) - g * Math.sin(x - 3 * Math.PI / 4));
}

// Kernel recursivo de Wait: T_i(λ) para estructura de N capas.
// rhos = [ρ1, ..., ρN], hs = [h1, ..., h_{N-1}]
function waitKernel(lambda, rhos, hs) {
  const N = rhos.length;
  let T = rhos[N - 1];
  for (let i = N - 2; i >= 0; i--) {
    const ri = rhos[i];
    const hi = hs[i];
    const th = Math.tanh(lambda * hi);
    T = ri * (T + ri * th) / (ri + T * th);
  }
  return T;
}

// Resistividad aparente Wenner sobre suelo de N capas (integración numérica).
// ρa = ρ1 · [1 + 2 · ∫₀^∞ (T1(u/a)/ρ1 − 1) · J1(u) · u · du]
function wennerApparentNLayer(a, rhos, hs) {
  const rho1 = rhos[0];
  let integral = 0;
  const pts = 150;
  const uMin = 1e-3, uMax = 200;
  const du = (uMax - uMin) / pts;
  for (let i = 0; i < pts; i++) {
    const u1 = uMin + i * du;
    const u2 = u1 + du;
    const um = (u1 + u2) / 2;
    const T1 = waitKernel(um / a, rhos, hs);
    const kern = (T1 / rho1 - 1) * besselJ1(um) * um;
    integral += kern * du;
  }
  return rho1 * (1 + 2 * integral);
}

// ─── GEL QUÍMICO (Dwight / Sunde) ────────────────────────────────────────────
// Resistencia de varilla vertical: R = (ρ / (2πL)) · (ln(8L/d) − 1)
function rodResistanceDwight(rho, L, radius) {
  const d = 2 * radius;
  return (rho / (2 * Math.PI * L)) * (Math.log(8 * L / d) - 1);
}

// Con funda de gel: modelo de cilindros concéntricos (Dwight extendido).
function rodResistanceWithGel({ rhoSuelo, rhoGel, L, radioVarilla, radioGel }) {
  const Rfunda = (rhoGel / (2 * Math.PI * L)) * Math.log(radioGel / radioVarilla);
  const Rsuelo = (rhoSuelo / (2 * Math.PI * L)) * (Math.log(8 * L / (2 * radioGel)) - 1);
  const Rtotal = Rfunda + Rsuelo;
  const rhoEff = Rtotal / ((1 / (2 * Math.PI * L)) * (Math.log(8 * L / (2 * radioVarilla)) - 1));
  return { Rfunda, Rsuelo, Rtotal, rhoEff };
}

function computeGel(g, rhoSuelo) {
  const Rsin = rodResistanceDwight(rhoSuelo, g.longVarillaGel, g.radioVarilla);
  const conGel = rodResistanceWithGel({
    rhoSuelo, rhoGel: g.rhoGel, L: g.longVarillaGel,
    radioVarilla: g.radioVarilla, radioGel: g.radioConGel,
  });
  const mejoraPct = ((Rsin - conGel.Rtotal) / Rsin) * 100;
  return { Rsin, ...conGel, mejoraPct };
}

// ─── RESISTENCIA DE MALLA SVERAK (IEEE Std 80-2013, Cl. 14.2) ────────────────
// Rg = ρ [ 1/Lt + (1/√(20A))·(1 + 1/(1+h√(20/A))) ]
function sverakGridResistance({ rho, area, Ltotal, depth }) {
  const term1 = 1 / Ltotal;
  const term2 = (1 / Math.sqrt(20 * area))
    * (1 + 1 / (1 + depth * Math.sqrt(20 / area)));
  const Rg = rho * (term1 + term2);
  return { Rg, term1, term2 };
}

function computeMalla(m, gelInfo) {
  const area    = m.largo * m.ancho;
  const condL   = (m.nConductoresL * m.ancho) + (m.nConductoresW * m.largo);
  const condRods = m.nVarillas * m.longVarilla;
  const Ltotal  = condL + condRods;
  const rhoUsado = (gelInfo && gelInfo.activo) ? gelInfo.rhoEff : m.rho;
  const { Rg, term1, term2 } = sverakGridResistance({ rho: rhoUsado, area, Ltotal, depth: m.profundidad });
  const gpr = Rg * m.iFalla;
  return { area, condL, condRods, Ltotal, Rg, term1, term2, gpr, rhoUsado };
}

// ─── TENSIONES PASO/CONTACTO (IEEE Std 80-2013, Cl. 16) ──────────────────────

// Factor de reducción por capa superficial (Sverak), Ec. 27
function surfaceFactorCs(rho, rhoSuperficial, hSuperficial) {
  return 1 - (0.09 * (1 - rho / rhoSuperficial)) / (2 * hSuperficial + 0.09);
}

// Tensión de contacto admisible (touch voltage), Ec. 33 (70 kg) / 30 (50 kg)
function permissibleTouch(Cs, rhoSuperficial, t, peso) {
  const k = peso === 50 ? 0.116 : 0.157;
  return (1000 + 1.5 * Cs * rhoSuperficial) * k / Math.sqrt(t);
}

// Tensión de paso admisible (step voltage), Ec. 32 (70 kg) / 29 (50 kg)
function permissibleStep(Cs, rhoSuperficial, t, peso) {
  const k = peso === 50 ? 0.116 : 0.157;
  return (1000 + 6 * Cs * rhoSuperficial) * k / Math.sqrt(t);
}

// Tensión de malla real Em — Cl. 16.5, forma simplificada de Sverak
function meshVoltage({ rho, Ig, D, d, h, n, Ltotal }) {
  const Kii = 1;
  const Kh  = Math.sqrt(1 + h / 1.0);
  const Km  = (1 / (2 * Math.PI)) * (
    Math.log(
      (D * D) / (16 * h * d) +
      Math.pow(D + 2 * h, 2) / (8 * D * d) -
      h / (4 * d)
    ) + (Kii / Kh) * Math.log(8 / (Math.PI * (2 * n - 1)))
  );
  const Ki = 0.644 + 0.148 * n;
  const Em = (rho * Ki * Ig * Km) / Ltotal;
  return { Em, Km, Ki, Kh, Kii };
}

// Tensión de paso real Es — Cl. 16.5
function stepVoltageReal({ rho, Ig, D, h, n, Ltotal, Ki }) {
  const Ks = (1 / Math.PI) * (
    1 / (2 * h) + 1 / (D + h) + (1 / D) * (1 - Math.pow(0.5, n - 2))
  );
  const Es = (rho * Ks * Ki * Ig) / Ltotal;
  return { Es, Ks };
}

// ─── CONDUCTOR — ONDERDONK (IEEE Std 80-2013, Cl. 11.3) ──────────────────────
const CONDUCTOR_TABLE = [
  { calibre: '2 AWG',      mm2:  33.6 },
  { calibre: '1/0 AWG',   mm2:  53.5 },
  { calibre: '2/0 AWG',   mm2:  67.4 },
  { calibre: '3/0 AWG',   mm2:  85.0 },
  { calibre: '4/0 AWG',   mm2: 107.2 },
  { calibre: '250 kcmil', mm2: 126.7 },
  { calibre: '300 kcmil', mm2: 152.0 },
  { calibre: '350 kcmil', mm2: 177.3 },
  { calibre: '500 kcmil', mm2: 253.4 },
  { calibre: '750 kcmil', mm2: 380.0 },
];

// A[mm²] = (I[kA] · 197.4) / denom   donde denom = √((TCAP/(t·αr·ρr))·ln((Ko+Tm)/(Ko+Ta)))
function onderdonkArea({ Ifalla_kA, tFalla, tempAmbiente, tempMaxFusion }) {
  const TCAP  = 3.422;
  const alfa_r = 0.00381;
  const rho_r  = 1.78;
  const Ko     = 234;
  const Ta = tempAmbiente;
  const Tm = tempMaxFusion;
  const lnTerm = Math.log((Ko + Tm) / (Ko + Ta));
  const denom  = Math.sqrt((TCAP / (tFalla * alfa_r * rho_r)) * lnTerm);
  const areaMm2 = (Ifalla_kA * 197.4) / denom;
  return { areaMm2, lnTerm, denom, TCAP, alfa_r, rho_r, Ko };
}

function computeConductor(c) {
  const r = onderdonkArea({
    Ifalla_kA:    c.iFalla / 1000,
    tFalla:       c.tFalla,
    tempAmbiente: c.tempAmbiente,
    tempMaxFusion: c.tempMaxFusion,
  });
  const sugerido = CONDUCTOR_TABLE.find(c2 => c2.mm2 >= r.areaMm2)
    || CONDUCTOR_TABLE[CONDUCTOR_TABLE.length - 1];
  let seleccionado = sugerido;
  let esSeleccionManual = false;
  let calibreSubdimensionado = null;
  if (c.calibreSeleccionado) {
    const elegido = CONDUCTOR_TABLE.find(c2 => c2.calibre === c.calibreSeleccionado);
    if (elegido) {
      if (elegido.mm2 >= r.areaMm2) {
        seleccionado = elegido;
        esSeleccionManual = true;
      } else {
        calibreSubdimensionado = elegido;
        seleccionado = sugerido;
      }
    }
  }
  const margen = ((seleccionado.mm2 - r.areaMm2) / r.areaMm2) * 100;
  return { ...r, sugerido, seleccionado, esSeleccionManual, calibreSubdimensionado, margen };
}

module.exports = {
  wennerApparent,
  estimateTwoLayer,
  schlumbergerApparent,
  theoreticalTwoLayerRho,
  besselJ1,
  waitKernel,
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
};
