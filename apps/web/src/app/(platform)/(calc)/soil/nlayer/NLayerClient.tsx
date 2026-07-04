'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  SectionLabel, StatCard, ExpertItem, FundBtn,
  calcLayout, panelStyle, Th, TdMono,
} from '@/components/ui/CalcShared';
import { ExportBar } from '@/components/ui/ExportBar';
import { SoundingComparisonChart } from '@/components/ui/Charts';
import { useSoilModel } from '@/context/SoilModelContext';
import { API_BASE as BASE } from '@/lib/apiBase';

interface RhoPoint       { a: number; rho: number }
interface LayerCandidate { nLayers: number; rhos: number[]; hs: number[]; rmsError: number; curve: RhoPoint[] }
interface FitResult       { best: LayerCandidate; candidates: LayerCandidate[]; measured: RhoPoint[]; norm: string }

/* ── Layer cross-section diagram ──────────────────────────────────── */
function LayerDiagram({ rhos, hs }: { rhos: number[]; hs: (number | null)[] }) {
  const W = 280, PAD = 8;
  const totalH = hs.reduce<number>((s, h) => s + (h ?? 0), 0) || 40;
  const displayH = Math.min(totalH + 20, 150);
  const SCALE = (displayH - PAD * 2) / (totalH + 20);
  const rhoMax = Math.max(...rhos);

  let y = PAD;
  return (
    <svg viewBox={`0 0 ${W} ${displayH}`} style={{ width: '100%', height: displayH, display: 'block' }}>
      {rhos.map((rho, i) => {
        const h = hs[i] ?? 20;
        const barH = h * SCALE;
        const opacity = 0.15 + 0.6 * (rho / rhoMax);
        const el = (
          <g key={i}>
            <rect x={PAD} y={y} width={W - PAD * 2} height={barH}
              fill="var(--copper)" fillOpacity={opacity} rx="1" />
            <text x={W / 2} y={y + barH / 2 + 3.5} fill="var(--text)" fontSize="8.5" textAnchor="middle" fontFamily="var(--font-mono)">
              ρ{i + 1} = {rho.toFixed(0)} Ω·m {hs[i] !== null ? `· h${i + 1} = ${hs[i]!.toFixed(1)} m` : '(semi-espacio)'}
            </text>
            {i < rhos.length - 1 && (
              <line x1={PAD} y1={y + barH} x2={W - PAD} y2={y + barH}
                stroke="var(--line)" strokeWidth="1" strokeDasharray="4,3" />
            )}
          </g>
        );
        y += barH;
        return el;
      })}
      <text x={PAD + 4} y={PAD - 2} fill="var(--faint)" fontSize="7">Superficie</text>
    </svg>
  );
}

export function NLayerClient() {
  const soilModel = useSoilModel();
  const [result,  setResult]  = useState<FitResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFund, setShowFund] = useState(false);

  const hasReadings = soilModel.schlumbergerReadings.length > 0 || soilModel.wennerReadings.length > 0;

  async function calculate() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${BASE}/api/v1/soil/nlayer/fit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wenner: soilModel.wennerReadings,
          schlumberger: soilModel.schlumbergerReadings,
        }),
      });
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      setResult(await res.json() as FitResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally { setLoading(false); }
  }

  const best = result?.best;

  return (
    <div style={calcLayout}>
      <aside style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', background: 'var(--panel)', padding: '18px 16px 40px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Modelo N capas</h2>
        <p style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 14, lineHeight: 1.6 }}>
          La estratificación no se ingresa manualmente: se determina ajustando el universo de
          curvas patrón (Orellana &amp; Mooney, 1966 — evaluadas de forma exacta vía el kernel de
          Wait) contra la curva ρa(a) medida en terreno, probando de 1 a 4 estratos.
        </p>

        <SectionLabel>Lecturas de campo</SectionLabel>
        {hasReadings ? (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16,
            fontSize: 9.5, color: 'var(--dim)', fontFamily: 'var(--font-mono)',
          }}>
            {soilModel.schlumbergerReadings.length > 0 && (
              <div>📡 Schlumberger: {soilModel.schlumbergerReadings.length} lecturas</div>
            )}
            {soilModel.wennerReadings.length > 0 && (
              <div>〰 Wenner: {soilModel.wennerReadings.length} lecturas</div>
            )}
            <Link href="/soil/field" style={{ color: 'var(--copper)', marginTop: 2 }}>
              Editar lecturas en Mediciones de Campo →
            </Link>
          </div>
        ) : (
          <div style={{
            fontSize: 9.5, color: 'var(--faint)', marginBottom: 16, lineHeight: 1.5,
            background: 'var(--panel3)', border: '1px solid var(--line)', borderRadius: 4, padding: '8px 10px',
          }}>
            Sin lecturas de campo aún —{' '}
            <Link href="/soil/field" style={{ color: 'var(--copper)' }}>ingrésalas en Mediciones de Campo</Link>.
            El ajuste de N capas se calcula directamente desde esas lecturas.
          </div>
        )}

        <button onClick={calculate} disabled={loading || !hasReadings} style={{
          width: '100%', background: 'var(--copper)', border: 'none', color: '#fff', fontWeight: 700,
          fontSize: 11, padding: 10, borderRadius: 3, cursor: 'pointer',
          opacity: (loading || !hasReadings) ? 0.6 : 1,
        }}>
          {loading ? 'Ajustando…' : 'Ajustar modelo de N capas'}
        </button>
        {error && <div style={{ marginTop: 12, padding: '8px 10px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 3, fontSize: 10, color: 'var(--danger)' }}>{error}</div>}
      </aside>

      <section style={{ overflowY: 'auto', padding: '18px 24px 40px', background: 'var(--bg)' }}>
        {!result || !best ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <div style={{ fontSize: 32 }}>🌍</div>
            <div style={{ color: 'var(--faint)', fontSize: 11 }}>Presiona "Ajustar modelo de N capas" para procesar las lecturas de campo</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <StatCard label="Estratos ajustados" value={String(best.nLayers)} unit="capas" primary />
              <StatCard label="Error de ajuste (RMS)" value={`${(best.rmsError * 100).toFixed(1)}`} unit="%" ok={best.rmsError <= 0.05} />
              <StatCard label="ρ1 (superior)" value={best.rhos[0]!.toFixed(0)} unit="Ω·m" />
              <StatCard label="ρN (semi-espacio)" value={best.rhos[best.rhos.length - 1]!.toFixed(0)} unit="Ω·m" />
            </div>

            <SectionLabel purple>Sistema Experto</SectionLabel>
            <ExpertItem type={best.rmsError <= 0.05 ? 'ok' : 'warn'}>
              {best.rmsError <= 0.05
                ? `El modelo de ${best.nLayers} estrato${best.nLayers !== 1 ? 's' : ''} ajusta las lecturas de campo con ${(best.rmsError * 100).toFixed(1)}% de error RMS — dentro de la precisión habitual de un ensayo VES.`
                : `El mejor ajuste disponible (${best.nLayers} estratos) tiene ${(best.rmsError * 100).toFixed(1)}% de error RMS, por sobre el 5% esperado — revisa que las lecturas de Mediciones de Campo no tengan errores de escala o ruido de medición.`}
            </ExpertItem>
            {best.rhos[0]! > best.rhos[best.rhos.length - 1]! ? (
              <ExpertItem type="info">
                Perfil tipo H o Q: la capa profunda es más conductiva que la superficial — favorable para reducir Rg si la malla alcanza esa profundidad.
              </ExpertItem>
            ) : (
              <ExpertItem type="info">
                Perfil tipo K o A: la resistividad aumenta en profundidad — conviene diseñar la malla dentro de la capa superior{best.hs[0] ? ` (h≈${best.hs[0].toFixed(1)} m)` : ''}.
              </ExpertItem>
            )}

            {/* Cross-section */}
            <div style={{ ...panelStyle, marginBottom: 16, padding: '10px 8px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, paddingLeft: 4 }}>Estratificación ajustada</div>
              <LayerDiagram rhos={best.rhos} hs={[...best.hs, null]} />
            </div>

            {/* Curve overlay: measured vs fitted */}
            <div style={{ ...panelStyle, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Curva ρa(a) — medido vs. ajuste de {best.nLayers} estrato{best.nLayers !== 1 ? 's' : ''}</div>
              <SoundingComparisonChart
                series={[
                  { label: 'Medido (campo)', color: 'var(--chart-1)', points: result.measured.map(p => ({ x: p.a, y: p.rho })) },
                  { label: `Ajuste N capas (${best.nLayers})`, color: 'var(--chart-2)', dashed: true, points: best.curve.map(p => ({ x: p.a, y: p.rho })) },
                ]}
              />
            </div>

            {/* Candidate comparison table — transparency on why nLayers was chosen */}
            <div style={panelStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Universo de curvas patrón evaluadas (1 a 4 estratos)</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><Th>Estratos</Th><Th>ρ (Ω·m)</Th><Th>h (m)</Th><Th>Error RMS</Th></tr></thead>
                <tbody>
                  {result.candidates.map(c => (
                    <tr key={c.nLayers} style={{ background: c.nLayers === best.nLayers ? 'var(--copper-soft)' : undefined }}>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--line)', fontSize: 10, color: c.nLayers === best.nLayers ? 'var(--copper)' : 'var(--dim)', fontWeight: c.nLayers === best.nLayers ? 700 : 400 }}>
                        {c.nLayers} {c.nLayers === best.nLayers && '★'}
                      </td>
                      <TdMono>{c.rhos.map(r => r.toFixed(0)).join(' / ')}</TdMono>
                      <TdMono>{c.hs.length ? c.hs.map(h => h.toFixed(1)).join(' / ') : '—'}</TdMono>
                      <TdMono highlight={c.nLayers === best.nLayers}>{(c.rmsError * 100).toFixed(1)}%</TdMono>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ExportBar
              module="nlayer"
              inputs={{ measured: result.measured }}
              outputs={{ nLayers: best.nLayers, rhos: best.rhos, hs: best.hs, rmsError: best.rmsError, curve: best.curve }}
              norm={result.norm}
            />

            <FundBtn show={showFund} onToggle={() => setShowFund(f => !f)} label="Ajuste automático de N capas (Wait 1954 / Orellana-Mooney 1966)">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)', marginBottom: 8, fontSize: 11 }}>
                ρa = ρ1·[1 + 2·∫₀^∞ (T₁(u/a)/ρ1 − 1)·J₁(u)·u·du]
              </div>
              <p><strong style={{ color: 'var(--text)' }}>Kernel recursivo T:</strong> calculado desde la capa inferior hacia arriba, usando <code style={{ color: 'var(--copper)', fontFamily: 'var(--font-mono)', fontSize: 9 }}>tanh(λ·h)</code> para cada interfaz — esta es la misma teoría que da origen a las curvas patrón impresas de Orellana &amp; Mooney, aquí evaluada de forma exacta en vez de leída de tablas.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Ajuste:</strong> para cada número de estratos (1 a 4) se busca, mediante refinamiento local multi-semilla, el conjunto de ρ/h que minimiza el error cuadrático medio relativo contra las lecturas de campo. Se adopta el modelo más simple cuyo error ya está dentro de la precisión habitual de un ensayo VES (5% RMS) — evita interpretar ruido de medición como estratos ficticios.</p>
              <p style={{ marginTop: 12, fontSize: 9, color: 'var(--faint)' }}>Wait (1954) · Orellana &amp; Mooney (1966) · IEEE Std 81-2012</p>
            </FundBtn>
          </>
        )}
      </section>
    </div>
  );
}
