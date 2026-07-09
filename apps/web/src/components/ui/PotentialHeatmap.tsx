'use client';
import type { PotentialGridResult } from '@/lib/api';

const W = 320, H = 320, PAD = 24;

/** Verde (seguro) → amarillo → rojo (excede el límite) según la razón touch/admisible. */
function colorForRatio(ratio: number): string {
  const clamped = Math.max(0, Math.min(ratio, 1.3));
  if (clamped <= 1) {
    const hue = 120 - clamped * 120; // 120=verde, 0=rojo
    return `hsl(${hue}, 75%, 45%)`;
  }
  return 'hsl(0, 85%, 32%)'; // rojo oscuro — por sobre el límite admisible
}

/**
 * Mapa de calor del potencial de superficie (tensión de contacto local),
 * complemento del punto crítico analítico (Em/Es de meshVoltage/stepVoltageReal)
 * — muestra cómo se distribuye el riesgo en toda el área, no solo en el peor
 * punto. Ver computePotentialGrid en @gdp/engines-math para el fundamento.
 */
export function PotentialHeatmap({ result, largo, ancho, admissibleTouch }: {
  result: PotentialGridResult; largo: number; ancho: number; admissibleTouch?: number;
}) {
  if (result.points.length === 0) return null;
  const xs = result.points.map(p => p.x);
  const ys = result.points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const scale = Math.min((W - PAD * 2) / spanX, (H - PAD * 2) / spanY);
  const ox = W / 2, oy = H / 2;
  const sideCount = Math.max(Math.round(Math.sqrt(result.points.length)), 2);
  const cellSize = Math.max((spanX * scale) / sideCount, 5);

  const maxTouch = admissibleTouch ?? Math.max(...result.points.map(p => p.touch), 1e-6);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block', margin: '0 auto', background: 'var(--bg)', borderRadius: 4 }}>
        {result.points.map((p, i) => {
          const cx = ox + p.x * scale;
          const cy = oy - p.y * scale;
          const ratio = p.touch / maxTouch;
          return (
            <rect key={i} x={cx - cellSize / 2} y={cy - cellSize / 2} width={cellSize} height={cellSize}
              fill={colorForRatio(ratio)} opacity={0.85} />
          );
        })}
        <rect
          x={ox - (largo / 2) * scale} y={oy - (ancho / 2) * scale}
          width={largo * scale} height={ancho * scale}
          fill="none" stroke="var(--copper)" strokeWidth="1.5" opacity={0.95}
        />
      </svg>
      <p style={{ fontSize: 8.5, color: 'var(--faint)', textAlign: 'center', marginTop: 6, lineHeight: 1.5 }}>
        {admissibleTouch !== undefined
          ? 'Verde = tensión de contacto local dentro del límite admisible · Rojo = lo excede'
          : 'Escala relativa (verde = menor tensión de contacto local en esta grilla, rojo = mayor)'}
        <br />Contorno naranja: perímetro de la malla. Mapa aproximado por superposición de fuentes puntuales — ver informe para el fundamento y sus límites.
      </p>
    </div>
  );
}
