import { sql } from '../db/client.ts';

/**
 * Motor de autoaprendizaje propio (multi-armed bandit, UCB1 — Auer et al. 2002)
 * que aprende, a partir del uso real del sistema, qué acción de optimización
 * resulta más efectiva para cada módulo de diseño. No usa ninguna API externa
 * ni modelo de lenguaje: es un algoritmo clásico de aprendizaje por refuerzo
 * implementado íntegramente en este backend, con su estado persistido en la
 * base de datos propia (tabla `optimization_stats`).
 *
 * UCB1 balancea explotación (preferir la acción con mejor recompensa promedio
 * histórica) y exploración (dar prioridad a acciones con pocas observaciones,
 * vía el término de incertidumbre sqrt(2·ln(N_total)/n_acción)). Con el tiempo,
 * el orden de acciones converge hacia la estrategia empíricamente más eficiente
 * por tipo de sistema de puesta a tierra.
 */

let ensured = false;
async function ensureTable(): Promise<void> {
  if (ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS optimization_stats (
      module      TEXT NOT NULL,
      action_kind TEXT NOT NULL,
      n           INTEGER NOT NULL DEFAULT 0,
      mean_reward DOUBLE PRECISION NOT NULL DEFAULT 0,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (module, action_kind)
    )
  `;
  ensured = true;
}

interface StatRow { action_kind: string; n: number; mean_reward: number }

/**
 * Calcula el orden de prioridad de acciones para un módulo dado, usando UCB1
 * sobre las estadísticas acumuladas. Las acciones nunca antes observadas
 * reciben puntaje infinito (se exploran primero), replicando el comportamiento
 * estándar de cold-start de UCB1.
 */
export async function getActionOrder(module: string, defaultOrder: string[]): Promise<string[]> {
  try {
    await ensureTable();
    const rows = await sql<StatRow[]>`
      SELECT action_kind, n, mean_reward FROM optimization_stats WHERE module = ${module}
    `;
    if (rows.length === 0) return defaultOrder;
    const stats = new Map(rows.map(r => [r.action_kind, r]));
    const totalN = rows.reduce((s, r) => s + r.n, 0);
    const score = (kind: string): number => {
      const s = stats.get(kind);
      if (!s || s.n === 0) return Infinity;
      return s.mean_reward + Math.sqrt((2 * Math.log(Math.max(totalN, 1))) / s.n);
    };
    return [...defaultOrder].sort((a, b) => score(b) - score(a));
  } catch {
    // Si la base de datos no está disponible, se degrada al orden por defecto
    // (determinístico basado en costo constructivo) sin interrumpir el cálculo.
    return defaultOrder;
  }
}

/**
 * Registra el resultado de una tanda de optimización: por cada acción
 * realmente ejecutada, actualiza su recompensa promedio mediante la fórmula
 * de actualización incremental online (Sutton & Barto):
 *   mean_new = mean_old + (reward - mean_old) / (n + 1)
 * La recompensa es la mejora relativa (%) que esa acción aportó sobre la
 * métrica objetivo del módulo (Rg, Rn, Rh, etc., o razón de tensión).
 */
export async function recordOutcomes(
  module: string,
  outcomes: Array<{ kind: string; reward: number }>,
): Promise<void> {
  if (outcomes.length === 0) return;
  try {
    await ensureTable();
    for (const { kind, reward } of outcomes) {
      await sql`
        INSERT INTO optimization_stats (module, action_kind, n, mean_reward)
        VALUES (${module}, ${kind}, 1, ${reward})
        ON CONFLICT (module, action_kind) DO UPDATE SET
          mean_reward = optimization_stats.mean_reward
            + (${reward} - optimization_stats.mean_reward) / (optimization_stats.n + 1),
          n = optimization_stats.n + 1,
          updated_at = now()
      `;
    }
  } catch {
    // El aprendizaje es una mejora incremental, no crítica: si falla la
    // persistencia, la optimización ya entregada al usuario no se ve afectada.
  }
}

/** Convierte los pasos de un resultado de optimización en recompensas relativas normalizadas (0–1) para alimentar el bandit. */
export function stepsToOutcomes(
  steps: Array<{ kind: string; Rg: number }>,
  initialMetric: number,
): Array<{ kind: string; reward: number }> {
  if (steps.length === 0 || initialMetric <= 0) return [];
  const outcomes: Array<{ kind: string; reward: number }> = [];
  let prev = initialMetric;
  for (const s of steps) {
    const improvement = Math.max(0, (prev - s.Rg) / initialMetric);
    outcomes.push({ kind: s.kind, reward: improvement });
    prev = s.Rg;
  }
  return outcomes;
}
