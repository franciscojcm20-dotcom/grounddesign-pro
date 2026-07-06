/**
 * Generador de planos DXF (AutoCAD) — motor propio, formato ASCII DXF R12.
 *
 * No usa ninguna librería ni servicio externo de CAD: escribe directamente
 * las secciones HEADER/TABLES/ENTITIES del formato DXF tal como lo define la
 * especificación pública de Autodesk, generando entidades LINE, CIRCLE y TEXT
 * a partir de la geometría real del sistema de puesta a tierra diseñado. El
 * archivo resultante se puede abrir en AutoCAD, DraftSight, LibreCAD, QCAD,
 * etc. (formato .dxf, universalmente compatible con .dwg vía import/export).
 *
 * Cada plano incluye, además de la vista en planta del sistema: una portada
 * (cajetín) con los datos del proyecto, un detalle de la unión de conductores
 * empleada, un detalle de cámara de registro para inspección del electrodo, y
 * un cuadro resumen de cálculo con las cantidades y resultados relevantes.
 *
 * En los planos de malla (generateGridDxf / generateCombinedDxf) el
 * reticulado queda completamente acotado: además de las cotas de largo/ancho
 * TOTAL del sistema, se dibuja una cadena de cotas (dimension chain) por eje
 * que indica la posición y el espaciamiento real de cada línea individual del
 * conductor de la malla, tal como exige un plano de malla de tierra
 * profesional (cada conductor queda acotado, no solo el contorno exterior).
 */

export interface DxfLayer { name: string; colorIndex: number }

const LAYERS: DxfLayer[] = [
  { name: 'MALLA-CONDUCTOR', colorIndex: 1 },  // rojo
  { name: 'MALLA-VARILLAS',  colorIndex: 5 },  // azul
  { name: 'MALLA-COTAS',     colorIndex: 7 },  // blanco/negro
  { name: 'MALLA-TEXTO',     colorIndex: 3 },  // verde
  { name: 'MALLA-DETALLE',   colorIndex: 4 },  // cyan — uniones y cámara de registro
  { name: 'MALLA-CAJETIN',   colorIndex: 2 },  // amarillo — portada/cajetín
];

function dxfHeader(): string[] {
  return [
    '0', 'SECTION',
    '2', 'HEADER',
    '9', '$ACADVER',
    '1', 'AC1009',
    '9', '$INSUNITS',
    '70', '6', // 6 = metros
    '0', 'ENDSEC',
  ];
}

function dxfTables(): string[] {
  const lines: string[] = ['0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', String(LAYERS.length)];
  for (const l of LAYERS) {
    lines.push('0', 'LAYER', '2', l.name, '70', '0', '62', String(l.colorIndex), '6', 'CONTINUOUS');
  }
  lines.push('0', 'ENDTAB', '0', 'ENDSEC');
  return lines;
}

function line(layer: string, x1: number, y1: number, x2: number, y2: number): string[] {
  return [
    '0', 'LINE', '8', layer,
    '10', x1.toFixed(3), '20', y1.toFixed(3), '30', '0.0',
    '11', x2.toFixed(3), '21', y2.toFixed(3), '31', '0.0',
  ];
}

function rect(layer: string, x: number, y: number, w: number, h: number): string[] {
  return [
    ...line(layer, x, y, x + w, y),
    ...line(layer, x + w, y, x + w, y + h),
    ...line(layer, x + w, y + h, x, y + h),
    ...line(layer, x, y + h, x, y),
  ];
}

function circle(layer: string, cx: number, cy: number, r: number): string[] {
  return ['0', 'CIRCLE', '8', layer, '10', cx.toFixed(3), '20', cy.toFixed(3), '30', '0.0', '40', r.toFixed(3)];
}

function text(layer: string, x: number, y: number, height: number, value: string): string[] {
  // Cada registro DXF ocupa exactamente 2 líneas (código de grupo + valor); un
  // salto de línea dentro del valor (p. ej. en un nombre de proyecto ingresado
  // por el usuario) rompería esa estructura al unir las líneas del documento.
  const safeValue = value.replace(/[\r\n]+/g, ' ');
  return ['0', 'TEXT', '8', layer, '10', x.toFixed(3), '20', y.toFixed(3), '30', '0.0', '40', height.toFixed(3), '1', safeValue];
}

function assembleDxf(entities: string[]): string {
  const doc = [
    ...dxfHeader(),
    ...dxfTables(),
    '0', 'SECTION', '2', 'ENTITIES',
    ...entities,
    '0', 'ENDSEC',
    '0', 'EOF',
  ];
  return doc.join('\n');
}

function label(proyecto: string | undefined, norm: string | undefined, fallback: string, y: number, textH: number, entities: string[]) {
  entities.push(...text('MALLA-TEXTO', 0, y, textH * 1.3, `${proyecto ?? 'Sistema de puesta a tierra'} — ${fallback} — ${norm ?? ''}`));
}

/**
 * Cadena de cotas (dimension chain) para acotar cada línea individual de un
 * reticulado de malla, además de las cotas de contorno (largo/ancho total).
 *
 * Dibuja una línea base paralela al eje acotado, ticks perpendiculares cortos
 * en cada posición de `positions`, y un texto con el espaciamiento (delta
 * entre posiciones consecutivas) centrado entre cada par de ticks.
 *
 * @param axis      'x' → cadena horizontal (acota posiciones en X, línea base
 *                  paralela al eje X); 'y' → cadena vertical (acota
 *                  posiciones en Y, línea base paralela al eje Y).
 * @param origin    coordenada fija del eje perpendicular donde arranca la
 *                  malla (normalmente 0), antes de aplicar `offset`.
 * @param positions coordenadas (a lo largo del eje acotado) de cada línea
 *                  del reticulado, ya ordenadas de menor a mayor.
 * @param offset    desplazamiento perpendicular al que se traza la línea
 *                  base, relativo a `origin` (negativo = fuera del área de
 *                  la malla, por debajo/izquierda).
 */
function dimensionChain(
  entities: string[],
  layer: string,
  axis: 'x' | 'y',
  origin: number,
  positions: number[],
  offset: number,
  textH: number,
): void {
  if (positions.length < 2) return;
  const base = origin + offset;
  const tick = textH * 0.6;

  for (let i = 0; i < positions.length; i++) {
    const p = positions[i]!;
    if (axis === 'x') {
      // Línea base horizontal en y = base; ticks verticales cortos en cada x.
      entities.push(...line(layer, p, base - tick / 2, p, base + tick / 2));
    } else {
      // Línea base vertical en x = base; ticks horizontales cortos en cada y.
      entities.push(...line(layer, base - tick / 2, p, base + tick / 2, p));
    }
  }

  if (axis === 'x') {
    entities.push(...line(layer, positions[0]!, base, positions[positions.length - 1]!, base));
  } else {
    entities.push(...line(layer, base, positions[0]!, base, positions[positions.length - 1]!));
  }

  // Ancho aproximado del texto de espaciamiento (heurística: ~0.6·textH por carácter, "X.XX m" ~6 caracteres).
  const labelWidth = textH * 0.7 * 6 * 0.6;
  const minDeltaForLabel = labelWidth * 1.15;
  let lastLabelEnd = -Infinity;

  for (let i = 0; i < positions.length - 1; i++) {
    const a = positions[i]!;
    const b = positions[i + 1]!;
    const delta = Math.abs(b - a);
    const mid = (a + b) / 2;
    // Si el espaciamiento real es demasiado angosto para el texto (malla muy densa), se omite
    // la etiqueta de ese tramo para evitar solape — los ticks de cota igual quedan dibujados,
    // y el espaciamiento uniforme puede leerse en el cuadro resumen de cálculo.
    if (delta < minDeltaForLabel || mid - labelWidth / 2 < lastLabelEnd) continue;
    lastLabelEnd = mid + labelWidth / 2;
    const value = `${delta.toFixed(2)} m`;
    if (axis === 'x') {
      entities.push(...text(layer, mid - textH * 1.2, base + tick * 0.7, textH * 0.7, value));
    } else {
      entities.push(...text(layer, base + tick * 0.7, mid - textH * 0.35, textH * 0.7, value));
    }
  }
}

export interface ResumenRow { label: string; value: string }

interface SheetOptions {
  extentW: number;
  extentH: number;
  originY: number;          // borde inferior de la vista en planta (normalmente negativo, ya usado por cotas)
  proyecto?: string | undefined;
  norm?: string | undefined;
  sistema: string;
  resumen: ResumenRow[];
}

/**
 * Bloque de hoja profesional: portada/cajetín + detalle de unión exotérmica +
 * detalle de cámara de registro + cuadro resumen de cálculo, dispuestos en
 * layout horizontal bajo la vista en planta del sistema.
 */
function buildSheetFrame(entities: string[], o: SheetOptions): void {
  const s = Math.max(o.extentW, o.extentH, 10) / 30; // escala de referencia del bloque de hoja
  const gap = s * 1.5;
  const panelH = s * 13;
  const panelW = s * 22;
  const y0 = o.originY - gap * 3 - panelH;
  const th = Math.max(s * 0.55, 0.15);
  const thSmall = th * 0.75;

  // ── Panel 1: Portada / Cajetín ──────────────────────────────────────────────
  const x1 = 0;
  entities.push(...rect('MALLA-CAJETIN', x1, y0, panelW, panelH));
  entities.push(...line('MALLA-CAJETIN', x1, y0 + panelH - th * 2, x1 + panelW, y0 + panelH - th * 2));
  const fecha = new Date().toISOString().slice(0, 10);
  entities.push(...text('MALLA-CAJETIN', x1 + th * 0.5, y0 + panelH - th * 1.6, th * 1.1, 'GROUNDDESIGN PRO'));
  entities.push(...text('MALLA-CAJETIN', x1 + th * 0.5, y0 + panelH - th * 3.4, thSmall, `Proyecto: ${o.proyecto ?? 'Sistema de puesta a tierra'}`));
  entities.push(...text('MALLA-CAJETIN', x1 + th * 0.5, y0 + panelH - th * 4.8, thSmall, `Sistema: ${o.sistema}`));
  entities.push(...text('MALLA-CAJETIN', x1 + th * 0.5, y0 + panelH - th * 6.2, thSmall, `Norma: ${o.norm ?? 'IEEE Std 80-2013'}`));
  entities.push(...text('MALLA-CAJETIN', x1 + th * 0.5, y0 + panelH - th * 7.6, thSmall, `Fecha: ${fecha}`));
  entities.push(...text('MALLA-CAJETIN', x1 + th * 0.5, y0 + panelH - th * 9.0, thSmall, 'Escala: s/e (plano referencial)'));
  entities.push(...text('MALLA-CAJETIN', x1 + th * 0.5, y0 + th * 0.5, thSmall, 'Lámina 1/1 — Motor CAD propio, sin dependencias externas'));

  // ── Panel 2: Detalle de unión exotérmica ────────────────────────────────────
  const x2 = x1 + panelW + gap;
  entities.push(...rect('MALLA-DETALLE', x2, y0, panelW, panelH));
  entities.push(...text('MALLA-DETALLE', x2 + th * 0.5, y0 + panelH - th * 1.6, th, 'DETALLE DE UNIÓN'));
  const ucx = x2 + panelW * 0.3, ucy = y0 + panelH * 0.55;
  entities.push(...line('MALLA-DETALLE', ucx - s * 3, ucy, ucx + s * 3, ucy));
  entities.push(...line('MALLA-DETALLE', ucx, ucy - s * 2, ucx, ucy + s * 2));
  entities.push(...circle('MALLA-DETALLE', ucx, ucy, s * 0.6));
  entities.push(...text('MALLA-DETALLE', x2 + th * 0.5, y0 + th * 3.6, thSmall, 'Unión exotérmica tipo'));
  entities.push(...text('MALLA-DETALLE', x2 + th * 0.5, y0 + th * 2.3, thSmall, 'Cadweld/Thermoweld —'));
  entities.push(...text('MALLA-DETALLE', x2 + th * 0.5, y0 + th * 1.0, thSmall, 'sin soldadura de estaño'));

  // ── Panel 3: Cámara de registro ──────────────────────────────────────────────
  const x3 = x2 + panelW + gap;
  entities.push(...rect('MALLA-DETALLE', x3, y0, panelW, panelH));
  entities.push(...text('MALLA-DETALLE', x3 + th * 0.5, y0 + panelH - th * 1.6, th, 'CÁMARA DE REGISTRO'));
  const chSize = s * 5;
  const chx = x3 + panelW / 2 - chSize / 2, chy = y0 + panelH * 0.32;
  entities.push(...rect('MALLA-DETALLE', chx, chy, chSize, chSize));
  entities.push(...circle('MALLA-DETALLE', chx + chSize / 2, chy + chSize / 2, chSize * 0.12));
  entities.push(...line('MALLA-DETALLE', chx, chy - th * 0.8, chx + chSize, chy - th * 0.8));
  entities.push(...text('MALLA-DETALLE', chx, chy - th * 1.8, thSmall, '≥ 300 mm libre'));
  entities.push(...text('MALLA-DETALLE', x3 + th * 0.5, y0 + th * 3.4, thSmall, 'Acceso mínimo interior 300 mm'));
  entities.push(...text('MALLA-DETALLE', x3 + th * 0.5, y0 + th * 2.1, thSmall, 'para inspección/mantención del'));
  entities.push(...text('MALLA-DETALLE', x3 + th * 0.5, y0 + th * 0.8, thSmall, 'electrodo (IEEE 80 / SEC-RIC)'));

  // ── Panel 4: Cuadro resumen de cálculo ───────────────────────────────────────
  const x4 = x3 + panelW + gap;
  const panelW4 = panelW * 1.6;
  entities.push(...rect('MALLA-CAJETIN', x4, y0, panelW4, panelH));
  entities.push(...text('MALLA-CAJETIN', x4 + th * 0.5, y0 + panelH - th * 1.6, th, 'CUADRO RESUMEN DE CÁLCULO'));
  entities.push(...line('MALLA-CAJETIN', x4, y0 + panelH - th * 2.4, x4 + panelW4, y0 + panelH - th * 2.4));
  const rowH = th * 1.35;
  const maxRows = Math.floor((panelH - th * 2.8) / rowH);
  o.resumen.slice(0, maxRows).forEach((row, i) => {
    const ry = y0 + panelH - th * 2.4 - rowH * (i + 1);
    entities.push(...text('MALLA-CAJETIN', x4 + th * 0.5, ry + th * 0.25, thSmall, row.label));
    entities.push(...text('MALLA-CAJETIN', x4 + panelW4 * 0.62, ry + th * 0.25, thSmall, row.value));
  });
}

export interface GridDxfInput {
  largo: number; ancho: number;               // m
  nConductoresL: number; nConductoresW: number;
  nVarillas: number; longVarilla?: number;
  proyecto?: string; norm?: string;
  resultados?: ResumenRow[];
}

/** Malla rectangular (Sverak) — conductores en grilla + varillas perimetrales. */
export function generateGridDxf(p: GridDxfInput): string {
  const entities: string[] = [];
  const nL = Math.max(p.nConductoresL, 2);
  const nW = Math.max(p.nConductoresW, 2);
  const longVarilla = p.longVarilla ?? 3;

  const posicionesHorizontales: number[] = [];
  const posicionesVerticales: number[] = [];
  for (let i = 0; i < nW; i++) {
    const y = (i / (nW - 1)) * p.ancho;
    entities.push(...line('MALLA-CONDUCTOR', 0, y, p.largo, y));
    posicionesHorizontales.push(y);
  }
  for (let i = 0; i < nL; i++) {
    const x = (i / (nL - 1)) * p.largo;
    entities.push(...line('MALLA-CONDUCTOR', x, 0, x, p.ancho));
    posicionesVerticales.push(x);
  }

  const rodCount = p.nVarillas;
  const corners: [number, number][] = [[0, 0], [p.largo, 0], [0, p.ancho], [p.largo, p.ancho]];
  const perimeter = 2 * (p.largo + p.ancho);
  for (let i = 0; i < rodCount; i++) {
    let x: number, y: number;
    if (i < 4 && i < rodCount) { [x, y] = corners[i]!; }
    else {
      const dist = (perimeter * (i - 4)) / Math.max(rodCount - 4, 1);
      if (dist < p.largo)                 { x = dist;               y = 0; }
      else if (dist < p.largo + p.ancho)  { x = p.largo;            y = dist - p.largo; }
      else if (dist < 2 * p.largo + p.ancho) { x = p.largo - (dist - p.largo - p.ancho); y = p.ancho; }
      else                                  { x = 0;                  y = p.ancho - (dist - 2 * p.largo - p.ancho); }
    }
    entities.push(...circle('MALLA-VARILLAS', x, y, Math.min(p.largo, p.ancho) * 0.01));
  }

  const textH = Math.max(Math.min(p.largo, p.ancho) * 0.03, 0.3);

  // Cadena de cotas del reticulado: acota cada línea individual de la malla,
  // no solo el contorno exterior. Se dibuja más lejos que las cotas totales
  // (que usan offset -textH*2) para no solaparse con ellas.
  dimensionChain(entities, 'MALLA-COTAS', 'x', 0, posicionesVerticales, -textH * 5, textH);
  dimensionChain(entities, 'MALLA-COTAS', 'y', 0, posicionesHorizontales, -textH * 5, textH);

  entities.push(...text('MALLA-COTAS', p.largo / 2 - textH * 2, -textH * 2, textH, `${p.largo.toFixed(1)} m`));
  entities.push(...text('MALLA-COTAS', -textH * 6, p.ancho / 2, textH, `${p.ancho.toFixed(1)} m`));
  entities.push(...text('MALLA-TEXTO', 0, p.ancho + textH * 2, textH * 1.3,
    `${p.proyecto ?? 'Sistema de puesta a tierra'} — Malla ${nL}x${nW} + ${p.nVarillas} varillas — ${p.norm ?? 'IEEE Std 80-2013 Cl. 14.2'}`));

  const condL = p.nConductoresL * p.ancho + p.nConductoresW * p.largo;
  const condRods = p.nVarillas * longVarilla;
  const uniones = p.nVarillas + p.nConductoresL * p.nConductoresW;
  buildSheetFrame(entities, {
    extentW: p.largo, extentH: p.ancho, originY: -textH * 7,
    proyecto: p.proyecto, norm: p.norm, sistema: `Malla rectangular ${nL}×${nW} + ${p.nVarillas} varillas`,
    resumen: [
      { label: 'Largo × Ancho', value: `${p.largo.toFixed(1)} × ${p.ancho.toFixed(1)} m` },
      { label: 'Conductor en malla', value: `${condL.toFixed(1)} m` },
      { label: 'Conductor en varillas', value: `${condRods.toFixed(1)} m` },
      { label: 'Conductor total Lt', value: `${(condL + condRods).toFixed(1)} m` },
      { label: 'Nº varillas', value: `${p.nVarillas} × ${longVarilla} m` },
      { label: 'Uniones exotérmicas (cubicación)', value: `${uniones} un` },
      ...(p.resultados ?? []),
    ],
  });

  return assembleDxf(entities);
}

// ─── Electrodos verticales (picas) — Dwight/Sunde ────────────────────────────

export interface RodDxfInput {
  n: number; L: number; spacing: number;
  proyecto?: string; norm?: string;
  resultados?: ResumenRow[];
}

export function generateRodDxf(p: RodDxfInput): string {
  const entities: string[] = [];
  const n = Math.max(p.n, 1);
  const totalWidth = (n - 1) * p.spacing;
  const textH = Math.max(p.L * 0.06, 0.2);

  entities.push(...line('MALLA-CONDUCTOR', 0, 0, totalWidth, 0));
  for (let i = 0; i < n; i++) {
    const x = i * p.spacing;
    entities.push(...line('MALLA-VARILLAS', x, 0, x, -p.L));
    entities.push(...circle('MALLA-VARILLAS', x, 0, textH * 0.15));
  }
  entities.push(...text('MALLA-COTAS', totalWidth / 2 - textH * 2, textH * 1.5, textH, `${n} picas × ${p.L} m, s=${p.spacing} m`));
  label(p.proyecto, p.norm, `${n} electrodos verticales`, -p.L - textH * 3, textH, entities);

  buildSheetFrame(entities, {
    extentW: Math.max(totalWidth, p.L), extentH: p.L, originY: -p.L - textH * 3,
    proyecto: p.proyecto, norm: p.norm, sistema: `${n} electrodos verticales × ${p.L} m`,
    resumen: [
      { label: 'Conductor de unión', value: `${totalWidth.toFixed(1)} m` },
      { label: 'Conductor en picas', value: `${(n * p.L).toFixed(1)} m` },
      { label: 'Conductor total', value: `${(totalWidth + n * p.L).toFixed(1)} m` },
      { label: 'Nº picas', value: `${n} × ${p.L} m` },
      { label: 'Uniones exotérmicas', value: `${n} un` },
      ...(p.resultados ?? []),
    ],
  });

  return assembleDxf(entities);
}

// ─── Conductor horizontal enterrado — Dwight ─────────────────────────────────

export interface StripDxfInput {
  L: number; h: number;
  proyecto?: string; norm?: string;
  resultados?: ResumenRow[];
}

export function generateStripDxf(p: StripDxfInput): string {
  const entities: string[] = [];
  const textH = Math.max(p.L * 0.03, 0.2);

  entities.push(...line('MALLA-CONDUCTOR', 0, 0, p.L, 0));
  entities.push(...circle('MALLA-VARILLAS', 0, 0, textH * 0.2));
  entities.push(...circle('MALLA-VARILLAS', p.L, 0, textH * 0.2));
  entities.push(...text('MALLA-COTAS', p.L / 2 - textH * 2, textH * 1.5, textH, `L = ${p.L} m, h = ${p.h} m`));
  label(p.proyecto, p.norm, 'Conductor horizontal enterrado', -textH * 3, textH, entities);

  buildSheetFrame(entities, {
    extentW: p.L, extentH: p.L * 0.3, originY: -textH * 3,
    proyecto: p.proyecto, norm: p.norm, sistema: `Conductor horizontal enterrado ${p.L} m`,
    resumen: [
      { label: 'Conductor total', value: `${p.L.toFixed(1)} m` },
      { label: 'Profundidad', value: `${p.h.toFixed(2)} m` },
      { label: 'Uniones exotérmicas (extremos)', value: '2 un' },
      ...(p.resultados ?? []),
    ],
  });

  return assembleDxf(entities);
}

// ─── Sistema radial / estrella — Laurent-Niemann ─────────────────────────────

export interface RadialDxfInput {
  n: number; L: number;
  proyecto?: string; norm?: string;
  resultados?: ResumenRow[];
}

export function generateRadialDxf(p: RadialDxfInput): string {
  const entities: string[] = [];
  const n = Math.max(p.n, 2);
  const textH = Math.max(p.L * 0.05, 0.2);

  entities.push(...circle('MALLA-VARILLAS', 0, 0, textH * 0.25));
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * 2 * Math.PI;
    const x2 = Math.cos(angle) * p.L, y2 = Math.sin(angle) * p.L;
    entities.push(...line('MALLA-CONDUCTOR', 0, 0, x2, y2));
  }
  entities.push(...text('MALLA-COTAS', -textH * 2, -p.L - textH * 2, textH, `${n} radiales × ${p.L} m`));
  label(p.proyecto, p.norm, 'Sistema radial / estrella', -p.L - textH * 4, textH, entities);

  buildSheetFrame(entities, {
    extentW: p.L * 2, extentH: p.L * 2, originY: -p.L - textH * 4,
    proyecto: p.proyecto, norm: p.norm, sistema: `Sistema radial ${n} × ${p.L} m`,
    resumen: [
      { label: 'Conductor total', value: `${(n * p.L).toFixed(1)} m` },
      { label: 'Nº radiales', value: `${n} × ${p.L} m` },
      { label: 'Uniones exotérmicas (centro)', value: `${n} un` },
      ...(p.resultados ?? []),
    ],
  });

  return assembleDxf(entities);
}

// ─── Anillo perimetral — Sunde ────────────────────────────────────────────────

export interface RingDxfInput {
  largo: number; ancho: number;
  proyecto?: string; norm?: string;
  resultados?: ResumenRow[];
}

export function generateRingDxf(p: RingDxfInput): string {
  const entities: string[] = [];
  const textH = Math.max(Math.min(p.largo, p.ancho) * 0.04, 0.2);

  entities.push(...line('MALLA-CONDUCTOR', 0, 0, p.largo, 0));
  entities.push(...line('MALLA-CONDUCTOR', p.largo, 0, p.largo, p.ancho));
  entities.push(...line('MALLA-CONDUCTOR', p.largo, p.ancho, 0, p.ancho));
  entities.push(...line('MALLA-CONDUCTOR', 0, p.ancho, 0, 0));
  for (const [x, y] of [[0, 0], [p.largo, 0], [0, p.ancho], [p.largo, p.ancho]] as [number, number][]) {
    entities.push(...circle('MALLA-VARILLAS', x, y, textH * 0.2));
  }
  entities.push(...text('MALLA-COTAS', p.largo / 2 - textH * 2, -textH * 2, textH, `${p.largo.toFixed(1)} m`));
  entities.push(...text('MALLA-COTAS', -textH * 6, p.ancho / 2, textH, `${p.ancho.toFixed(1)} m`));
  label(p.proyecto, p.norm, `Anillo perimetral P=${(2 * (p.largo + p.ancho)).toFixed(1)} m`, p.ancho + textH * 2, textH, entities);

  const perimeter = 2 * (p.largo + p.ancho);
  buildSheetFrame(entities, {
    extentW: p.largo, extentH: p.ancho, originY: -textH * 2,
    proyecto: p.proyecto, norm: p.norm, sistema: `Anillo perimetral ${p.largo.toFixed(1)}×${p.ancho.toFixed(1)} m`,
    resumen: [
      { label: 'Perímetro (conductor total)', value: `${perimeter.toFixed(1)} m` },
      { label: 'Uniones exotérmicas (esquinas)', value: '4 un' },
      ...(p.resultados ?? []),
    ],
  });

  return assembleDxf(entities);
}

// ─── Malla + picas combinada — Schwarz ────────────────────────────────────────

export interface CombinedDxfInput {
  largo: number; ancho: number; nConductoresL: number; nConductoresW: number; nRods: number;
  rodLength?: number;
  proyecto?: string; norm?: string;
  resultados?: ResumenRow[];
}

export function generateCombinedDxf(p: CombinedDxfInput): string {
  const entities: string[] = [];
  const nL = Math.max(p.nConductoresL, 2);
  const nW = Math.max(p.nConductoresW, 2);
  const rodLength = p.rodLength ?? 3;

  const posicionesHorizontales: number[] = [];
  const posicionesVerticales: number[] = [];
  for (let i = 0; i < nW; i++) {
    const y = (i / (nW - 1)) * p.ancho;
    entities.push(...line('MALLA-CONDUCTOR', 0, y, p.largo, y));
    posicionesHorizontales.push(y);
  }
  for (let i = 0; i < nL; i++) {
    const x = (i / (nL - 1)) * p.largo;
    entities.push(...line('MALLA-CONDUCTOR', x, 0, x, p.ancho));
    posicionesVerticales.push(x);
  }

  const rodCount = Math.max(p.nRods, 0);
  for (let i = 0; i < rodCount; i++) {
    const fx = (i % 4) / 3, fy = Math.floor(i / 4) / Math.max(Math.ceil(rodCount / 4) - 1, 1);
    entities.push(...circle('MALLA-VARILLAS', fx * p.largo, fy * p.ancho, Math.min(p.largo, p.ancho) * 0.01));
  }

  const textH = Math.max(Math.min(p.largo, p.ancho) * 0.03, 0.3);

  // Cadena de cotas del reticulado: acota cada línea individual de la malla,
  // no solo el contorno exterior. Se dibuja más lejos que las cotas totales
  // (que usan offset -textH*2) para no solaparse con ellas.
  dimensionChain(entities, 'MALLA-COTAS', 'x', 0, posicionesVerticales, -textH * 5, textH);
  dimensionChain(entities, 'MALLA-COTAS', 'y', 0, posicionesHorizontales, -textH * 5, textH);

  entities.push(...text('MALLA-COTAS', p.largo / 2 - textH * 2, -textH * 2, textH, `${p.largo.toFixed(1)} m`));
  entities.push(...text('MALLA-COTAS', -textH * 6, p.ancho / 2, textH, `${p.ancho.toFixed(1)} m`));
  label(p.proyecto, p.norm, `Malla ${nL}x${nW} + ${p.nRods} picas (Schwarz)`, p.ancho + textH * 2, textH, entities);

  const condL = p.nConductoresL * p.ancho + p.nConductoresW * p.largo;
  const condRods = p.nRods * rodLength;
  const uniones = p.nRods + p.nConductoresL * p.nConductoresW;
  buildSheetFrame(entities, {
    extentW: p.largo, extentH: p.ancho, originY: -textH * 7,
    proyecto: p.proyecto, norm: p.norm, sistema: `Malla ${nL}×${nW} + ${p.nRods} picas (Schwarz)`,
    resumen: [
      { label: 'Conductor en malla', value: `${condL.toFixed(1)} m` },
      { label: 'Conductor en picas', value: `${condRods.toFixed(1)} m` },
      { label: 'Conductor total', value: `${(condL + condRods).toFixed(1)} m` },
      { label: 'Nº picas adicionales', value: `${p.nRods} × ${rodLength} m` },
      { label: 'Uniones exotérmicas (cubicación)', value: `${uniones} un` },
      ...(p.resultados ?? []),
    ],
  });

  return assembleDxf(entities);
}
