'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, type SchlumbergerResult } from '@/lib/api';
import {
  SectionLabel, StatCard, CompBanner, ExpertItem, FundBtn,
  calcLayout, panelStyle, Th, TdMono,
} from '@/components/ui/CalcShared';
import { ExportBar } from '@/components/ui/ExportBar';
import { ChartRho } from '@/components/ui/ChartRho';
import { useSoilModel } from '@/context/SoilModelContext';

export function SchlumbergerClient() {
  const soilModel = useSoilModel();
  const readings = soilModel.schlumbergerReadings;

  const [result, setResult] = useState<SchlumbergerResult | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFund, setShowFund] = useState(false);

  async function calculate() {
    if (readings.length < 2) { setError('Se necesitan al menos 2 lecturas válidas. Agrégalas en Mediciones de Campo.'); return; }
    setLoading(true); setError(null);
    try {
      const data = await api.soil.schlumberger(readings);
      setResult(data);
      soilModel.setFromSchlumberger(data.twoLayer);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally { setLoading(false); }
  }

  // Calcula automáticamente si ya hay lecturas guardadas desde Mediciones de Campo.
  useEffect(() => {
    if (readings.length >= 2 && !result) { calculate(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readings]);

  const wennerRhoAvg = result ? result.rhoAvg : null;

  return (
    <div style={calcLayout}>
      <aside style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', background: 'var(--panel)', padding: '18px 16px 40px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Resistividad — Schlumberger</h2>
        <p style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 6, lineHeight: 1.5 }}>
          ρa = π·(L²−l²)/(2l)·R · IEEE Std 81-2012, Cl. 8
        </p>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 8.5,
          color: 'var(--copper)', background: 'var(--copper-soft)', border: '1px solid var(--copper)',
          borderRadius: 10, padding: '2px 8px', marginBottom: 14, fontFamily: 'var(--font-mono)',
        }}>
          ★ Método principal — mayor profundidad de exploración y menor sensibilidad a heterogeneidades laterales
        </div>

        <div style={{
          fontSize: 9, color: 'var(--dim)', background: 'var(--panel3)', border: '1px solid var(--line)',
          borderRadius: 4, padding: '7px 9px', marginBottom: 14, lineHeight: 1.5,
        }}>
          🔒 Las lecturas se editan únicamente en{' '}
          <Link href="/soil/field" style={{ color: 'var(--copper)' }}>Mediciones de Campo</Link>. Esta vista es de solo cálculo/consulta.
        </div>

        <SectionLabel>Lecturas de campo (L, l, R)</SectionLabel>
        {readings.length === 0 ? (
          <div style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 14, lineHeight: 1.5 }}>
            Sin lecturas todavía. Ve a{' '}
            <Link href="/soil/field" style={{ color: 'var(--copper)' }}>Mediciones de Campo</Link> para registrarlas.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
            <thead><tr><Th>L (m)</Th><Th>l (m)</Th><Th>R (Ω)</Th></tr></thead>
            <tbody>
              {readings.map((row, i) => (
                <tr key={i}>
                  <TdMono>{row.L}</TdMono>
                  <TdMono>{row.l}</TdMono>
                  <TdMono>{row.r}</TdMono>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <button onClick={calculate} disabled={loading || readings.length < 2} style={{ width: '100%', background: 'var(--copper)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 11, padding: 10, borderRadius: 3, cursor: 'pointer', opacity: (loading || readings.length < 2) ? 0.6 : 1 }}>
          {loading ? 'Calculando…' : 'Calcular'}
        </button>
        {error && <div style={{ marginTop: 12, padding: '8px 10px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 3, fontSize: 10, color: 'var(--danger)' }}>{error}</div>}
      </aside>

      <section style={{ overflowY: 'auto', padding: '18px 24px 40px', background: 'var(--bg)' }}>
        {!result ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <div style={{ fontSize: 32 }}>📡</div>
            <div style={{ color: 'var(--faint)', fontSize: 11 }}>
              {readings.length < 2 ? 'Registra lecturas en Mediciones de Campo primero.' : 'Presiona Calcular.'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <StatCard label="ρ promedio" value={result.rhoAvg.toFixed(0)} unit="Ω·m" primary />
              <StatCard label="ρ1 (sup.)" value={result.twoLayer.rho1.toFixed(0)} unit="Ω·m" />
              <StatCard label="ρ2 (inf.)" value={result.twoLayer.rho2.toFixed(0)} unit="Ω·m" />
              <StatCard label="Lecturas" value={String(result.points.length)} unit="válidas" />
            </div>

            <div style={{ ...panelStyle, marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 8 }}>ρa vs. semidistancia L (m)</div>
              <ChartRho
                points={result.points.map(p => ({ a: p.L, rhoA: p.rhoA }))}
                rho1={result.twoLayer.rho1}
                rho2={result.twoLayer.rho2}
                h={result.twoLayer.h}
                xLabel="L (m)"
              />
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, background: 'var(--copper-soft)',
              border: '1px solid var(--copper)', borderRadius: 4, padding: '8px 12px', marginBottom: 16, fontSize: 10.5, color: 'var(--copper)',
            }}>
              <span style={{ fontWeight: 700 }}>★</span>
              <span>Modelo de suelo activo actualizado — ρ1={result.twoLayer.rho1.toFixed(0)} Ω·m, ρ2={result.twoLayer.rho2.toFixed(0)} Ω·m, h≈{result.twoLayer.h}m. Los módulos de diseño de malla usarán este modelo automáticamente.</span>
            </div>

            <CompBanner pass={true} norm={result.norm}
              msg={`${result.points.length} lecturas Schlumberger procesadas — ρ promedio ${result.rhoAvg.toFixed(0)} Ω·m`} />
            <ExportBar module="schlumberger" inputs={{ nLecturas: result.points.length }} outputs={result as unknown as Record<string,unknown>} norm={result.norm} />

            <SectionLabel purple>Sistema Experto</SectionLabel>
            <ExpertItem type="info">
              ρ1={result.twoLayer.rho1.toFixed(0)} Ω·m · ρ2={result.twoLayer.rho2.toFixed(0)} Ω·m — profundidad estimada de capa: h ≈ {result.twoLayer.h} m. Curva determinada automáticamente a partir de las lecturas de campo (no seleccionable manualmente).
            </ExpertItem>
            <ExpertItem type="info">
              Schlumberger es más preciso que Wenner para detectar capas profundas porque mantiene l fijo y varía L, reduciendo el efecto de heterogeneidades laterales.
            </ExpertItem>
            {wennerRhoAvg !== null && Math.abs(wennerRhoAvg - result.rhoAvg) / result.rhoAvg > 0.1 && (
              <ExpertItem type="warn">
                ρ Schlumberger ({result.rhoAvg.toFixed(0)} Ω·m) difiere &gt;10% respecto a Wenner. Verificar que las lecturas correspondan al mismo sitio y orientación.
              </ExpertItem>
            )}

            <div style={panelStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Resistividades aparentes</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><Th>L (m)</Th><Th>l (m)</Th><Th>R (Ω)</Th><Th>ρa (Ω·m)</Th></tr></thead>
                <tbody>
                  {result.points.map((pt, i) => (
                    <tr key={i}>
                      <TdMono>{pt.L}</TdMono>
                      <TdMono>{pt.l}</TdMono>
                      <TdMono>{pt.r}</TdMono>
                      <TdMono highlight>{pt.rhoA.toFixed(1)}</TdMono>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <FundBtn show={showFund} onToggle={() => setShowFund(f => !f)} label="Método de Schlumberger">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)', marginBottom: 10, fontSize: 11 }}>ρa = π · (L² − l²) / (2l) · R</div>
              <p><strong style={{ color: 'var(--text)' }}>Variables:</strong> L = semidistancia entre electrodos de corriente (m), l = semidistancia entre electrodos de potencial (m, fijo), R = resistencia medida (Ω).</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Ventaja sobre Wenner:</strong> al mantener l fijo la medición es menos sensible a variaciones laterales. Preferido para SEV (Sondeo Eléctrico Vertical).</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Aproximación L≫l:</strong> cuando L≫l, (L²−l²) ≈ L² y la fórmula se simplifica a π·L²/(2l)·R.</p>
              <p style={{ marginTop: 12, fontSize: 9, color: 'var(--faint)' }}>Telford et al. (1990) · IEEE Std 81-2012, Cl. 8</p>
            </FundBtn>
          </>
        )}
      </section>
    </div>
  );
}
