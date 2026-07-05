'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type SoilModelSource = 'schlumberger' | 'wenner';

export interface SoilModel {
  rho1:    number;
  rho2:    number;
  h:       number;
  rhoUniform: number;
  source:  SoilModelSource;
  validatedBy?: { source: 'wenner'; rho1: number; rho2: number; h: number; deltaPct: number };
  updatedAt: string;
}

export interface SchlumReading { L: number; l: number; r: number }
export interface WennerReading { a: number; r: number }

interface SoilModelCtx {
  model: SoilModel | null;
  setFromSchlumberger: (m: { rho1: number; rho2: number; h: number }) => void;
  setFromWenner: (m: { rho1: number; rho2: number; h: number }) => void;
  clear: () => void;
  /** Lecturas de campo — la única fuente editable es el módulo "Mediciones de Campo". */
  schlumbergerReadings: SchlumReading[];
  wennerReadings: WennerReading[];
  setReadings: (schlum: SchlumReading[], wenner: WennerReading[]) => void;
}

const STORAGE_KEY   = 'gdp-soil-model';
const READINGS_KEY  = 'gdp-field-readings';

const Ctx = createContext<SoilModelCtx>({
  model: null,
  setFromSchlumberger: () => {},
  setFromWenner: () => {},
  clear: () => {},
  schlumbergerReadings: [],
  wennerReadings: [],
  setReadings: () => {},
});

function rhoUniformFrom(rho1: number, rho2: number): number {
  // ρ representativo para fórmulas de suelo uniforme (Sverak, Dwight, Sunde, etc.)
  return Math.sqrt(rho1 * rho2);
}

export function SoilModelProvider({ children }: { children: ReactNode }) {
  const [model, setModel] = useState<SoilModel | null>(null);
  const [schlumbergerReadings, setSchlumbergerReadingsState] = useState<SchlumReading[]>([]);
  const [wennerReadings, setWennerReadingsState] = useState<WennerReading[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setModel(JSON.parse(saved) as SoilModel); } catch { /* ignore corrupt cache */ }
    }
    const savedReadings = localStorage.getItem(READINGS_KEY);
    if (savedReadings) {
      try {
        const parsed = JSON.parse(savedReadings) as { schlumberger: SchlumReading[]; wenner: WennerReading[] };
        setSchlumbergerReadingsState(parsed.schlumberger ?? []);
        setWennerReadingsState(parsed.wenner ?? []);
      } catch { /* ignore corrupt cache */ }
    }
  }, []);

  const setFromSchlumberger = useCallback((m: { rho1: number; rho2: number; h: number }) => {
    setModel(prev => {
      const next: SoilModel = {
        rho1: m.rho1, rho2: m.rho2, h: m.h,
        rhoUniform: rhoUniformFrom(m.rho1, m.rho2),
        source: 'schlumberger',
        ...(prev?.validatedBy ? { validatedBy: prev.validatedBy } : {}),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setFromWenner = useCallback((m: { rho1: number; rho2: number; h: number }) => {
    setModel(prev => {
      const base = prev?.source === 'schlumberger' ? prev : null;
      const rhoUnifWenner = rhoUniformFrom(m.rho1, m.rho2);
      if (base) {
        const deltaPct = Math.abs(rhoUnifWenner - base.rhoUniform) / base.rhoUniform * 100;
        const next: SoilModel = { ...base, validatedBy: { source: 'wenner', rho1: m.rho1, rho2: m.rho2, h: m.h, deltaPct } };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      }
      // No hay modelo Schlumberger aún: Wenner queda como modelo provisional.
      const next: SoilModel = {
        rho1: m.rho1, rho2: m.rho2, h: m.h,
        rhoUniform: rhoUnifWenner,
        source: 'wenner',
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setModel(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const setReadings = useCallback((schlum: SchlumReading[], wenner: WennerReading[]) => {
    setSchlumbergerReadingsState(schlum);
    setWennerReadingsState(wenner);
    localStorage.setItem(READINGS_KEY, JSON.stringify({ schlumberger: schlum, wenner }));
  }, []);

  return (
    <Ctx.Provider value={{
      model, setFromSchlumberger, setFromWenner, clear,
      schlumbergerReadings, wennerReadings, setReadings,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSoilModel() {
  return useContext(Ctx);
}
