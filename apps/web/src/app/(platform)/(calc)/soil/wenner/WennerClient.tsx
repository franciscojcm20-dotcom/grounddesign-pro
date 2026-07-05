'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, type WennerResult } from '@/lib/api';
import { ExportBar } from '@/components/ui/ExportBar';
import { ChartRho } from '@/components/ui/ChartRho';
import {
  SectionLabel, StatCard, CompBanner, ExpertItem, FundBtn,
  calcLayout, panelStyle, Th, TdMono,
} from '@/components/ui/CalcShared';
import { useSoilModel } from '@/context/SoilModelContext';

export function WennerClient() {
  const soilModel = useSoilModel();
  const readings = soilModel.wennerReadings;

  const [result, setResult] = useState<WennerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFund, setShowFund] = useState(false);

  async function calculate() {
    if (readings.length < 2) { setError('Se necesitan al menos 2 lecturas válidas. Agrégalas en Mediciones de Campo.'); return; }
    setLoading(true); setError(null);
    try {
      const res = await api.soil.wenner(readings);
      setResult(res);
      soilModel.setFromWenner(res.twoLayer);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión con la API');
    } finally { setLoading(false); }
  }

  // Calcula automáticamente si ya hay lecturas guardadas desde Mediciones de Campo.
  useEffect(() => {
    if (readings.length >= 2 && !result) { calculate(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readings]);

  return (
    <div style={calcLayout}>
      {/* INPUTS */}
      <aside style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', background: 'var(--panel)', padding: '18px 16px 40px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Resistividad — Wenner</h2>
        <p style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 6, lineHeight: 1.5 }}>
          ρa = 2πaR · IEEE Std 81-2012, Cl. 8.3
        </p>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 8.5,
          color: 'var(--blue)', background: 'var(--blue-soft)', border: '1px solid var(--blue)',
          borderRadius: 10, padding: '2px 8px', marginBottom: 14, fontFamily: 'var(--font-mono)',
        }}>
          ✓ Método de validación — contrastar contra Schlumberger para confirmar el modelo de suelo
        </div>

        <div style={{
          fontSize: 9, color: 'var(--dim)', background: 'var(--panel3)', border: '1px solid var(--line)',
          borderRadius: 4, padding: '7px 9px', marginBottom: 14, lineHeight: 1.5,
        }}>
          🔒 Las lecturas se editan únicamente en{' '}
          <Link href="/soil/field" style={{ color: 'var(--copper)' }}>Mediciones de Campo</Link>. Esta vista es de solo cálculo/consulta.
        </div>

        <SectionLabel>Lecturas de campo (a, R)</SectionLabel>
        {readings.length === 0 ? (
          <div style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 14, lineHeight: 1.5 }}>
            Sin lecturas todavía. Ve a{' '}
            <Link href="/soil/field" style={{ color: 'var(--copper)' }}>Mediciones de Campo</Link> para registrarlas.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
            <thead><tr><Th>a (m)</Th><Th>R (Ω)</Th></tr></thead>
            <tbody>
              {readings.map((row, i) => (
                <tr key={i}>
                  <TdMono>{row.a}</TdMono>
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

      {/* RESULTS */}
      <section style={{ overflowY: 'auto', padding: '18px 24px 40px', background: 'var(--bg)' }}>
        {!result ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <div style={{ fontSize: 32 }}>⚡</div>
            <div style={{ color: 'var(--faint)', fontSize: 11 }}>
              {readings.length < 2 ? 'Registra lecturas en Mediciones de Campo primero.' : 'Presiona Calcular.'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <StatCard label="ρ promedio" value={result.rhoAvg.toFixed(0)} unit="Ω·m" primary />
              <StatCard label="Lecturas" value={String(result.points.length)} unit="válidas" />
              <StatCard label="ρ1 (sup.)" value={result.twoLayer.rho1.toFixed(0)} unit="Ω·m" />
              <StatCard label="ρ2 (inf.)" value={result.twoLayer.rho2.toFixed(0)} unit="Ω·m" />
            </div>

            <div style={{ ...panelStyle, marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 8 }}>ρa vs. espaciamiento a (m)</div>
              <ChartRho
                points={result.points.map(p => ({ a: p.a, rhoA: p.rhoA }))}
                rho1={result.twoLayer.rho1}
                rho2={result.twoLayer.rho2}
                h={result.twoLayer.h}
              />
            </div>

            <CompBanner pass={true} norm="IEEE 81-2012 · Cl. 8.3"
              msg={`${result.points.length} lecturas procesadas — ρ promedio ${result.rhoAvg.toFixed(0)} Ω·m`} />

            <ExportBar module="wenner" inputs={{ nLecturas: result.points.length }} outputs={result as unknown as Record<string,unknown>} norm="IEEE 81-2012 Cl.8.3" />

            <SectionLabel purple>Sistema Experto</SectionLabel>
            <ExpertItem type="info">
              ρ1={result.twoLayer.rho1.toFixed(0)} Ω·m · ρ2={result.twoLayer.rho2.toFixed(0)} Ω·m — profundidad estimada de capa: h ≈ {result.twoLayer.h} m.
            </ExpertItem>
            {result.rhoAvg > 1000 && (
              <ExpertItem type="warn">
                ρ = {result.rhoAvg.toFixed(0)} Ω·m — suelo de alta resistividad. Evaluar aditivo gel o reducir malla al mínimo normativo.
              </ExpertItem>
            )}
            {soilModel.model?.source === 'schlumberger' && soilModel.model.validatedBy && (
              <ExpertItem type={soilModel.model.validatedBy.deltaPct > 15 ? 'warn' : 'ok'}>
                Validación vs. Schlumberger (método principal): diferencia de {soilModel.model.validatedBy.deltaPct.toFixed(1)}% en ρ equivalente.
                {soilModel.model.validatedBy.deltaPct > 15
                  ? ' Diferencia significativa — revisar orientación/ubicación de las mediciones.'
                  : ' Dentro del rango esperado de concordancia entre métodos.'}
              </ExpertItem>
            )}

            <div style={{ ...panelStyle, marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Resistividades aparentes</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><Th>a (m)</Th><Th>R (Ω)</Th><Th>ρa (Ω·m)</Th></tr></thead>
                <tbody>
                  {result.points.map((pt, i) => (
                    <tr key={i}>
                      <TdMono>{pt.a}</TdMono>
                      <TdMono>{pt.r}</TdMono>
                      <TdMono highlight>{pt.rhoA.toFixed(1)}</TdMono>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <FundBtn show={showFund} onToggle={() => setShowFund(f => !f)} label="Método de Wenner">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)', marginBottom: 10, fontSize: 12 }}>ρa = 2 · π · a · R</div>
              <p><strong style={{ color: 'var(--text)' }}>Variables:</strong> ρa = resistividad aparente (Ω·m), a = espaciamiento (m), R = resistencia medida (Ω).</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Limitaciones:</strong> No diferencia capas con bajo contraste. Sensible a heterogeneidades laterales.</p>
              <p style={{ marginTop: 12, fontSize: 9, color: 'var(--faint)' }}>Wenner, F. (1916). NBS Scientific Paper 258 · IEEE Std 81-2012, Cl. 8.</p>
            </FundBtn>
          </>
        )}
      </section>
    </div>
  );
}
