'use client';
import { useState, useEffect } from 'react';

/**
 * Persiste un valor en localStorage bajo `key`. Los componentes de página de
 * Next.js se desmontan por completo en cada cambio de ruta, así que el estado
 * local de React (useState) por sí solo no sobrevive a navegar a otro módulo
 * y volver — este hook hace que sí sobreviva.
 *
 * El valor arranca en `defaultValue` (para que el primer render en servidor y
 * cliente coincidan) y se hidrata desde localStorage en un efecto post-mount;
 * `hydrated` evita que el efecto de guardado sobreescriba el valor guardado
 * con el default antes de que la hidratación se aplique.
 */
export function usePersistedState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) setValue(JSON.parse(saved) as T);
    } catch { /* ignore corrupt cache */ }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full/unavailable */ }
  }, [key, value, hydrated]);

  return [value, setValue] as const;
}
