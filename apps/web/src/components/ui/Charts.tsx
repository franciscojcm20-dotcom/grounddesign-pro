'use client';
import {
  ResponsiveContainer,
  Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
  Area, ComposedChart,
} from 'recharts';

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, formatter }: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string | number;
  formatter?: (v: number, name: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--chart-tooltip-bg)',
      border: '1px solid var(--chart-tooltip-border)',
      borderRadius: 4,
      padding: '8px 12px',
      fontSize: 10.5,
      fontFamily: 'var(--font-mono)',
      boxShadow: 'var(--shadow)',
    }}>
      {label !== undefined && (
        <div style={{ color: 'var(--dim)', marginBottom: 4, fontSize: 9.5 }}>{label}</div>
      )}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--dim)', fontSize: 9.5 }}>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>{formatter ? formatter(p.value, p.name) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── LineAreaChart ─────────────────────────────────────────────────────────────

export interface LineAreaChartProps {
  data: Record<string, number | string>[];
  xKey: string;
  yKey: string;
  yKey2?: string;
  xLabel?: string;
  yLabel?: string;
  color?: string;
  color2?: string;
  refLines?: Array<{ y: number; label: string; color: string }>;
  formatter?: (v: number, name: string) => string;
  height?: number;
  logScale?: boolean;
}

export function LineAreaChart({
  data, xKey, yKey, yKey2,
  xLabel, yLabel,
  color = 'var(--chart-1)',
  color2 = 'var(--chart-2)',
  refLines,
  formatter,
  height = 220,
  logScale = false,
}: LineAreaChartProps) {
  const xAxisProps = logScale
    ? { scale: 'log' as const, domain: ['auto', 'auto'] as [string, string], allowDataOverflow: true }
    : {};
  const yAxisProps = logScale
    ? { scale: 'log' as const, domain: ['auto', 'auto'] as [string, string], allowDataOverflow: true }
    : {};
  const numFmt = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v >= 10 ? String(Math.round(v)) : String(v);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: xLabel ? 24 : 8 }}>
        <defs>
          <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.18} />
            <stop offset="95%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
          {yKey2 && (
            <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color2} stopOpacity={0.15} />
              <stop offset="95%" stopColor={color2} stopOpacity={0.01} />
            </linearGradient>
          )}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis
          dataKey={xKey}
          type={logScale ? 'number' : 'category'}
          {...xAxisProps}
          tick={{ fill: 'var(--chart-axis)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
          axisLine={{ stroke: 'var(--chart-grid)' }}
          tickLine={false}
          tickFormatter={logScale ? numFmt : undefined}
          label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -10, fill: 'var(--chart-axis)', fontSize: 9 } : undefined}
        />
        <YAxis
          {...yAxisProps}
          tick={{ fill: 'var(--chart-axis)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
          width={44}
          label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fill: 'var(--chart-axis)', fontSize: 9, offset: 10 } : undefined}
          tickFormatter={numFmt}
        />
        <Tooltip content={<ChartTooltip formatter={formatter} />} />
        {refLines?.map(r => (
          <ReferenceLine key={r.y} y={r.y} stroke={r.color} strokeDasharray="5 3" strokeWidth={1.2}
            label={{ value: r.label, fill: r.color, fontSize: 8.5, fontFamily: 'var(--font-mono)' }} />
        ))}
        {logScale ? (
          <>
            <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} dot={{ r: 3.5, fill: color, stroke: 'var(--bg)', strokeWidth: 1.5 }} activeDot={{ r: 5 }} />
            {yKey2 && (
              <Line type="monotone" dataKey={yKey2} stroke={color2} strokeWidth={1.8} strokeDasharray="5 3" dot={{ r: 3, fill: color2, stroke: 'var(--bg)', strokeWidth: 1.5 }} />
            )}
          </>
        ) : (
          <>
            <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} fill="url(#grad1)" dot={{ r: 3.5, fill: color, stroke: 'var(--bg)', strokeWidth: 1.5 }} activeDot={{ r: 5 }} />
            {yKey2 && (
              <Area type="monotone" dataKey={yKey2} stroke={color2} strokeWidth={1.8} fill="url(#grad2)" strokeDasharray="5 3" dot={{ r: 3, fill: color2, stroke: 'var(--bg)', strokeWidth: 1.5 }} />
            )}
          </>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── SoundingComparisonChart — overlay de curvas ρa en escala log-log ──────────
// Convención estándar de sondeo eléctrico vertical (VES): ambos ejes logarítmicos,
// ya que la profundidad explorada abarca varios órdenes de magnitud.

export interface SoundingSeries {
  label:  string;
  color:  string;
  points: { x: number; y: number }[];
  dashed?: boolean;
}

export function SoundingComparisonChart({ series, xLabel = 'Espaciamiento equivalente AB/2 (m)', yLabel = 'ρa (Ω·m)', height = 260 }: {
  series: SoundingSeries[]; xLabel?: string; yLabel?: string; height?: number;
}) {
  const numFmt = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v >= 10 ? String(Math.round(v)) : String(v);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis
          dataKey="x" type="number" scale="log" domain={['auto', 'auto']} allowDataOverflow
          tick={{ fill: 'var(--chart-axis)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
          axisLine={{ stroke: 'var(--chart-grid)' }} tickLine={false} tickFormatter={numFmt}
          label={{ value: xLabel, position: 'insideBottom', offset: -10, fill: 'var(--chart-axis)', fontSize: 9 }}
        />
        <YAxis
          type="number" scale="log" domain={['auto', 'auto']} allowDataOverflow
          tick={{ fill: 'var(--chart-axis)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
          axisLine={false} tickLine={false} width={48} tickFormatter={numFmt}
          label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: 'var(--chart-axis)', fontSize: 9, offset: 10 }}
        />
        <Tooltip content={<ChartTooltip formatter={(v) => `${v.toLocaleString()} Ω·m`} />} />
        <Legend wrapperStyle={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'var(--dim)', paddingTop: 6 }} />
        {series.map(s => (
          <Line
            key={s.label} data={s.points} dataKey="y" name={s.label}
            type="monotone" stroke={s.color} strokeWidth={2.2}
            strokeDasharray={s.dashed ? '6 3' : undefined}
            dot={{ r: 3.5, fill: s.color, stroke: 'var(--bg)', strokeWidth: 1.5 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── BarCompareChart ───────────────────────────────────────────────────────────

export interface BarCompareChartProps {
  data: Record<string, number | string>[];
  xKey: string;
  bars: Array<{ key: string; label: string; color?: string }>;
  refLines?: Array<{ y: number; label: string; color: string }>;
  formatter?: (v: number, name: string) => string;
  height?: number;
  xLabel?: string;
  yLabel?: string;
}

export function BarCompareChart({
  data, xKey, bars, refLines, formatter, height = 220, xLabel, yLabel,
}: BarCompareChartProps) {
  const colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: xLabel ? 24 : 8 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fill: 'var(--chart-axis)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
          axisLine={{ stroke: 'var(--chart-grid)' }}
          tickLine={false}
          label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -10, fill: 'var(--chart-axis)', fontSize: 9 } : undefined}
        />
        <YAxis
          tick={{ fill: 'var(--chart-axis)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
          width={44}
          label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fill: 'var(--chart-axis)', fontSize: 9, offset: 10 } : undefined}
          tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)}
        />
        <Tooltip content={<ChartTooltip formatter={formatter} />} />
        {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--dim)', paddingTop: 4 }} />}
        {refLines?.map(r => (
          <ReferenceLine key={r.y} y={r.y} stroke={r.color} strokeDasharray="5 3" strokeWidth={1.2}
            label={{ value: r.label, fill: r.color, fontSize: 8.5, fontFamily: 'var(--font-mono)' }} />
        ))}
        {bars.map((b, i) => (
          <Bar key={b.key} dataKey={b.key} name={b.label} fill={b.color ?? colors[i % colors.length]} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── StatBar (horizontal single-value bar) ─────────────────────────────────────

export function StatBar({ value, max, color = 'var(--chart-1)', label }: {
  value: number; max: number; color?: string; label?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div>
      {label && <div style={{ fontSize: 8.5, color: 'var(--faint)', marginBottom: 3, fontFamily: 'var(--font-mono)' }}>{label}</div>}
      <div style={{ height: 6, background: 'var(--panel3)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .5s ease' }} />
      </div>
    </div>
  );
}
