const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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
export interface WennerResult {
  points:   WennerPoint[];
  rhoAvg:   number;
  twoLayer: { rho1: number; rho2: number; h: number; curve: RhoPoint[] };
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

export interface RodResult {
  R1: number; Rm: number; Rn: number; gpr: number;
  compliance: { rg1: boolean; rg5: boolean }; norm: string;
}
export interface StripResult {
  Rh: number; gpr: number;
  compliance: { rg1: boolean; rg5: boolean }; norm: string;
}
export interface RadialResult {
  R1: number; Rstar: number; Ltotal: number; gpr: number;
  compliance: { rg1: boolean; rg5: boolean }; norm: string;
}
export interface RingResult {
  rEq: number; Rring: number; gpr: number;
  compliance: { rg1: boolean; rg5: boolean }; norm: string;
}
export interface CombinedResult {
  Rg: number; Rr: number; Rmr: number; Rc: number; gpr: number; mejora: number;
  compliance: { rg1: boolean; rg5: boolean }; norm: string;
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

// ─── Llamadas ─────────────────────────────────────────────────────────────────

export const api = {
  soil: {
    wenner: (readings: { a: number; r: number }[]) =>
      post<WennerResult>('/api/v1/soil/wenner', { readings }),
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
      gel?: { activo: boolean; rhoGel: number; radioVarilla: number; radioConGel: number; longVarillaGel: number };
    }) => post<GridResult>('/api/v1/grid/resistance', body),
    rod: (body: {
      rho: number; L: number; radius: number; n: number; spacing: number; iFalla: number;
    }) => post<RodResult>('/api/v1/grid/rod', body),
    strip: (body: {
      rho: number; L: number; h: number; radius: number; iFalla: number;
    }) => post<StripResult>('/api/v1/grid/strip', body),
    radial: (body: {
      rho: number; L: number; h: number; radius: number; n: number; iFalla: number;
    }) => post<RadialResult>('/api/v1/grid/radial', body),
    ring: (body: {
      rho: number; perimeter: number; h: number; radius: number; iFalla: number;
    }) => post<RingResult>('/api/v1/grid/ring', body),
    combined: (body: {
      rho: number; area: number; Ltotal: number; depth: number;
      nRods: number; rodLength: number; rodRadius: number; rodSpacing: number; iFalla: number;
    }) => post<CombinedResult>('/api/v1/grid/combined', body),
  },
  voltages: {
    real: (body: {
      rho: number; Ig: number; D: number; d: number; h: number; n: number; Ltotal: number;
      rhoSuperficial: number; hSuperficial: number; tFalla: number; peso?: 50 | 70;
    }) => post<VoltagesRealResult>('/api/v1/voltages/real', body),
  },
};
