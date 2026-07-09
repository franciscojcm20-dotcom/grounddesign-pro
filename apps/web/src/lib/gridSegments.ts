import type { ConductorSegment } from './api';

/**
 * Segmentos de conductor de una malla rectangular perimetral + interior,
 * con la misma geometría que Grid3D/GridDiagram (ver Topology3D.tsx) —
 * reutilizada aquí para alimentar el mapa de potencial de superficie
 * (computePotentialGrid), que necesita las coordenadas reales de cada tramo.
 */
export function rectGridSegments(largo: number, ancho: number, nL: number, nW: number): ConductorSegment[] {
  const hw = largo / 2, hd = ancho / 2;
  const nLc = Math.max(Math.round(nL), 2), nWc = Math.max(Math.round(nW), 2);
  const segments: ConductorSegment[] = [];
  for (let i = 0; i < nWc; i++) {
    const y = -hd + (i / (nWc - 1)) * ancho;
    segments.push({ start: { x: -hw, y }, end: { x: hw, y } });
  }
  for (let i = 0; i < nLc; i++) {
    const x = -hw + (i / (nLc - 1)) * largo;
    segments.push({ start: { x, y: -hd }, end: { x, y: hd } });
  }
  return segments;
}
