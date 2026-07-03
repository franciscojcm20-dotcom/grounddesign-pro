import { API_BASE as BASE } from './apiBase';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error: string };
    throw new Error(err.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json() as Promise<T>;
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface WennerPoint { a: number; r: number; rhoA: number }
export interface RhoPoint    { a: number; rho: number }
export interface TwoLayerResult { rho1: number; rho2: number; h: number; curve: RhoPoint[] }
export interface WennerResult {
  points:   WennerPoint[];
  rhoAvg:   number;
  twoLayer: TwoLayerResult;
  norm:     string;
}

export interface SchlumbergerPoint { L: number; l: number; r: number; rhoA: number }
export interface SchlumbergerResult {
  points:   SchlumbergerPoint[];
  rhoAvg:   number;
  twoLayer: TwoLayerResult;
  norm:     string;
}

export interface ConductorEntry  { calibre: string; mm2: number }
export interface ConductorResult {
  areaMm2:    number;
  sugerido:   ConductorEntry;
  seleccionado: ConductorEntry;
  esSeleccionManual: boolean;
  calibreSubdimensionado: ConductorEntry | null;
  margen:     number;
  compliance: {
    pass: boolean;
    sugerido: string;
    seleccionado: string;
    margenPct: number;
    advertencia?: string;
  };
  norm: string;
}

export interface GridResult {
  area:    number;
  condL:   number;
  condRods: number;
  Ltotal:  number;
  Rg:      number;
  gpr:     number;
  rhoUsado: number;
  gelInfo: { activo: boolean; rhoEff: number } | null;
  compliance: {
    rg1ohm: { pass: boolean; limit: string; norm: string };
    rg5ohm: { pass: boolean; limit: string; norm: string };
  };
  norm: string;
}

export interface GelParams { activo: boolean; rhoGel: number; radioVarilla: number; radioConGel: number; longVarillaGel: number }
export type GelInfo = { activo: boolean; rhoEff: number } | null;

export interface OptimizeStep { action: string; Rg: number }
export interface MallaOptimizeResult {
  achieved:  boolean;
  steps:     OptimizeStep[];
  suggested: {
    largo: number; ancho: number; profundidad: number;
    nConductoresL: number; nConductoresW: number;
    nVarillas: number; longVarilla: number;
    rho: number; iFalla: number; tFalla: number;
  };
  initialRg: number;
  finalRg:   number;
  norm:      string;
}

export interface RodResult {
  R1: number; Rm: number; Rn: number; gpr: number; gelInfo?: GelInfo; rhoUsado?: number;
  compliance: { rg1: boolean; rg5: boolean }; norm: string;
}
export interface StripResult {
  Rh: number; gpr: number; gelInfo?: GelInfo; rhoUsado?: number;
  compliance: { rg1: boolean; rg5: boolean }; norm: string;
}
export interface RadialResult {
  R1: number; Rstar: number; Ltotal: number; gpr: number; gelInfo?: GelInfo; rhoUsado?: number;
  compliance: { rg1: boolean; rg5: boolean }; norm: string;
}
export interface RingResult {
  rEq: number; Rring: number; gpr: number; gelInfo?: GelInfo; rhoUsado?: number;
  compliance: { rg1: boolean; rg5: boolean }; norm: string;
}
export interface CombinedResult {
  Rg: number; Rr: number; Rmr: number; Rc: number; gpr: number; mejora: number; gelInfo?: GelInfo; rhoUsado?: number;
  compliance: { rg1: boolean; rg5: boolean }; norm: string;
}

export interface RodOptimizeResult {
  achieved: boolean; steps: OptimizeStep[];
  suggested: { rho: number; L: number; radius: number; n: number; spacing: number; iFalla: number };
  initialRg: number; finalRg: number; norm: string;
}
export interface StripOptimizeResult {
  achieved: boolean; steps: OptimizeStep[];
  suggested: { rho: number; L: number; h: number; radius: number; iFalla: number };
  initialRg: number; finalRg: number; norm: string;
}
export interface RadialOptimizeResult {
  achieved: boolean; steps: OptimizeStep[];
  suggested: { rho: number; L: number; h: number; radius: number; n: number; iFalla: number };
  initialRg: number; finalRg: number; norm: string;
}
export interface RingOptimizeResult {
  achieved: boolean; steps: OptimizeStep[];
  suggested: { rho: number; perimeter: number; h: number; radius: number; iFalla: number };
  initialRg: number; finalRg: number; norm: string;
}
export interface CombinedOptimizeResult {
  achieved: boolean; steps: OptimizeStep[];
  suggested: { rho: number; area: number; Ltotal: number; depth: number; nRods: number; rodLength: number; rodRadius: number; rodSpacing: number; iFalla: number };
  initialRg: number; finalRg: number; norm: string;
}

export interface VoltagesOptimizeResult {
  achieved: boolean; steps: OptimizeStep[];
  suggested: {
    rho: number; Ig: number; D: number; d: number; h: number; n: number; Ltotal: number;
    rhoSuperficial: number; hSuperficial: number; tFalla: number; peso?: 50 | 70;
  };
  initialRatio: number; finalRatio: number; norm: string;
}

export interface VoltagesRealResult {
  mesh:        { Em: number; Km: number; Ki: number; Kh: number };
  step:        { Es: number; Ks: number };
  Cs:          number;
  eTouchAdm_V: number;
  eStepAdm_V:  number;
  compliance: {
    touch: { real_V: number; adm_V: number; pass: boolean };
    step:  { real_V: number; adm_V: number; pass: boolean };
  };
  norm: string;
}

// ─── PDF Report ───────────────────────────────────────────────────────────────

export interface ReportMeta {
  projectName: string;
  projectCode?: string;
  company?: string;
  engineer?: string;
  location?: string;
  date?: string;
  norm?: string;
}

export async function downloadReport(
  meta: ReportMeta,
  sections: Array<{ module: string; inputs: Record<string, unknown>; outputs: Record<string, unknown>; norm?: string }>,
): Promise<void> {
  const res = await fetch(`${BASE}/api/v1/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meta, sections }),
  });
  if (!res.ok) throw new Error('Error al generar PDF');
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `GDP-${meta.projectCode ?? 'report'}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Cubicación y Valorización Económica ───────────────────────────────────────

export interface CubicacionInput {
  conductorMetros: number; conductorSeccionMm2: number;
  varillasCantidad: number; varillaLongitudM: number;
  conectoresCantidad: number; gelActivo: boolean; gelKg: number; zanjaM3: number;
}
export interface PreciosUnitariosCLP {
  conductorPorMetroPorMm2: number; varillaPorUnidad: number; conectorPorUnidad: number;
  gelPorKg: number; excavacionPorM3: number; manoObraPct: number; imprevistosPct: number;
}
export interface BOQItem { item: string; unidad: string; cantidad: number; precioUnitCLP: number; subtotalCLP: number }
export interface ValorizacionResult {
  items: BOQItem[]; subtotalMateriales: number; manoObra: number; imprevistos: number;
  total: number; moneda: 'CLP'; precios: PreciosUnitariosCLP; norm: string;
}

export async function downloadValorizacionPdf(
  meta: ReportMeta,
  cubicacion: CubicacionInput,
  precios: PreciosUnitariosCLP,
  valorizacion: ValorizacionResult,
): Promise<void> {
  const res = await fetch(`${BASE}/api/v1/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      meta,
      sections: [{ module: 'valorizacion', inputs: { ...cubicacion, precios }, outputs: valorizacion }],
    }),
  });
  if (!res.ok) throw new Error('Error al generar la valorización en PDF');
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `GDP-valorizacion-${meta.projectCode ?? 'proyecto'}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface DxfResumenRow { label: string; value: string }

export interface GridDxfInput {
  largo: number; ancho: number; nConductoresL: number; nConductoresW: number;
  nVarillas: number; longVarilla?: number; proyecto?: string; norm?: string;
  resultados?: DxfResumenRow[];
}
export interface RodDxfInput {
  n: number; L: number; spacing: number; proyecto?: string; norm?: string;
  resultados?: DxfResumenRow[];
}
export interface StripDxfInput {
  L: number; h: number; proyecto?: string; norm?: string;
  resultados?: DxfResumenRow[];
}
export interface RadialDxfInput {
  n: number; L: number; proyecto?: string; norm?: string;
  resultados?: DxfResumenRow[];
}
export interface RingDxfInput {
  largo: number; ancho: number; proyecto?: string; norm?: string;
  resultados?: DxfResumenRow[];
}
export interface CombinedDxfInput {
  largo: number; ancho: number; nConductoresL: number; nConductoresW: number; nRods: number;
  rodLength?: number; proyecto?: string; norm?: string;
  resultados?: DxfResumenRow[];
}

async function downloadDxf(endpoint: string, input: { proyecto?: string }, filePrefix: string): Promise<void> {
  const res = await fetch(`${BASE}/api/v1/report/dxf/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Error al generar el plano DXF');
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `GDP-${filePrefix}-${String((input as { proyecto?: string }).proyecto ?? 'proyecto').replace(/\s+/g, '-')}.dxf`;
  a.click();
  URL.revokeObjectURL(url);
}

export const downloadGridDxf     = (input: GridDxfInput)     => downloadDxf('grid', input, 'malla');
export const downloadRodDxf      = (input: RodDxfInput)      => downloadDxf('rod', input, 'picas');
export const downloadStripDxf    = (input: StripDxfInput)    => downloadDxf('strip', input, 'conductor');
export const downloadRadialDxf   = (input: RadialDxfInput)   => downloadDxf('radial', input, 'radial');
export const downloadRingDxf     = (input: RingDxfInput)     => downloadDxf('ring', input, 'anillo');
export const downloadCombinedDxf = (input: CombinedDxfInput) => downloadDxf('combined', input, 'combinada');

// ─── Motor de Análisis de Falla ─────────────────────────────────────────────────

export type SplitFactorMethod = 'manual' | 'conservative' | 'estimated';

export interface FaultAnalysisInput {
  If: number; tFalla: number; xr: number; freq?: number;
  splitFactor: { method: SplitFactorMethod; manualValue?: number; nParallelPaths?: number };
}
export interface FaultAnalysisResult {
  If: number; Df: number; Ta: number; Sf: number; Ig: number;
  splitJustificacion: string; confidence: 'alta' | 'media' | 'conservadora'; norm: string;
}

// ─── Modelado del sistema — niveles de cortocircuito (calcula If) ──────────────

export type ShortCircuitFaultType = 'trifasica' | 'monofasica_tierra';
export type GroundingConfig = 'solido' | 'resistencia' | 'reactancia' | 'aislado' | 'desconocido';

export interface SourceImpedanceInput {
  un: number; ikss3: number; xr: number; ik1?: number; c?: number;
}
export interface TransformerImpedanceInput {
  activo: boolean; sn: number; un: number; vcc: number; xr: number; z0Factor?: number;
}
export interface ShortCircuitInput {
  fuente: SourceImpedanceInput;
  transformador?: TransformerImpedanceInput;
  tipoFalla: ShortCircuitFaultType;
  zn?: number;
  aterramiento?: GroundingConfig;
  c?: number;
}
export interface ImpedanceRX { R: number; X: number; Z: number }
export interface ShortCircuitResult {
  tipoFalla: ShortCircuitFaultType;
  Z1: ImpedanceRX; Z0: ImpedanceRX | null; z0Assumed: boolean;
  If: number; un: number; memoria: string[];
  recomendaciones: string[]; advertencias: string[];
  confidence: 'alta' | 'media' | 'estimada'; norm: string;
}

// ─── Llamadas ─────────────────────────────────────────────────────────────────

export const api = {
  faultAnalysis: {
    compute: (body: FaultAnalysisInput) => post<FaultAnalysisResult>('/api/v1/fault-analysis', body),
    shortCircuit: (body: ShortCircuitInput) => post<ShortCircuitResult>('/api/v1/fault-analysis/short-circuit', body),
  },
  soil: {
    wenner: (readings: { a: number; r: number }[]) =>
      post<WennerResult>('/api/v1/soil/wenner', { readings }),
    schlumberger: (readings: { L: number; l: number; r: number }[]) =>
      post<SchlumbergerResult>('/api/v1/soil/schlumberger', { readings }),
  },
  conductor: {
    table: () => get<{ table: ConductorEntry[] }>('/api/v1/conductor/table'),
    size: (body: {
      iFalla: number; tFalla: number; tempAmbiente: number; tempMaxFusion: number;
      calibreSeleccionado?: string;
    }) => post<ConductorResult>('/api/v1/conductor/size', body),
  },
  grid: {
    resistance: (body: {
      largo: number; ancho: number; profundidad: number;
      nConductoresL: number; nConductoresW: number;
      nVarillas: number; longVarilla: number;
      rho: number; iFalla: number; tFalla: number;
      gel?: GelParams;
    }) => post<GridResult>('/api/v1/grid/resistance', body),
    resistanceOptimize: (body: {
      largo: number; ancho: number; profundidad: number;
      nConductoresL: number; nConductoresW: number;
      nVarillas: number; longVarilla: number;
      rho: number; iFalla: number; tFalla: number;
      targetRg: number;
      gel?: GelParams;
    }) => post<MallaOptimizeResult>('/api/v1/grid/resistance/optimize', body),
    rod: (body: {
      rho: number; L: number; radius: number; n: number; spacing: number; iFalla: number;
      gel?: GelParams;
    }) => post<RodResult>('/api/v1/grid/rod', body),
    rodOptimize: (body: {
      rho: number; L: number; radius: number; n: number; spacing: number; iFalla: number;
      targetRg: number; gel?: GelParams;
    }) => post<RodOptimizeResult>('/api/v1/grid/rod/optimize', body),
    strip: (body: {
      rho: number; L: number; h: number; radius: number; iFalla: number;
      gel?: GelParams;
    }) => post<StripResult>('/api/v1/grid/strip', body),
    stripOptimize: (body: {
      rho: number; L: number; h: number; radius: number; iFalla: number;
      targetRg: number; gel?: GelParams;
    }) => post<StripOptimizeResult>('/api/v1/grid/strip/optimize', body),
    radial: (body: {
      rho: number; L: number; h: number; radius: number; n: number; iFalla: number;
      gel?: GelParams;
    }) => post<RadialResult>('/api/v1/grid/radial', body),
    radialOptimize: (body: {
      rho: number; L: number; h: number; radius: number; n: number; iFalla: number;
      targetRg: number; gel?: GelParams;
    }) => post<RadialOptimizeResult>('/api/v1/grid/radial/optimize', body),
    ring: (body: {
      rho: number; perimeter: number; h: number; radius: number; iFalla: number;
      gel?: GelParams;
    }) => post<RingResult>('/api/v1/grid/ring', body),
    ringOptimize: (body: {
      rho: number; perimeter: number; h: number; radius: number; iFalla: number;
      targetRg: number; gel?: GelParams;
    }) => post<RingOptimizeResult>('/api/v1/grid/ring/optimize', body),
    combined: (body: {
      rho: number; area: number; Ltotal: number; depth: number;
      nRods: number; rodLength: number; rodRadius: number; rodSpacing: number; iFalla: number;
      gel?: GelParams;
    }) => post<CombinedResult>('/api/v1/grid/combined', body),
    combinedOptimize: (body: {
      rho: number; area: number; Ltotal: number; depth: number;
      nRods: number; rodLength: number; rodRadius: number; rodSpacing: number; iFalla: number;
      targetRg: number; gel?: GelParams;
    }) => post<CombinedOptimizeResult>('/api/v1/grid/combined/optimize', body),
  },
  voltages: {
    real: (body: {
      rho: number; Ig: number; D: number; d: number; h: number; n: number; Ltotal: number;
      rhoSuperficial: number; hSuperficial: number; tFalla: number; peso?: 50 | 70;
    }) => post<VoltagesRealResult>('/api/v1/voltages/real', body),
    optimize: (body: {
      rho: number; Ig: number; D: number; d: number; h: number; n: number; Ltotal: number;
      rhoSuperficial: number; hSuperficial: number; tFalla: number; peso?: 50 | 70;
    }) => post<VoltagesOptimizeResult>('/api/v1/voltages/optimize', body),
  },
  valorizacion: {
    compute: (body: CubicacionInput & { precios?: Partial<PreciosUnitariosCLP> }) =>
      post<ValorizacionResult>('/api/v1/valorizacion', body),
    preciosDefault: () => get<PreciosUnitariosCLP>('/api/v1/valorizacion/precios-default'),
    estimarZanja: (body: { conductorMetros: number; anchoM?: number; profundidadM?: number }) =>
      post<{ zanjaM3: number }>('/api/v1/valorizacion/estimar-zanja', body),
  },
};
