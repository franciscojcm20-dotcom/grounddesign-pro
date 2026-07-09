'use client';
import { useRef, useState } from 'react';
import { api, type FreeformGridResult, type Point2D, type PotentialGridResult } from '@/lib/api';
import {
  Field, SectionLabel, StatCard, CompBanner, ExpertItem,
  FundBtn, calcLayout, inputStyle, panelStyle,
} from '@/components/ui/CalcShared';
import { polygonSegments } from '@/lib/gridSegments';
import { PotentialHeatmap } from '@/components/ui/PotentialHeatmap';
import { FaultCurrentField } from '@/components/ui/FaultCurrentField';
import { useFaultAnalysis } from '@/context/FaultAnalysisContext';
import { useNormativeProfile } from '@/context/NormativeProfileContext';
import { NormativeProfileSelector } from '@/components/ui/NormativeProfileSelector';
import { evaluateRgCompliance, effectiveRgGeneral } from '@gdp/engines-math';
import { usePersistedState } from '@/lib/usePersistedState';

const DEFAULTS = {
  vertices: [
    { x: -20, y: -15 }, { x: 20, y: -15 }, { x: 25, y: 5 }, { x: 10, y: 20 }, { x: -20, y: 15 },
  ] as Point2D[],
  rods: [{ x: 0, y: 0 }] as Point2D[],
  rodLength: 3, profundidad: 0.6, rho: 110, iFalla: 8500, tFalla: 0.5,
};

const VB = 120; // m — lado del viewBox del editor (cuadrado, centrado en 0,0)
const SIZE = 340; // px
const MIN_VERTICES = 3;

/** Editor de polígono en SVG: agregar/mover/eliminar vértices y picas con el mouse. */
function PolygonEditor({ vertices, rods, mode, onVertexAdd, onVertexMove, onVertexRemove, onRodAdd, onRodRemove }: {
  vertices: Point2D[]; rods: Point2D[]; mode: 'vertex' | 'rod';
  onVertexAdd: (p: Point2D) => void;
  onVertexMove: (i: number, p: Point2D) => void;
  onVertexRemove: (i: number) => void;
  onRodAdd: (p: Point2D) => void;
  onRodRemove: (i: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  function toSvg(e: { clientX: number; clientY: number }): Point2D {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    return { x: px * VB - VB / 2, y: -(py * VB - VB / 2) };
  }
  function toPx(p: Point2D) {
    return { cx: (p.x + VB / 2) / VB * SIZE, cy: (-p.y + VB / 2) / VB * SIZE };
  }

  function handleCanvasClick(e: React.MouseEvent<SVGSVGElement>) {
    if (dragging !== null) return;
    const p = toSvg(e);
    if (mode === 'vertex') onVertexAdd(p); else onRodAdd(p);
  }
  function handlePointerMove(e: React.MouseEvent<SVGSVGElement>) {
    if (dragging === null) return;
    onVertexMove(dragging, toSvg(e));
  }

  const pathD = vertices.length >= 2
    ? vertices.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toPx(v).cx} ${toPx(v).cy}`).join(' ') + ' Z'
    : '';

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={SIZE} height={SIZE}
      style={{ width: '100%', maxWidth: SIZE, display: 'block', margin: '0 auto', background: 'var(--bg)', borderRadius: 4, cursor: mode === 'vertex' ? 'crosshair' : 'copy' }}
      onClick={handleCanvasClick}
      onMouseMove={handlePointerMove}
      onMouseUp={() => setDragging(null)}
      onMouseLeave={() => setDragging(null)}
    >
      <line x1={SIZE / 2} y1={0} x2={SIZE / 2} y2={SIZE} stroke="var(--line)" strokeWidth="0.5" opacity={0.4} />
      <line x1={0} y1={SIZE / 2} x2={SIZE} y2={SIZE / 2} stroke="var(--line)" strokeWidth="0.5" opacity={0.4} />
      {pathD && <path d={pathD} fill="var(--copper)" fillOpacity={0.12} stroke="var(--copper)" strokeWidth="2" />}
      {vertices.map((v, i) => {
        const { cx, cy } = toPx(v);
        return (
          <circle key={i} cx={cx} cy={cy} r={6} fill="var(--copper)" stroke="#fff" strokeWidth="1.5"
            style={{ cursor: 'move' }}
            onMouseDown={e => { e.stopPropagation(); setDragging(i); }}
            onDoubleClick={e => { e.stopPropagation(); if (vertices.length > MIN_VERTICES) onVertexRemove(i); }}
          />
        );
      })}
      {rods.map((r, i) => {
        const { cx, cy } = toPx(r);
        return (
          <circle key={`rod${i}`} cx={cx} cy={cy} r={4} fill="var(--blue)" stroke="#fff" strokeWidth="1"
            style={{ cursor: 'pointer' }}
            onClick={e => e.stopPropagation()}
            onDoubleClick={e => { e.stopPropagation(); onRodRemove(i); }}
          />
        );
      })}
    </svg>
  );
}

export function FreeformClient() {
  const faultAnalysis = useFaultAnalysis();
  const { profile, relaxedConditionsMet } = useNormativeProfile();
  const [form, setForm] = usePersistedState('gdp-form-freeform', DEFAULTS);
  const [mode, setMode] = useState<'vertex' | 'rod'>('vertex');
  const [result, setResult] = useState<FreeformGridResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFund, setShowFund] = useState(false);
  const [showPotential, setShowPotential] = useState(false);
  const [potentialResult, setPotentialResult] = useState<PotentialGridResult | null>(null);
  const [potentialLoading, setPotentialLoading] = useState(false);

  function set(k: keyof typeof DEFAULTS, v: number) { setForm(f => ({ ...f, [k]: v })); }

  function addVertex(p: Point2D) { setForm(f => ({ ...f, vertices: [...f.vertices, p] })); setResult(null); setPotentialResult(null); }
  function moveVertex(i: number, p: Point2D) { setForm(f => ({ ...f, vertices: f.vertices.map((v, j) => j === i ? p : v) })); }
  function removeVertex(i: number) { setForm(f => ({ ...f, vertices: f.vertices.filter((_, j) => j !== i) })); setResult(null); setPotentialResult(null); }
  function addRod(p: Point2D) { setForm(f => ({ ...f, rods: [...f.rods, p] })); setResult(null); setPotentialResult(null); }
  function removeRod(i: number) { setForm(f => ({ ...f, rods: f.rods.filter((_, j) => j !== i) })); setResult(null); setPotentialResult(null); }
  function resetShape() { setForm(f => ({ ...f, vertices: DEFAULTS.vertices, rods: DEFAULTS.rods })); setResult(null); setPotentialResult(null); }

  async function calculate() {
    if (form.vertices.length < MIN_VERTICES) { setError(`Se necesitan al menos ${MIN_VERTICES} vértices.`); return; }
    setLoading(true); setError(''); setPotentialResult(null);
    try {
      const res = await api.grid.freeform({
        vertices: form.vertices, rods: form.rods, rodLength: form.rodLength,
        rho: form.rho, depth: form.profundidad, iFalla: form.iFalla,
      });
      setResult(res);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error de conexión'); }
    finally { setLoading(false); }
  }

  async function computePotentialMap() {
    if (!result) return;
    setPotentialLoading(true);
    try {
      const segments = polygonSegments(form.vertices);
      const r = await api.grid.potentialMap({
        segments, current: form.iFalla, rho: form.rho, depth: form.profundidad, gpr: result.gpr,
      });
      setPotentialResult(r);
    } catch { /* silent — complemento visual */ }
    finally { setPotentialLoading(false); }
  }

  const rg1 = result ? result.Rg <= 1 : false;
  const rg5 = result ? result.Rg <= 5 : false;
  const profileCheck = result ? evaluateRgCompliance(result.Rg, profile, relaxedConditionsMet) : null;

  return (
    <div style={calcLayout}>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Malla de geometría libre</h2>
          <p style={{ fontSize: 10, color: 'var(--faint)', lineHeight: 1.5 }}>
            Para predios de forma irregular donde las 6 topologías paramétricas no calzan — dibuja el perímetro real
            de la malla y ubica las picas donde correspondan. Misma fórmula de Sverak ya validada, alimentada con el
            área y perímetro reales del polígono en vez de largo × ancho.
          </p>
        </div>

        <div style={panelStyle}>
          <SectionLabel>Suelo y conductor</SectionLabel>
          <NormativeProfileSelector />
          <Field label="Resistividad del suelo ρ" unit="Ω·m">
            <input style={inputStyle} type="number" value={form.rho} onChange={e => set('rho', Number(e.target.value))} />
          </Field>
          <Field label="Profundidad de enterramiento" unit="m">
            <input style={inputStyle} type="number" step="0.1" value={form.profundidad} onChange={e => set('profundidad', Number(e.target.value))} />
          </Field>
          <Field label="Longitud de cada pica" unit="m">
            <input style={inputStyle} type="number" step="0.5" value={form.rodLength} onChange={e => set('rodLength', Number(e.target.value))} />
          </Field>
          <FaultCurrentField onSync={v => set('iFalla', v)} />
          <Field label="Tiempo de despeje" unit="s">
            <input style={inputStyle} type="number" step="0.1" value={form.tFalla} onChange={e => set('tFalla', Number(e.target.value))} />
          </Field>
        </div>

        <button onClick={calculate} disabled={loading || !faultAnalysis.result}
          style={{ padding: '10px 0', background: 'var(--copper)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: (loading || !faultAnalysis.result) ? .6 : 1 }}>
          {loading ? 'Calculando…' : 'Calcular (Sverak, polígono)'}
        </button>
        {error && <div style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</div>}
      </aside>

      <main style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={panelStyle}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            <button onClick={() => { setMode('vertex'); setShowPotential(false); }} style={{
              flex: 1, padding: '5px 4px', borderRadius: 3, cursor: 'pointer', fontSize: 9.5, fontWeight: 700,
              background: !showPotential && mode === 'vertex' ? 'var(--copper-soft)' : 'var(--bg)',
              border: `1px solid ${!showPotential && mode === 'vertex' ? 'var(--copper)' : 'var(--line)'}`,
              color: !showPotential && mode === 'vertex' ? 'var(--copper)' : 'var(--dim)',
            }}>✏ Vértices</button>
            <button onClick={() => { setMode('rod'); setShowPotential(false); }} style={{
              flex: 1, padding: '5px 4px', borderRadius: 3, cursor: 'pointer', fontSize: 9.5, fontWeight: 700,
              background: !showPotential && mode === 'rod' ? 'var(--copper-soft)' : 'var(--bg)',
              border: `1px solid ${!showPotential && mode === 'rod' ? 'var(--copper)' : 'var(--line)'}`,
              color: !showPotential && mode === 'rod' ? 'var(--copper)' : 'var(--dim)',
            }}>📍 Picas</button>
            <button
              onClick={() => { setShowPotential(true); if (!potentialResult) computePotentialMap(); }}
              disabled={!result}
              title={!result ? 'Calcula el sistema primero' : undefined}
              style={{
                flex: 1, padding: '5px 4px', borderRadius: 3, cursor: result ? 'pointer' : 'not-allowed', fontSize: 9.5, fontWeight: 700,
                background: showPotential ? 'var(--copper-soft)' : 'var(--bg)',
                border: `1px solid ${showPotential ? 'var(--copper)' : 'var(--line)'}`,
                color: showPotential ? 'var(--copper)' : 'var(--dim)', opacity: result ? 1 : 0.5,
              }}>🌡 Potencial</button>
            <button onClick={resetShape} title="Restablecer forma de ejemplo" style={{
              padding: '5px 10px', borderRadius: 3, cursor: 'pointer', fontSize: 9.5, fontWeight: 700,
              background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--faint)',
            }}>↺</button>
          </div>

          {showPotential ? (
            potentialLoading ? (
              <div style={{ padding: 30, textAlign: 'center', fontSize: 10, color: 'var(--faint)' }}>Calculando mapa de potencial…</div>
            ) : potentialResult ? (
              <PotentialHeatmap result={potentialResult} outline={form.vertices} />
            ) : (
              <div style={{ padding: 30, textAlign: 'center', fontSize: 10, color: 'var(--faint)' }}>Calcula el sistema para ver el mapa de potencial.</div>
            )
          ) : (
            <>
              <PolygonEditor
                vertices={form.vertices} rods={form.rods} mode={mode}
                onVertexAdd={addVertex} onVertexMove={moveVertex} onVertexRemove={removeVertex}
                onRodAdd={addRod} onRodRemove={removeRod}
              />
              <p style={{ fontSize: 8.5, color: 'var(--faint)', textAlign: 'center', marginTop: 6, lineHeight: 1.5 }}>
                {mode === 'vertex'
                  ? 'Clic para agregar un vértice · arrastra un vértice para moverlo · doble clic para eliminarlo (mínimo 3).'
                  : 'Clic para agregar una pica · doble clic sobre una pica para eliminarla.'}
                <br />{form.vertices.length} vértices · {form.rods.length} picas
              </p>
            </>
          )}
        </div>

        {result && (
          <>
            <CompBanner
              pass={rg1 || rg5}
              label={`Rg = ${result.Rg.toFixed(3)} Ω — ${rg5 ? 'cumple' : 'no cumple'} IEEE 80`}
              norm="Sverak (polígono arbitrario) — IEEE Std 80-2013 Cl. 14.2"
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              <StatCard label="Área del polígono" value={`${result.area.toFixed(1)} m²`} />
              <StatCard label="Perímetro" value={`${result.perimeter.toFixed(1)} m`} />
              <StatCard label="Resistencia Rg" value={`${result.Rg.toFixed(3)} Ω`} highlight />
              <StatCard label="Longitud total conductor" value={`${result.Ltotal.toFixed(1)} m`} />
              <StatCard label="GPR" value={`${(result.gpr / 1000).toFixed(2)} kV`} />
            </div>

            {profileCheck && (
              <div style={panelStyle}>
                <SectionLabel>Verificación normativa</SectionLabel>
                <ExpertItem type={rg1 || rg5 ? 'ok' : 'warn'}>
                  Rg ≤ 1 Ω (subestaciones críticas): {rg1 ? '✓ cumple' : '✗ no cumple'} · Rg ≤ 5 Ω (uso general): {rg5 ? '✓ cumple' : '✗ no cumple'}
                </ExpertItem>
                <ExpertItem type={profileCheck.rgGeneral ? 'ok' : 'warn'}>
                  Rg ≤ {effectiveRgGeneral(profile, relaxedConditionsMet)} Ω — {profile.label}{relaxedConditionsMet && profile.rgRelaxed !== undefined ? ' (relajado, declarado por el usuario)' : ''}: {profileCheck.rgGeneral ? '✓ cumple' : '✗ no cumple'} ({profile.standard})
                </ExpertItem>
              </div>
            )}

            <ExpertItem type="info">
              GPR = Rg × Ifalla = {result.Rg.toFixed(3)} × {form.iFalla} A = {result.gpr.toFixed(0)} V ({(result.gpr / 1000).toFixed(2)} kV).
              Este valor alimenta el cálculo de tensiones de paso y contacto.
            </ExpertItem>

            <FundBtn show={showFund} onToggle={() => setShowFund(f => !f)} label="Sverak — generalizado a polígono arbitrario">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)', marginBottom: 10, fontSize: 11 }}>
                A = |½ Σ(xᵢyᵢ₊₁ − xᵢ₊₁yᵢ)| &nbsp;·&nbsp; P = Σ|vᵢ₊₁ − vᵢ| &nbsp;·&nbsp; Rg = ρ·[1/Lt + (1/√(20A))·(1 + 1/(1+h√(20/A)))]
              </div>
              <p><strong style={{ color: 'var(--text)' }}>Variables:</strong> A y P se calculan por la fórmula del shoelace sobre el polígono dibujado (en vez de largo×ancho); Lt = P + (n picas × longitud de pica); h = profundidad de enterramiento.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Interpretación:</strong> Sverak solo necesita el área encerrada y la longitud total de conductor — nunca exigió una huella rectangular. Esta generalización produce exactamente el mismo Rg que el módulo de malla rectangular para el caso particular de un rectángulo sin conductores internos (validado en tests).</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Limitación:</strong> sigue siendo una aproximación empírica (no un solver de elementos finitos) — para huellas muy irregulares o con concavidades pronunciadas, verificar con un estudio numérico específico.</p>
            </FundBtn>
          </>
        )}
      </main>
    </div>
  );
}
