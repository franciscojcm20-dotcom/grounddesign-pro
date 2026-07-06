import { describe, it, expect, vi, afterEach } from 'vitest';
import { api } from '@/lib/api';

describe('lib/api — wrappers post/get (manejo de errores)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('post: en error con body {error}, lanza Error con ese mensaje', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Bad Request',
      json: () => Promise.resolve({ error: 'ρa fuera de rango' }),
    });

    await expect(api.soil.wenner([{ a: 1, r: 100 }])).rejects.toThrow('ρa fuera de rango');
  });

  it('post: si el body de error no es JSON, cae al statusText', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('not json')),
    });

    await expect(api.soil.wenner([{ a: 1, r: 100 }])).rejects.toThrow('Internal Server Error');
  });

  it('get: en error, lanza Error con el statusText (sin intentar leer el body)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, statusText: 'Not Found' });

    await expect(api.conductor.table()).rejects.toThrow('Not Found');
  });

  it('post: en éxito, devuelve el JSON parseado', async () => {
    const payload = { points: [], rhoAvg: 100, twoLayer: { rho1: 1, rho2: 2, h: 1, curve: [] }, norm: 'IEEE 80' };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(payload) });

    await expect(api.soil.wenner([{ a: 1, r: 100 }])).resolves.toEqual(payload);
  });

  it('post envía Content-Type: application/json y el body serializado', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    global.fetch = fetchMock;

    await api.grid.rod({ rho: 100, L: 2.4, radius: 0.008, n: 4, spacing: 3, iFalla: 8000 });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toMatchObject({ rho: 100, n: 4 });
  });
});
