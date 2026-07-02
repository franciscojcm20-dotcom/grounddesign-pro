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
  return [(n >> 16) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const PAGE   = { width: 595.28, height: 841.89 };
const MARGIN = 40;
const CONTENT = PAGE.width - MARGIN * 2;
const COL_W   = CONTENT / 2 - 6;

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
  doc.fontSize(size).fillColor(hex(color)).font('Helvetica').text(text, x, y, { lineBreak: false });
}

function val(doc: PDFKit.PDFDocument, x: number, y: number, text: string, size = 9, color: string = C.text, bold = false) {
  doc.fontSize(size).fillColor(hex(color)).font(bold ? 'Helvetica-Bold' : 'Helvetica').text(text, x, y, { lineBreak: false });
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
    .text('GroundDesing', MARGIN + 20, 16, { lineBreak: false })
    .fillColor(hex(C.copper))
    .text('Pro', MARGIN + 111, 16, { lineBreak: false });
  doc.fontSize(7).fillColor(hex(C.dim)).font('Helvetica')
    .text('Diseño de sistemas de puesta a tierra · IEEE Std 80/81', MARGIN + 20, 33, { lineBreak: false });

  // Project name in header (pages > 1)
  if (pageNum > 1) {
    doc.fontSize(7).fillColor(hex(C.faint))
      .text(meta.projectName, PAGE.width / 2 - 80, 24, { lineBreak: false, width: 160, align: 'center' });
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

// ─── Cover page ───────────────────────────────────────────────────────────────

function drawCoverPage(doc: PDFKit.PDFDocument, meta: ReportMeta, sections: ReportSection[], totalPages: number) {
  drawHeader(doc, meta, 1, totalPages);

  // Hero band
  fillRect(doc, 0, 60, PAGE.width, 220, C.panel);
  fillRect(doc, 0, 60, PAGE.width, 3, C.copper);

  // Large ground symbol
  drawGroundSymbol(doc, PAGE.width / 2 - 8, 82, 2.2);

  // Title
  doc.fontSize(22).fillColor(hex(C.white)).font('Helvetica-Bold')
    .text('INFORME DE CÁLCULO', MARGIN, 128, { width: CONTENT, align: 'center', lineBreak: false });
  doc.fontSize(11).fillColor(hex(C.copper)).font('Helvetica')
    .text('SISTEMA DE PUESTA A TIERRA', MARGIN, 158, { width: CONTENT, align: 'center', lineBreak: false });

  // Meta rows in hero
  const mid = 200;
  const entries = [
    ['PROYECTO', meta.projectName],
    ['CÓDIGO',   meta.projectCode ?? '—'],
    ['EMPRESA',  meta.company     ?? '—'],
    ['INGENIERO', meta.engineer   ?? '—'],
    ['UBICACIÓN', meta.location   ?? '—'],
    ['FECHA',     meta.date
      ? new Date(meta.date).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })],
    ['NORMA REF.', meta.norm ?? 'IEEE Std 80-2013 / 81-2012'],
  ];

  let ey = mid;
  for (const [k, v] of entries) {
    hRule(doc, ey, C.line);
    lbl(doc, MARGIN + 10, ey + 4, k as string, 6.5, C.faint);
    val(doc, MARGIN + 130, ey + 4, v as string, 8, C.text);
    ey += 18;
  }
  hRule(doc, ey, C.line);

  // Compliance summary table on cover
  const hasPasses = sections.some(s => s.pass !== undefined);
  if (hasPasses) {
    const tY = ey + 20;
    lbl(doc, MARGIN, tY, 'RESUMEN DE CUMPLIMIENTO NORMATIVO', 7, C.faint);
    let rowY = tY + 14;

    // Header row
    fillRect(doc, MARGIN, rowY, CONTENT, 16, C.bg);
    lbl(doc, MARGIN + 8,       rowY + 5, 'MÓDULO / CÁLCULO',     7, C.faint);
    lbl(doc, MARGIN + 260,     rowY + 5, 'NORMA',                7, C.faint);
    lbl(doc, PAGE.width - MARGIN - 70, rowY + 5, 'RESULTADO',    7, C.faint);
    rowY += 16;

    for (const sec of sections) {
      if (sec.pass === undefined) continue;
      const bg = rowY % 36 < 18 ? C.panelDark : C.panel;
      fillRect(doc, MARGIN, rowY, CONTENT, 18, bg);
      val(doc, MARGIN + 8,   rowY + 5, sec.title,         7.5, C.text);
      val(doc, MARGIN + 260, rowY + 5, sec.norm ?? '—',   7,   C.dim);

      const pColor = sec.pass ? C.safe : C.danger;
      const pBg    = sec.pass ? C.safeBg : C.dangerBg;
      const pTxt   = sec.pass ? '✓ CUMPLE' : '✗ NO CUMPLE';
      fillRect(doc, PAGE.width - MARGIN - 80, rowY + 2, 80, 14, pBg);
      val(doc, PAGE.width - MARGIN - 75, rowY + 5, pTxt, 7.5, pColor, true);
      rowY += 18;
    }
    strokeRect(doc, MARGIN, tY + 14, CONTENT, rowY - tY - 14, C.line);
  }

  // Footer disclaimer
  const fy = PAGE.height - 60;
  hRule(doc, fy, C.line);
  doc.fontSize(6.5).fillColor(hex(C.faint)).font('Helvetica')
    .text('Este informe fue generado con GroundDesing Pro. Los cálculos se basan en las normas IEEE Std 80-2013 e IEEE Std 81-2012.', MARGIN, fy + 8, { width: CONTENT, lineBreak: true })
    .text('El ingeniero responsable debe verificar que los parámetros de entrada correspondan a las condiciones reales del sitio.', MARGIN, fy + 18, { width: CONTENT, lineBreak: true });

  if (meta.engineer) {
    strokeRect(doc, PAGE.width - MARGIN - 110, fy + 4, 110, 32, C.line);
    lbl(doc, PAGE.width - MARGIN - 105, fy + 9, 'Firma / Sello P.E.', 6, C.faint);
    lbl(doc, PAGE.width - MARGIN - 105, fy + 22, meta.engineer, 6.5, C.dim);
  }
}

// ─── Section ──────────────────────────────────────────────────────────────────

function drawSection(doc: PDFKit.PDFDocument, sec: ReportSection, startY: number): number {
  let y = startY;

  // Section title bar
  fillRect(doc, MARGIN, y, CONTENT, 22, C.panel);
  fillRect(doc, MARGIN, y, 3, 22, C.copper);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(hex(C.copper))
    .text(sec.title.toUpperCase(), MARGIN + 12, y + 7, { lineBreak: false });
  if (sec.norm) {
    const titleW = doc.widthOfString(sec.title.toUpperCase());
    doc.font('Helvetica').fontSize(6.5).fillColor(hex(C.faint))
      .text(sec.norm, MARGIN + 12 + titleW + 10, y + 8, { lineBreak: false });
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
      .text(inp.label, MARGIN + 7, iy + 5, { lineBreak: false, width: COL_W - 65 });
    const v = `${inp.value}${inp.unit ? ' ' + inp.unit : ''}`;
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
      .text(res.label, rx + 7, ry + 5, { lineBreak: false, width: COL_W - 65 });
    const v = `${res.value}${res.unit ? ' ' + res.unit : ''}`;
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
      .text(`${mark}  ${txt}`, MARGIN + 12, y + 5, { lineBreak: false });
    y += 22;
  }

  // ── Observations ─────────────────────────────────────────────────────────
  if (sec.observations?.length) {
    for (const obs of sec.observations) {
      fillRect(doc, MARGIN, y, CONTENT, 14, C.blueBg);
      fillRect(doc, MARGIN, y, 2, 14, C.blue);
      doc.font('Helvetica').fontSize(7).fillColor(hex(C.dim))
        .text(`•  ${obs}`, MARGIN + 10, y + 4, { lineBreak: false, width: CONTENT - 16 });
      y += 15;
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
    .text('GroundDesing Pro · Motor IEEE Std 80-2013 / 81-2012 · grounddesing.pro', MARGIN, y + 8, { lineBreak: false });
  if (meta.engineer) {
    doc.text(`Ingeniero responsable: ${meta.engineer}`, MARGIN, y + 18, { lineBreak: false });
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

  const bodyHeight = PAGE.height - 80 - 40;
  const sectionHeight = (sec: ReportSection) =>
    24 + 13 + Math.max(sec.inputs.length, sec.results.length) * 18 +
    (sec.pass !== undefined ? 22 : 0) +
    (sec.observations?.length ?? 0) * 15 + 8;

  // Page 1 = cover, remaining pages = calc sections
  let used = 0;
  let totalPages = 2; // cover + at least one calc page
  for (const sec of sections) {
    const h = sectionHeight(sec);
    if (used + h > bodyHeight) { totalPages++; used = 0; }
    used += h;
  }

  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });
  doc.pipe(stream);

  // ── Cover page ──────────────────────────────────────────────────────────
  doc.addPage();
  drawCoverPage(doc, meta, sections, totalPages);

  // ── Calculation pages ───────────────────────────────────────────────────
  let pageNum = 1;
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
    if (y + h > PAGE.height - 46) newPage();
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
