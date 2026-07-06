import PDFDocument from 'pdfkit';
import { Writable } from 'node:stream';

export {
  generateGridDxf, generateRodDxf, generateStripDxf, generateRadialDxf, generateRingDxf, generateCombinedDxf,
  type GridDxfInput, type RodDxfInput, type StripDxfInput, type RadialDxfInput, type RingDxfInput, type CombinedDxfInput,
  type DxfLayer, type ResumenRow,
} from './dxf.ts';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ReportMeta {
  projectName: string;
  projectCode?: string;
  company?: string;
  engineer?: string;
  /** Título profesional del proyectista (ej. "Ingeniero Civil Eléctrico"). */
  engineerTitle?: string;
  /** Registro/licencia profesional del proyectista (ej. "Licencia SEC Clase A N°12345"). */
  engineerLicense?: string;
  /**
   * Logo del proyectista/empresa como data URL (data:image/png;base64,... o
   * data:image/jpeg;base64,...). Se dibuja en el bloque de identificación del
   * proyectista en la portada — la portada misma (branding, disclaimer, normas,
   * fecha) es fija del sistema y no editable por el usuario.
   */
  logoDataUrl?: string;
  location?: string;
  date?: string;          // ISO string; defaults to today
  norm?: string;          // primary norm reference
}

export interface ReportSection {
  title: string;
  norm?: string;
  inputs: Array<{ label: string; value: string | number; unit?: string }>;
  results: Array<{ label: string; value: string | number; unit?: string; highlight?: boolean }>;
  pass?: boolean;
  passLabel?: string;
  observations?: string[];
}

export interface ReportOptions {
  meta: ReportMeta;
  sections: ReportSection[];
  stream: Writable;
}

// ─── Colours ──────────────────────────────────────────────────────────────────

const C = {
  bg:          '#0f1117',
  panel:       '#181c24',
  panelDark:   '#12151e',
  copper:      '#E07A23',
  copperSoft:  '#1e1508',
  text:        '#f2f4f7',
  dim:         '#9aa3b0',
  faint:       '#4b5563',
  safe:        '#22c55e',
  safeBg:      '#0d1a0d',
  danger:      '#ef4444',
  dangerBg:    '#1a0d0d',
  blue:        '#3b82f6',
  blueBg:      '#0d1220',
  line:        '#2a2f3e',
  white:       '#ffffff',
} as const;

function hex(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const PAGE   = { width: 595.28, height: 841.89 };
const MARGIN = 40;
const CONTENT = PAGE.width - MARGIN * 2;
const COL_W   = CONTENT / 2 - 6;

// ─── Text sanitisation ────────────────────────────────────────────────────────
// PDFKit's standard 14 fonts (Helvetica) only support WinAnsiEncoding (Windows-1252
// — Latin-1 plus Spanish accents, but NO Greek letters or most math operators).
// Content built elsewhere in the app freely uses Ω, ρ, π, √, Δ, α, ≤, ≥, ≈, etc.
// (electrical engineering notation), which corrupts not just the unsupported glyph
// but the rest of the string once WinAnsi's mapping fails. Every string reaching
// the PDF must be sanitised to a WinAnsi-safe equivalent first.
const UNSAFE_CHAR_MAP: Record<string, string> = {
  'Ω': 'Ohm', 'ρ': 'rho', 'π': 'pi', 'Δ': 'Delta', 'α': 'alpha', 'β': 'beta',
  'σ': 'sigma', 'Σ': 'Sigma', 'μ': 'u', 'λ': 'lambda', 'θ': 'theta', 'φ': 'phi', 'Φ': 'Phi',
  '√': 'sqrt', '≤': '<=', '≥': '>=', '≈': '~', '≫': '>>', '≪': '<<', '→': '->',
  '−': '-', '★': '*', '─': '-', '✓': 'OK', '✗': 'X',
};
const UNSAFE_CHARS_RE = new RegExp(Object.keys(UNSAFE_CHAR_MAP).join('|'), 'g');

/** Reemplaza símbolos griegos/matemáticos fuera de WinAnsi por su equivalente ASCII seguro. */
function safe(text: string): string {
  return text.replace(UNSAFE_CHARS_RE, (m) => UNSAFE_CHAR_MAP[m] ?? m);
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function fillRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, color: string) {
  doc.save().rect(x, y, w, h).fill(hex(color)).restore();
}

function strokeRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, color: string, lw = 0.5) {
  doc.save().rect(x, y, w, h).lineWidth(lw).strokeColor(hex(color)).stroke().restore();
}

function hRule(doc: PDFKit.PDFDocument, y: number, color: string = C.line, lw = 0.5) {
  doc.save().moveTo(MARGIN, y).lineTo(PAGE.width - MARGIN, y).lineWidth(lw).strokeColor(hex(color)).stroke().restore();
}

function lbl(doc: PDFKit.PDFDocument, x: number, y: number, text: string, size = 7, color: string = C.dim) {
  doc.fontSize(size).fillColor(hex(color)).font('Helvetica').text(safe(text), x, y, { lineBreak: false });
}

function val(doc: PDFKit.PDFDocument, x: number, y: number, text: string, size = 9, color: string = C.text, bold = false) {
  doc.fontSize(size).fillColor(hex(color)).font(bold ? 'Helvetica-Bold' : 'Helvetica').text(safe(text), x, y, { lineBreak: false });
}

// ─── Ground symbol ────────────────────────────────────────────────────────────

function drawGroundSymbol(doc: PDFKit.PDFDocument, sx: number, sy: number, scale = 1) {
  doc.save().strokeColor(hex(C.copper)).lineWidth(1.5 * scale)
    .moveTo(sx + 8 * scale, sy).lineTo(sx + 8 * scale, sy + 10 * scale)
    .moveTo(sx + 2 * scale, sy + 10 * scale).lineTo(sx + 14 * scale, sy + 10 * scale)
    .moveTo(sx + 4 * scale, sy + 14 * scale).lineTo(sx + 12 * scale, sy + 14 * scale)
    .moveTo(sx + 6 * scale, sy + 18 * scale).lineTo(sx + 10 * scale, sy + 18 * scale)
    .stroke().restore();
}

// ─── Header ───────────────────────────────────────────────────────────────────

function drawHeader(doc: PDFKit.PDFDocument, meta: ReportMeta, pageNum: number, totalPages: number) {
  fillRect(doc, 0, 0, PAGE.width, 58, C.bg);
  drawGroundSymbol(doc, MARGIN, 14);

  doc.fontSize(14).fillColor(hex(C.white)).font('Helvetica-Bold')
    .text('GroundDesign', MARGIN + 20, 16, { lineBreak: false })
    .fillColor(hex(C.copper))
    .text('Pro', MARGIN + 111, 16, { lineBreak: false });
  doc.fontSize(7).fillColor(hex(C.dim)).font('Helvetica')
    .text('Diseño de sistemas de puesta a tierra · IEEE Std 80/81', MARGIN + 20, 33, { lineBreak: false });

  // Project name in header (pages > 1)
  if (pageNum > 1) {
    doc.fontSize(7).fillColor(hex(C.faint))
      .text(safe(meta.projectName), PAGE.width / 2 - 80, 24, { lineBreak: false, width: 160, align: 'center' });
  }

  doc.fontSize(7).fillColor(hex(C.dim))
    .text(`Pág. ${pageNum} / ${totalPages}`, PAGE.width - MARGIN - 60, 24, { lineBreak: false });

  fillRect(doc, 0, 58, PAGE.width, 2, C.copper);
}

// ─── Project meta block ───────────────────────────────────────────────────────

function drawMeta(doc: PDFKit.PDFDocument, meta: ReportMeta): number {
  const y = 76;
  fillRect(doc, MARGIN, y, CONTENT, 56, C.panel);
  strokeRect(doc, MARGIN, y, CONTENT, 56, C.line);

  const date = meta.date
    ? new Date(meta.date).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });

  // Copper left accent
  fillRect(doc, MARGIN, y, 3, 56, C.copper);

  lbl(doc, MARGIN + 12, y + 8, 'PROYECTO', 6.5, C.faint);
  val(doc, MARGIN + 12, y + 18, meta.projectName, 12, C.white, true);

  lbl(doc, MARGIN + 320, y + 8, 'CÓDIGO', 6.5, C.faint);
  val(doc, MARGIN + 320, y + 18, meta.projectCode ?? '—', 10, C.copper, true);

  lbl(doc, MARGIN + 12, y + 36, 'EMPRESA / CONSULTOR', 6, C.faint);
  val(doc, MARGIN + 12, y + 45, meta.company ?? '—', 8, C.dim);

  lbl(doc, MARGIN + 190, y + 36, 'INGENIERO PE', 6, C.faint);
  val(doc, MARGIN + 190, y + 45, meta.engineer ?? '—', 8, C.dim);

  lbl(doc, MARGIN + 355, y + 36, 'FECHA', 6, C.faint);
  val(doc, MARGIN + 355, y + 45, date, 8, C.dim);

  return y + 56 + 14;
}

// ─── Cover page (bloqueada por el sistema) ────────────────────────────────────
// La portada es un entregable fijo de GroundDesign Pro: branding, título,
// disclaimer, normas aplicadas y fecha de emisión los define el sistema y no son
// editables por el usuario. Los únicos datos de origen del usuario son los del
// proyecto (nombre, código, ubicación) y el bloque de identificación del
// proyectista (nombre, título, licencia, empresa, logo) en su recuadro designado.

const SOFTWARE_VERSION = '1.0';

function decodeLogo(logoDataUrl?: string): Buffer | null {
  if (!logoDataUrl) return null;
  const m = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(logoDataUrl);
  if (!m) return null;
  try { return Buffer.from(m[2]!, 'base64'); } catch { return null; }
}

function formatDate(iso?: string): string {
  return (iso ? new Date(iso) : new Date())
    .toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Normas únicas aplicadas en el informe (para listarlas en la portada). */
function collectNorms(meta: ReportMeta, sections: ReportSection[]): string[] {
  const norms = new Set<string>();
  if (meta.norm) norms.add(meta.norm);
  for (const s of sections) if (s.norm) norms.add(s.norm);
  return [...norms];
}

function drawCoverPage(doc: PDFKit.PDFDocument, meta: ReportMeta, sections: ReportSection[], totalPages: number) {
  // ── Banda superior de branding del sistema (fija) ─────────────────────────
  fillRect(doc, 0, 0, PAGE.width, 118, C.bg);
  fillRect(doc, 0, 118, PAGE.width, 3, C.copper);
  drawGroundSymbol(doc, MARGIN, 24, 1.6);
  doc.fontSize(19).fillColor(hex(C.white)).font('Helvetica-Bold')
    .text('GroundDesign', MARGIN + 32, 24, { lineBreak: false })
    .fillColor(hex(C.copper))
    .text('Pro', MARGIN + 152, 24, { lineBreak: false });
  doc.fontSize(7.5).fillColor(hex(C.dim)).font('Helvetica')
    .text('Plataforma de diseño de sistemas de puesta a tierra · Motor de cálculo IEEE Std 80-2013 / 81-2012', MARGIN + 32, 47, { lineBreak: false });
  doc.fontSize(6.5).fillColor(hex(C.faint))
    .text(safe(`Documento oficial generado por GroundDesign Pro v${SOFTWARE_VERSION} — portada emitida por el sistema, no editable`), MARGIN + 32, 59, { lineBreak: false });
  doc.fontSize(7).fillColor(hex(C.dim))
    .text(safe(`Emitido: ${formatDate(meta.date)}`), PAGE.width - MARGIN - 150, 28, { width: 150, align: 'right', lineBreak: false })
    .text(`Pág. 1 / ${totalPages}`, PAGE.width - MARGIN - 150, 40, { width: 150, align: 'right', lineBreak: false });

  // ── Título del documento ──────────────────────────────────────────────────
  doc.fontSize(24).fillColor(hex(C.white)).font('Helvetica-Bold')
    .text('INFORME DE CÁLCULO', MARGIN, 78, { width: CONTENT, align: 'left', lineBreak: false });
  doc.fontSize(11).fillColor(hex(C.copper)).font('Helvetica')
    .text('MEMORIA DE CÁLCULO — SISTEMA DE PUESTA A TIERRA', MARGIN, 103, { lineBreak: false });

  // ── Datos del proyecto ────────────────────────────────────────────────────
  let y = 140;
  lbl(doc, MARGIN, y, 'DATOS DEL PROYECTO', 7, C.faint);
  y += 12;
  const entries: Array<[string, string]> = [
    ['PROYECTO',  meta.projectName],
    ['CÓDIGO',    meta.projectCode ?? '—'],
    ['UBICACIÓN', meta.location    ?? '—'],
    ['FECHA DE EMISIÓN', formatDate(meta.date)],
  ];
  fillRect(doc, MARGIN, y, CONTENT, entries.length * 20 + 8, C.panel);
  fillRect(doc, MARGIN, y, 3, entries.length * 20 + 8, C.copper);
  let ey = y + 6;
  for (const [k, v] of entries) {
    lbl(doc, MARGIN + 12, ey + 3, k, 6.5, C.faint);
    val(doc, MARGIN + 130, ey + 2, v, 9, k === 'PROYECTO' ? C.white : C.text, k === 'PROYECTO');
    ey += 20;
  }
  y = ey + 14;

  // ── Identificación del proyectista (datos + logo provistos por el usuario) ─
  lbl(doc, MARGIN, y, 'PROYECTISTA RESPONSABLE', 7, C.faint);
  y += 12;
  const bh = 74;
  fillRect(doc, MARGIN, y, CONTENT, bh, C.panelDark);
  strokeRect(doc, MARGIN, y, CONTENT, bh, C.line);

  const logo = decodeLogo(meta.logoDataUrl);
  const textX = logo ? MARGIN + 88 : MARGIN + 12;
  if (logo) {
    // Recuadro del logo — el dibujo se protege para que una imagen corrupta no
    // aborte el informe completo (se omite el logo y se sigue sin él).
    strokeRect(doc, MARGIN + 10, y + 10, 66, 54, C.line);
    try { doc.image(logo, MARGIN + 13, y + 13, { fit: [60, 48], align: 'center', valign: 'center' }); }
    catch { lbl(doc, MARGIN + 16, y + 34, 'logo inválido', 6, C.faint); }
  }
  val(doc, textX, y + 12, meta.engineer ?? '—', 11, C.white, true);
  lbl(doc, textX, y + 28, meta.engineerTitle ?? 'Proyectista eléctrico / especialista', 7.5, C.dim);
  if (meta.engineerLicense) lbl(doc, textX, y + 40, meta.engineerLicense, 7.5, C.copper);
  if (meta.company) lbl(doc, textX, y + 52, meta.company, 7, C.faint);

  // Recuadro de firma dentro del bloque de proyectista
  strokeRect(doc, PAGE.width - MARGIN - 130, y + 10, 120, 54, C.line);
  lbl(doc, PAGE.width - MARGIN - 124, y + 15, 'Firma / Sello profesional', 6, C.faint);
  y += bh + 14;

  // ── Normas aplicadas (recopiladas por el sistema desde los capítulos) ─────
  const norms = collectNorms(meta, sections).slice(0, 7);
  lbl(doc, MARGIN, y, 'NORMAS Y MÉTODOS APLICADOS EN ESTE INFORME', 7, C.faint);
  y += 12;
  fillRect(doc, MARGIN, y, CONTENT, norms.length * 14 + 10, C.panel);
  strokeRect(doc, MARGIN, y, CONTENT, norms.length * 14 + 10, C.line);
  let ny = y + 6;
  for (const n of norms) {
    fillRect(doc, MARGIN + 10, ny + 3, 3, 3, C.copper);
    lbl(doc, MARGIN + 20, ny, n, 7, C.dim);
    ny += 14;
  }
  y += norms.length * 14 + 10 + 14;

  // ── Resumen de cumplimiento normativo ─────────────────────────────────────
  const passSections = sections.filter(s => s.pass !== undefined);
  if (passSections.length) {
    // Altura disponible antes del pie fijo — se recorta la tabla si no cabe completa
    // (el detalle completo vive en la memoria de cálculo; el índice lista todo).
    const footTop = PAGE.height - 64;
    const maxRows = Math.max(0, Math.floor((footTop - y - 16 - 16 - 10) / 18));
    const rows = passSections.slice(0, maxRows);

    lbl(doc, MARGIN, y, 'RESUMEN DE CUMPLIMIENTO NORMATIVO', 7, C.faint);
    let rowY = y + 12;
    fillRect(doc, MARGIN, rowY, CONTENT, 16, C.bg);
    lbl(doc, MARGIN + 8,   rowY + 5, 'CAPÍTULO / CÁLCULO', 7, C.faint);
    lbl(doc, MARGIN + 280, rowY + 5, 'NORMA', 7, C.faint);
    lbl(doc, PAGE.width - MARGIN - 70, rowY + 5, 'RESULTADO', 7, C.faint);
    rowY += 16;
    for (let i = 0; i < rows.length; i++) {
      const sec = rows[i]!;
      fillRect(doc, MARGIN, rowY, CONTENT, 18, i % 2 === 0 ? C.panelDark : C.panel);
      doc.font('Helvetica').fontSize(7.5).fillColor(hex(C.text))
        .text(safe(sec.title), MARGIN + 8, rowY + 5, { lineBreak: false, width: 262, ellipsis: true });
      doc.font('Helvetica').fontSize(7).fillColor(hex(C.dim))
        .text(safe(sec.norm ?? '—'), MARGIN + 280, rowY + 5, { lineBreak: false, width: 170, ellipsis: true });
      const pColor = sec.pass ? C.safe : C.danger;
      fillRect(doc, PAGE.width - MARGIN - 80, rowY + 2, 80, 14, sec.pass ? C.safeBg : C.dangerBg);
      val(doc, PAGE.width - MARGIN - 75, rowY + 5, sec.pass ? '✓ CUMPLE' : '✗ NO CUMPLE', 7.5, pColor, true);
      rowY += 18;
    }
    strokeRect(doc, MARGIN, y + 12, CONTENT, rowY - y - 12, C.line);
    if (rows.length < passSections.length) {
      lbl(doc, MARGIN, rowY + 4, `… y ${passSections.length - rows.length} capítulos más — ver índice y memoria de cálculo`, 6.5, C.faint);
    }
  }

  // ── Pie fijo del sistema (bloqueado) ──────────────────────────────────────
  const fy = PAGE.height - 56;
  fillRect(doc, 0, fy, PAGE.width, 56, C.bg);
  fillRect(doc, 0, fy, PAGE.width, 1, C.copper);
  doc.fontSize(6.5).fillColor(hex(C.faint)).font('Helvetica')
    .text(safe(`Documento generado por GroundDesign Pro v${SOFTWARE_VERSION} el ${formatDate(meta.date)} · ${sections.length} capítulos de cálculo · grounddesign.pro`), MARGIN, fy + 10, { width: CONTENT, lineBreak: true })
    .text('Los resultados de este informe deben ser validados y firmados por un ingeniero eléctrico competente antes de cualquier uso en construcción real. El profesional responsable debe verificar que los parámetros de entrada correspondan a las condiciones reales del sitio.', MARGIN, fy + 22, { width: CONTENT, lineBreak: true });
}

// ─── Índice (tabla de contenidos con paginación real) ─────────────────────────

function drawTocPage(doc: PDFKit.PDFDocument, meta: ReportMeta, entries: Array<{ title: string; norm?: string; page: number }>, totalPages: number) {
  drawHeader(doc, meta, 2, totalPages);

  let y = 84;
  doc.fontSize(15).fillColor(hex(C.white)).font('Helvetica-Bold')
    .text('ÍNDICE', MARGIN, y, { lineBreak: false });
  fillRect(doc, MARGIN, y + 20, 40, 2, C.copper);
  y += 34;

  const rows: Array<{ title: string; norm?: string; page: number }> = [
    { title: 'Portada — Informe de cálculo', page: 1 },
    { title: 'Índice', page: 2 },
    ...entries,
  ];

  doc.font('Helvetica');
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const rowH = r.norm ? 26 : 18;
    if (y + rowH > PAGE.height - 46) break; // índice truncado con elegancia si hubiese decenas de capítulos
    fillRect(doc, MARGIN, y, CONTENT, rowH, i % 2 === 0 ? C.panelDark : C.panel);

    const numTxt = String(i + 1).padStart(2, '0');
    doc.fontSize(7.5).fillColor(hex(C.copper)).font('Helvetica-Bold')
      .text(numTxt, MARGIN + 8, y + 5, { lineBreak: false });
    const titleX = MARGIN + 30;
    const pageW = 34;
    const titleTxt = safe(r.title);
    doc.fontSize(8.5).fillColor(hex(C.text)).font('Helvetica')
      .text(titleTxt, titleX, y + 5, { lineBreak: false, width: CONTENT - 30 - pageW - 60, ellipsis: true });

    // Línea punteada conductora hasta el número de página
    const titleWidth = Math.min(doc.widthOfString(titleTxt), CONTENT - 30 - pageW - 60);
    const dotsStart = titleX + titleWidth + 6;
    const dotsEnd = PAGE.width - MARGIN - pageW - 8;
    if (dotsEnd > dotsStart) {
      doc.save().moveTo(dotsStart, y + 11).lineTo(dotsEnd, y + 11)
        .lineWidth(0.5).strokeColor(hex(C.faint)).dash(1, { space: 3 }).stroke().undash().restore();
    }
    doc.fontSize(8.5).fillColor(hex(C.copper)).font('Helvetica-Bold')
      .text(String(r.page), PAGE.width - MARGIN - pageW, y + 5, { width: pageW, align: 'right', lineBreak: false });

    if (r.norm) {
      doc.fontSize(6.5).fillColor(hex(C.faint)).font('Helvetica')
        .text(safe(r.norm), titleX, y + 16, { lineBreak: false, width: CONTENT - 30 - pageW - 60, ellipsis: true });
    }
    y += rowH;
  }

  strokeRect(doc, MARGIN, 118, CONTENT, y - 118, C.line);
  drawFooter(doc, meta, 2);
}

// ─── Section ──────────────────────────────────────────────────────────────────

function drawSection(doc: PDFKit.PDFDocument, sec: ReportSection, startY: number): number {
  let y = startY;

  // Section title bar
  fillRect(doc, MARGIN, y, CONTENT, 22, C.panel);
  fillRect(doc, MARGIN, y, 3, 22, C.copper);
  const safeTitle = safe(sec.title.toUpperCase());
  doc.font('Helvetica-Bold').fontSize(9).fillColor(hex(C.copper))
    .text(safeTitle, MARGIN + 12, y + 7, { lineBreak: false });
  if (sec.norm) {
    const titleW = doc.widthOfString(safeTitle);
    doc.font('Helvetica').fontSize(6.5).fillColor(hex(C.faint))
      .text(safe(sec.norm), MARGIN + 12 + titleW + 10, y + 8, { lineBreak: false });
  }
  y += 24;

  const inputsY  = y;
  const resultsY = y;

  // ── Column headers ────────────────────────────────────────────────────────
  lbl(doc, MARGIN, inputsY, 'PARÁMETROS DE ENTRADA', 6.5, C.faint);
  lbl(doc, MARGIN + COL_W + 12, resultsY, 'RESULTADOS DE CÁLCULO', 6.5, C.faint);
  hRule(doc, inputsY + 11, C.line, 0.3);
  hRule(doc, inputsY + 11, C.line, 0.3);
  y += 13;

  // ── Inputs column ────────────────────────────────────────────────────────
  let iy = y;
  for (let i = 0; i < sec.inputs.length; i++) {
    const inp = sec.inputs[i]!;
    const bg  = i % 2 === 0 ? C.panelDark : C.panel;
    fillRect(doc, MARGIN, iy, COL_W, 17, bg);
    doc.font('Helvetica').fontSize(7.5).fillColor(hex(C.dim))
      .text(safe(inp.label), MARGIN + 7, iy + 5, { lineBreak: false, width: COL_W - 65 });
    const v = safe(`${inp.value}${inp.unit ? ' ' + inp.unit : ''}`);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(hex(C.text))
      .text(v, MARGIN + COL_W - 62, iy + 4, { lineBreak: false, width: 58, align: 'right' });
    doc.font('Helvetica');
    iy += 18;
  }
  strokeRect(doc, MARGIN, y, COL_W, iy - y, C.line);

  // ── Results column ────────────────────────────────────────────────────────
  const rx = MARGIN + COL_W + 12;
  let ry    = y;
  for (let i = 0; i < sec.results.length; i++) {
    const res    = sec.results[i]!;
    const bg     = res.highlight ? C.copperSoft : (i % 2 === 0 ? C.panelDark : C.panel);
    const vColor = res.highlight ? C.copper : C.text;
    fillRect(doc, rx, ry, COL_W, 17, bg);
    if (res.highlight) fillRect(doc, rx, ry, 2, 17, C.copper);
    doc.font('Helvetica').fontSize(7.5).fillColor(hex(C.dim))
      .text(safe(res.label), rx + 7, ry + 5, { lineBreak: false, width: COL_W - 65 });
    const v = safe(`${res.value}${res.unit ? ' ' + res.unit : ''}`);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(hex(vColor))
      .text(v, rx + COL_W - 62, ry + 4, { lineBreak: false, width: 58, align: 'right' });
    doc.font('Helvetica');
    ry += 18;
  }
  strokeRect(doc, rx, y, COL_W, ry - y, C.line);

  y = Math.max(iy, ry) + 6;

  // ── Compliance banner ────────────────────────────────────────────────────
  if (sec.pass !== undefined) {
    const bColor = sec.pass ? C.safe : C.danger;
    const bBg    = sec.pass ? C.safeBg : C.dangerBg;
    fillRect(doc, MARGIN, y, CONTENT, 18, bBg);
    fillRect(doc, MARGIN, y, 3, 18, bColor);
    const mark = sec.pass ? '✓' : '✗';
    const txt  = sec.passLabel ?? (sec.pass ? 'CUMPLE' : 'NO CUMPLE');
    doc.font('Helvetica-Bold').fontSize(8).fillColor(hex(bColor))
      .text(safe(`${mark}  ${txt}`), MARGIN + 12, y + 5, { lineBreak: false });
    y += 22;
  }

  // ── Observations ─────────────────────────────────────────────────────────
  // Height is measured per observation (they wrap to multiple lines) rather than
  // assumed single-line, so long paragraphs no longer overlap the next row.
  if (sec.observations?.length) {
    for (const obs of sec.observations) {
      const text = safe(`•  ${obs}`);
      doc.font('Helvetica').fontSize(7);
      const textH = doc.heightOfString(text, { width: CONTENT - 16 });
      const rowH = textH + 8;
      fillRect(doc, MARGIN, y, CONTENT, rowH, C.blueBg);
      fillRect(doc, MARGIN, y, 2, rowH, C.blue);
      doc.fillColor(hex(C.dim)).text(text, MARGIN + 10, y + 4, { width: CONTENT - 16 });
      y += rowH + 1;
    }
  }

  return y + 8;
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function drawFooter(doc: PDFKit.PDFDocument, meta: ReportMeta, pageNum: number) {
  const y = PAGE.height - 36;
  fillRect(doc, 0, y, PAGE.width, 36, C.bg);
  fillRect(doc, 0, y, PAGE.width, 1, C.line);

  doc.font('Helvetica').fontSize(6.5).fillColor(hex(C.faint))
    .text('GroundDesign Pro · Motor IEEE Std 80-2013 / 81-2012 · grounddesign.pro', MARGIN, y + 8, { lineBreak: false });
  if (meta.engineer) {
    doc.text(safe(`Ingeniero responsable: ${meta.engineer}`), MARGIN, y + 18, { lineBreak: false });
  }

  if (pageNum > 1) {
    strokeRect(doc, PAGE.width - MARGIN - 100, y + 4, 100, 26, C.line);
    lbl(doc, PAGE.width - MARGIN - 94, y + 8, 'Firma / Sello P.E.', 6, C.faint);
    lbl(doc, PAGE.width - MARGIN - 94, y + 19, 'Reg. Profesional:', 5.5, C.faint);
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateReport(opts: ReportOptions): void {
  const { meta, sections, stream } = opts;

  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });
  doc.pipe(stream);

  // Observations wrap to multiple lines, so their height must be measured against the
  // real font metrics (doc.heightOfString) rather than assumed as a fixed single line —
  // otherwise pagination under-estimates section height and rows overflow past the page.
  const observationsHeight = (obs?: string[]) => {
    if (!obs?.length) return 0;
    doc.font('Helvetica').fontSize(7);
    return obs.reduce((sum, o) => sum + doc.heightOfString(safe(`•  ${o}`), { width: CONTENT - 16 }) + 8 + 1, 0);
  };
  // Debe reflejar exactamente lo que dibuja drawSection (incluido el +6 tras las
  // columnas): el índice publica números de página, así que la pre-pasada de
  // paginación no puede divergir ni un punto del dibujo real.
  const sectionHeight = (sec: ReportSection) =>
    24 + 13 + Math.max(sec.inputs.length, sec.results.length) * 18 + 6 +
    (sec.pass !== undefined ? 22 : 0) +
    observationsHeight(sec.observations) + 8;

  // ── Pre-pasada de paginación ─────────────────────────────────────────────
  // Página 1 = portada, página 2 = índice, capítulos desde la página 3. Replica
  // la misma acumulación del loop de dibujo para asignar página a cada capítulo.
  const START_Y = 76 + 16;             // y inicial tras el encabezado de página de cálculo
  const LIMIT_Y = PAGE.height - 46;    // límite inferior antes de saltar de página
  const sectionPages: number[] = [];
  {
    let page = 3, y = START_Y;
    for (const sec of sections) {
      const h = sectionHeight(sec);
      if (y + h > LIMIT_Y && y > START_Y) { page++; y = START_Y; }
      sectionPages.push(page);
      y += h;
    }
  }
  const totalPages = sectionPages.length ? sectionPages[sectionPages.length - 1]! : 3;

  // ── Portada (página 1, bloqueada por el sistema) ─────────────────────────
  doc.addPage();
  drawCoverPage(doc, meta, sections, totalPages);

  // ── Índice (página 2) ────────────────────────────────────────────────────
  doc.addPage();
  drawTocPage(
    doc, meta,
    sections.map((s, i) => ({ title: s.title, ...(s.norm !== undefined ? { norm: s.norm } : {}), page: sectionPages[i]! })),
    totalPages,
  );

  // ── Páginas de cálculo (desde la página 3) ───────────────────────────────
  let pageNum = 2;
  let y = 0;

  function newPage() {
    pageNum++;
    doc.addPage();
    drawHeader(doc, meta, pageNum, totalPages);
    y = 76;
    // Section subtitle
    lbl(doc, MARGIN, y, 'MEMORIA DE CÁLCULO', 7, C.faint);
    hRule(doc, y + 11, C.line, 0.3);
    y += 16;
  }

  newPage();

  for (const sec of sections) {
    const h = sectionHeight(sec);
    if (y + h > LIMIT_Y && y > START_Y) newPage();
    y = drawSection(doc, sec, y);
    drawFooter(doc, meta, pageNum);
  }

  doc.end();
}

// ─── Convenience: buffer ─────────────────────────────────────────────────────

export function generateReportBuffer(opts: Omit<ReportOptions, 'stream'>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const sink = new Writable({
      write(chunk: Buffer, _enc: string, cb: () => void) { chunks.push(chunk); cb(); },
      final(cb: () => void) { resolve(Buffer.concat(chunks)); cb(); },
    });
    sink.on('error', reject);
    generateReport({ ...opts, stream: sink });
  });
}
