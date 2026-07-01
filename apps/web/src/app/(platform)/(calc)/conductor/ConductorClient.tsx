'use client';
import { useState } from 'react';
import { api, type ConductorResult, type ConductorEntry } from '@/lib/api';
import { Field, SectionLabel, StatCard, CompBanner, ExpertItem, FundBtn, calcLayout, inputStyle, panelStyle } from '@/components/ui/CalcShared';
import { ExportBar } from '@/components/ui/ExportBar';
import { useI18n } from '@/context/I18nContext';

const DEFAULTS = { iFalla: 8500, tFalla: 0.5, tempAmbiente: 40, tempMaxFusion: 450 };

export function ConductorClient() {
  const { t } = useI18n();
  const [form, setForm] = useState({ ...DEFAULTS, calibreSeleccionado: '' });
  const [result, setResult] = useState<ConductorResult | null>(null);
  const [table, setTable]   = useState<ConductorEntry[]>([]);
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFund, setShowFund] = useState(false);

  function set(k: string, v: string | number) { setForm(f => ({ ...f, [k]: v })); }

  async function calculate() {
    setLoading(true); setError(null);
    try {
      const [res, tbl] = await Promise.all([
        api.conductor.size({
          iFalla:       Number(form.iFalla),
          tFalla:       Number(form.tFalla),
          tempAmbiente: Number(form.tempAmbiente),
          tempMaxFusion: Number(form.tempMaxFusion),
          ...(form.calibreSeleccionado ? { calibreSeleccionado: form.calibreSeleccionado } : {}),
        }),
        api.conductor.table(),
      ]);
      setResult(res);
      setTable(tbl.table);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={calcLayout}>
      {/* INPUTS */}
      <aside style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', background: 'var(--panel)', padding: '18px 16px 40px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Conductor — Onderdonk</h2>
        <p style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 18, lineHeight: 1.5 }}>
          A = (I·197.4) / denom · IEEE Std 80-2013, Cl. 11.3
        </p>

        <SectionLabel>{t('faultCurrent')} / {t('clearingTime')}</SectionLabel>
        <Field label={t('faultCurrent')} unit="A">
          <input style={inputStyle} type="number" value={form.iFalla} onChange={e => set('iFalla', e.target.value)} />
        </Field>
        <Field label={t('clearingTime')} unit="s">
          <input style={inputStyle} type="number" step="0.1" value={form.tFalla} onChange={e => set('tFalla', e.target.value)} />
        </Field>

        <SectionLabel>{t('ambientTemp')} (Onderdonk)</SectionLabel>
        <Field label={t('ambientTemp')} unit="°C">
          <input style={inputStyle} type="number" value={form.tempAmbiente} onChange={e => set('tempAmbiente', e.target.value)} />
        </Field>
        <Field label={t('maxTemp')} unit="°C">
          <input style={inputStyle} type="number" value={form.tempMaxFusion} onChange={e => set('tempMaxFusion', e.target.value)} />
        </Field>

        <SectionLabel>Selección manual (opcional)</SectionLabel>
        <Field label="Calibre a verificar" unit="">
          <input style={inputStyle} placeholder="ej. 4/0 AWG" value={form.calibreSeleccionado}
            onChange={e => set('calibreSeleccionado', e.target.value)} />
        </Field>

        <button onClick={calculate} disabled={loading} style={{
          width: '100%', background: 'var(--copper)', border: 'none',
          color: '#fff', fontWeight: 700, fontSize: 11, padding: 10,
          borderRadius: 3, cursor: 'pointer', opacity: loading ? 0.6 : 1, marginTop: 8,
        }}>{loading ? t('calculating') : t('calculate')}</button>
        {error && <div style={{ marginTop: 10, padding: '8px 10px', background: '#1a0d0d', border: '1px solid #ef444433', borderRadius: 3, fontSize: 10, color: 'var(--danger)' }}>{error}</div>}
      </aside>

      {/* RESULTS */}
      <section style={{ overflowY: 'auto', padding: '18px 24px 40px', background: 'var(--bg)' }}>
        {!result ? (
          <EmptyState />
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <StatCard label="Área mínima" value={result.areaMm2.toFixed(1)} unit="mm²" primary />
              <StatCard label="Calibre sugerido" value={result.sugerido.calibre} unit={`${result.sugerido.mm2} mm²`} />
              <StatCard label="Margen" value={`+${result.margen.toFixed(0)}`} unit="%" ok={result.margen >= 0} />
            </div>

            <CompBanner pass={result.compliance.pass}
              norm={result.norm}
              msg={result.compliance.pass
                ? `Calibre ${result.seleccionado.calibre} (${result.seleccionado.mm2} mm²) cumple con margen +${result.compliance.margenPct}%`
                : result.compliance.advertencia ?? 'Calibre subdimensionado'} />
            <ExportBar module="conductor" inputs={form as unknown as Record<string,unknown>} outputs={result as unknown as Record<string,unknown>} norm={result.norm} />

            {result.calibreSubdimensionado && (
              <ExpertItem type="warn">
                <strong>Calibre rechazado:</strong> {result.calibreSubdimensionado.calibre} ({result.calibreSubdimensionado.mm2} mm²)
                es inferior al mínimo de {result.areaMm2.toFixed(1)} mm². Se usa automáticamente {result.sugerido.calibre}.
              </ExpertItem>
            )}
            <ExpertItem type="info">
              Con I={form.iFalla} A y t={form.tFalla} s, el área mínima es {result.areaMm2.toFixed(1)} mm².
              El siguiente calibre disponible es {result.sugerido.calibre} ({result.sugerido.mm2} mm²), con {result.margen.toFixed(0)}% de margen.
            </ExpertItem>

            {/* Tabla de conductores */}
            {table.length > 0 && (
              <div style={{ ...panelStyle, marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Tabla de conductores — cobre duro</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>{['Calibre', 'Área (mm²)', 'Estado'].map(h => (
                      <th key={h} style={{ textAlign: 'left', color: 'var(--faint)', fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '.05em', padding: '4px 8px', borderBottom: '1px solid var(--line)' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {table.map(row => {
                      const isSel     = row.calibre === result.seleccionado.calibre;
                      const isSuggest = row.calibre === result.sugerido.calibre;
                      const tooSmall  = row.mm2 < result.areaMm2;
                      return (
                        <tr key={row.calibre} style={{ background: isSel ? 'var(--copper-soft)' : 'transparent' }}>
                          <td style={{ padding: '5px 8px', borderBottom: '1px solid #1e2230', fontFamily: 'var(--font-mono)', color: isSel ? 'var(--copper)' : 'var(--text)', fontWeight: isSel ? 700 : 400 }}>
                            {row.calibre} {isSel && '← seleccionado'}
                          </td>
                          <td style={{ padding: '5px 8px', borderBottom: '1px solid #1e2230', fontFamily: 'var(--font-mono)', color: 'var(--dim)' }}>{row.mm2}</td>
                          <td style={{ padding: '5px 8px', borderBottom: '1px solid #1e2230', fontSize: 10 }}>
                            {tooSmall
                              ? <span style={{ color: 'var(--danger)' }}>✗ subdimensionado</span>
                              : isSuggest
                                ? <span style={{ color: 'var(--safe)' }}>✓ mínimo normativo</span>
                                : <span style={{ color: 'var(--faint)' }}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <FundBtn show={showFund} onToggle={() => setShowFund(f => !f)} label="Onderdonk — Dimensionamiento térmico">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)', marginBottom: 10, fontSize: 12 }}>
                A = (I · 197.4) / √((TCAP / (t · αr · ρr)) · ln((Ko+Tm)/(Ko+Ta)))
              </div>
              <p><strong style={{ color: 'var(--text)' }}>Variables:</strong> A = área (mm²), I = corriente (kA),
              t = tiempo (s), TCAP = 3.422 J/cm³·°C, αr = 0.00381 1/°C, ρr = 1.78 μΩ·cm, Ko = 234, Ta = temp. ambiente, Tm = temp. máx. fusión.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Conductor de referencia:</strong> cobre duro (annealed copper). Para otros materiales ajustar TCAP, αr y ρr.</p>
              <p style={{ marginTop: 12, fontSize: 9, color: 'var(--faint)' }}>IEEE Std 80-2013, Cl. 11.3, Ec. 37 · Onderdonk (1928)</p>
            </FundBtn>
          </>
        )}
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
      <div style={{ fontSize: 32 }}>🔌</div>
      <div style={{ color: 'var(--faint)', fontSize: 11 }}>Ingresa los parámetros y presiona Calcular</div>
    </div>
  );
}
