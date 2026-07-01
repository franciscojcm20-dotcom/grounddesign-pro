'use client';
import { useState, useMemo } from 'react';
import {
  computeLightning,
  ROLLING_SPHERE_RADIUS,
  TOLERABLE_FREQUENCY,
  type LightningInput,
  type LightningResult,
} from '@gdp/engines-math';
import { ExportBar } from '@/components/ui/ExportBar';
import { AuthGuard } from '@/components/ui/AuthGuard';
import { useI18n } from '@/context/I18nContext';

// ─── Styles ───────────────────────────────────────────────────────────────────

const ROW: React.CSSProperties = {
  display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12,
};
const FIELD: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 140,
};
const LBL: React.CSSProperties = {
  fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--font-mono)',
  letterSpacing: '.06em', textTransform: 'uppercase',
};
const INPUT: React.CSSProperties = {
  background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 3,
  color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 11,
  padding: '7px 10px', outline: 'none', width: '100%', boxSizing: 'border-box',
};
const SELECT: React.CSSProperties = { ...INPUT };
const PANEL: React.CSSProperties = {
  background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6,
  padding: '18px 20px', marginBottom: 14,
};
const SEC_TITLE: React.CSSProperties = {
  fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--faint)',
  letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12, fontWeight: 700,
};
const RESULT_ROW: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '7px 0', borderBottom: '1px solid var(--line)',
};

// ─── Occupancy options ────────────────────────────────────────────────────────

const OCCUPANCY_LABELS_ES: Record<string, string> = {
  dwelling:  'Vivienda / Edificio residencial',
  farm:      'Agrícola / Rural',
  industry:  'Industrial / Comercial',
  public:    'Público / Cultural (>1000 pers.)',
  hospital:  'Hospital / Infraestructura crítica',
  heritage:  'Patrimonio cultural',
};
const OCCUPANCY_LABELS_EN: Record<string, string> = {
  dwelling:  'Residential / Dwelling',
  farm:      'Agricultural / Rural',
  industry:  'Industrial / Commercial',
  public:    'Public / Cultural (>1000 people)',
  hospital:  'Hospital / Critical infrastructure',
  heritage:  'Cultural heritage',
};

const ENV_FACTORS_ES = [
  { value: 0.25, label: 'Colina / Promontorio aislado' },
  { value: 0.5,  label: 'Zona rural / Campo abierto' },
  { value: 1.0,  label: 'Urbano (suburbano)' },
  { value: 2.0,  label: 'Centro urbano denso' },
];
const ENV_FACTORS_EN = [
  { value: 0.25, label: 'Isolated hilltop / Promontory' },
  { value: 0.5,  label: 'Rural / Open field' },
  { value: 1.0,  label: 'Urban (suburban)' },
  { value: 2.0,  label: 'Dense urban center' },
];

// ─── Rolling Sphere SVG ───────────────────────────────────────────────────────

function RollingSphereView({ result, height, width, label }: { result: LightningResult; height: number; width: number; label: string }) {
  const W = 380, H = 280;
  const scale  = Math.min((W - 60) / (width + result.rollingSphereRadius * 2), (H - 60) / (height + result.rollingSphereRadius));
  const floorY = H - 30;
  const structX = (W - width * scale) / 2;
  const structY = floorY - height * scale;
  const r = result.rollingSphereRadius * scale;
  const cx = structX + (width * scale) / 2;
  const cy = structY - r;
  const leftRollCx  = structX - r;
  const rightRollCx = structX + width * scale + r;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block' }}>
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1={f * W} y1={0} x2={f * W} y2={H} stroke="#2a2f3e" strokeWidth={0.3} />
      ))}
      <line x1={20} y1={floorY} x2={W - 20} y2={floorY} stroke="#4b5563" strokeWidth={1} />
      <text x={22} y={floorY + 10} fontSize={7} fill="#4b5563">±0.00 m</text>
      <rect x={structX} y={structY} width={width * scale} height={height * scale}
        fill="#1e1508" stroke="var(--copper)" strokeWidth={1.5} />
      <text x={structX + width * scale / 2} y={structY + height * scale / 2 + 4}
        textAnchor="middle" fontSize={8} fill="var(--copper)">{height} m</text>
      <circle cx={cx} cy={cy} r={r}
        fill="none" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
        fontSize={7} fill="#3b82f6">r={result.rollingSphereRadius}m</text>
      <circle cx={leftRollCx} cy={floorY - r} r={r}
        fill="none" stroke="#64748b" strokeWidth={0.8} strokeDasharray="3 3" opacity={0.4} />
      <circle cx={rightRollCx} cy={floorY - r} r={r}
        fill="none" stroke="#64748b" strokeWidth={0.8} strokeDasharray="3 3" opacity={0.4} />
      <polygon
        points={`${structX},${structY} ${structX - r},${floorY} ${structX + width * scale + r},${floorY} ${structX + width * scale},${structY}`}
        fill="#22c55e08" stroke="#22c55e" strokeWidth={0.8} strokeDasharray="5 3"
      />
      <text x={W - 22} y={floorY - 5} textAnchor="end" fontSize={7} fill="#22c55e">{label}</text>
      <text x={W / 2} y={14} textAnchor="middle" fontSize={7} fill="#4b5563">
        Rolling Sphere Method — IEC 62305 / NFPA 780
      </text>
    </svg>
  );
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: LightningInput = {
  structureLength:    30,
  structureWidth:     15,
  structureHeight:    12,
  groundFlashDensity: 3.0,
  lpsLevel:           'II',
  occupancyType:      'industry',
  environmentFactor:  1.0,
};

// ─── Main component ───────────────────────────────────────────────────────────

export function LightningClient() {
  const { t, locale } = useI18n();
  const [p, setP] = useState<LightningInput>(DEFAULTS);
  const result: LightningResult = useMemo(() => computeLightning(p), [p]);

  const occupancyLabels = locale === 'en' ? OCCUPANCY_LABELS_EN : OCCUPANCY_LABELS_ES;
  const envFactors      = locale === 'en' ? ENV_FACTORS_EN : ENV_FACTORS_ES;

  function n(field: keyof LightningInput) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setP(prev => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }));
  }
  function s(field: keyof LightningInput) {
    return (e: React.ChangeEvent<HTMLSelectElement>) =>
      setP(prev => ({ ...prev, [field]: e.target.value }));
  }

  const pColor = result.protectionRequired ? 'var(--danger)' : 'var(--safe)';
  const pBg    = result.protectionRequired ? '#1a0d0d' : '#0d1a0d';
  const pTxt   = result.protectionRequired
    ? `${t('protRequired')} — LPS ${result.recommendedLevel}`
    : t('protNotRequired');

  const exportInputs = {
    [t('structLength')]:   `${p.structureLength} m`,
    [t('structWidth')]:    `${p.structureWidth} m`,
    [t('structHeight')]:   `${p.structureHeight} m`,
    [t('flashDensity')]:   `${p.groundFlashDensity}`,
    [t('lpsLevel')]:       `LPS ${p.lpsLevel}`,
    [t('occupancy')]:      occupancyLabels[p.occupancyType] ?? p.occupancyType,
    [t('envFactor')]:      String(p.environmentFactor),
  };
  const exportOutputs = {
    [t('sphereRadius')]:   `${result.rollingSphereRadius} m`,
    [t('collectArea')]:    `${result.collectionAreaM2.toFixed(0)} m²`,
    [t('annualStrikes')]:  result.annualStrikes.toFixed(4),
    [t('tolFreq')]:        result.tolerableFrequency.toExponential(0),
    [t('reqEfficiency')]:  `${(result.efficiencyRequired * 100).toFixed(1)} %`,
    [t('recLevel')]:       `LPS ${result.recommendedLevel}`,
    [t('downConductors')]: String(result.downConductors),
    [t('groundTerms')]:    String(result.groundTerminations),
  };

  return (
    <AuthGuard>
      <div style={{ padding: '32px 40px', maxWidth: 960 }}>
        <div style={{ fontSize: 9, color: 'var(--copper)', fontFamily: 'var(--font-mono)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 4 }}>
          {locale === 'en' ? 'Lightning protection' : 'Protección contra rayos'}
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{t('lightningTitle')}</h1>
        <p style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 20, lineHeight: 1.6 }}>
          {t('lightningSubtitle')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Left — inputs */}
          <div>
            <div style={PANEL}>
              <div style={SEC_TITLE}>{t('geomSection')}</div>
              <div style={ROW}>
                <div style={FIELD}>
                  <label style={LBL}>{t('structLength')} (m)</label>
                  <input style={INPUT} type="number" value={p.structureLength} onChange={n('structureLength')} min={1} step={1} />
                </div>
                <div style={FIELD}>
                  <label style={LBL}>{t('structWidth')} (m)</label>
                  <input style={INPUT} type="number" value={p.structureWidth} onChange={n('structureWidth')} min={1} step={1} />
                </div>
                <div style={FIELD}>
                  <label style={LBL}>{t('structHeight')} (m)</label>
                  <input style={INPUT} type="number" value={p.structureHeight} onChange={n('structureHeight')} min={1} step={0.5} />
                </div>
              </div>
            </div>

            <div style={PANEL}>
              <div style={SEC_TITLE}>{t('riskSection')}</div>
              <div style={ROW}>
                <div style={{ ...FIELD, minWidth: 200 }}>
                  <label style={LBL}>{t('flashDensity')}</label>
                  <input style={INPUT} type="number" value={p.groundFlashDensity} onChange={n('groundFlashDensity')} min={0.1} max={20} step={0.1} />
                </div>
                <div style={FIELD}>
                  <label style={LBL}>{t('envFactor')}</label>
                  <select style={SELECT} value={p.environmentFactor} onChange={e => setP(prev => ({ ...prev, environmentFactor: parseFloat(e.target.value) }))}>
                    {envFactors.map(f => (
                      <option key={f.value} value={f.value}>{f.label} (Cd={f.value})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={ROW}>
                <div style={FIELD}>
                  <label style={LBL}>{t('occupancy')}</label>
                  <select style={SELECT} value={p.occupancyType} onChange={s('occupancyType')}>
                    {Object.entries(occupancyLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v} (NT=10⁻{-Math.log10(TOLERABLE_FREQUENCY[k]!).toFixed(0)})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div style={PANEL}>
              <div style={SEC_TITLE}>{t('lpsLevel')}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(Object.keys(ROLLING_SPHERE_RADIUS) as Array<'I' | 'II' | 'III' | 'IV'>).map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setP(prev => ({ ...prev, lpsLevel: lvl }))}
                    style={{
                      padding: '8px 18px', borderRadius: 3, cursor: 'pointer',
                      fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11,
                      background: p.lpsLevel === lvl ? 'var(--copper)' : 'var(--bg)',
                      border: `1px solid ${p.lpsLevel === lvl ? 'var(--copper)' : 'var(--line)'}`,
                      color: p.lpsLevel === lvl ? '#fff' : 'var(--dim)',
                    }}
                  >
                    LPS {lvl}<br />
                    <span style={{ fontSize: 9, fontWeight: 400 }}>r={ROLLING_SPHERE_RADIUS[lvl]}m</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right — results */}
          <div>
            <div style={{ background: pBg, border: `1px solid ${pColor}44`, borderRadius: 6, padding: '14px 18px', marginBottom: 14 }}>
              <div style={{ borderLeft: `3px solid ${pColor}`, paddingLeft: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: pColor, fontFamily: 'var(--font-mono)' }}>{pTxt}</div>
                <div style={{ fontSize: 9.5, color: 'var(--dim)', marginTop: 4 }}>
                  {result.protectionRequired
                    ? `Nd = ${result.annualStrikes.toFixed(4)} > NT = ${result.tolerableFrequency.toExponential(0)}`
                    : `Nd = ${result.annualStrikes.toFixed(4)} ≤ NT = ${result.tolerableFrequency.toExponential(0)}`}
                </div>
              </div>
            </div>

            <div style={PANEL}>
              <div style={SEC_TITLE}>{t('riskResults')}</div>
              {[
                [t('collectArea'),   `${result.collectionAreaM2.toFixed(0)} m²`],
                [t('annualStrikes'), result.annualStrikes.toFixed(4)],
                [t('tolFreq'),       result.tolerableFrequency.toExponential(0)],
                [t('reqEfficiency'), `${(result.efficiencyRequired * 100).toFixed(1)} %`],
                [t('recLevel'),      `LPS ${result.recommendedLevel}`],
              ].map(([k, v]) => (
                <div key={k as string} style={RESULT_ROW}>
                  <span style={{ fontSize: 10.5, color: 'var(--dim)' }}>{k}</span>
                  <span style={{ fontSize: 11, color: 'var(--text)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={PANEL}>
              <div style={SEC_TITLE}>{t('designSpr')} — LPS {p.lpsLevel}</div>
              {[
                [t('sphereRadius'),  `${result.rollingSphereRadius} m`],
                [t('downConductors'), `≥ ${result.downConductors}`],
                [t('groundTerms'),   `≥ ${result.groundTerminations}`],
                [t('maxSpacing'),    `${(2 * (p.structureLength + p.structureWidth) / result.downConductors).toFixed(1)} m`],
              ].map(([k, v]) => (
                <div key={k as string} style={RESULT_ROW}>
                  <span style={{ fontSize: 10.5, color: 'var(--dim)' }}>{k}</span>
                  <span style={{ fontSize: 11, color: 'var(--copper)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={PANEL}>
              <div style={SEC_TITLE}>{t('sphereView')}</div>
              <RollingSphereView
                result={result}
                height={p.structureHeight}
                width={p.structureWidth}
                label={locale === 'en' ? 'Protected zone' : 'Zona protegida'}
              />
              <div style={{ fontSize: 8, color: 'var(--faint)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
                r = {result.rollingSphereRadius} m · LPS {p.lpsLevel}
              </div>
            </div>
          </div>
        </div>

        <ExportBar
          module="lightning"
          inputs={exportInputs}
          outputs={exportOutputs}
          norm="IEC 62305-2/3 · NFPA 780"
        />
      </div>
    </AuthGuard>
  );
}
