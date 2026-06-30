'use client';
import { useState } from 'react';
import { downloadReport, type ReportMeta } from '@/lib/api';

interface ExportBarProps {
  module: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  norm?: string;
  projectName?: string;
}

export function ExportBar({ module, inputs, outputs, norm, projectName }: ExportBarProps) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfOk, setPdfOk]           = useState(false);
  const [err, setErr]               = useState<string | null>(null);

  const MODULE_NAMES: Record<string, string> = {
    wenner: 'Resistividad Wenner', schlumberger: 'Resistividad Schlumberger',
    nlayer: 'Modelo N capas', grid: 'Resistencia de malla',
    conductor: 'Conductor IEEE 80', voltages: 'Tensiones paso/contacto', gel: 'Gel químico',
  };

  async function handlePdf() {
    setPdfLoading(true); setErr(null); setPdfOk(false);
    try {
      const meta: ReportMeta = {
        projectName: projectName ?? 'Sin proyecto',
        projectCode: `GDP-${module.toUpperCase()}-${new Date().toISOString().slice(0,10)}`,
        engineer: 'Ingeniero de proyecto',
      };
      await downloadReport(meta, [{ module, inputs, outputs, norm }]);
      setPdfOk(true);
      setTimeout(() => setPdfOk(false), 3000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al generar PDF');
    } finally { setPdfLoading(false); }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
      <button onClick={handlePdf} disabled={pdfLoading} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: `1px solid ${pdfOk ? 'var(--safe)' : 'var(--copper)'}`,
        borderRadius: 3, color: pdfOk ? 'var(--safe)' : 'var(--copper)',
        fontFamily: 'var(--font-mono)', fontSize: 10,
        padding: '6px 14px', cursor: 'pointer', opacity: pdfLoading ? 0.6 : 1,
        transition: 'border-color .2s, color .2s',
      }}>
        {pdfLoading ? '⏳ Generando…' : pdfOk ? '✓ Descargado' : '↓ Exportar PDF'}
      </button>

      <span style={{ fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>
        {MODULE_NAMES[module] ?? module} · {norm ?? 'IEEE'}
      </span>

      {err && <span style={{ fontSize: 9, color: 'var(--danger)' }}>{err}</span>}
    </div>
  );
}
