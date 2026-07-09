import { describe, it, expect } from 'vitest';
import { parseWennerReadings, parseSchlumbergerReadings } from '@/lib/parseFieldReadings';

describe('parseWennerReadings', () => {
  it('parsea CSV con coma', () => {
    const { rows, skipped } = parseWennerReadings('1,196.99\n2,101.37\n4,53.18');
    expect(rows).toEqual([{ a: 1, r: 196.99 }, { a: 2, r: 101.37 }, { a: 4, r: 53.18 }]);
    expect(skipped).toBe(0);
  });

  it('parsea TSV (separado por tabs)', () => {
    const { rows, skipped } = parseWennerReadings('1\t196.99\n2\t101.37');
    expect(rows).toEqual([{ a: 1, r: 196.99 }, { a: 2, r: 101.37 }]);
    expect(skipped).toBe(0);
  });

  it('parsea texto separado por espacios', () => {
    const { rows } = parseWennerReadings('1 196.99\n2 101.37');
    expect(rows).toEqual([{ a: 1, r: 196.99 }, { a: 2, r: 101.37 }]);
  });

  it('descarta un encabezado sin bloquear las filas válidas', () => {
    const { rows, skipped } = parseWennerReadings('a,R\n1,196.99\n2,101.37');
    expect(rows).toEqual([{ a: 1, r: 196.99 }, { a: 2, r: 101.37 }]);
    expect(skipped).toBe(1);
  });

  it('descarta filas con valores no positivos o no numéricos', () => {
    const { rows, skipped } = parseWennerReadings('1,196.99\n-2,50\n3,abc\n4,53.18');
    expect(rows).toEqual([{ a: 1, r: 196.99 }, { a: 4, r: 53.18 }]);
    expect(skipped).toBe(2);
  });

  it('ignora líneas vacías', () => {
    const { rows, skipped } = parseWennerReadings('1,196.99\n\n\n2,101.37\n');
    expect(rows.length).toBe(2);
    expect(skipped).toBe(0);
  });

  it('texto vacío produce cero filas y cero descartes', () => {
    const { rows, skipped } = parseWennerReadings('');
    expect(rows).toEqual([]);
    expect(skipped).toBe(0);
  });
});

describe('parseSchlumbergerReadings', () => {
  it('parsea CSV de 3 columnas (L, l, R)', () => {
    const { rows, skipped } = parseSchlumbergerReadings('1,0.5,525.30\n1.5,0.5,199.91');
    expect(rows).toEqual([{ L: 1, l: 0.5, r: 525.30 }, { L: 1.5, l: 0.5, r: 199.91 }]);
    expect(skipped).toBe(0);
  });

  it('descarta filas con menos de 3 columnas (formato Wenner mezclado por error)', () => {
    const { rows, skipped } = parseSchlumbergerReadings('1,525.30\n1,0.5,525.30');
    expect(rows).toEqual([{ L: 1, l: 0.5, r: 525.30 }]);
    expect(skipped).toBe(1);
  });

  it('acepta coma decimal (formato europeo) además de punto', () => {
    const { rows } = parseSchlumbergerReadings('1,0;0,5;525,30');
    // separador de columnas ';', decimal ','
    expect(rows).toEqual([{ L: 1, l: 0.5, r: 525.30 }]);
  });
});
