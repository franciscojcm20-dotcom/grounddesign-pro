// Runner de migraciones — reemplaza el antiguo schema.sql aplicado una sola
// vez. Cada archivo .sql en migrations/ se aplica como máximo una vez, en
// orden alfabético (por eso el prefijo numérico 0001_, 0002_, ...), dentro de
// su propia transacción, y queda registrado en la tabla _migrations.
//
// Uso: DATABASE_URL=postgres://... node --experimental-strip-types src/db/migrate.ts

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from './client.ts';

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

export async function runMigrations(): Promise<{ applied: string[] }> {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      name        TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  const files = (await readdir(MIGRATIONS_DIR))
    .filter(f => f.endsWith('.sql'))
    .sort();

  const already = new Set((await sql<{ name: string }[]>`SELECT name FROM _migrations`).map(r => r.name));

  const applied: string[] = [];
  for (const file of files) {
    if (already.has(file)) continue;
    const content = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`INSERT INTO _migrations (name) VALUES (${file})`;
    });
    applied.push(file);
  }

  return { applied };
}

// Permite ejecutarlo tanto como CLI (`node migrate.ts`) como importarlo desde
// otro módulo (p. ej. un futuro test de integración) sin disparar el proceso
// principal ni cerrar la conexión de otro llamador.
if (process.argv[1]?.replace(/\\/g, '/').endsWith('/db/migrate.ts')) {
  const { applied } = await runMigrations();
  if (applied.length === 0) {
    console.log('Sin migraciones pendientes — base de datos al día.');
  } else {
    console.log(`Migraciones aplicadas: ${applied.join(', ')}`);
  }
  await sql.end();
}
