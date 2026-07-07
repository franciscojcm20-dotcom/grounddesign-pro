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
import { CURVE_FAMILIES, getCurveFamilyInfo } from '@gdp/engines-math';

interface RhoPoint       { a: number; rho: number }
interface LayerCandidate { nLayers: number; rhos: number[]; hs: number[]; rmsError: number; curve: RhoPoint[]; curveType: string }
interface FitResult       { best: LayerCandidate; candidates: LayerCandidate[]; measured: RhoPoint[]; norm: string }

/* ── Layer cross-section diagram ──────────────────────────────────────────────
   Cada estrato ocupa una fila con altura mínima garantizada (los textos nunca
   se superponen aunque el estrato sea delgado); la altura es proporcional al
   espesor real solo por encima de ese mínimo, y la profundidad acumulada se
   marca en el borde derecho de cada interfaz. */
function LayerDiagram({ rhos, hs }: { rhos: number[]; hs: (number | null)[] }) {
  const W = 460, PAD = 10, TOP = 16, MIN_ROW = 40, MAX_ROW = 78;
  const rhoMax = Math.max(...rhos);
  const hMax = Math.max(...hs.map(h => h ?? 0), 1);

  // Altura de fila: mínima legible + componente proporcional al espesor real.
  const rowHeights = rhos.map((_, i) => {
    const h = hs[i];
    if (h === null || h === undefined) return MIN_ROW + 8; // semi-espacio
    return Math.min(MIN_ROW + (h / hMax) * (MAX_ROW - MIN_ROW), MAX_ROW);
  });
  const totalH = TOP + rowHeights.reduce((s, r) => s + r, 0) + PAD;

  let y = TOP;
  let cumDepth = 0;
  return (
    <svg viewBox={`0 0 ${W} ${totalH}`} style={{ width: '100%', maxWidth: W, height: 'auto', display: 'block', margin: '0 auto' }}>
      <text x={PAD} y={TOP - 5} fill="var(--faint)" fontSize="8">Superficie (0.0 m)</text>
      <line x1={PAD} y1={TOP} x2={W - PAD} y2={TOP} stroke="var(--dim)" strokeWidth="1" />
      {rhos.map((rho, i) => {
        const rowH = rowHeights[i]!;
        const opacity = 0.15 + 0.55 * (rho / rhoMax);
        const isHalfSpace = hs[i] === null || hs[i] === undefined;
        if (!isHalfSpace) cumDepth += hs[i]!;
        const el = (
          <g key={i}>
            <rect x={PAD} y={y} width={W - PAD * 2} height={rowH} fill="var(--copper)" fillOpacity={opacity} />
            <text x={PAD + 12} y={y + rowH / 2 - 4} fill="var(--text)" fontSize="10" fontWeight="700">
              Estrato {i + 1}{isHalfSpace ? ' — semi-espacio' : ''}
            </text>
            <text x={PAD + 12} y={y + rowH / 2 + 10} fill="var(--text)" fontSize="9.5" fontFamily="var(--font-mono)">
              ρ{i + 1} = {rho.toFixed(0)} Ω·m{!isHalfSpace ? `  ·  espesor h${i + 1} = ${hs[i]!.toFixed(1)} m` : '  ·  sin límite inferior'}
            </text>
            {!isHalfSpace && (
              <>
                <line x1={PAD} y1={y + rowH} x2={W - PAD} y2={y + rowH} stroke="var(--line)" strokeWidth="1" strokeDasharray="5,3" />
                <text x={W - PAD - 4} y={y + rowH - 4} fill="var(--faint)" fontSize="8" textAnchor="end" fontFamily="var(--font-mono)">
                  {cumDepth.toFixed(1)} m
                </text>
              </>
            )}
          </g>
        );
        y += rowH;
        return el;
      })}
    </svg>
  );
}

/* ── Miniatura de la forma de cada familia de curva patrón ─────────────────── */
const CURVE_SHAPES: Record<string, string> = {
  'Homogéneo':            '2,14 46,14',
  'Ascendente (2 capas)': '2,20 16,18 32,10 46,5',
  'Descendente (2 capas)':'2,5 16,7 32,15 46,20',
  'H': '2,8 14,16 24,20 34,14 46,6',
  'K': '2,18 14,10 24,5 34,11 46,19',
  'Q': '2,5 14,8 26,13 36,17 46,21',
  'A': '2,21 14,17 26,12 36,8 46,4',
};

function CurveShapeSketch({ code, highlight }: { code: string; highlight: boolean }) {
  const pts = CURVE_SHAPES[code] ?? '2,14 46,14';
  return (
    <svg viewBox="0 0 48 26" style={{ width: 48, height: 26, flexShrink: 0 }}>
      <rect x="0" y="0" width="48" height="26" fill="var(--bg)" stroke="var(--line)" strokeWidth="0.5" rx="2" />
      <polyline points={pts} fill="none" stroke={highlight ? 'var(--copper)' : 'var(--dim)'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function NLayerClient() {
  const soilModel = useSoilModel();
  const [result,  setResult]  = useState<FitResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFund, setShowFund] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);

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
              <StatCard label="Curva patrón (O&M)" value={best.curveType} unit="" primary />
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
            {getCurveFamilyInfo(best.curveType).map(fam => (
              <ExpertItem key={fam.code} type="info">
                Curva patrón tipo <strong style={{ color: 'var(--copper)' }}>{fam.code}</strong> ({fam.pattern}): {fam.description} {fam.designImplication}
              </ExpertItem>
            ))}

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
                <thead><tr><Th>Estratos</Th><Th>Curva patrón</Th><Th>ρ (Ω·m)</Th><Th>h (m)</Th><Th>Error RMS</Th></tr></thead>
                <tbody>
                  {result.candidates.map(c => (
                    <tr key={c.nLayers} style={{ background: c.nLayers === best.nLayers ? 'var(--copper-soft)' : undefined }}>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--line)', fontSize: 10, color: c.nLayers === best.nLayers ? 'var(--copper)' : 'var(--dim)', fontWeight: c.nLayers === best.nLayers ? 700 : 400 }}>
                        {c.nLayers} {c.nLayers === best.nLayers && '★'}
                      </td>
                      <TdMono highlight={c.nLayers === best.nLayers}>{c.curveType}</TdMono>
                      <TdMono>{c.rhos.map(r => r.toFixed(0)).join(' / ')}</TdMono>
                      <TdMono>{c.hs.length ? c.hs.map(h => h.toFixed(1)).join(' / ') : '—'}</TdMono>
                      <TdMono highlight={c.nLayers === best.nLayers}>{(c.rmsError * 100).toFixed(1)}%</TdMono>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Repositorio de familias de curvas patrón (Orellana & Mooney) */}
            <div style={panelStyle}>
              <button
                onClick={() => setShowCatalog(s => !s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontSize: 11, fontWeight: 700, color: 'var(--text)',
                }}
              >
                <span style={{ color: 'var(--copper)' }}>{showCatalog ? '▾' : '▸'}</span>
                📚 Repositorio de curvas patrón — Orellana &amp; Mooney (1966)
                <span style={{ fontSize: 9, color: 'var(--faint)', fontWeight: 400 }}>
                  · tu curva ajustada: <strong style={{ color: 'var(--copper)' }}>{best.curveType}</strong>
                </span>
              </button>
              {showCatalog && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ fontSize: 9.5, color: 'var(--faint)', lineHeight: 1.6, margin: 0 }}>
                    Familias clásicas de sondeo eléctrico vertical, evaluadas aquí de forma exacta vía el kernel de Wait
                    en vez de leídas de las tablas impresas. La familia de tu curva se determina automáticamente desde las
                    lecturas de campo; para modelos de 4 estratos el código concatena las ternas sucesivas (ej. HK, QH).
                  </p>
                  {CURVE_FAMILIES.map(fam => {
                    const isMatch = getCurveFamilyInfo(best.curveType).some(f => f.code === fam.code) || fam.code === best.curveType;
                    return (
                      <div key={fam.code} style={{
                        display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 4,
                        background: isMatch ? 'var(--copper-soft)' : 'var(--bg)',
                        border: `1px solid ${isMatch ? 'var(--copper)' : 'var(--line)'}`,
                      }}>
                        <CurveShapeSketch code={fam.code} highlight={isMatch} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: isMatch ? 'var(--copper)' : 'var(--text)' }}>
                            Tipo {fam.code} <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--dim)', fontWeight: 400 }}>({fam.pattern} · {fam.nLayers} capa{fam.nLayers !== 1 ? 's' : ''})</span>
                            {isMatch && <span style={{ marginLeft: 6, fontSize: 8.5 }}>★ tu curva</span>}
                          </div>
                          <div style={{ fontSize: 9.5, color: 'var(--dim)', lineHeight: 1.55, marginTop: 2 }}>{fam.description}</div>
                          <div style={{ fontSize: 9.5, color: 'var(--faint)', lineHeight: 1.55, marginTop: 2 }}>
                            <strong style={{ color: 'var(--dim)' }}>Diseño:</strong> {fam.designImplication}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <ExportBar
              module="nlayer"
              inputs={{ measured: result.measured }}
              outputs={{ nLayers: best.nLayers, curveType: best.curveType, rhos: best.rhos, hs: best.hs, rmsError: best.rmsError, curve: best.curve }}
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
