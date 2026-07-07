'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type SplitFactorMethod = 'manual' | 'conservative' | 'estimated';

/** Traza del modelado del sistema (red + transformador + líneas/cables) cuando If se calculó en vez de ingresarse manualmente. */
export interface ShortCircuitTrace {
  tipoFalla: 'trifasica' | 'monofasica_tierra';
  fuente: { un: number; ikss3: number; xr: number; ik1?: number };
  transformador?: { sn: number; un: number; vcc: number; xr: number; z0Factor?: number };
  lineas?: Array<{ nombre?: string; tipo: 'linea_aerea' | 'cable'; longitudKm: number; rOhmKm: number; xOhmKm: number; r0OhmKm?: number; x0OhmKm?: number }>;
  zn?: number;
  aterramiento?: 'solido' | 'resistencia' | 'reactancia' | 'aislado' | 'desconocido';
  Z1: { R: number; X: number; Z: number };
  Z0: { R: number; X: number; Z: number } | null;
  z0Assumed: boolean;
  memoria: string[];
  recomendaciones: string[];
  advertencias: string[];
  confidence: 'alta' | 'media' | 'estimada';
}

export interface FaultAnalysisMaster {
  If:      number;   // A — corriente de falla simétrica (estudio de cortocircuito o modelado calculado)
  ifOrigin: 'manual' | 'calculado';
  shortCircuitModel?: ShortCircuitTrace;
  tFalla:  number;   // s
  xr:      number;   // X/R
  freq:    number;   // Hz
  splitMethod:       SplitFactorMethod;
  splitManualValue?: number;
  splitNPaths?:      number;
  Df: number;
  Ta: number;
  Sf: number;
  Ig: number;        // corriente de diseño oficial del proyecto
  splitJustificacion: string;
  confidence: 'alta' | 'media' | 'conservadora';
  updatedAt: string;
}

interface FaultAnalysisCtx {
  /** Corriente de diseño oficial del proyecto — parámetro maestro que alimenta todos los cálculos posteriores. */
  result: FaultAnalysisMaster | null;
  setResult: (r: FaultAnalysisMaster) => void;
  clear: () => void;
}

const STORAGE_KEY = 'gdp-fault-analysis';

const Ctx = createContext<FaultAnalysisCtx>({
  result: null,
  setResult: () => {},
  clear: () => {},
});

export function FaultAnalysisProvider({ children }: { children: ReactNode }) {
  const [result, setResultState] = useState<FaultAnalysisMaster | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setResultState(JSON.parse(saved) as FaultAnalysisMaster); } catch { /* ignore corrupt cache */ }
    }
  }, []);

  const setResult = useCallback((r: FaultAnalysisMaster) => {
    setResultState(r);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
  }, []);

  const clear = useCallback(() => {
    setResultState(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return <Ctx.Provider value={{ result, setResult, clear }}>{children}</Ctx.Provider>;
}

export function useFaultAnalysis() {
  return useContext(Ctx);
}
