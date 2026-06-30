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

// ─── Tipos de respuesta ───────────────────────────────────────────────────────

export interface WennerPoint  { a: number; r: number; rhoA: number }
export interface RhoPoint     { a: number; rho: number }

export interface WennerResult {
  points:    WennerPoint[];
  rhoAvg:    number;
  twoLayer:  { rho1: number; rho2: number; h: number; curve: RhoPoint[] };
  norm:      string;
}

export interface ConductorResult {
  areaMm2:   number;
  sugerido:  { calibre: string; mm2: number };
  seleccionado: { calibre: string; mm2: number };
  margen:    number;
  compliance: { pass: boolean; sugerido: string; seleccionado: string; margenPct: number; advertencia?: string };
  norm:      string;
}

export interface GridResult {
  Rg: number; Ltotal: number; area: number; gpr: number;
  compliance: { rg1ohm: { pass: boolean }; rg5ohm: { pass: boolean } };
  norm: string;
}

export interface VoltagesRealResult {
  mesh:        { Em: number; Km: number; Ki: number };
  step:        { Es: number; Ks: number };
  eTouchAdm_V: number;
  eStepAdm_V:  number;
  compliance:  {
    touch: { real_V: number; adm_V: number; pass: boolean };
    step:  { real_V: number; adm_V: number; pass: boolean };
  };
  norm: string;
}

// ─── Llamadas ─────────────────────────────────────────────────────────────────

export const api = {
  soil: {
    wenner: (readings: { a: number; r: number }[]) =>
      post<WennerResult>('/api/v1/soil/wenner', { readings }),
  },
  conductor: {
    size: (body: {
      iFalla: number; tFalla: number; tempAmbiente: number; tempMaxFusion: number;
      calibreSeleccionado?: string;
    }) => post<ConductorResult>('/api/v1/conductor/size', body),
  },
  grid: {
    resistance: (body: unknown) => post<GridResult>('/api/v1/grid/resistance', body),
  },
  voltages: {
    real: (body: unknown) => post<VoltagesRealResult>('/api/v1/voltages/real', body),
  },
};
