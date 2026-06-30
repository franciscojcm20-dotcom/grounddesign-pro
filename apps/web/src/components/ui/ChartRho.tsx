'use client';

interface Point { a: number; rhoA: number }

interface ChartRhoProps {
  points:    Point[];
  rho1?:     number;
  rho2?:     number;
  h?:        number;
  yLabel?:   string;
  xLabel?:   string;
  logScale?: boolean;
  height?:   number;
}

export function ChartRho({
  points,
  rho1,
  rho2,
  h,
  yLabel  = 'ρa (Ω·m)',
  xLabel  = 'a (m)',
  logScale = false,
  height   = 200,
}: ChartRhoProps) {
  if (points.length < 2) return null;

  const W = 520, H = height, PL = 52, PR = 16, PT = 16, PB = 36;
  const CW = W - PL - PR, CH = H - PT - PB;

  const xs  = points.map(p => p.a);
  const ys  = points.map(p => p.rhoA);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys) * 0.9, yMax = Math.max(...ys) * 1.1;

  function scX(v: number) {
    if (logScale) {
      const lMin = Math.log10(Math.max(xMin, 0.01));
      const lMax = Math.log10(Math.max(xMax, 0.01));
      return PL + ((Math.log10(Math.max(v, 0.01)) - lMin) / (lMax - lMin || 1)) * CW;
    }
    return PL + ((v - xMin) / (xMax - xMin || 1)) * CW;
  }

  function scY(v: number) {
    return PT + CH - ((v - yMin) / (yMax - yMin || 1)) * CH;
  }

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scX(p.a).toFixed(1)} ${scY(p.rhoA).toFixed(1)}`)
    .join(' ');

  const yTicks = [yMin, yMin + (yMax - yMin) * 0.25, yMin + (yMax - yMin) * 0.5, yMin + (yMax - yMin) * 0.75, yMax];
  const xTicks = points.filter((_, i) => i % Math.ceil(points.length / 5) === 0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
      {/* Grid lines */}
      {yTicks.map(v => (
        <line key={v}
          x1={PL} y1={scY(v)} x2={W - PR} y2={scY(v)}
          stroke="var(--line)" strokeWidth="1" strokeDasharray="3,3"
        />
      ))}

      {/* Axes */}
      <line x1={PL} y1={PT} x2={PL} y2={H - PB} stroke="var(--faint)" strokeWidth="1" />
      <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke="var(--faint)" strokeWidth="1" />

      {/* Y ticks & labels */}
      {yTicks.map(v => (
        <g key={v}>
          <line x1={PL - 3} y1={scY(v)} x2={PL} y2={scY(v)} stroke="var(--faint)" strokeWidth="1" />
          <text x={PL - 5} y={scY(v) + 3.5} fill="var(--faint)" fontSize="8" textAnchor="end">
            {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}
          </text>
        </g>
      ))}

      {/* X ticks & labels */}
      {xTicks.map(p => (
        <g key={p.a}>
          <line x1={scX(p.a)} y1={H - PB} x2={scX(p.a)} y2={H - PB + 3} stroke="var(--faint)" strokeWidth="1" />
          <text x={scX(p.a)} y={H - PB + 12} fill="var(--faint)" fontSize="8" textAnchor="middle">{p.a}</text>
        </g>
      ))}

      {/* Axis labels */}
      <text x={W / 2} y={H - 2} fill="var(--faint)" fontSize="9" textAnchor="middle">{xLabel}</text>
      <text x={10} y={PT + CH / 2} fill="var(--faint)" fontSize="9" textAnchor="middle"
        transform={`rotate(-90, 10, ${PT + CH / 2})`}>{yLabel}</text>

      {/* Reference lines for two-layer model */}
      {rho1 !== undefined && rho1 > yMin && rho1 < yMax && (
        <line x1={PL} y1={scY(rho1)} x2={W - PR} y2={scY(rho1)}
          stroke="var(--copper)" strokeWidth="1" strokeDasharray="6,3" opacity="0.5" />
      )}
      {rho2 !== undefined && rho2 > yMin && rho2 < yMax && (
        <line x1={PL} y1={scY(rho2)} x2={W - PR} y2={scY(rho2)}
          stroke="var(--blue)" strokeWidth="1" strokeDasharray="6,3" opacity="0.5" />
      )}

      {/* Area under curve */}
      {points.length > 1 && (
        <path
          d={`${path} L ${scX(xs[xs.length - 1]!).toFixed(1)} ${H - PB} L ${PL} ${H - PB} Z`}
          fill="var(--copper)" fillOpacity="0.06"
        />
      )}

      {/* Curve */}
      <path d={path} fill="none" stroke="var(--copper)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={scX(p.a)} cy={scY(p.rhoA)} r="3.5" fill="var(--copper)" stroke="var(--bg)" strokeWidth="1.5" />
      ))}

      {/* Legend */}
      {(rho1 !== undefined || rho2 !== undefined) && (
        <g>
          {rho1 !== undefined && (
            <g>
              <line x1={PL + 4} y1={PT + 6} x2={PL + 18} y2={PT + 6} stroke="var(--copper)" strokeWidth="1.5" strokeDasharray="4,2" />
              <text x={PL + 21} y={PT + 9} fill="var(--faint)" fontSize="7.5">ρ1={rho1.toFixed(0)}</text>
            </g>
          )}
          {rho2 !== undefined && (
            <g>
              <line x1={PL + 4} y1={PT + 18} x2={PL + 18} y2={PT + 18} stroke="var(--blue)" strokeWidth="1.5" strokeDasharray="4,2" />
              <text x={PL + 21} y={PT + 21} fill="var(--faint)" fontSize="7.5">ρ2={rho2.toFixed(0)}{h !== undefined ? ` h=${h}m` : ''}</text>
            </g>
          )}
        </g>
      )}
    </svg>
  );
}
