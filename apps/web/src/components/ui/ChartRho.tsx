'use client';
import { useState } from 'react';
import { LineAreaChart } from './Charts';

interface Point { a: number; rhoA: number }

interface ChartRhoProps {
  points:    Point[];
  rho1?:     number;
  rho2?:     number;
  h?:        number;
  yLabel?:   string;
  xLabel?:   string;
  height?:   number;
  /** Escala inicial. Log-log es la convención estándar para curvas de sondeo (VES). */
  defaultLogScale?: boolean;
}

export function ChartRho({
  points,
  rho1,
  rho2,
  h,
  yLabel  = 'ρa (Ω·m)',
  xLabel  = 'a (m)',
  height  = 220,
  defaultLogScale = true,
}: ChartRhoProps) {
  const [logScale, setLogScale] = useState(defaultLogScale);
  if (points.length < 2) return null;

  const data = points.map(p => ({ a: p.a, 'ρa': Math.round(p.rhoA) }));

  const refLines = [
    ...(rho1 !== undefined ? [{ y: rho1, label: `ρ1=${rho1.toFixed(0)}`, color: 'var(--chart-1)' }] : []),
    ...(rho2 !== undefined ? [{ y: rho2, label: `ρ2=${rho2.toFixed(0)}${h !== undefined ? ` h=${h}m` : ''}`, color: 'var(--chart-2)' }] : []),
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <button
          type="button"
          onClick={() => setLogScale(v => !v)}
          title="Log-log es la convención estándar para curvas de sondeo eléctrico vertical (VES)"
          style={{
            fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--faint)',
            background: 'none', border: '1px solid var(--line)', borderRadius: 10,
            padding: '2px 8px', cursor: 'pointer',
          }}
        >
          escala: {logScale ? 'log-log' : 'lineal'}
        </button>
      </div>
      <LineAreaChart
        data={data}
        xKey="a"
        yKey="ρa"
        xLabel={xLabel}
        yLabel={yLabel}
        refLines={refLines}
        height={height}
        logScale={logScale}
        formatter={(v) => `${v.toLocaleString()} Ω·m`}
      />
    </div>
  );
}
