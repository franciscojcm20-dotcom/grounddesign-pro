// parseFieldReadings.ts — importación de lecturas de campo pegadas/exportadas
// desde un teluómetro, sin depender de ningún formato binario propietario
// (AGI SuperSting, Megger DET, etc. requieren SDKs pagos, fuera de alcance).
// Acepta CSV, TSV o texto separado por espacios — detecta el separador por
// línea y descarta silenciosamente filas no numéricas (encabezados, unidades,
// líneas vacías) sin bloquear el resto de la importación.

export interface WennerReadingRow { a: number; r: number }
export interface SchlumbergerReadingRow { L: number; l: number; r: number }

export interface ParseResult<T> {
  rows: T[];
  /** Nº de líneas no vacías que no pudieron interpretarse como una lectura válida (encabezados, texto, valores no positivos). */
  skipped: number;
}

/**
 * Divide una línea por tab, luego por ';' (convención europea: ';' separa
 * columnas y ',' es el separador decimal), luego por ',', y si no hay
 * ninguno, por espacios.
 */
function splitLine(line: string): string[] {
  if (line.includes('\t')) return line.split('\t');
  if (line.includes(';')) return line.split(';');
  if (line.includes(',')) return line.split(',');
  return line.trim().split(/\s+/);
}

function toPositiveNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const n = Number(raw.trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Parsea lecturas Wenner: dos columnas (a, R) por línea. */
export function parseWennerReadings(text: string): ParseResult<WennerReadingRow> {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const rows: WennerReadingRow[] = [];
  let skipped = 0;
  for (const line of lines) {
    const cols = splitLine(line).map(c => c.trim()).filter(c => c.length > 0);
    const a = toPositiveNumber(cols[0]);
    const r = toPositiveNumber(cols[1]);
    if (cols.length < 2 || a === null || r === null) { skipped++; continue; }
    rows.push({ a, r });
  }
  return { rows, skipped };
}

/** Parsea lecturas Schlumberger: tres columnas (L, l, R) por línea. */
export function parseSchlumbergerReadings(text: string): ParseResult<SchlumbergerReadingRow> {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const rows: SchlumbergerReadingRow[] = [];
  let skipped = 0;
  for (const line of lines) {
    const cols = splitLine(line).map(c => c.trim()).filter(c => c.length > 0);
    const L = toPositiveNumber(cols[0]);
    const l = toPositiveNumber(cols[1]);
    const r = toPositiveNumber(cols[2]);
    if (cols.length < 3 || L === null || l === null || r === null) { skipped++; continue; }
    rows.push({ L, l, r });
  }
  return { rows, skipped };
}
