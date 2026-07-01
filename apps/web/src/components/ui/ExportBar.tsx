'use client';
import { useState } from 'react';
import { downloadReport, type ReportMeta } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { SaveToProjectModal } from './SaveToProjectModal';
import { useI18n } from '@/context/I18nContext';

interface ExportBarProps {
  module: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  norm?: string;
  projectName?: string;
}

const MODULE_NAMES_ES: Record<string, string> = {
  wenner: 'Resistividad Wenner', schlumberger: 'Resistividad Schlumberger',
  nlayer: 'Modelo N capas', grid: 'Resistencia de malla',
  conductor: 'Conductor IEEE 80', voltages: 'Tensiones paso/contacto',
  gel: 'Gel químico', gpr: 'Potencial de tierra GPR',
  lightning: 'Protección contra Rayos',
};
const MODULE_NAMES_EN: Record<string, string> = {
  wenner: 'Wenner Resistivity', schlumberger: 'Schlumberger Resistivity',
  nlayer: 'N-Layer Model', grid: 'Grid Resistance',
  conductor: 'Conductor IEEE 80', voltages: 'Step / Touch Voltages',
  gel: 'Chemical Ground Gel', gpr: 'Ground Potential Rise',
  lightning: 'Lightning Protection',
};

export function ExportBar({ module, inputs, outputs, norm, projectName }: ExportBarProps) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfOk,      setPdfOk]      = useState(false);
  const [showSave,   setShowSave]   = useState(false);
  const [savedTo,    setSavedTo]    = useState<string | null>(null);
  const toast  = useToast();
  const { t, locale } = useI18n();
  const MODULE_NAMES = locale === 'en' ? MODULE_NAMES_EN : MODULE_NAMES_ES;

  async function handlePdf() {
    setPdfLoading(true); setPdfOk(false);
    try {
      const meta: ReportMeta = {
        projectName: projectName ?? savedTo ?? 'Sin proyecto',
        projectCode: `GDP-${module.toUpperCase()}-${new Date().toISOString().slice(0, 10)}`,
        engineer: 'Ingeniero de proyecto',
      };
      await downloadReport(meta, [{ module, inputs, outputs, norm }]);
      setPdfOk(true);
      toast.success(`PDF "${MODULE_NAMES[module] ?? module}" generado y descargado`);
      setTimeout(() => setPdfOk(false), 3000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al generar PDF');
    } finally { setPdfLoading(false); }
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={handlePdf} disabled={pdfLoading} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: `1px solid ${pdfOk ? 'var(--safe)' : 'var(--copper)'}`,
          borderRadius: 3, color: pdfOk ? 'var(--safe)' : 'var(--copper)',
          fontFamily: 'var(--font-mono)', fontSize: 10,
          padding: '6px 14px', cursor: 'pointer', opacity: pdfLoading ? 0.6 : 1,
          transition: 'border-color .2s, color .2s',
        }}>
          {pdfLoading ? t('generating') : pdfOk ? t('downloaded') : t('exportPdf')}
        </button>

        <button onClick={() => setShowSave(true)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: savedTo ? 'var(--copper-soft)' : 'none',
          border: `1px solid ${savedTo ? 'var(--copper)' : 'var(--line)'}`,
          borderRadius: 3, color: savedTo ? 'var(--copper)' : 'var(--dim)',
          fontFamily: 'var(--font-mono)', fontSize: 10,
          padding: '6px 14px', cursor: 'pointer',
          transition: 'border-color .2s, color .2s, background .2s',
        }}>
          {savedTo ? `✓ Guardado en "${savedTo}"` : '💾 Guardar en proyecto'}
        </button>

        <span style={{ fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>
          {MODULE_NAMES[module] ?? module} · {norm ?? 'IEEE'}
        </span>
      </div>

      {showSave && (
        <SaveToProjectModal
          module={module}
          inputs={inputs}
          outputs={outputs}
          norm={norm}
          onClose={() => setShowSave(false)}
          onSaved={(_id, name) => setSavedTo(name)}
        />
      )}
    </>
  );
}
