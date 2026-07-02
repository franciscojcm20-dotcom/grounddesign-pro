/**
 * @gdp/engines-math
 * Motores de cálculo puros para sistemas de puesta a tierra.
 *
 * Normas implementadas con cálculo real:
 *   IEEE Std 80-2013 — Guide for Safety in AC Substation Grounding
 *   IEEE Std 81-2012 — Guide for Measuring Earth Resistivity
 */

// ─── TIPOS PÚBLICOS ───────────────────────────────────────────────────────────

export interface Reading { a: number; r: number }
export interface RhoPoint { a: number; rho: number }
export interface TwoLayerEstimate {
  rho1: number; rho2: number; h: number; curve: RhoPoint[];
}

export interface GelInput {
  longVarillaGel: number;
  radioVarilla:   number;
  rhoGel:         number;
  radioConGel:    number;
}

export interface GelResult {
  Rsin:      number;
  Rfunda:    number;
  Rsuelo:    number;
  Rtotal:    number;
  rhoEff:    number;
  mejoraPct: number;
}

export interface MallaInput {
  largo:         number;
  ancho:         number;
  nConductoresL: number;
  nConductoresW: number;
  nVarillas:     number;
  longVarilla:   number;
  profundidad:   number;
  rho:           number;
  iFalla:        number;
}

export interface MallaResult {
  area:      number;
  condL:     number;
  condRods:  number;
  Ltotal:    number;
  Rg:        number;
  term1:     number;
  term2:     number;
  gpr:       number;
  rhoUsado:  number;
}

export interface MeshInput {
  rho:    number;
  Ig:     number;
  D:      number;
  d:      number;
  h:      number;
  n:      number;
  Ltotal: number;
}

export interface MeshResult {
  Em: number; Km: number; Ki: number; Kh: number; Kii: number;
}

export interface StepInput {
  rho:    number;
  Ig:     number;
  D:      number;
  h:      number;
  n:      number;
  Ltotal: number;
  Ki:     number;
}

export interface OnderdonkInput {
  Ifalla_kA:     number;
  tFalla:        number;
  tempAmbiente:  number;
  tempMaxFusion: number;
}

export interface OnderdonkResult {
  areaMm2: number;
  lnTerm:  number;
  denom:   number;
  TCAP:    number;
  alfa_r:  number;
  rho_r:   number;
  Ko:      number;
}

export interface ConductorEntry { calibre: string; mm2: number }

export interface ConductorInput {
  iFalla:              number;
  tFalla:              number;
  tempAmbiente:        number;
  tempMaxFusion:       number;
  calibreSeleccionado?: string;
}

export interface ConductorResult extends OnderdonkResult {
  sugerido:              ConductorEntry;
  seleccionado:          ConductorEntry;
  esSeleccionManual:     boolean;
  calibreSubdimensionado: ConductorEntry | null;
  margen:                number;
}

export interface SverakInput {
  rho:    number;
  area:   number;
  Ltotal: number;
  depth:  number;
}

export interface RodWithGelInput {
  rhoSuelo:   number;
  rhoGel:     number;
  L:          number;
  radioVarilla: number;
  radioGel:   number;
}

// ─── WENNER (IEEE Std 81-2012, Cl. 8.3) ──────────────────────────────────────

/** ρa = 2 · π · a · R */
export function wennerApparent(a: number, R: number): number {
  return 2 * Math.PI * a * R;
}

/** Estimación de 2 capas a partir de una curva ρa(spacing) ya calculada: método de asíntotas. */
export function estimateTwoLayerFromCurve(curve: RhoPoint[]): TwoLayerEstimate {
  const sorted = [...curve].sort((x, y) => x.a - y.a);
  const n = sorted.length;
  const halfLow  = sorted.slice(0, Math.ceil(n / 2));
  const halfHigh = sorted.slice(Math.floor(n / 2));
  const rho1 = halfLow.reduce((s, x) => s + x.rho, 0) / halfLow.length;
  const rho2 = halfHigh.reduce((s, x) => s + x.rho, 0) / halfHigh.length;
  const target = Math.sqrt(rho1 * rho2);
  let hEstimate = sorted[Math.floor(n / 2)]!.a;
  let minDiff = Infinity;
  for (const pt of sorted) {
    const diff = Math.abs(pt.rho - target);
    if (diff < minDiff) { minDiff = diff; hEstimate = pt.a; }
  }
  return { rho1, rho2, h: hEstimate, curve: sorted };
}

/** Estimación de 2 capas a partir de la curva ρa(a) de Wenner: método de asíntotas. */
export function estimateTwoLayer(readings: Reading[]): TwoLayerEstimate {
  const sorted = [...readings].sort((x, y) => x.a - y.a);
  const rhos: RhoPoint[] = sorted.map(r => ({ a: r.a, rho: wennerApparent(r.a, r.r) }));
  return estimateTwoLayerFromCurve(rhos);
}

/** Estimación de 2 capas a partir de lecturas Schlumberger (L, l, R): usa L/2 como espaciado equivalente AB/2. */
export function estimateTwoLayerSchlumberger(readings: { L: number; l: number; r: number }[]): TwoLayerEstimate {
  const rhos: RhoPoint[] = readings.map(({ L, l, r }) => ({ a: L / 2, rho: schlumbergerApparent(L, l, r) }));
  return estimateTwoLayerFromCurve(rhos);
}

// ─── SCHLUMBERGER (IEEE Std 81-2012, Cl. 8) ──────────────────────────────────

/** ρa = π · (L² − l²) / (2l) · R  (forma exacta, Telford et al.) */
export function schlumbergerApparent(L: number, l: number, R: number): number {
  return Math.PI * ((L * L - l * l) / (2 * l)) * R;
}

// ─── CURVAS PATRÓN / N CAPAS (Wait, 1954) ────────────────────────────────────

/**
 * Resistividad aparente teórica de 2 capas (Stefanescu/Wenner).
 * ρa/ρ1 = 1 + 2·Σ[ Kr^n · t / sqrt(t² + (2n)²) ]
 */
export function theoreticalTwoLayerRho(t: number, k: number, nTerms = 60): number {
  const Kr = (k - 1) / (k + 1);
  let sum = 0;
  for (let n = 1; n <= nTerms; n++) {
    sum += Math.pow(Kr, n) / Math.sqrt(1 + Math.pow(2 * n / t, 2));
  }
  return 1 + 2 * sum;
}

/** Función de Bessel J1(x) — Abramowitz & Stegun 9.4.1 */
export function besselJ1(x: number): number {
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

/**
 * Kernel recursivo de Wait: T_i(λ) para estructura de N capas.
 * rhos = [ρ1, ..., ρN], hs = [h1, ..., h_{N-1}]
 */
export function waitKernel(lambda: number, rhos: number[], hs: number[]): number {
  const N = rhos.length;
  let T = rhos[N - 1]!;
  for (let i = N - 2; i >= 0; i--) {
    const ri = rhos[i]!;
    const hi = hs[i]!;
    const th = Math.tanh(lambda * hi);
    T = ri * (T + ri * th) / (ri + T * th);
  }
  return T;
}

/**
 * Resistividad aparente Wenner sobre suelo de N capas (integración numérica).
 * ρa = ρ1 · [1 + 2 · ∫₀^∞ (T1(u/a)/ρ1 − 1) · J1(u) · u · du]
 */
export function wennerApparentNLayer(a: number, rhos: number[], hs: number[]): number {
  const rho1 = rhos[0]!;
  let integral = 0;
  const pts = 150;
  const uMin = 1e-3, uMax = 200;
  const du = (uMax - uMin) / pts;
  for (let i = 0; i < pts; i++) {
    const u1 = uMin + i * du;
    const um = u1 + du / 2;
    const T1 = waitKernel(um / a, rhos, hs);
    integral += (T1 / rho1 - 1) * besselJ1(um) * um * du;
  }
  return rho1 * (1 + 2 * integral);
}

// ─── GEL QUÍMICO (Dwight / Sunde) ────────────────────────────────────────────

/** Resistencia de varilla vertical: R = (ρ / (2πL)) · (ln(8L/d) − 1) */
export function rodResistanceDwight(rho: number, L: number, radius: number): number {
  const d = 2 * radius;
  return (rho / (2 * Math.PI * L)) * (Math.log(8 * L / d) - 1);
}

/** Con funda de gel: modelo de cilindros concéntricos (Dwight extendido). */
export function rodResistanceWithGel(p: RodWithGelInput): {
  Rfunda: number; Rsuelo: number; Rtotal: number; rhoEff: number;
} {
  const Rfunda = (p.rhoGel / (2 * Math.PI * p.L)) * Math.log(p.radioGel / p.radioVarilla);
  const Rsuelo = (p.rhoSuelo / (2 * Math.PI * p.L)) * (Math.log(8 * p.L / (2 * p.radioGel)) - 1);
  const Rtotal = Rfunda + Rsuelo;
  const rhoEff = Rtotal / ((1 / (2 * Math.PI * p.L)) * (Math.log(8 * p.L / (2 * p.radioVarilla)) - 1));
  return { Rfunda, Rsuelo, Rtotal, rhoEff };
}

export function computeGel(g: GelInput, rhoSuelo: number): GelResult {
  const Rsin = rodResistanceDwight(rhoSuelo, g.longVarillaGel, g.radioVarilla);
  const conGel = rodResistanceWithGel({
    rhoSuelo, rhoGel: g.rhoGel, L: g.longVarillaGel,
    radioVarilla: g.radioVarilla, radioGel: g.radioConGel,
  });
  const mejoraPct = ((Rsin - conGel.Rtotal) / Rsin) * 100;
  return { Rsin, ...conGel, mejoraPct };
}

// ─── RESISTENCIA DE MALLA SVERAK (IEEE Std 80-2013, Cl. 14.2) ────────────────

/** Rg = ρ [ 1/Lt + (1/√(20A))·(1 + 1/(1+h√(20/A))) ] */
export function sverakGridResistance(p: SverakInput): {
  Rg: number; term1: number; term2: number;
} {
  const term1 = 1 / p.Ltotal;
  const term2 = (1 / Math.sqrt(20 * p.area))
    * (1 + 1 / (1 + p.depth * Math.sqrt(20 / p.area)));
  return { Rg: p.rho * (term1 + term2), term1, term2 };
}

export function computeMalla(
  m: MallaInput,
  gelInfo?: { activo: boolean; rhoEff: number } | null,
): MallaResult {
  const area    = m.largo * m.ancho;
  const condL   = m.nConductoresL * m.ancho + m.nConductoresW * m.largo;
  const condRods = m.nVarillas * m.longVarilla;
  const Ltotal  = condL + condRods;
  const rhoUsado = gelInfo?.activo ? gelInfo.rhoEff : m.rho;
  const { Rg, term1, term2 } = sverakGridResistance({ rho: rhoUsado, area, Ltotal, depth: m.profundidad });
  return { area, condL, condRods, Ltotal, Rg, term1, term2, gpr: Rg * m.iFalla, rhoUsado };
}

// ─── OPTIMIZACIÓN ITERATIVA DE MALLA — motor de reglas propio (sin IA/API externa) ──

export interface MallaOptimizeInput extends MallaInput {
  targetRg: number;
  maxLargo?: number;
  maxAncho?: number;
  maxVarillas?: number;
  maxConductoresL?: number;
  maxConductoresW?: number;
}

export interface OptimizeStep { action: string; Rg: number; kind: string }

export interface MallaOptimizeResult {
  achieved:  boolean;
  steps:     OptimizeStep[];
  suggested: MallaInput;
  initialRg: number;
  finalRg:   number;
}

/**
 * Ordena una lista de candidatos de mutación según un orden de prioridad
 * aprendido (`order`, lista de `kind`). Los candidatos no mencionados en
 * `order` conservan su posición relativa original al final. Esto permite que
 * el motor de aprendizaje (bandit) re-priorice las acciones sin modificar la
 * lógica de cálculo de cada optimizador.
 */
function sortByOrder<T extends { kind: string }>(candidates: T[], order?: string[]): T[] {
  if (!order || order.length === 0) return candidates;
  const rank = new Map(order.map((k, i) => [k, i]));
  return [...candidates].sort((a, b) => {
    const ra = rank.has(a.kind) ? rank.get(a.kind)! : order.length + candidates.indexOf(a);
    const rb = rank.has(b.kind) ? rank.get(b.kind)! : order.length + candidates.indexOf(b);
    return ra - rb;
  });
}

/**
 * Búsqueda iterativa determinística: en cada iteración prueba, en el orden
 * indicado (por defecto: varillas → conductores → geometría, el orden de
 * menor costo constructivo relativo), y conserva el primer cambio que reduce
 * Rg. El orden puede ser sobrescrito por `actionOrder` (provisto por el motor
 * de aprendizaje en apps/api, basado en el historial real de qué acción fue
 * más efectiva en proyectos anteriores). Se detiene al alcanzar targetRg, al
 * topar los límites físicos del predio, o al no encontrar más mejora posible.
 */
export function optimizeMallaResistance(
  input: MallaOptimizeInput,
  gelInfo?: { activo: boolean; rhoEff: number } | null,
  actionOrder?: string[],
): MallaOptimizeResult {
  const bounds = {
    maxLargo:         input.maxLargo         ?? input.largo * 2,
    maxAncho:         input.maxAncho         ?? input.ancho * 2,
    maxVarillas:      input.maxVarillas      ?? Math.max(input.nVarillas * 3, 40),
    maxConductoresL:  input.maxConductoresL  ?? Math.max(input.nConductoresL * 2, 20),
    maxConductoresW:  input.maxConductoresW  ?? Math.max(input.nConductoresW * 2, 20),
  };
  let current: MallaInput = { ...input };
  const steps: OptimizeStep[] = [];
  const initialRg = computeMalla(current, gelInfo).Rg;
  let Rg = initialRg;

  function tryStep(kind: string, action: string, mutate: (c: MallaInput) => MallaInput): boolean {
    const next = mutate({ ...current });
    const r = computeMalla(next, gelInfo);
    if (r.Rg < Rg - 1e-9) {
      current = next; Rg = r.Rg;
      steps.push({ kind, action, Rg });
      return true;
    }
    return false;
  }

  let iterations = 0;
  while (Rg > input.targetRg && iterations < 60) {
    iterations++;
    const candidates = sortByOrder([
      { kind: 'add_rods', run: () => current.nVarillas < bounds.maxVarillas && tryStep('add_rods', `+2 varillas (total ${current.nVarillas + 2})`, c => ({ ...c, nVarillas: c.nVarillas + 2 })) },
      { kind: 'add_cond_l', run: () => current.nConductoresL < bounds.maxConductoresL && tryStep('add_cond_l', `+1 conductor longitudinal (total ${current.nConductoresL + 1})`, c => ({ ...c, nConductoresL: c.nConductoresL + 1 })) },
      { kind: 'add_cond_w', run: () => current.nConductoresW < bounds.maxConductoresW && tryStep('add_cond_w', `+1 conductor transversal (total ${current.nConductoresW + 1})`, c => ({ ...c, nConductoresW: c.nConductoresW + 1 })) },
      { kind: 'expand_largo', run: () => current.largo < bounds.maxLargo && tryStep('expand_largo', `Ampliar largo a ${Math.round(current.largo * 1.05 * 10) / 10} m`, c => ({ ...c, largo: Math.round(c.largo * 1.05 * 10) / 10 })) },
      { kind: 'expand_ancho', run: () => current.ancho < bounds.maxAncho && tryStep('expand_ancho', `Ampliar ancho a ${Math.round(current.ancho * 1.05 * 10) / 10} m`, c => ({ ...c, ancho: Math.round(c.ancho * 1.05 * 10) / 10 })) },
    ], actionOrder);
    let progressed = false;
    for (const c of candidates) { if (c.run()) { progressed = true; break; } }
    if (!progressed) break;
  }

  return { achieved: Rg <= input.targetRg, steps, suggested: current, initialRg, finalRg: Rg };
}

// ─── TENSIONES PASO/CONTACTO (IEEE Std 80-2013, Cl. 16) ──────────────────────

/** Factor de reducción por capa superficial (Sverak), Ec. 27 */
export function surfaceFactorCs(rho: number, rhoSuperficial: number, hSuperficial: number): number {
  return 1 - (0.09 * (1 - rho / rhoSuperficial)) / (2 * hSuperficial + 0.09);
}

/** Tensión de contacto admisible (touch voltage), Ec. 33 (70 kg) / 30 (50 kg) */
export function permissibleTouch(
  Cs: number, rhoSuperficial: number, t: number, peso: 50 | 70 = 70
): number {
  const k = peso === 50 ? 0.116 : 0.157;
  return (1000 + 1.5 * Cs * rhoSuperficial) * k / Math.sqrt(t);
}

/** Tensión de paso admisible (step voltage), Ec. 32 (70 kg) / 29 (50 kg) */
export function permissibleStep(
  Cs: number, rhoSuperficial: number, t: number, peso: 50 | 70 = 70
): number {
  const k = peso === 50 ? 0.116 : 0.157;
  return (1000 + 6 * Cs * rhoSuperficial) * k / Math.sqrt(t);
}

/** Tensión de malla real Em — Cl. 16.5, forma simplificada de Sverak */
export function meshVoltage(p: MeshInput): MeshResult {
  const Kii = 1;
  const Kh  = Math.sqrt(1 + p.h / 1.0);
  const Km  = (1 / (2 * Math.PI)) * (
    Math.log(
      (p.D * p.D) / (16 * p.h * p.d) +
      Math.pow(p.D + 2 * p.h, 2) / (8 * p.D * p.d) -
      p.h / (4 * p.d)
    ) + (Kii / Kh) * Math.log(8 / (Math.PI * (2 * p.n - 1)))
  );
  const Ki = 0.644 + 0.148 * p.n;
  return { Em: (p.rho * Ki * p.Ig * Km) / p.Ltotal, Km, Ki, Kh, Kii };
}

/** Tensión de paso real Es — Cl. 16.5 */
export function stepVoltageReal(p: StepInput): { Es: number; Ks: number } {
  const Ks = (1 / Math.PI) * (
    1 / (2 * p.h) + 1 / (p.D + p.h) + (1 / p.D) * (1 - Math.pow(0.5, p.n - 2))
  );
  return { Es: (p.rho * Ks * p.Ki * p.Ig) / p.Ltotal, Ks };
}

// ─── OPTIMIZACIÓN DE TENSIONES DE PASO/CONTACTO — motor de reglas propio ─────
//
// A diferencia de las mallas (donde se optimiza una sola resistencia), aquí
// se optimiza el margen de cumplimiento de DOS criterios simultáneos (Em vs
// Etouch_adm, Es vs Estep_adm). La métrica objetivo es la peor razón real/admisible
// entre ambos; se busca llevarla a ≤ 1. Se priorizan mejoras de bajo costo
// constructivo: primero la capa superficial (grava — ρs y hs, que suben el
// límite admisible), luego la longitud total de conductor (que baja Em y Es
// directamente), y por último geometría (D, h).

export interface VoltagesOptimizeInput {
  rho: number; Ig: number; D: number; d: number; h: number; n: number; Ltotal: number;
  rhoSuperficial: number; hSuperficial: number; tFalla: number; peso?: 50 | 70;
  maxRhoSuperficial?: number; maxHSuperficial?: number; maxLtotal?: number; maxD?: number; maxH?: number;
}
export interface VoltagesOptimizeResult {
  achieved: boolean;
  steps: OptimizeStep[];
  suggested: Omit<VoltagesOptimizeInput, 'maxRhoSuperficial' | 'maxHSuperficial' | 'maxLtotal' | 'maxD' | 'maxH'>;
  initialRatio: number;
  finalRatio: number;
}

function worstVoltageRatio(p: VoltagesOptimizeInput): number {
  const mesh = meshVoltage(p);
  const step = stepVoltageReal({ ...p, Ki: mesh.Ki });
  const Cs = surfaceFactorCs(p.rho, p.rhoSuperficial, p.hSuperficial);
  const eTouchAdm = permissibleTouch(Cs, p.rhoSuperficial, p.tFalla, p.peso ?? 70);
  const eStepAdm = permissibleStep(Cs, p.rhoSuperficial, p.tFalla, p.peso ?? 70);
  return Math.max(mesh.Em / eTouchAdm, step.Es / eStepAdm);
}

export function optimizeVoltages(input: VoltagesOptimizeInput, actionOrder?: string[]): VoltagesOptimizeResult {
  const bounds = {
    maxRhoSuperficial: input.maxRhoSuperficial ?? Math.max(input.rhoSuperficial * 2, 5000),
    maxHSuperficial:   input.maxHSuperficial   ?? 0.20,
    maxLtotal:         input.maxLtotal         ?? input.Ltotal * 2,
    maxD:              input.maxD              ?? input.D * 1.5,
    maxH:              input.maxH              ?? Math.max(input.h * 1.5, 1),
  };
  let current: VoltagesOptimizeInput = { ...input };
  const steps: OptimizeStep[] = [];
  const initialRatio = worstVoltageRatio(current);
  let ratio = initialRatio;
  function tryStep(kind: string, action: string, mutate: (c: VoltagesOptimizeInput) => VoltagesOptimizeInput): boolean {
    const next = mutate({ ...current });
    const r = worstVoltageRatio(next);
    if (r < ratio - 1e-9) { current = next; ratio = r; steps.push({ kind, action, Rg: ratio }); return true; }
    return false;
  }
  let iterations = 0;
  while (ratio > 1 && iterations < 60) {
    iterations++;
    const candidates = sortByOrder([
      { kind: 'improve_surface_rho', run: () => current.rhoSuperficial < bounds.maxRhoSuperficial && tryStep('improve_surface_rho', `Mejorar capa superficial a ρs = ${Math.round(current.rhoSuperficial * 1.15)} Ω·m (grava de mayor resistividad)`, c => ({ ...c, rhoSuperficial: Math.round(c.rhoSuperficial * 1.15) })) },
      { kind: 'thicken_surface', run: () => current.hSuperficial < bounds.maxHSuperficial && tryStep('thicken_surface', `Aumentar espesor de capa superficial a ${Math.round((current.hSuperficial + 0.02) * 100) / 100} m`, c => ({ ...c, hSuperficial: Math.round((c.hSuperficial + 0.02) * 100) / 100 })) },
      { kind: 'extend_ltotal', run: () => current.Ltotal < bounds.maxLtotal && tryStep('extend_ltotal', `Aumentar longitud total de conductor a ${Math.round(current.Ltotal * 1.08)} m`, c => ({ ...c, Ltotal: Math.round(c.Ltotal * 1.08) })) },
      { kind: 'increase_depth', run: () => current.h < bounds.maxH && tryStep('increase_depth', `Aumentar profundidad de enterramiento a ${Math.round(current.h * 1.1 * 100) / 100} m`, c => ({ ...c, h: Math.round(c.h * 1.1 * 100) / 100 })) },
      { kind: 'increase_spacing', run: () => current.D < bounds.maxD && tryStep('increase_spacing', `Aumentar espaciado entre conductores D a ${Math.round(current.D * 1.08 * 100) / 100} m`, c => ({ ...c, D: Math.round(c.D * 1.08 * 100) / 100 })) },
    ], actionOrder);
    let progressed = false;
    for (const c of candidates) { if (c.run()) { progressed = true; break; } }
    if (!progressed) break;
  }
  const { maxRhoSuperficial: _a, maxHSuperficial: _b, maxLtotal: _c, maxD: _d, maxH: _e, ...suggested } = current;
  return { achieved: ratio <= 1, steps, suggested, initialRatio, finalRatio: ratio };
}

// ─── CONDUCTOR — ONDERDONK (IEEE Std 80-2013, Cl. 11.3) ──────────────────────

export const CONDUCTOR_TABLE: readonly ConductorEntry[] = [
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
] as const;

/** A[mm²] = (I[kA] · 197.4) / √((TCAP/(t·αr·ρr))·ln((Ko+Tm)/(Ko+Ta))) */
export function onderdonkArea(p: OnderdonkInput): OnderdonkResult {
  const TCAP  = 3.422;
  const alfa_r = 0.00381;
  const rho_r  = 1.78;
  const Ko     = 234;
  const lnTerm = Math.log((Ko + p.tempMaxFusion) / (Ko + p.tempAmbiente));
  const denom  = Math.sqrt((TCAP / (p.tFalla * alfa_r * rho_r)) * lnTerm);
  return { areaMm2: (p.Ifalla_kA * 197.4) / denom, lnTerm, denom, TCAP, alfa_r, rho_r, Ko };
}

export function computeConductor(c: ConductorInput): ConductorResult {
  const r = onderdonkArea({
    Ifalla_kA:     c.iFalla / 1000,
    tFalla:        c.tFalla,
    tempAmbiente:  c.tempAmbiente,
    tempMaxFusion: c.tempMaxFusion,
  });
  const sugerido = CONDUCTOR_TABLE.find(e => e.mm2 >= r.areaMm2)
    ?? CONDUCTOR_TABLE[CONDUCTOR_TABLE.length - 1]!;
  let seleccionado: ConductorEntry = sugerido;
  let esSeleccionManual = false;
  let calibreSubdimensionado: ConductorEntry | null = null;

  if (c.calibreSeleccionado) {
    const elegido = CONDUCTOR_TABLE.find(e => e.calibre === c.calibreSeleccionado);
    if (elegido) {
      if (elegido.mm2 >= r.areaMm2) {
        seleccionado = elegido;
        esSeleccionManual = true;
      } else {
        calibreSubdimensionado = elegido;
      }
    }
  }
  const margen = ((seleccionado.mm2 - r.areaMm2) / r.areaMm2) * 100;
  return { ...r, sugerido, seleccionado, esSeleccionManual, calibreSubdimensionado, margen };
}

// ─── TOPOLOGÍAS ADICIONALES DE ELECTRODOS (IEEE 80-2013 Annex B) ─────────────

export interface MultipleRodsInput {
  rho: number;      // Ω·m — resistividad del suelo
  L: number;        // m   — longitud de cada pica
  radius: number;   // m   — radio del conductor de la pica
  n: number;        // —   — número de picas
  spacing: number;  // m   — separación entre picas (>= 2L recomendado)
  iFalla: number;   // A   — corriente de falla
}
export interface MultipleRodsResult {
  R1: number;       // Ω — resistencia de una pica sola (Dwight)
  Rm: number;       // Ω — resistencia mutua por par de picas
  Rn: number;       // Ω — resistencia total n picas en paralelo
  gpr: number;      // V — potencial de tierra (GPR = Rn × Ifalla)
  compliance: { rg1: boolean; rg5: boolean };
}

/**
 * N electrodos verticales en paralelo — Dwight con resistencia mutua
 * IEEE 80-2013 Annex B.1, Sunde (1949)
 */
export function computeMultipleRods(p: MultipleRodsInput): MultipleRodsResult {
  const R1 = rodResistanceDwight(p.rho, p.L, p.radius);
  // Resistencia mutua entre dos picas: Rm = (ρ/2πL)·[ln(2L/s) - 1]
  const Rm = (p.rho / (2 * Math.PI * p.L)) * (Math.log(2 * p.L / p.spacing) - 1);
  // Para n picas en fila: R_n = (R1 + (n-1)·Rm) / n²  (Sunde)
  const Rn = p.n === 1 ? R1 : (R1 + (p.n - 1) * Rm) / p.n;
  const gpr = Rn * p.iFalla;
  return { R1, Rm, Rn, gpr, compliance: { rg1: Rn <= 1, rg5: Rn <= 5 } };
}

export interface HorizontalStripInput {
  rho: number;      // Ω·m
  L: number;        // m — longitud total del conductor
  h: number;        // m — profundidad de enterramiento
  radius: number;   // m — radio del conductor
  iFalla: number;   // A
}
export interface HorizontalStripResult {
  Rh: number;
  gpr: number;
  compliance: { rg1: boolean; rg5: boolean };
}

/**
 * Conductor horizontal enterrado (tira) — Dwight (1936)
 * IEEE 80-2013 Annex B.3
 * R = (ρ/πL) · [ln(2L²/a·h) - 1]
 */
export function computeHorizontalStrip(p: HorizontalStripInput): HorizontalStripResult {
  const Rh = (p.rho / (Math.PI * p.L)) * (Math.log(2 * p.L * p.L / (p.radius * p.h)) - 1);
  const gpr = Rh * p.iFalla;
  return { Rh, gpr, compliance: { rg1: Rh <= 1, rg5: Rh <= 5 } };
}

export interface RadialStarInput {
  rho: number;      // Ω·m
  L: number;        // m — longitud de cada radial
  h: number;        // m — profundidad
  radius: number;   // m — radio del conductor
  n: number;        // — número de radiales (igual separación angular)
  iFalla: number;   // A
}
export interface RadialStarResult {
  R1: number;       // Ω — resistencia de un radial solo
  Rstar: number;    // Ω — resistencia sistema radial completo
  Ltotal: number;   // m — longitud total de conductor
  gpr: number;
  compliance: { rg1: boolean; rg5: boolean };
}

/**
 * Sistema de electrodos radiales (estrella) — Laurent-Niemann
 * IEEE 80-2013 Annex B, fórmula de Niemann (1952)
 * Rg = (ρ/π·n·L) · [ln(2L²/a·h) - 1 + (n−1)·(h/L)]
 */
export function computeRadialStar(p: RadialStarInput): RadialStarResult {
  const R1 = (p.rho / (Math.PI * p.L)) * (Math.log(2 * p.L * p.L / (p.radius * p.h)) - 1);
  // Factor de acoplamiento mutuo entre radiales a igual ángulo (Niemann)
  const mutualFactor = p.n > 1 ? ((p.n - 1) * p.h) / p.L : 0;
  const Rstar = (p.rho / (Math.PI * p.n * p.L))
    * (Math.log(2 * p.L * p.L / (p.radius * p.h)) - 1 + mutualFactor);
  return {
    R1, Rstar,
    Ltotal: p.n * p.L,
    gpr: Rstar * p.iFalla,
    compliance: { rg1: Rstar <= 1, rg5: Rstar <= 5 },
  };
}

export interface RingLoopInput {
  rho: number;      // Ω·m
  perimeter: number;// m — perímetro del anillo (cualquier forma)
  h: number;        // m — profundidad
  radius: number;   // m — radio del conductor
  iFalla: number;   // A
}
export interface RingLoopResult {
  rEq: number;      // m — radio equivalente del anillo
  Rring: number;    // Ω
  gpr: number;
  compliance: { rg1: boolean; rg5: boolean };
}

/**
 * Anillo perimetral — Sunde (1949)
 * IEEE 80-2013 §14.3
 * R = (ρ/2π²·r) · [ln(8r/a) + ln(2r/h) − 2]
 * r = radio equivalente del anillo = P / (2π)
 */
export function computeRingLoop(p: RingLoopInput): RingLoopResult {
  const rEq = p.perimeter / (2 * Math.PI);
  const Rring = (p.rho / (2 * Math.PI * Math.PI * rEq))
    * (Math.log(8 * rEq / p.radius) + Math.log(2 * rEq / p.h) - 2);
  return { rEq, Rring, gpr: Rring * p.iFalla, compliance: { rg1: Rring <= 1, rg5: Rring <= 5 } };
}

export interface CombinedGridRodInput {
  // Malla rectangular (Sverak)
  rho: number;
  area: number;          // m²
  Ltotal: number;        // m — longitud total conductores de malla
  depth: number;         // m — profundidad de malla
  // Picas adicionales
  nRods: number;
  rodLength: number;     // m
  rodRadius: number;     // m
  rodSpacing: number;    // m (separación entre picas)
  iFalla: number;        // A
}
export interface CombinedGridRodResult {
  Rg: number;    // Ω — resistencia malla sola (Sverak)
  Rr: number;    // Ω — resistencia picas en paralelo
  Rmr: number;   // Ω — resistencia mutua malla-picas
  Rc: number;    // Ω — resistencia combinada (Schwarz)
  gpr: number;
  mejora: number; // % reducción respecto a malla sola
  compliance: { rg1: boolean; rg5: boolean };
}

/**
 * Sistema combinado malla + picas — Schwarz (1954)
 * IEEE 80-2013 §14.5
 * Rc = (Rg·Rr − Rmr²) / (Rg + Rr − 2·Rmr)
 */
export function computeCombinedGridRod(p: CombinedGridRodInput): CombinedGridRodResult {
  const { Rg } = sverakGridResistance({ rho: p.rho, area: p.area, Ltotal: p.Ltotal, depth: p.depth });
  // Resistencia de las picas en paralelo (Dwight + Sunde)
  const R1rod = rodResistanceDwight(p.rho, p.rodLength, p.rodRadius);
  const Rmutual = p.nRods > 1
    ? (p.rho / (2 * Math.PI * p.rodLength)) * (Math.log(2 * p.rodLength / p.rodSpacing) - 1)
    : 0;
  const Rr = p.nRods === 1 ? R1rod : (R1rod + (p.nRods - 1) * Rmutual) / p.nRods;
  // Resistencia mutua malla-picas (Schwarz): Rmr = (ρ/2πLt)·ln(Lt/hp) - 1
  // Aproximación: Rmr = ρ/(2π·√(area)) · k  donde k ≈ 1
  const Rmr = (p.rho / (2 * Math.PI * Math.sqrt(p.area)));
  const denom = Rg + Rr - 2 * Rmr;
  const Rc = denom > 0 ? (Rg * Rr - Rmr * Rmr) / denom : Math.min(Rg, Rr);
  const mejora = ((Rg - Rc) / Rg) * 100;
  return { Rg, Rr, Rmr, Rc, gpr: Rc * p.iFalla, mejora, compliance: { rg1: Rc <= 1, rg5: Rc <= 5 } };
}

// ─── OPTIMIZACIÓN ITERATIVA — TOPOLOGÍAS ADICIONALES (motor de reglas propio) ──
//
// Mismo principio que optimizeMallaResistance: en cada iteración se prueban
// mutaciones en orden de menor costo constructivo relativo, se conserva solo
// la primera que reduce la resistencia, y se detiene al alcanzar targetRg,
// al topar límites configurados, o al no encontrar más mejora posible.

export interface RodOptimizeInput extends MultipleRodsInput {
  targetRg: number; maxN?: number; maxL?: number; maxSpacing?: number;
}
export interface RodOptimizeResult { achieved: boolean; steps: OptimizeStep[]; suggested: MultipleRodsInput; initialRg: number; finalRg: number }

export function optimizeRodResistance(input: RodOptimizeInput, actionOrder?: string[]): RodOptimizeResult {
  const bounds = { maxN: input.maxN ?? Math.max(input.n * 3, 20), maxL: input.maxL ?? input.L * 2, maxSpacing: input.maxSpacing ?? input.spacing * 2 };
  let current: MultipleRodsInput = { ...input };
  const steps: OptimizeStep[] = [];
  const initialRg = computeMultipleRods(current).Rn;
  let Rg = initialRg;
  function tryStep(kind: string, action: string, mutate: (c: MultipleRodsInput) => MultipleRodsInput): boolean {
    const next = mutate({ ...current });
    const r = computeMultipleRods(next).Rn;
    if (r < Rg - 1e-9) { current = next; Rg = r; steps.push({ kind, action, Rg }); return true; }
    return false;
  }
  let iterations = 0;
  while (Rg > input.targetRg && iterations < 60) {
    iterations++;
    const candidates = sortByOrder([
      { kind: 'add_rod', run: () => current.n < bounds.maxN && tryStep('add_rod', `+1 pica (total ${current.n + 1})`, c => ({ ...c, n: c.n + 1 })) },
      { kind: 'extend_length', run: () => current.L < bounds.maxL && tryStep('extend_length', `Aumentar longitud de pica a ${Math.round(current.L * 1.1 * 10) / 10} m`, c => ({ ...c, L: Math.round(c.L * 1.1 * 10) / 10 })) },
      { kind: 'increase_spacing', run: () => current.spacing < bounds.maxSpacing && tryStep('increase_spacing', `Aumentar separación entre picas a ${Math.round(current.spacing * 1.1 * 10) / 10} m`, c => ({ ...c, spacing: Math.round(c.spacing * 1.1 * 10) / 10 })) },
    ], actionOrder);
    let progressed = false;
    for (const c of candidates) { if (c.run()) { progressed = true; break; } }
    if (!progressed) break;
  }
  return { achieved: Rg <= input.targetRg, steps, suggested: current, initialRg, finalRg: Rg };
}

export interface StripOptimizeInput extends HorizontalStripInput {
  targetRg: number; maxL?: number; maxRadius?: number; maxH?: number;
}
export interface StripOptimizeResult { achieved: boolean; steps: OptimizeStep[]; suggested: HorizontalStripInput; initialRg: number; finalRg: number }

export function optimizeStripResistance(input: StripOptimizeInput, actionOrder?: string[]): StripOptimizeResult {
  const bounds = { maxL: input.maxL ?? input.L * 2, maxRadius: input.maxRadius ?? input.radius * 2, maxH: input.maxH ?? Math.max(input.h * 2, 1.5) };
  let current: HorizontalStripInput = { ...input };
  const steps: OptimizeStep[] = [];
  const initialRg = computeHorizontalStrip(current).Rh;
  let Rg = initialRg;
  function tryStep(kind: string, action: string, mutate: (c: HorizontalStripInput) => HorizontalStripInput): boolean {
    const next = mutate({ ...current });
    const r = computeHorizontalStrip(next).Rh;
    if (r < Rg - 1e-9) { current = next; Rg = r; steps.push({ kind, action, Rg }); return true; }
    return false;
  }
  let iterations = 0;
  while (Rg > input.targetRg && iterations < 60) {
    iterations++;
    const candidates = sortByOrder([
      { kind: 'extend_length', run: () => current.L < bounds.maxL && tryStep('extend_length', `Ampliar longitud de conductor a ${Math.round(current.L * 1.08)} m`, c => ({ ...c, L: Math.round(c.L * 1.08) })) },
      { kind: 'increase_depth', run: () => current.h < bounds.maxH && tryStep('increase_depth', `Aumentar profundidad de enterramiento a ${Math.round(current.h * 1.1 * 100) / 100} m`, c => ({ ...c, h: Math.round(c.h * 1.1 * 100) / 100 })) },
      { kind: 'increase_section', run: () => current.radius < bounds.maxRadius && tryStep('increase_section', `Aumentar sección del conductor (radio ${Math.round(current.radius * 1.1 * 1000) / 1000} m)`, c => ({ ...c, radius: Math.round(c.radius * 1.1 * 1000) / 1000 })) },
    ], actionOrder);
    let progressed = false;
    for (const c of candidates) { if (c.run()) { progressed = true; break; } }
    if (!progressed) break;
  }
  return { achieved: Rg <= input.targetRg, steps, suggested: current, initialRg, finalRg: Rg };
}

export interface RadialOptimizeInput extends RadialStarInput {
  targetRg: number; maxN?: number; maxL?: number; maxH?: number;
}
export interface RadialOptimizeResult { achieved: boolean; steps: OptimizeStep[]; suggested: RadialStarInput; initialRg: number; finalRg: number }

export function optimizeRadialResistance(input: RadialOptimizeInput, actionOrder?: string[]): RadialOptimizeResult {
  const bounds = { maxN: input.maxN ?? Math.max(input.n * 2, 16), maxL: input.maxL ?? input.L * 2, maxH: input.maxH ?? Math.max(input.h * 2, 1.5) };
  let current: RadialStarInput = { ...input };
  const steps: OptimizeStep[] = [];
  const initialRg = computeRadialStar(current).Rstar;
  let Rg = initialRg;
  function tryStep(kind: string, action: string, mutate: (c: RadialStarInput) => RadialStarInput): boolean {
    const next = mutate({ ...current });
    const r = computeRadialStar(next).Rstar;
    if (r < Rg - 1e-9) { current = next; Rg = r; steps.push({ kind, action, Rg }); return true; }
    return false;
  }
  let iterations = 0;
  while (Rg > input.targetRg && iterations < 60) {
    iterations++;
    const candidates = sortByOrder([
      { kind: 'add_radial', run: () => current.n < bounds.maxN && tryStep('add_radial', `+1 radial (total ${current.n + 1})`, c => ({ ...c, n: c.n + 1 })) },
      { kind: 'extend_length', run: () => current.L < bounds.maxL && tryStep('extend_length', `Ampliar longitud de cada radial a ${Math.round(current.L * 1.08 * 10) / 10} m`, c => ({ ...c, L: Math.round(c.L * 1.08 * 10) / 10 })) },
      { kind: 'increase_depth', run: () => current.h < bounds.maxH && tryStep('increase_depth', `Aumentar profundidad a ${Math.round(current.h * 1.1 * 100) / 100} m`, c => ({ ...c, h: Math.round(c.h * 1.1 * 100) / 100 })) },
    ], actionOrder);
    let progressed = false;
    for (const c of candidates) { if (c.run()) { progressed = true; break; } }
    if (!progressed) break;
  }
  return { achieved: Rg <= input.targetRg, steps, suggested: current, initialRg, finalRg: Rg };
}

export interface RingOptimizeInput extends RingLoopInput {
  targetRg: number; maxPerimeter?: number; maxRadius?: number; maxH?: number;
}
export interface RingOptimizeResult { achieved: boolean; steps: OptimizeStep[]; suggested: RingLoopInput; initialRg: number; finalRg: number }

export function optimizeRingResistance(input: RingOptimizeInput, actionOrder?: string[]): RingOptimizeResult {
  const bounds = { maxPerimeter: input.maxPerimeter ?? input.perimeter * 2, maxRadius: input.maxRadius ?? input.radius * 2, maxH: input.maxH ?? Math.max(input.h * 2, 1.5) };
  let current: RingLoopInput = { ...input };
  const steps: OptimizeStep[] = [];
  const initialRg = computeRingLoop(current).Rring;
  let Rg = initialRg;
  function tryStep(kind: string, action: string, mutate: (c: RingLoopInput) => RingLoopInput): boolean {
    const next = mutate({ ...current });
    const r = computeRingLoop(next).Rring;
    if (r < Rg - 1e-9) { current = next; Rg = r; steps.push({ kind, action, Rg }); return true; }
    return false;
  }
  let iterations = 0;
  while (Rg > input.targetRg && iterations < 60) {
    iterations++;
    const candidates = sortByOrder([
      { kind: 'expand_perimeter', run: () => current.perimeter < bounds.maxPerimeter && tryStep('expand_perimeter', `Ampliar perímetro del anillo a ${Math.round(current.perimeter * 1.06 * 10) / 10} m`, c => ({ ...c, perimeter: Math.round(c.perimeter * 1.06 * 10) / 10 })) },
      { kind: 'increase_depth', run: () => current.h < bounds.maxH && tryStep('increase_depth', `Aumentar profundidad a ${Math.round(current.h * 1.1 * 100) / 100} m`, c => ({ ...c, h: Math.round(c.h * 1.1 * 100) / 100 })) },
      { kind: 'increase_section', run: () => current.radius < bounds.maxRadius && tryStep('increase_section', `Aumentar sección del conductor (radio ${Math.round(current.radius * 1.1 * 1000) / 1000} m)`, c => ({ ...c, radius: Math.round(c.radius * 1.1 * 1000) / 1000 })) },
    ], actionOrder);
    let progressed = false;
    for (const c of candidates) { if (c.run()) { progressed = true; break; } }
    if (!progressed) break;
  }
  return { achieved: Rg <= input.targetRg, steps, suggested: current, initialRg, finalRg: Rg };
}

export interface CombinedOptimizeInput extends CombinedGridRodInput {
  targetRg: number; maxArea?: number; maxLtotal?: number; maxNRods?: number; maxRodLength?: number;
}
export interface CombinedOptimizeResult { achieved: boolean; steps: OptimizeStep[]; suggested: CombinedGridRodInput; initialRg: number; finalRg: number }

export function optimizeCombinedResistance(input: CombinedOptimizeInput, actionOrder?: string[]): CombinedOptimizeResult {
  const bounds = {
    maxArea: input.maxArea ?? input.area * 2,
    maxLtotal: input.maxLtotal ?? input.Ltotal * 2,
    maxNRods: input.maxNRods ?? Math.max(input.nRods * 3, 30),
    maxRodLength: input.maxRodLength ?? input.rodLength * 2,
  };
  let current: CombinedGridRodInput = { ...input };
  const steps: OptimizeStep[] = [];
  const initialRg = computeCombinedGridRod(current).Rc;
  let Rg = initialRg;
  function tryStep(kind: string, action: string, mutate: (c: CombinedGridRodInput) => CombinedGridRodInput): boolean {
    const next = mutate({ ...current });
    const r = computeCombinedGridRod(next).Rc;
    if (r < Rg - 1e-9) { current = next; Rg = r; steps.push({ kind, action, Rg }); return true; }
    return false;
  }
  let iterations = 0;
  while (Rg > input.targetRg && iterations < 60) {
    iterations++;
    const candidates = sortByOrder([
      { kind: 'add_rods', run: () => current.nRods < bounds.maxNRods && tryStep('add_rods', `+2 picas adicionales (total ${current.nRods + 2})`, c => ({ ...c, nRods: c.nRods + 2 })) },
      { kind: 'extend_rods', run: () => current.rodLength < bounds.maxRodLength && tryStep('extend_rods', `Aumentar longitud de picas a ${Math.round(current.rodLength * 1.1 * 10) / 10} m`, c => ({ ...c, rodLength: Math.round(c.rodLength * 1.1 * 10) / 10 })) },
      { kind: 'extend_ltotal', run: () => current.Ltotal < bounds.maxLtotal && tryStep('extend_ltotal', `Aumentar longitud total de malla a ${Math.round(current.Ltotal * 1.05)} m`, c => ({ ...c, Ltotal: Math.round(c.Ltotal * 1.05) })) },
      { kind: 'expand_area', run: () => current.area < bounds.maxArea && tryStep('expand_area', `Ampliar área de la malla a ${Math.round(current.area * 1.08)} m²`, c => ({ ...c, area: Math.round(c.area * 1.08) })) },
    ], actionOrder);
    let progressed = false;
    for (const c of candidates) { if (c.run()) { progressed = true; break; } }
    if (!progressed) break;
  }
  return { achieved: Rg <= input.targetRg, steps, suggested: current, initialRg, finalRg: Rg };
}

// ─── Lightning Protection — Rolling Sphere / NFPA 780 / IEC 62305 ────────────

/** LPS protection level → rolling sphere radius (m) per IEC 62305-3 Table 2 */
export const ROLLING_SPHERE_RADIUS: Record<string, number> = {
  'I':   20,
  'II':  30,
  'III': 45,
  'IV':  60,
};

/** Collection area of an isolated structure per IEC 62305-2 Annex A (simplified) */
export function collectionArea(length: number, width: number, height: number): number {
  // Ad = L·W + 2·(L+W)·H + π·H²
  return length * width + 2 * (length + width) * height + Math.PI * height * height;
}

/** Annual flash density from ground flash density Ng (flashes/km²/yr) */
export function annualStrikes(Ad_m2: number, Ng: number): number {
  return Ng * Ad_m2 * 1e-6; // convert m² → km²
}

/** Tolerable frequency of dangerous events per IEC 62305-2 */
export const TOLERABLE_FREQUENCY: Record<string, number> = {
  'dwelling':    1e-3,
  'farm':        1e-3,
  'industry':    1e-4,
  'public':      1e-5,
  'hospital':    1e-5,
  'heritage':    1e-3,
};

export interface LightningInput {
  structureLength:  number;   // m
  structureWidth:   number;   // m
  structureHeight:  number;   // m
  groundFlashDensity: number; // Ng, flashes/km²/yr (typical 1-10)
  lpsLevel:         'I' | 'II' | 'III' | 'IV';
  occupancyType:    keyof typeof TOLERABLE_FREQUENCY;
  environmentFactor?: number; // Cd: 0.25 isolated hilltop, 0.5 rural, 1.0 urban, 2.0 dense
}

export interface ProtectionZone {
  level: string;
  radius: number;
  /** Points on the arc of the rolling sphere for SVG rendering [x, y][] */
  arcPoints: Array<[number, number]>;
}

export interface LightningResult {
  rollingSphereRadius: number;   // m
  collectionAreaM2:    number;
  annualStrikes:       number;   // Nd
  tolerableFrequency:  number;   // NT
  protectionRequired:  boolean;
  efficiencyRequired:  number;   // E = 1 - NT/Nd (0 if not needed)
  recommendedLevel:    string;
  zones: ProtectionZone[];
  downConductors:      number;   // minimum per NFPA 780 §4.7
  groundTerminations:  number;
}

export function computeLightning(p: LightningInput): LightningResult {
  const Cd  = p.environmentFactor ?? 1.0;
  const Ad  = collectionArea(p.structureLength, p.structureWidth, p.structureHeight);
  const Nd  = annualStrikes(Ad, p.groundFlashDensity) * Cd;
  const NT  = TOLERABLE_FREQUENCY[p.occupancyType] ?? 1e-3;
  const protectionRequired = Nd > NT;
  const efficiencyRequired = protectionRequired ? Math.max(0, 1 - NT / Nd) : 0;

  // Recommend level based on required efficiency (IEC 62305-2 Table 2)
  let recommendedLevel = 'IV';
  if (efficiencyRequired >= 0.98) recommendedLevel = 'I';
  else if (efficiencyRequired >= 0.95) recommendedLevel = 'II';
  else if (efficiencyRequired >= 0.90) recommendedLevel = 'III';

  const radius = ROLLING_SPHERE_RADIUS[p.lpsLevel]!;

  // Arc points for rolling sphere cross-section (elevation view, normalized to structure height)
  // Sphere rolls along roof; contact point at edge gives protected zone arc
  const H = p.structureHeight;
  const arcPoints: Array<[number, number]> = [];
  for (let deg = -90; deg <= 90; deg += 5) {
    const rad = (deg * Math.PI) / 180;
    arcPoints.push([radius * Math.cos(rad), H + radius - radius * Math.sin(Math.abs(rad))]);
  }

  // Zones: zone 0A (unprotected), 0B (partially), 1 (protected)
  const zones: ProtectionZone[] = [
    { level: 'LPZ 0A', radius: 0, arcPoints: [] },
    { level: `LPZ 1 (r = ${radius} m)`, radius, arcPoints },
  ];

  // Minimum down conductors: perimeter / 10m spacing (NFPA 780 §4.7.2), min 2
  const perimeter = 2 * (p.structureLength + p.structureWidth);
  const downConductors = Math.max(2, Math.ceil(perimeter / 10));
  const groundTerminations = downConductors;

  return {
    rollingSphereRadius: radius,
    collectionAreaM2: Ad,
    annualStrikes: Nd,
    tolerableFrequency: NT,
    protectionRequired,
    efficiencyRequired,
    recommendedLevel,
    zones,
    downConductors,
    groundTerminations,
  };
}

// ─── CUBICACIÓN Y VALORIZACIÓN ECONÓMICA — motor propio (sin API externa) ────
//
// Convierte la geometría de cualquier sistema de puesta a tierra ya diseñado
// (malla, picas, conductor, radial, anillo o combinada) en una cubicación de
// materiales (BOQ — Bill of Quantities) y su valorización económica en CLP.
// Los precios unitarios son de referencia y siempre editables por el usuario
// antes de emitir el entregable — no provienen de ninguna API de precios.

export interface CubicacionInput {
  conductorMetros:      number;  // m — longitud total de conductor (malla + picas + radiales, etc.)
  conductorSeccionMm2:  number;  // mm² — sección del conductor seleccionado (Onderdonk)
  varillasCantidad:     number;  // — número de electrodos verticales (picas)
  varillaLongitudM:     number;  // m — longitud de cada pica
  conectoresCantidad:   number;  // — uniones exotérmicas (derivación + terminales)
  gelActivo:            boolean;
  gelKg:                number;  // kg — aditivo químico de baja resistividad
  zanjaM3:              number;  // m³ — excavación y relleno de zanja
}

export interface PreciosUnitariosCLP {
  conductorPorMetroPorMm2: number; // CLP / (m·mm²) — conductor de cobre desnudo
  varillaPorUnidad:        number; // CLP / unidad — varilla copperweld
  conectorPorUnidad:       number; // CLP / unidad — conector exotérmico
  gelPorKg:                number; // CLP / kg — aditivo gel químico
  excavacionPorM3:         number; // CLP / m³ — excavación + relleno
  manoObraPct:             number; // % sobre subtotal de materiales
  imprevistosPct:          number; // % sobre (materiales + mano de obra)
}

/** Precios de referencia (CLP, mercado chileno) — punto de partida editable, no una cotización real. */
export const DEFAULT_PRECIOS_CLP: PreciosUnitariosCLP = {
  conductorPorMetroPorMm2: 350,
  varillaPorUnidad:        18000,
  conectorPorUnidad:       6500,
  gelPorKg:                3200,
  excavacionPorM3:         12000,
  manoObraPct:             25,
  imprevistosPct:          10,
};

export interface BOQItem {
  item:          string;
  unidad:        string;
  cantidad:      number;
  precioUnitCLP: number;
  subtotalCLP:   number;
}

export interface ValorizacionResult {
  items:              BOQItem[];
  subtotalMateriales: number;
  manoObra:           number;
  imprevistos:        number;
  total:              number;
  moneda:             'CLP';
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export function computeValorizacion(
  input: CubicacionInput,
  precios: PreciosUnitariosCLP = DEFAULT_PRECIOS_CLP,
): ValorizacionResult {
  const items: BOQItem[] = [];

  if (input.conductorMetros > 0) {
    const precioUnit = round2(input.conductorSeccionMm2 * precios.conductorPorMetroPorMm2);
    items.push({
      item: `Conductor de cobre desnudo ${input.conductorSeccionMm2} mm²`,
      unidad: 'm', cantidad: round2(input.conductorMetros),
      precioUnitCLP: precioUnit, subtotalCLP: round2(input.conductorMetros * precioUnit),
    });
  }
  if (input.varillasCantidad > 0) {
    items.push({
      item: `Varilla copperweld ${input.varillaLongitudM} m`,
      unidad: 'un', cantidad: input.varillasCantidad,
      precioUnitCLP: precios.varillaPorUnidad,
      subtotalCLP: round2(input.varillasCantidad * precios.varillaPorUnidad),
    });
  }
  if (input.conectoresCantidad > 0) {
    items.push({
      item: 'Conector exotérmico (derivación/terminal)',
      unidad: 'un', cantidad: input.conectoresCantidad,
      precioUnitCLP: precios.conectorPorUnidad,
      subtotalCLP: round2(input.conectoresCantidad * precios.conectorPorUnidad),
    });
  }
  if (input.gelActivo && input.gelKg > 0) {
    items.push({
      item: 'Aditivo gel químico de baja resistividad',
      unidad: 'kg', cantidad: round2(input.gelKg),
      precioUnitCLP: precios.gelPorKg,
      subtotalCLP: round2(input.gelKg * precios.gelPorKg),
    });
  }
  if (input.zanjaM3 > 0) {
    items.push({
      item: 'Excavación y relleno de zanja',
      unidad: 'm³', cantidad: round2(input.zanjaM3),
      precioUnitCLP: precios.excavacionPorM3,
      subtotalCLP: round2(input.zanjaM3 * precios.excavacionPorM3),
    });
  }

  const subtotalMateriales = round2(items.reduce((s, i) => s + i.subtotalCLP, 0));
  const manoObra    = round2(subtotalMateriales * (precios.manoObraPct / 100));
  const imprevistos = round2((subtotalMateriales + manoObra) * (precios.imprevistosPct / 100));
  const total       = round2(subtotalMateriales + manoObra + imprevistos);

  return { items, subtotalMateriales, manoObra, imprevistos, total, moneda: 'CLP' };
}

/** Estima el volumen de zanja (m³) a partir de la longitud de conductor y una sección típica de zanja. */
export function estimateTrenchVolume(conductorMetros: number, anchoM = 0.3, profundidadM = 0.6): number {
  return round2(conductorMetros * anchoM * profundidadM);
}

// ─── MOTOR DE ANÁLISIS DE FALLA — CORRIENTE DE DISEÑO (IEEE Std 80-2013 Cl. 15) ──
//
// Determina y justifica técnicamente la corriente oficial de diseño (Ig) que
// alimenta el resto del proyecto. Ig = If · Sf · Df, donde:
//   If = corriente de falla simétrica (estudio de cortocircuito, dato de entrada)
//   Sf = factor de división de corriente (fracción de If que efectivamente
//        retorna por la malla en estudio, en vez de por caminos alternativos:
//        neutros, cables de guarda, pantallas de cable, estructuras metálicas,
//        mallas de tierra vecinas)
//   Df = factor de decremento (corrige por la componente asimétrica/DC de la
//        corriente de falla durante el tiempo de despeje, IEEE 80-2013 Ec. 79)

export interface DecrementFactorInput {
  tFalla: number;   // s — duración de la falla (tiempo de despeje de protecciones)
  xr: number;       // — relación X/R en el punto de falla
  freq?: number;    // Hz — frecuencia del sistema (50 Chile/Europa, 60 América)
}

/**
 * Factor de decremento Df — IEEE Std 80-2013, Ecuación 79:
 *   Df = √(1 + (Ta/tf)·(1 − e^(−2tf/Ta)))
 * donde Ta = (X/R)/(2πf) es la constante de tiempo del sistema en el punto de falla.
 * Df ≥ 1 siempre; para tf grande respecto a Ta, Df → 1 (la componente DC decae
 * antes de que actúen las protecciones).
 */
export function computeDecrementFactor(p: DecrementFactorInput): { Df: number; Ta: number } {
  const freq = p.freq ?? 50;
  const Ta = p.xr / (2 * Math.PI * freq);
  const tf = p.tFalla;
  const Df = Math.sqrt(1 + (Ta / tf) * (1 - Math.exp((-2 * tf) / Ta)));
  return { Df, Ta };
}

export type SplitFactorMethod = 'manual' | 'conservative' | 'estimated';

export interface SplitFactorInput {
  method: SplitFactorMethod;
  manualValue?: number;      // 0–1, requerido si method='manual'
  nParallelPaths?: number;   // nº de trayectorias de retorno paralelas, requerido si method='estimated'
}

export interface SplitFactorResult { Sf: number; justificacion: string }

/**
 * Factor de división de corriente (split factor) Sf — la determinación exacta
 * requiere modelar todas las trayectorias de retorno paralelas a la malla
 * (IEEE Std 80-2013 Annex C: cables de guarda, pantallas, neutros, estructuras
 * metálicas, mallas vecinas), lo que exige datos de línea/torre detallados
 * (normalmente obtenidos con software especializado de líneas de transmisión).
 * Este motor ofrece tres métodos, para que el profesional use el más adecuado
 * según la información disponible — nunca asume una corriente fija:
 *   'manual'       — el profesional ingresa Sf desde un estudio específico (mayor confiabilidad).
 *   'conservative' — Sf = 1 (100% retorna por la malla); usado cuando no hay
 *                    datos de trayectorias alternativas — resultado conservador (Ig más alta).
 *   'estimated'    — aproximación propia en función del número de trayectorias
 *                    de retorno paralelas identificadas (NO reemplaza un
 *                    estudio de distribución de corriente para proyectos críticos).
 */
export function computeSplitFactor(p: SplitFactorInput): SplitFactorResult {
  if (p.method === 'conservative') {
    return {
      Sf: 1,
      justificacion: 'Se asume conservadoramente que el 100% de la corriente de falla retorna por la malla de tierra en estudio, por no existir datos suficientes de trayectorias de retorno alternativas (cables de guarda, neutros, pantallas, estructuras o mallas vecinas). Esta hipótesis maximiza Ig y por tanto el diseño resultante, sin optimización de costo.',
    };
  }
  if (p.method === 'manual') {
    const Sf = Math.min(Math.max(p.manualValue ?? 1, 0), 1);
    return {
      Sf,
      justificacion: 'Factor de división ingresado directamente por el profesional a partir de un estudio específico de distribución de corriente de falla (análisis de línea de transmisión, EMTP/ATP, o información entregada por la compañía eléctrica/operador del sistema).',
    };
  }
  const n = Math.max(p.nParallelPaths ?? 1, 1);
  // Modelo propio simplificado de retornos decrecientes: cada trayectoria paralela adicional
  // reduce la fracción que retorna por la malla, con un factor de acoplamiento típico de 0.7
  // (no lineal — reflejar que la primera trayectoria alternativa es la más efectiva).
  const Sf = Math.max(1 / (1 + 0.7 * (n - 1)), 0.1);
  return {
    Sf,
    justificacion: `Estimación propia considerando ${n} trayectoria(s) de retorno paralela(s) identificada(s) por el profesional (cables de guarda, pantallas de cable, neutros, estructuras metálicas o mallas de tierra vecinas). Es una aproximación simplificada de ingeniería, no una curva de distribución de corriente exacta — para proyectos críticos se recomienda un estudio específico conforme a IEEE Std 80-2013 Annex C.`,
  };
}

export interface FaultAnalysisInput {
  If: number;              // A — corriente de falla simétrica
  tFalla: number;          // s
  xr: number;
  freq?: number;
  splitFactor: SplitFactorInput;
}

export interface FaultAnalysisResult {
  If: number;
  Df: number;
  Ta: number;
  Sf: number;
  Ig: number;              // corriente de diseño oficial = If · Sf · Df
  splitJustificacion: string;
  confidence: 'alta' | 'media' | 'conservadora';
}

/** Corriente de diseño oficial del proyecto: Ig = If · Sf · Df. */
export function computeFaultAnalysis(p: FaultAnalysisInput): FaultAnalysisResult {
  const { Df, Ta } = computeDecrementFactor({ tFalla: p.tFalla, xr: p.xr, ...(p.freq !== undefined ? { freq: p.freq } : {}) });
  const { Sf, justificacion } = computeSplitFactor(p.splitFactor);
  const Ig = p.If * Sf * Df;
  const confidence: FaultAnalysisResult['confidence'] =
    p.splitFactor.method === 'manual' ? 'alta' :
    p.splitFactor.method === 'estimated' ? 'media' : 'conservadora';
  return { If: p.If, Df, Ta, Sf, Ig, splitJustificacion: justificacion, confidence };
}
