'use client';
import { useState, type ReactNode } from 'react';
import { panelStyle } from './CalcShared';

export interface ComplianceCheck {
  label: string;
  pass: boolean;
  detail: string;
}

export interface OptimizeStepLike { action: string; Rg: number }
export interface OptimizeResultLike {
  achieved: boolean;
  steps: OptimizeStepLike[];
  initialRg: number;
  finalRg: number;
}

function fmtMetric(v: number, unit: string) {
  return unit === 'Ω' ? `${v.toFixed(3)} Ω` : `${v.toFixed(3)}${unit ? ' ' + unit : ''}`;
}

function Semaforo({ pass }: { pass: boolean }) {
  return (
    <span style={{
      display: 'inline-block', width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
      background: pass ? 'var(--safe)' : 'var(--danger)',
      boxShadow: pass ? '0 0 5px var(--safe)' : '0 0 5px var(--danger)',
    }} />
  );
}

/**
 * Panel de asistencia técnica: semaforización de cumplimiento, diagnóstico de
 * por qué falla, revisión de calidad de las mediciones, y botón de
 * optimización iterativa del sistema (motor de reglas propio, sin API externa).
 */
export function DiagnosisPanel({
  checks,
  diagnosis,
  dataQuality,
  methodNote,
  onOptimize,
  optimizing,
  optimizeResult,
  onApplySuggested,
  targetLabel,
  metricUnit = 'Ω',
  buttonLabel,
}: {
  checks: ComplianceCheck[];
  diagnosis: string[];
  dataQuality: string[];
  methodNote?: ReactNode;
  onOptimize?: () => void;
  optimizing?: boolean;
  optimizeResult?: OptimizeResultLike | null;
  onApplySuggested?: () => void;
  targetLabel?: string;
  metricUnit?: string;
  buttonLabel?: string;
}) {
  const [showSteps, setShowSteps] = useState(true);
  const anyFail = checks.some(c => !c.pass);

  return (
    <div style={panelStyle}>
      <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>
        Interpretación técnica y cumplimiento
      </div>

      {/* Semaforización */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12 }}>
        {checks.map(c => (
          <div key={c.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ marginTop: 3 }}><Semaforo pass={c.pass} /></div>
            <div style={{ fontSize: 10.5, color: 'var(--dim)', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 700, color: c.pass ? 'var(--safe)' : 'var(--danger)' }}>{c.label}</span>
              {' — '}{c.detail}
            </div>
          </div>
        ))}
      </div>

      {/* Diagnóstico de incumplimiento */}
      {anyFail && diagnosis.length > 0 && (
        <div style={{
          background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 4,
          padding: '10px 12px', marginBottom: 12,
        }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
            ¿Por qué no cumple?
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 10.5, color: 'var(--dim)', lineHeight: 1.6 }}>
            {diagnosis.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      )}

      {/* Revisión de mediciones / calidad de datos */}
      {dataQuality.length > 0 && (
        <div style={{
          background: 'var(--warn-soft)', border: '1px solid var(--warn)', borderRadius: 4,
          padding: '10px 12px', marginBottom: 12,
        }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--warn)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
            Revisión de mediciones y parámetros
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 10.5, color: 'var(--dim)', lineHeight: 1.6 }}>
            {dataQuality.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      )}

      {methodNote && (
        <div style={{ fontSize: 10, color: 'var(--faint)', lineHeight: 1.6, marginBottom: 12 }}>
          {methodNote}
        </div>
      )}

      {/* Botón de optimización */}
      {onOptimize && (
        <>
          <button onClick={onOptimize} disabled={optimizing} style={{
            width: '100%', background: anyFail ? 'var(--copper)' : 'var(--panel)',
            border: anyFail ? 'none' : '1px solid var(--copper-soft)',
            color: anyFail ? '#fff' : 'var(--copper)',
            fontWeight: 700, fontSize: 10.5, padding: 9, borderRadius: 3,
            cursor: 'pointer', opacity: optimizing ? 0.6 : 1, marginBottom: 8,
          }}>
            {optimizing ? 'Optimizando…' : `⚙ ${buttonLabel ?? 'Optimizar sistema de puesta a tierra'}${targetLabel ? ` (${targetLabel})` : ''}`}
          </button>

          {optimizeResult && (
            <div style={{
              background: optimizeResult.achieved ? 'var(--safe-soft)' : 'var(--danger-soft)',
              border: `1px solid ${optimizeResult.achieved ? 'var(--safe)' : 'var(--danger)'}`,
              borderRadius: 4, padding: '10px 12px', marginBottom: 8,
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: 10.5, color: optimizeResult.achieved ? 'var(--safe)' : 'var(--danger)', fontWeight: 700, marginBottom: 6,
              }}>
                <span>
                  {optimizeResult.achieved
                    ? `✓ Objetivo alcanzado: ${fmtMetric(optimizeResult.initialRg, metricUnit)} → ${fmtMetric(optimizeResult.finalRg, metricUnit)}`
                    : `✗ No se alcanzó el objetivo dentro de límites físicos razonables (→ ${fmtMetric(optimizeResult.finalRg, metricUnit)})`}
                </span>
                {optimizeResult.steps.length > 0 && (
                  <button onClick={() => setShowSteps(s => !s)} style={{
                    background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 9,
                  }}>{showSteps ? 'ocultar pasos ▴' : 'ver pasos ▾'}</button>
                )}
              </div>
              {showSteps && optimizeResult.steps.length > 0 && (
                <ol style={{ margin: 0, paddingLeft: 16, fontSize: 10, color: 'var(--dim)', lineHeight: 1.7 }}>
                  {optimizeResult.steps.map((s, i) => (
                    <li key={i}>{s.action} → {fmtMetric(s.Rg, metricUnit)}</li>
                  ))}
                </ol>
              )}
              {optimizeResult.steps.length === 0 && (
                <div style={{ fontSize: 10, color: 'var(--dim)' }}>
                  El sistema ya se encontraba en el óptimo evaluado por el motor, o no existe margen de mejora dentro de los límites configurados.
                </div>
              )}
              {onApplySuggested && optimizeResult.steps.length > 0 && (
                <button onClick={onApplySuggested} style={{
                  marginTop: 8, width: '100%', background: 'var(--panel)',
                  border: '1px solid var(--copper-soft)', color: 'var(--copper)',
                  fontSize: 10, fontWeight: 700, padding: 7, borderRadius: 3, cursor: 'pointer',
                }}>
                  Aplicar parámetros sugeridos al formulario
                </button>
              )}
            </div>
          )}
          <div style={{ fontSize: 9, color: 'var(--faint)', lineHeight: 1.5 }}>
            La optimización es iterativa y editable: puedes volver a presionar el botón cuantas veces
            necesites tras ajustar manualmente cualquier parámetro, para revisar nuevamente el cumplimiento.
          </div>
        </>
      )}
    </div>
  );
}
