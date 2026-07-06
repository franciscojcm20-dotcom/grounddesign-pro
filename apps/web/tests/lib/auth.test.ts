import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authApi, projectApi, ApiError } from '@/lib/auth';

describe('lib/auth — apiFetch (manejo de errores de red y de la API)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('cuando la red falla (fetch rechaza), lanza ApiError sin status y con mensaje amigable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(authApi.me()).rejects.toMatchObject({
      status: undefined,
      message: expect.stringContaining('No se pudo conectar'),
    });
  });

  it('cuando el servidor responde con error y body JSON {error}, propaga ese mensaje y el status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Credenciales inválidas' }),
    });

    await expect(authApi.login('a@a.com', 'x')).rejects.toMatchObject({
      status: 401,
      message: 'Credenciales inválidas',
    });
  });

  it('cuando el servidor responde con error y el body no es JSON válido, usa un mensaje genérico', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    });

    await expect(authApi.me()).rejects.toMatchObject({ status: 500, message: 'Error' });
  });

  it('en éxito, devuelve el body parseado tal cual', async () => {
    const user = { id: '1', email: 'a@a.com', name: 'A', plan: 'community' as const };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ user }) });

    await expect(authApi.me()).resolves.toEqual({ user });
  });

  it('ApiError conserva el status para que el caller distinga 401 (no autenticado) de otros fallos', () => {
    const err = new ApiError('mensaje', 401);
    expect(err.status).toBe(401);
    expect(err).toBeInstanceOf(Error);
  });

  it('projectApi.saveResult envía el body correcto al endpoint del proyecto', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ result: {} }) });
    global.fetch = fetchMock;

    await projectApi.saveResult('proj-1', 'wenner', { a: 1 }, { rho: 100 }, 'IEEE 80-2013');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/v1/projects/proj-1/results');
    expect(JSON.parse(init.body)).toEqual({
      module: 'wenner', inputs: { a: 1 }, outputs: { rho: 100 }, norm: 'IEEE 80-2013',
    });
  });
});
