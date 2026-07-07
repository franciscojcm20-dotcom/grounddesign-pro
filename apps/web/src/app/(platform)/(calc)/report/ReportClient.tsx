'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  downloadValorizacionPdf, api, fetchReportBlob,
  downloadGridDxf, downloadRodDxf, downloadStripDxf, downloadRadialDxf, downloadRingDxf, downloadCombinedDxf,
  type ReportMeta, type ReportSectionInput, type CubicacionInput, type PreciosUnitariosCLP, type ValorizacionResult,
} from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useSoilModel } from '@/context/SoilModelContext';
import { useFaultAnalysis } from '@/context/FaultAnalysisContext';
import { useI18n } from '@/context/I18nContext';
import { useNormativeProfile } from '@/context/NormativeProfileContext';
import { SectionLabel, StatCard, CompBanner, panelStyle, calcLayout, Field, inputStyle, Th, TdMono } from '@/components/ui/CalcShared';
import { API_BASE as BASE } from '@/lib/apiBase';

const GEOMETRY_MODULES = new Set(['grid', 'rod', 'strip', 'radial', 'ring', 'combined']);

/** Deriva una cubicación inicial (editable) a partir del resultado guardado de un módulo de malla. */
function deriveCubicacion(module: string, inputs: Record<string, unknown>, outputs: Record<string, unknown>): CubicacionInput {
  const num = (v: unknown, d = 0) => typeof v === 'number' ? v : d;
  let conductorMetros = 0, varillasCantidad = 0, varillaLongitudM = 0;

  if (module === 'grid') {
    conductorMetros = num(outputs['Ltotal']);
    varillasCantidad = num(inputs['nVarillas']);
    varillaLongitudM = num(inputs['longVarilla']);
  } else if (module === 'rod') {
    varillasCantidad = num(inputs['n']);
    varillaLongitudM = num(inputs['L']);
    conductorMetros = varillasCantidad * varillaLongitudM;
  } else if (module === 'strip') {
    conductorMetros = num(inputs['L']);
  } else if (module === 'radial') {
    conductorMetros = num(outputs['Ltotal']) || num(inputs['n']) * num(inputs['L']);
  } else if (module === 'ring') {
    conductorMetros = num(inputs['perimeter']);
  } else if (module === 'combined') {
    conductorMetros = num(inputs['Ltotal']);
    varillasCantidad = num(inputs['nRods']);
    varillaLongitudM = num(inputs['rodLength']);
  }

  const conectoresCantidad = varillasCantidad + Math.max(1, Math.ceil(conductorMetros / 20));
  const gelActivo = Boolean((outputs['gelInfo'] as { activo?: boolean } | null)?.activo);

  return {
    conductorMetros: Math.round(conductorMetros * 10) / 10,
    conductorSeccionMm2: 67.4, // 2/0 AWG por defecto — editable
    varillasCantidad, varillaLongitudM,
    conectoresCantidad, gelActivo,
    gelKg: gelActivo ? Math.round(conductorMetros * 0.5 * 10) / 10 : 0,
    zanjaM3: Math.round(conductorMetros * 0.3 * 0.6 * 10) / 10,
  };
}

interface Project { id: string; name: string; description?: string; created_at: string; updated_at: string }
interface CalcResult { id: string; module: string; inputs: Record<string, unknown>; outputs: Record<string, unknown>; norm?: string; created_at: string }

const MODULE_META: Record<string, { label: string; icon: string; group: string }> = {
  field:        { label: 'Mediciones de Campo',        icon: '🌐', group: 'Suelo' },
  schlumberger: { label: 'Resistividad Schlumberger',   icon: '📡', group: 'Suelo' },
  wenner:       { label: 'Resistividad Wenner',          icon: '〰', group: 'Suelo' },
  nlayer:       { label: 'Modelo N capas',               icon: '🌍', group: 'Suelo' },
  grid:         { label: 'Malla rectangular (Sverak)',   icon: '⬡', group: 'Malla' },
  rod:          { label: 'Electrodos verticales (picas)',icon: '⬇', group: 'Malla' },
  strip:        { label: 'Conductor horizontal',         icon: '─', group: 'Malla' },
  radial:       { label: 'Sistema radial / estrella',    icon: '✦', group: 'Malla' },
  ring:         { label: 'Anillo perimetral',            icon: '◯', group: 'Malla' },
  combined:     { label: 'Malla + picas combinada (Schwarz)', icon: '⊞', group: 'Malla' },
  gel:          { label: 'Aditivo gel químico',          icon: '🧪', group: 'Malla' },
  conductor:    { label: 'Conductor IEEE 80',            icon: '〰', group: 'Sistema' },
  voltages:     { label: 'Tensiones paso/contacto',      icon: '⚠', group: 'Sistema' },
  gpr:          { label: 'GPR — Potencial de tierra',    icon: '⏚', group: 'Sistema' },
};

const HEADLINE_KEYS = ['Rg', 'Rn', 'Rstar', 'Rring', 'Rc', 'Rh', 'Rtotal', 'rhoAvg', 'areaMm2'] as const;

/**
 * Orden lógico de ingeniería del informe — no el orden en que el profesional
 * fue guardando resultados en el proyecto: 1) criterio normativo aplicado,
 * 2) caracterización del suelo (se calcula justo después de las pruebas de
 * campo, no al final), 3) corriente de diseño, 4) todos los métodos de malla
 * evaluados, 5) conductor, 6) verificación de tensiones, 7) GPR, 8) juicio
 * técnico de cierre. Los capítulos con el mismo número mantienen su orden
 * relativo original (Array.prototype.sort es estable).
 */
const MODULE_ORDER: Record<string, number> = {
  normativeProfile: 0,
  field: 10, schlumberger: 11, wenner: 12, nlayer: 13, soilModel: 14,
  faultAnalysis: 20,
  gel: 29,
  grid: 30, rod: 31, strip: 32, radial: 33, ring: 34, combined: 35,
  conductor: 40,
  voltages: 41,
  gpr: 42,
  technicalJudgment: 90,
};

/** Etiqueta legible de un capítulo del informe, para la lista de selección de la previsualización. */
function sectionLabel(module: string): string {
  const synthetic: Record<string, string> = {
    normativeProfile: 'Perfil normativo aplicado al proyecto',
    soilModel: 'Modelo de suelo — VES (Schlumberger/Wenner)',
    faultAnalysis: 'Corriente de diseño — Motor de Análisis de Falla',
    technicalJudgment: 'Juicio Técnico y Responsabilidad Profesional',
  };
  return synthetic[module] ?? MODULE_META[module]?.label ?? module;
}

function summarize(outputs: Record<string, unknown>) {
  const compliance = outputs['compliance'] as Record<string, unknown> | undefined;
  let pass: boolean | null = null;
  if (compliance) {
    if ('rg1ohm' in compliance) pass = Boolean((compliance['rg1ohm'] as { pass?: boolean })?.pass) || Boolean((compliance['rg5ohm'] as { pass?: boolean })?.pass);
    else if ('rg1' in compliance) pass = Boolean(compliance['rg1']) || Boolean(compliance['rg5']);
    else if ('pass' in compliance) pass = Boolean(compliance['pass']);
    else if ('touch' in compliance) pass = Boolean((compliance['touch'] as { pass?: boolean })?.pass) && Boolean((compliance['step'] as { pass?: boolean })?.pass);
  }
  const headlineKey = HEADLINE_KEYS.find(k => typeof outputs[k] === 'number');
  const headline = headlineKey ? (outputs[headlineKey] as number) : null;
  const gpr = typeof outputs['gpr'] === 'number' ? outputs['gpr'] as number : null;
  const rhoUsado = typeof outputs['rhoUsado'] === 'number' ? outputs['rhoUsado'] as number : null;
  const gelInfo = outputs['gelInfo'] as { activo?: boolean } | null | undefined;
  return { pass, headlineKey, headline, gpr, rhoUsado, gelActivo: Boolean(gelInfo?.activo) };
}

/**
 * Sugiere el mejor sistema, entre los calculados, para el resumen comparativo: prioriza los
 * que cumplen el límite normativo y, entre ellos, el de menor resistencia de puesta a tierra
 * (más conservador). Si ninguno cumple, sugiere igualmente el de menor resistencia — pero
 * queda marcado como "revisar", nunca se oculta el incumplimiento. Es solo una sugerencia de
 * partida: la decisión final la fija el profesional con el selector "Elegir".
 */
function suggestBestId(results: CalcResult[]): string | null {
  const candidates = results
    .map(r => ({ id: r.id, s: summarize(r.outputs) }))
    .filter((x): x is { id: string; s: ReturnType<typeof summarize> & { headline: number } } => x.s.headline !== null);
  if (!candidates.length) return null;
  const compliant = candidates.filter(x => x.s.pass === true);
  const pool = compliant.length > 0 ? compliant : candidates;
  return pool.reduce((best, cur) => (cur.s.headline < best.s.headline ? cur : best)).id;
}

/**
 * Sugiere el sistema más económico entre los calculados — prioriza los que cumplen
 * el límite normativo (nunca el más barato a costa de no cumplir) y, entre ellos,
 * el de menor costo estimado. Es una sugerencia adicional e independiente de
 * suggestBestId (menor resistencia): el profesional puede ver ambas señales —
 * la más conservadora técnicamente y la más económica — antes de decidir.
 */
function suggestCheapestId(results: CalcResult[], costs: Record<string, number>): string | null {
  const candidates = results
    .map(r => ({ id: r.id, s: summarize(r.outputs), cost: costs[r.id] }))
    .filter((x): x is { id: string; s: ReturnType<typeof summarize>; cost: number } => typeof x.cost === 'number');
  if (!candidates.length) return null;
  const compliant = candidates.filter(x => x.s.pass === true);
  const pool = compliant.length > 0 ? compliant : candidates;
  return pool.reduce((best, cur) => (cur.cost < best.cost ? cur : best)).id;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

export function ReportClient() {
  const toast = useToast();
  const { user } = useAuth();
  const soilModel = useSoilModel();
  const faultAnalysis = useFaultAnalysis();
  const { t } = useI18n();
  const { profile: normativeProfile } = useNormativeProfile();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<CalcResult[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [view, setView] = useState<'consolidado' | 'valorizacion' | 'dxf'>('consolidado');

  // ── Previsualización del informe (modal con selección de capítulos) ──
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMeta, setPreviewMeta] = useState<ReportMeta | null>(null);
  const [previewSections, setPreviewSections] = useState<ReportSectionInput[]>([]);
  const [included, setIncluded] = useState<boolean[]>([]);
  const [previewStale, setPreviewStale] = useState(false);
  const [previewRefreshing, setPreviewRefreshing] = useState(false);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);

  // ── Cubicación y Valorización ──
  const [valResultId, setValResultId] = useState<string | null>(null);
  const [cubicacion, setCubicacion] = useState<CubicacionInput | null>(null);
  const [precios, setPrecios] = useState<PreciosUnitariosCLP | null>(null);
  const [valorizacion, setValorizacion] = useState<ValorizacionResult | null>(null);
  const [valLoading, setValLoading] = useState(false);
  const [valPdfLoading, setValPdfLoading] = useState(false);

  // ── Plano DXF ──
  const [dxfResultId, setDxfResultId] = useState<string | null>(null);
  const [dxfLoading, setDxfLoading] = useState(false);

  // ── Sistema elegido (fija cuál topología, entre las calculadas, es la oficial del proyecto) ──
  const [chosenId, setChosenId] = useState<string | null>(null);

  // ── Costo estimado por sistema, para comparar también económicamente ──
  const [comparisonCosts, setComparisonCosts] = useState<Record<string, number>>({});
  const [costsLoading, setCostsLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/v1/projects`, { credentials: 'include' });
      if (!res.ok) return;
      const body = await res.json() as { projects: Project[] };
      setProjects(body.projects);
      if (body.projects[0] && !selected) setSelected(body.projects[0].id);
    } catch { /* silent */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProject = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/v1/projects/${id}`, { credentials: 'include' });
      if (!res.ok) return;
      const body = await res.json() as { project: Project; results: CalcResult[] };
      setProject(body.project);
      setResults(body.results);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { if (selected) loadProject(selected); }, [selected, loadProject]);

  // Carga el sistema elegido (fijado) del proyecto activo — una topología, entre
  // las varias calculadas para comparar, marcada como la oficial del proyecto.
  useEffect(() => {
    setChosenId(project ? localStorage.getItem(`gdp-chosen-design:${project.id}`) : null);
  }, [project?.id]);

  const geometryResults = results.filter(r => GEOMETRY_MODULES.has(r.module));
  const dxfResults = results.filter(r => GEOMETRY_MODULES.has(r.module));
  const chosenValid = Boolean(chosenId) && geometryResults.some(r => r.id === chosenId);
  const needsChoice = geometryResults.length > 1 && !chosenValid;
  const suggestedId = geometryResults.length > 1 ? suggestBestId(geometryResults) : null;
  const cheapestId = geometryResults.length > 1 ? suggestCheapestId(geometryResults, comparisonCosts) : null;

  // Calcula automáticamente el costo estimado (precios de referencia por defecto) de cada
  // sistema calculado, para poder comparar también económicamente antes de elegir — no solo
  // por resistencia/cumplimiento. Se recalcula cuando cambia el conjunto de sistemas del
  // proyecto (por id, no por referencia de array, para no entrar en un loop de renders).
  const geometryIds = geometryResults.map(r => r.id).join(',');
  useEffect(() => {
    if (geometryResults.length < 2) { setComparisonCosts({}); return; }
    let cancelled = false;
    setCostsLoading(true);
    (async () => {
      try {
        const defaultPrecios = await api.valorizacion.preciosDefault();
        const entries = await Promise.all(geometryResults.map(async r => {
          try {
            const cub = deriveCubicacion(r.module, r.inputs, r.outputs);
            const v = await api.valorizacion.compute({ ...cub, precios: defaultPrecios });
            return [r.id, v.total] as const;
          } catch { return [r.id, undefined] as const; }
        }));
        if (cancelled) return;
        const map: Record<string, number> = {};
        for (const [id, total] of entries) if (total !== undefined) map[id] = total;
        setComparisonCosts(map);
      } finally { if (!cancelled) setCostsLoading(false); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometryIds]);

  function chooseDesign(id: string) {
    if (!project) return;
    setChosenId(id);
    localStorage.setItem(`gdp-chosen-design:${project.id}`, id);
    toast.success('Sistema fijado como diseño elegido del proyecto');
  }

  function selectValResult(id: string) {
    const r = results.find(x => x.id === id);
    if (!r) return;
    setValResultId(id);
    setCubicacion(deriveCubicacion(r.module, r.inputs, r.outputs));
    setValorizacion(null);
    if (!precios) api.valorizacion.preciosDefault().then(setPrecios).catch(() => {});
  }

  // Preselecciona el sistema fijado como elegido al entrar a Valorización o DXF,
  // para evitar generar esos entregables sobre una topología distinta a la oficial.
  useEffect(() => {
    if (!chosenValid || !chosenId) return;
    if (view === 'valorizacion' && !valResultId) selectValResult(chosenId);
    if (view === 'dxf' && !dxfResultId) setDxfResultId(chosenId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, chosenValid, chosenId]);

  async function computeVal() {
    if (!cubicacion || !precios) return;
    setValLoading(true);
    try {
      const r = await api.valorizacion.compute({ ...cubicacion, precios });
      setValorizacion(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al calcular la valorización');
    } finally { setValLoading(false); }
  }

  async function exportValorizacionPdf() {
    if (!project || !cubicacion || !precios || !valorizacion) return;
    setValPdfLoading(true);
    try {
      const meta: ReportMeta = {
        projectName: project.name,
        projectCode: `GDP-${project.id.slice(0, 8).toUpperCase()}-VAL`,
        engineer: 'Ingeniero de proyecto',
        location: project.description ?? undefined,
        norm: `${normativeProfile.label} — ${normativeProfile.standard}`,
      };
      await downloadValorizacionPdf(meta, cubicacion, precios, valorizacion);
      toast.success('Valorización económica exportada en PDF');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al generar el PDF');
    } finally { setValPdfLoading(false); }
  }

  async function exportDxf() {
    const r = results.find(x => x.id === dxfResultId);
    if (!r) return;
    setDxfLoading(true);
    try {
      const num = (v: unknown) => Number(v);
      /** Formatea un output numérico como texto; retorna '—' si no es un número válido. */
      const fmt = (v: unknown, decimals: number, suffix = ''): string => {
        const n = Number(v);
        return Number.isFinite(n) ? `${n.toFixed(decimals)}${suffix}` : '—';
      };
      const proyecto = project?.name, norm = r.norm;
      if (r.module === 'grid') {
        await downloadGridDxf({
          largo: num(r.inputs['largo']), ancho: num(r.inputs['ancho']),
          nConductoresL: num(r.inputs['nConductoresL']), nConductoresW: num(r.inputs['nConductoresW']),
          nVarillas: num(r.inputs['nVarillas']), longVarilla: num(r.inputs['longVarilla']), proyecto, norm,
          resultados: [
            { label: 'Rg (Sverak)', value: fmt(r.outputs['Rg'], 3, ' Ω') },
            { label: 'GPR', value: Number.isFinite(Number(r.outputs['gpr'])) ? `${(Number(r.outputs['gpr']) / 1000).toFixed(2)} kV` : '—' },
          ],
        });
      } else if (r.module === 'rod') {
        await downloadRodDxf({
          n: num(r.inputs['n']), L: num(r.inputs['L']), spacing: num(r.inputs['spacing']), proyecto, norm,
          resultados: [
            { label: 'Rn', value: fmt(r.outputs['Rn'], 3, ' Ω') },
            { label: 'GPR', value: Number.isFinite(Number(r.outputs['gpr'])) ? `${(Number(r.outputs['gpr']) / 1000).toFixed(2)} kV` : '—' },
          ],
        });
      } else if (r.module === 'strip') {
        await downloadStripDxf({
          L: num(r.inputs['L']), h: num(r.inputs['h']), proyecto, norm,
          resultados: [{ label: 'Rh', value: fmt(r.outputs['Rh'], 3, ' Ω') }],
        });
      } else if (r.module === 'radial') {
        await downloadRadialDxf({
          n: num(r.inputs['n']), L: num(r.inputs['L']), proyecto, norm,
          resultados: [{ label: 'R★', value: fmt(r.outputs['Rstar'], 3, ' Ω') }],
        });
      } else if (r.module === 'ring') {
        await downloadRingDxf({
          largo: num(r.inputs['largo']), ancho: num(r.inputs['ancho']), proyecto, norm,
          resultados: [{ label: 'Rring', value: fmt(r.outputs['Rring'], 3, ' Ω') }],
        });
      } else if (r.module === 'combined') {
        await downloadCombinedDxf({
          largo: num(r.inputs['largo']), ancho: num(r.inputs['ancho']),
          nConductoresL: num(r.inputs['nConductoresL']), nConductoresW: num(r.inputs['nConductoresW']),
          nRods: num(r.inputs['nRods']), rodLength: num(r.inputs['rodLength']), proyecto, norm,
          resultados: [
            { label: 'Rc (Schwarz)', value: fmt(r.outputs['Rc'], 3, ' Ω') },
            { label: 'Mejora vs malla sola', value: fmt(r.outputs['mejora'], 1, '%') },
          ],
        });
      }
      toast.success('Plano DXF generado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al generar el DXF');
    } finally { setDxfLoading(false); }
  }

  /**
   * Construye el payload completo del informe oficial: metadatos (incluida la
   * identificación del proyectista guardada en la cuenta) + todos los capítulos
   * evaluados, ordenados según la secuencia lógica de ingeniería (MODULE_ORDER)
   * en vez del orden en que se fueron guardando en el proyecto. Como se evalúan
   * varios métodos de malla para comparar, TODOS quedan disponibles como
   * capítulos exportables — por defecto solo el sistema elegido va marcado,
   * pero el profesional puede incluir los demás desde la previsualización.
   * Base común de la previsualización y la descarga.
   */
  function buildFullReport(): { meta: ReportMeta; sections: ReportSectionInput[]; defaultIncluded: boolean[] } | null {
    if (!project || results.length === 0) return null;
    const meta: ReportMeta = {
      projectName: project.name,
      projectCode: `GDP-${project.id.slice(0, 8).toUpperCase()}-${new Date().toISOString().slice(0, 10)}`,
      engineer: user?.name ?? 'Ingeniero de proyecto',
      ...(user?.designerTitle ? { engineerTitle: user.designerTitle } : {}),
      ...(user?.designerLicense ? { engineerLicense: user.designerLicense } : {}),
      ...(user?.designerCompany ? { company: user.designerCompany } : {}),
      ...(user?.designerLogo ? { logoDataUrl: user.designerLogo } : {}),
      ...(project.description ? { location: project.description } : {}),
      norm: `${normativeProfile.label} — ${normativeProfile.standard}`,
    };

    const chosenGeometryId = geometryResults.length <= 1 ? geometryResults[0]?.id : chosenId;
    const chosenResult = results.find(r => r.id === chosenGeometryId);
    const chosenLabel = chosenResult ? (MODULE_META[chosenResult.module]?.label ?? chosenResult.module) : '—';

    type Item = { section: ReportSectionInput; order: number; defaultInclude: boolean };
    const items: Item[] = [];

    items.push({
      order: MODULE_ORDER['normativeProfile']!, defaultInclude: true,
      section: {
        module: 'normativeProfile',
        inputs: {
          label: normativeProfile.label,
          standard: normativeProfile.standard,
          country: normativeProfile.country,
          rgCritical: normativeProfile.rgCritical,
          rgGeneral: normativeProfile.rgGeneral,
          ...(normativeProfile.touchVoltageMaxV ? { touchVoltageMaxV: normativeProfile.touchVoltageMaxV } : {}),
          notes: normativeProfile.notes,
        },
        outputs: {},
        norm: normativeProfile.standard,
      },
    });
    if (model) {
      items.push({
        order: MODULE_ORDER['soilModel']!, defaultInclude: true,
        section: {
          module: 'soilModel',
          inputs: {
            rho1: model.rho1, rho2: model.rho2, h: model.h, rhoUniform: model.rhoUniform, source: model.source,
            ...(model.validatedBy ? { validatedBy: model.validatedBy } : {}),
            schlumbergerReadings: soilModel.schlumbergerReadings,
            wennerReadings: soilModel.wennerReadings,
          },
          outputs: {},
          norm: 'IEEE Std 81-2012 Cl. 8',
        },
      });
    }
    if (faultAnalysis.result) {
      const fa = faultAnalysis.result;
      items.push({
        order: MODULE_ORDER['faultAnalysis']!, defaultInclude: true,
        section: {
          module: 'faultAnalysis',
          inputs: {
            If: fa.If, ifOrigin: fa.ifOrigin, shortCircuitModel: fa.shortCircuitModel,
            tFalla: fa.tFalla, xr: fa.xr, freq: fa.freq, Ta: fa.Ta, Df: fa.Df, Sf: fa.Sf, Ig: fa.Ig,
            splitMethod: fa.splitMethod, splitJustificacion: fa.splitJustificacion, confidence: fa.confidence,
          },
          outputs: {},
          norm: 'IEEE Std 80-2013 Cl. 15.9–15.10',
        },
      });
    }

    // Todos los resultados guardados quedan disponibles como capítulos — incluidas
    // las topologías de malla alternativas evaluadas para comparar. Por defecto solo
    // el sistema elegido y los capítulos no-geométricos quedan marcados para incluir.
    for (const r of results) {
      const isAltGeometry = GEOMETRY_MODULES.has(r.module) && r.id !== chosenGeometryId;
      items.push({
        order: MODULE_ORDER[r.module] ?? 50,
        defaultInclude: !isAltGeometry,
        section: { module: r.module, inputs: r.inputs, outputs: r.outputs, ...(r.norm !== undefined ? { norm: r.norm } : {}) },
      });
    }

    // Capítulo de cierre: juicio técnico de ingeniería + deslinde de responsabilidad
    // profesional — síntesis basada en el desarrollo teórico de los capítulos previos.
    items.push({
      order: MODULE_ORDER['technicalJudgment']!, defaultInclude: true,
      section: {
        module: 'technicalJudgment',
        inputs: {
          globalStatus: allPass ? 'cumple' : anyFail ? 'revisar' : 'parcial',
          chosenSystemLabel: chosenLabel,
          normativeLabel: normativeProfile.label,
          normativeStandard: normativeProfile.standard,
          verifiedCount: determinable.length,
          failedCount: determinable.filter(s => s.pass === false).length,
          engineerName: user?.name ?? null,
        },
        outputs: {},
      },
    });

    // sort() es estable (ES2019+) — capítulos con el mismo orden (ej. varias
    // topologías de malla) conservan su posición relativa original.
    items.sort((a, b) => a.order - b.order);
    return { meta, sections: items.map(i => i.section), defaultIncluded: items.map(i => i.defaultInclude) };
  }

  async function openPreview() {
    if (needsChoice) {
      toast.error('Hay más de un sistema de puesta a tierra calculado en este proyecto — fija cuál es el elegido antes de generar el informe.');
      return;
    }
    const full = buildFullReport();
    if (!full) return;
    setPdfLoading(true);
    try {
      const initialSections = full.sections.filter((_, i) => full.defaultIncluded[i]);
      const blob = await fetchReportBlob(full.meta, initialSections);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewMeta(full.meta);
      setPreviewSections(full.sections);
      setIncluded(full.defaultIncluded);
      setPreviewStale(false);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al generar la previsualización');
    } finally { setPdfLoading(false); }
  }

  /** Regenera la previsualización con los capítulos actualmente seleccionados. */
  async function refreshPreview() {
    if (!previewMeta) return;
    const chosen = previewSections.filter((_, i) => included[i]);
    if (chosen.length === 0) { toast.error('Selecciona al menos un capítulo para el informe.'); return; }
    setPreviewRefreshing(true);
    try {
      const blob = await fetchReportBlob(previewMeta, chosen);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
      setPreviewStale(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al actualizar la previsualización');
    } finally { setPreviewRefreshing(false); }
  }

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewMeta(null);
    setPreviewSections([]);
  }

  function downloadFromPreview() {
    if (!previewUrl || !previewMeta) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = `GDP-${previewMeta.projectCode ?? 'report'}.pdf`;
    a.click();
    toast.success('Informe PDF descargado');
  }

  function printFromPreview() {
    previewFrameRef.current?.contentWindow?.print();
  }

  const grouped = results.reduce<Record<string, CalcResult[]>>((acc, r) => {
    const group = MODULE_META[r.module]?.group ?? 'Otros';
    (acc[group] ??= []).push(r);
    return acc;
  }, {});

  const determinable = results.map(r => summarize(r.outputs)).filter(s => s.pass !== null);
  const allPass = determinable.length > 0 && determinable.every(s => s.pass);
  const anyFail = determinable.some(s => s.pass === false);

  const model = soilModel.model;

  return (
    <div style={calcLayout}>
      <aside style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', background: 'var(--panel)', padding: '18px 16px 40px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{t('moduleReport')}</h2>
        <p style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 14, lineHeight: 1.5 }}>
          {t('deliverablesSubtitle')}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
          {([
            { id: 'consolidado', icon: '📋', label: t('tabConsolidated') },
            { id: 'valorizacion', icon: '💰', label: t('tabValorization') },
            { id: 'dxf', icon: '📐', label: t('tabDxf') },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
                padding: '9px 12px', borderRadius: 3, cursor: 'pointer',
                background: view === tab.id ? 'var(--copper-soft)' : 'transparent',
                border: `1px solid ${view === tab.id ? 'var(--copper)' : 'var(--line)'}`,
                color: view === tab.id ? 'var(--copper)' : 'var(--dim)', fontSize: 11, fontWeight: view === tab.id ? 700 : 400,
              }}
            >
              <span>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        <SectionLabel>Proyecto</SectionLabel>
        {projects.length === 0 ? (
          <div style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 14, lineHeight: 1.5 }}>
            No tienes proyectos todavía. Ve a cualquier módulo de cálculo, presiona "Calcular" y usa "💾 Guardar en proyecto".
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '9px 12px', marginBottom: 4, borderRadius: 3,
                  background: selected === p.id ? 'var(--copper-soft)' : 'transparent',
                  border: `1px solid ${selected === p.id ? 'var(--copper)' : 'var(--line)'}`,
                  color: selected === p.id ? 'var(--copper)' : 'var(--dim)', cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: selected === p.id ? 700 : 400 }}>{p.name}</div>
                {p.description && <div style={{ fontSize: 9, color: 'var(--faint)', marginTop: 2 }}>{p.description}</div>}
              </button>
            ))}
          </div>
        )}

        <SectionLabel purple>Modelo de suelo activo</SectionLabel>
        {model ? (
          <div style={{ fontSize: 10, color: 'var(--dim)', lineHeight: 1.7, marginBottom: 14 }}>
            ρ1 = {model.rho1.toFixed(0)} Ω·m · ρ2 = {model.rho2.toFixed(0)} Ω·m<br />
            h ≈ {model.h}m · fuente: {model.source === 'schlumberger' ? 'Schlumberger ★' : 'Wenner'}
            {model.validatedBy && <><br />validado con {model.validatedBy.deltaPct.toFixed(1)}% de diferencia</>}
          </div>
        ) : (
          <div style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 14 }}>
            Sin modelo activo — ve a <Link href="/soil/field" style={{ color: 'var(--copper)' }}>Mediciones de Campo</Link>.
          </div>
        )}

        {view === 'consolidado' && (
          <>
            <button
              onClick={openPreview}
              disabled={pdfLoading || !project || results.length === 0 || needsChoice}
              style={{
                width: '100%', background: 'var(--copper)', border: 'none', color: '#fff',
                fontWeight: 700, fontSize: 11, padding: 10, borderRadius: 3, cursor: 'pointer',
                opacity: (pdfLoading || !project || results.length === 0 || needsChoice) ? 0.6 : 1,
              }}
            >
              {pdfLoading ? 'Generando…' : '👁 Previsualizar informe PDF'}
            </button>
            <div style={{ fontSize: 9, color: 'var(--faint)', marginTop: 6, lineHeight: 1.5 }}>
              Vista previa con portada oficial del sistema, índice profesional y selección de capítulos antes de descargar o imprimir.
            </div>
            {needsChoice && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 3, fontSize: 9.5, color: 'var(--danger)', lineHeight: 1.6 }}>
                Hay {geometryResults.length} sistemas de puesta a tierra calculados en este proyecto. Fija cuál es el elegido en el resumen (grupo "Malla") antes de generar el informe.
              </div>
            )}
          </>
        )}
      </aside>

      <section style={{ overflowY: 'auto', padding: '18px 24px 40px', background: 'var(--bg)' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--faint)', fontSize: 11 }}>
            Cargando proyecto…
          </div>
        ) : !project || results.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <div style={{ fontSize: 32 }}>📋</div>
            <div style={{ color: 'var(--faint)', fontSize: 11, textAlign: 'center', maxWidth: 320 }}>
              {projects.length === 0
                ? 'Aún no hay proyectos con cálculos guardados.'
                : 'Este proyecto no tiene cálculos guardados todavía. Guarda resultados desde cualquier módulo con "💾 Guardar en proyecto".'}
            </div>
          </div>
        ) : view === 'valorizacion' ? (
          <>
            <div style={{ marginBottom: 4 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700 }}>Cubicación y Valorización Económica</h1>
              <p style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>
                Entregable independiente del informe técnico — cubicación de materiales del sistema elegido y su costo estimado en CLP.
              </p>
            </div>

            {geometryResults.length === 0 ? (
              <div style={{ color: 'var(--faint)', fontSize: 11, marginTop: 20 }}>
                Este proyecto no tiene ningún diseño de malla/electrodos guardado todavía.
              </div>
            ) : (
              <>
                <SectionLabel>Sistema a valorizar</SectionLabel>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {geometryResults.map(r => (
                    <button
                      key={r.id}
                      onClick={() => selectValResult(r.id)}
                      style={{
                        padding: '7px 12px', borderRadius: 3, cursor: 'pointer', fontSize: 10.5,
                        background: valResultId === r.id ? 'var(--copper-soft)' : 'var(--panel)',
                        border: `1px solid ${valResultId === r.id ? 'var(--copper)' : 'var(--line)'}`,
                        color: valResultId === r.id ? 'var(--copper)' : 'var(--dim)',
                      }}
                    >
                      {MODULE_META[r.module]?.icon ?? '📄'} {MODULE_META[r.module]?.label ?? r.module}
                    </button>
                  ))}
                </div>

                {cubicacion && precios && (
                  <>
                    <div style={panelStyle}>
                      <SectionLabel>Cubicación (editable)</SectionLabel>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        <Field label="Conductor" unit="m">
                          <input style={inputStyle} type="number" value={cubicacion.conductorMetros}
                            onChange={e => setCubicacion(c => c && ({ ...c, conductorMetros: Number(e.target.value) }))} />
                        </Field>
                        <Field label="Sección" unit="mm²">
                          <input style={inputStyle} type="number" value={cubicacion.conductorSeccionMm2}
                            onChange={e => setCubicacion(c => c && ({ ...c, conductorSeccionMm2: Number(e.target.value) }))} />
                        </Field>
                        <Field label="Varillas" unit="un">
                          <input style={inputStyle} type="number" value={cubicacion.varillasCantidad}
                            onChange={e => setCubicacion(c => c && ({ ...c, varillasCantidad: Number(e.target.value) }))} />
                        </Field>
                        <Field label="Conectores" unit="un">
                          <input style={inputStyle} type="number" value={cubicacion.conectoresCantidad}
                            onChange={e => setCubicacion(c => c && ({ ...c, conectoresCantidad: Number(e.target.value) }))} />
                        </Field>
                        <Field label="Gel químico" unit="kg">
                          <input style={inputStyle} type="number" value={cubicacion.gelKg} disabled={!cubicacion.gelActivo}
                            onChange={e => setCubicacion(c => c && ({ ...c, gelKg: Number(e.target.value) }))} />
                        </Field>
                        <Field label="Excavación zanja" unit="m³">
                          <input style={inputStyle} type="number" value={cubicacion.zanjaM3}
                            onChange={e => setCubicacion(c => c && ({ ...c, zanjaM3: Number(e.target.value) }))} />
                        </Field>
                      </div>
                    </div>

                    <div style={panelStyle}>
                      <SectionLabel purple>Precios unitarios de referencia (CLP)</SectionLabel>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        <Field label="Conductor" unit="CLP/m·mm²">
                          <input style={inputStyle} type="number" value={precios.conductorPorMetroPorMm2}
                            onChange={e => setPrecios(p => p && ({ ...p, conductorPorMetroPorMm2: Number(e.target.value) }))} />
                        </Field>
                        <Field label="Varilla" unit="CLP/un">
                          <input style={inputStyle} type="number" value={precios.varillaPorUnidad}
                            onChange={e => setPrecios(p => p && ({ ...p, varillaPorUnidad: Number(e.target.value) }))} />
                        </Field>
                        <Field label="Conector" unit="CLP/un">
                          <input style={inputStyle} type="number" value={precios.conectorPorUnidad}
                            onChange={e => setPrecios(p => p && ({ ...p, conectorPorUnidad: Number(e.target.value) }))} />
                        </Field>
                        <Field label="Gel" unit="CLP/kg">
                          <input style={inputStyle} type="number" value={precios.gelPorKg}
                            onChange={e => setPrecios(p => p && ({ ...p, gelPorKg: Number(e.target.value) }))} />
                        </Field>
                        <Field label="Excavación" unit="CLP/m³">
                          <input style={inputStyle} type="number" value={precios.excavacionPorM3}
                            onChange={e => setPrecios(p => p && ({ ...p, excavacionPorM3: Number(e.target.value) }))} />
                        </Field>
                        <Field label="Mano de obra" unit="%">
                          <input style={inputStyle} type="number" value={precios.manoObraPct}
                            onChange={e => setPrecios(p => p && ({ ...p, manoObraPct: Number(e.target.value) }))} />
                        </Field>
                        <Field label="Imprevistos" unit="%">
                          <input style={inputStyle} type="number" value={precios.imprevistosPct}
                            onChange={e => setPrecios(p => p && ({ ...p, imprevistosPct: Number(e.target.value) }))} />
                        </Field>
                      </div>
                    </div>

                    <button onClick={computeVal} disabled={valLoading} style={{
                      background: 'var(--copper)', border: 'none', color: '#fff', fontWeight: 700,
                      fontSize: 11, padding: '9px 16px', borderRadius: 3, cursor: 'pointer', marginBottom: 16,
                      opacity: valLoading ? 0.6 : 1,
                    }}>
                      {valLoading ? 'Calculando…' : '💰 Calcular valorización'}
                    </button>

                    {valorizacion && (
                      <>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                          <StatCard label="Subtotal materiales" value={`$${Math.round(valorizacion.subtotalMateriales).toLocaleString('es-CL')}`} unit="" />
                          <StatCard label="Mano de obra" value={`$${Math.round(valorizacion.manoObra).toLocaleString('es-CL')}`} unit="" />
                          <StatCard label="TOTAL" value={`$${Math.round(valorizacion.total).toLocaleString('es-CL')}`} unit="CLP" primary />
                        </div>
                        <div style={panelStyle}>
                          <SectionLabel>Cubicación de materiales (BOQ)</SectionLabel>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr><Th>Ítem</Th><Th>Cant.</Th><Th>P. Unit.</Th><Th>Subtotal</Th></tr></thead>
                            <tbody>
                              {valorizacion.items.map(it => (
                                <tr key={it.item}>
                                  <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--line)', fontSize: 10, color: 'var(--dim)' }}>{it.item}</td>
                                  <TdMono>{it.cantidad} {it.unidad}</TdMono>
                                  <TdMono>${Math.round(it.precioUnitCLP).toLocaleString('es-CL')}</TdMono>
                                  <TdMono highlight>${Math.round(it.subtotalCLP).toLocaleString('es-CL')}</TdMono>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <button onClick={exportValorizacionPdf} disabled={valPdfLoading} style={{
                          background: 'var(--panel)', border: '1px solid var(--copper-soft)', color: 'var(--copper)',
                          fontWeight: 700, fontSize: 11, padding: '9px 16px', borderRadius: 3, cursor: 'pointer',
                          opacity: valPdfLoading ? 0.6 : 1,
                        }}>
                          {valPdfLoading ? 'Generando…' : '📄 Exportar valorización en PDF (portada + índice)'}
                        </button>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </>
        ) : view === 'dxf' ? (
          <>
            <div style={{ marginBottom: 4 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700 }}>Plano DXF (AutoCAD)</h1>
              <p style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>
                Exporta el plano del sistema de puesta a tierra en formato DXF, compatible con AutoCAD, DraftSight, LibreCAD y QCAD.
              </p>
            </div>
            {dxfResults.length === 0 ? (
              <div style={{ color: 'var(--faint)', fontSize: 11, marginTop: 20 }}>
                Este proyecto no tiene ningún diseño de malla/electrodos guardado todavía.
              </div>
            ) : (
              <>
                <SectionLabel>Sistema a exportar</SectionLabel>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {dxfResults.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setDxfResultId(r.id)}
                      style={{
                        padding: '7px 12px', borderRadius: 3, cursor: 'pointer', fontSize: 10.5,
                        background: dxfResultId === r.id ? 'var(--copper-soft)' : 'var(--panel)',
                        border: `1px solid ${dxfResultId === r.id ? 'var(--copper)' : 'var(--line)'}`,
                        color: dxfResultId === r.id ? 'var(--copper)' : 'var(--dim)',
                      }}
                    >
                      {MODULE_META[r.module]?.icon ?? '📄'} {MODULE_META[r.module]?.label ?? r.module} — {timeAgo(r.created_at)}
                    </button>
                  ))}
                </div>
                <button onClick={exportDxf} disabled={!dxfResultId || dxfLoading} style={{
                  background: 'var(--copper)', border: 'none', color: '#fff', fontWeight: 700,
                  fontSize: 11, padding: '9px 16px', borderRadius: 3, cursor: 'pointer',
                  opacity: (!dxfResultId || dxfLoading) ? 0.6 : 1,
                }}>
                  {dxfLoading ? 'Generando…' : '📐 Exportar plano DXF'}
                </button>
                <div style={{ fontSize: 9.5, color: 'var(--faint)', marginTop: 10, lineHeight: 1.6 }}>
                  Incluye capas separadas (conductor, varillas, cotas, texto) generadas directamente desde la geometría calculada — sin ningún servicio de CAD externo.
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div style={{ marginBottom: 4 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700 }}>{project.name}</h1>
              {project.description && <p style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>{project.description}</p>}
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--faint)', fontFamily: 'var(--font-mono)', marginBottom: 16 }}>
              {results.length} secciones guardadas · última actualización {timeAgo(project.updated_at)}
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <StatCard label="Secciones" value={String(results.length)} unit="" />
              <StatCard label="Verificadas" value={String(determinable.length)} unit="" />
              <StatCard label="Estado global" value={anyFail ? 'REVISAR' : allPass ? 'CUMPLE' : 'PARCIAL'} unit="" ok={allPass} />
            </div>

            {determinable.length > 0 && (
              <CompBanner
                pass={allPass}
                norm="Resumen consolidado — IEEE Std 80-2013 / 81-2012"
                msg={allPass
                  ? 'Todas las secciones verificables cumplen los límites normativos aplicables.'
                  : `${determinable.filter(s => s.pass === false).length} de ${determinable.length} secciones verificables no cumplen — revisar antes de emitir el informe final.`}
              />
            )}

            {['Suelo', 'Malla', 'Sistema', 'Otros'].filter(g => grouped[g]?.length).map(group => (
              <div key={group} style={{ marginBottom: 20 }}>
                <SectionLabel>{group}</SectionLabel>
                {group === 'Malla' && geometryResults.length > 1 ? (
                  <>
                    <div style={{ fontSize: 9.5, color: 'var(--faint)', marginBottom: 8, lineHeight: 1.5 }}>
                      Comparación de los {geometryResults.length} sistemas calculados para este proyecto
                      {suggestedId && <> — <strong style={{ color: 'var(--safe)' }}>★ sugerido</strong> el de menor resistencia entre los que cumplen la norma</>}
                      {cheapestId && <>, <strong style={{ color: 'var(--copper)' }}>💰 más económico</strong> el de menor costo estimado entre los que cumplen</>}.
                      Fija con &quot;Elegir&quot; cuál es el oficial para el informe.
                      {costsLoading && <span style={{ marginLeft: 6 }}>Calculando costos…</span>}
                    </div>
                    <div style={panelStyle}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <Th></Th>
                            <Th>Sistema</Th>
                            <Th>R (Ω)</Th>
                            <Th>GPR (kV)</Th>
                            <Th>ρ (Ω·m)</Th>
                            <Th>Conductor</Th>
                            <Th>Varillas</Th>
                            <Th>Costo est. (CLP)</Th>
                            <Th>Cumple</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {grouped[group]!.map(r => {
                            const meta = MODULE_META[r.module];
                            const s = summarize(r.outputs);
                            const isChosen = chosenValid && r.id === chosenId;
                            const isSuggested = r.id === suggestedId;
                            const isCheapest = r.id === cheapestId;
                            const cub = deriveCubicacion(r.module, r.inputs, r.outputs);
                            const cost = comparisonCosts[r.id];
                            return (
                              <tr key={r.id} style={{ background: isChosen ? 'var(--copper-soft)' : undefined }}>
                                <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--line)' }}>
                                  <label
                                    title="Fijar como sistema elegido del proyecto"
                                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                                  >
                                    <input type="radio" name="chosenDesign" checked={isChosen} onChange={() => chooseDesign(r.id)} />
                                  </label>
                                </td>
                                <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--line)', fontSize: 10.5, whiteSpace: 'nowrap' }}>
                                  {meta?.icon} {meta?.label ?? r.module}
                                  {isChosen && <span style={{ marginLeft: 6, fontSize: 8, color: 'var(--copper)', fontWeight: 700 }}>★ ELEGIDO</span>}
                                  {!isChosen && isSuggested && <span style={{ marginLeft: 6, fontSize: 8, color: 'var(--safe)', fontWeight: 700 }}>★ SUGERIDO</span>}
                                  {!isChosen && isCheapest && <span style={{ marginLeft: 6, fontSize: 8, color: 'var(--copper)', fontWeight: 700 }}>💰 ECONÓMICO</span>}
                                </td>
                                <TdMono highlight={isSuggested}>{s.headline !== null ? s.headline.toFixed(3) : '—'}</TdMono>
                                <TdMono>{s.gpr !== null ? (s.gpr / 1000).toFixed(2) : '—'}</TdMono>
                                <TdMono>{s.rhoUsado !== null ? s.rhoUsado.toFixed(0) : '—'}</TdMono>
                                <TdMono>{cub.conductorMetros ? `${cub.conductorMetros} m` : '—'}</TdMono>
                                <TdMono>{cub.varillasCantidad || '—'}</TdMono>
                                <TdMono highlight={isCheapest}>{cost !== undefined ? `$${Math.round(cost).toLocaleString('es-CL')}` : costsLoading ? '…' : '—'}</TdMono>
                                <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--line)' }}>
                                  {s.pass !== null && (
                                    <span style={{
                                      fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
                                      background: s.pass ? 'var(--safe-soft)' : 'var(--danger-soft)',
                                      color: s.pass ? 'var(--safe)' : 'var(--danger)',
                                    }}>
                                      {s.pass ? '✓ CUMPLE' : '✗ REVISAR'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <p style={{ fontSize: 8.5, color: 'var(--faint)', marginTop: 8, marginBottom: 0 }}>
                        Costo estimado con precios de referencia editables (ver pestaña &quot;Cubicación y Valorización&quot;) — no reemplaza una cotización real de proveedores.
                      </p>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {grouped[group]!.map(r => {
                      const meta = MODULE_META[r.module];
                      const s = summarize(r.outputs);
                      const isGeometry = GEOMETRY_MODULES.has(r.module);
                      const isChosen = isGeometry && chosenValid && r.id === chosenId;
                      return (
                        <div key={r.id} style={{
                          ...panelStyle, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 12,
                          border: isChosen ? '1px solid var(--copper)' : panelStyle.border,
                        }}>
                          <div style={{ fontSize: 18, flexShrink: 0 }}>{meta?.icon ?? '📄'}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11.5, fontWeight: 700 }}>{meta?.label ?? r.module}</div>
                            <div style={{ fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>
                              {r.norm ?? 'IEEE'} · {timeAgo(r.created_at)}
                              {s.rhoUsado !== null && ` · ρ=${s.rhoUsado.toFixed(0)} Ω·m${s.gelActivo ? ' (gel)' : ''}`}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            {s.headline !== null && (
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--copper)', fontFamily: 'var(--font-mono)' }}>
                                {s.headlineKey === 'areaMm2' ? `${s.headline.toFixed(1)} mm²` : `${s.headline.toFixed(3)} Ω`}
                              </div>
                            )}
                            {s.gpr !== null && (
                              <div style={{ fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>GPR {(s.gpr / 1000).toFixed(2)} kV</div>
                            )}
                          </div>
                          {s.pass !== null && (
                            <div style={{
                              fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 10, flexShrink: 0,
                              background: s.pass ? 'var(--safe-soft)' : 'var(--danger-soft)',
                              color: s.pass ? 'var(--safe)' : 'var(--danger)',
                            }}>
                              {s.pass ? '✓ CUMPLE' : '✗ REVISAR'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </section>

      {/* ── Modal de previsualización del informe ── */}
      {previewUrl && previewMeta && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.72)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            width: 'min(1200px, 96vw)', height: 'min(820px, 92vh)', background: 'var(--panel)',
            border: '1px solid var(--line)', borderRadius: 6, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Barra superior */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Vista previa del informe</div>
              <div style={{ fontSize: 9.5, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>{previewMeta.projectCode}</div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button onClick={downloadFromPreview} disabled={previewStale} title={previewStale ? 'Actualiza la vista previa antes de descargar' : undefined} style={{
                  background: 'var(--copper)', border: 'none', color: '#fff', fontWeight: 700,
                  fontSize: 10.5, padding: '7px 14px', borderRadius: 3, cursor: 'pointer', opacity: previewStale ? 0.5 : 1,
                }}>
                  ↓ Descargar PDF
                </button>
                <button onClick={printFromPreview} disabled={previewStale} title={previewStale ? 'Actualiza la vista previa antes de imprimir' : undefined} style={{
                  background: 'var(--panel)', border: '1px solid var(--copper)', color: 'var(--copper)', fontWeight: 700,
                  fontSize: 10.5, padding: '7px 14px', borderRadius: 3, cursor: 'pointer', opacity: previewStale ? 0.5 : 1,
                }}>
                  🖨 Imprimir
                </button>
                <button onClick={closePreview} style={{
                  background: 'none', border: '1px solid var(--line)', color: 'var(--dim)',
                  fontSize: 10.5, padding: '7px 12px', borderRadius: 3, cursor: 'pointer',
                }}>
                  ✕ Cerrar
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
              {/* Selección de capítulos */}
              <div style={{ width: 300, borderRight: '1px solid var(--line)', overflowY: 'auto', padding: '12px 14px', flexShrink: 0 }}>
                <div style={{ fontSize: 9.5, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
                  Capítulos del informe
                </div>
                <div style={{ fontSize: 9, color: 'var(--faint)', lineHeight: 1.5, marginBottom: 10 }}>
                  La portada y el índice siempre se incluyen y se regeneran según los capítulos seleccionados.
                </div>
                {previewSections.map((s, i) => (
                  <label key={i} style={{
                    display: 'flex', gap: 8, alignItems: 'flex-start', padding: '7px 8px', marginBottom: 4,
                    borderRadius: 3, border: '1px solid var(--line)', cursor: 'pointer',
                    background: included[i] ? 'var(--copper-soft)' : 'transparent',
                  }}>
                    <input
                      type="checkbox"
                      checked={included[i] ?? true}
                      onChange={e => {
                        setIncluded(arr => arr.map((v, j) => j === i ? e.target.checked : v));
                        setPreviewStale(true);
                      }}
                      style={{ marginTop: 2 }}
                    />
                    <span style={{ fontSize: 10, color: included[i] ? 'var(--text)' : 'var(--faint)', lineHeight: 1.4 }}>
                      {sectionLabel(s.module)}
                      {s.norm && <span style={{ display: 'block', fontSize: 8, color: 'var(--faint)', marginTop: 1 }}>{s.norm}</span>}
                    </span>
                  </label>
                ))}
                <button
                  onClick={refreshPreview}
                  disabled={previewRefreshing || !previewStale}
                  style={{
                    width: '100%', marginTop: 8, background: previewStale ? 'var(--copper)' : 'var(--panel)',
                    border: previewStale ? 'none' : '1px solid var(--line)',
                    color: previewStale ? '#fff' : 'var(--faint)', fontWeight: 700, fontSize: 10.5,
                    padding: 9, borderRadius: 3, cursor: 'pointer', opacity: previewRefreshing ? 0.6 : 1,
                  }}
                >
                  {previewRefreshing ? 'Actualizando…' : previewStale ? '↻ Actualizar vista previa' : 'Vista previa al día'}
                </button>
              </div>

              {/* Visor PDF */}
              <div style={{ flex: 1, background: '#333', position: 'relative' }}>
                <iframe
                  ref={previewFrameRef}
                  src={previewUrl}
                  title="Previsualización del informe PDF"
                  style={{ width: '100%', height: '100%', border: 'none', opacity: previewStale ? 0.35 : 1, transition: 'opacity .2s' }}
                />
                {previewStale && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
                  }}>
                    <div style={{ background: 'var(--panel)', border: '1px solid var(--copper)', borderRadius: 4, padding: '10px 18px', fontSize: 11, color: 'var(--copper)', fontWeight: 700 }}>
                      Selección modificada — presiona &quot;Actualizar vista previa&quot;
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
