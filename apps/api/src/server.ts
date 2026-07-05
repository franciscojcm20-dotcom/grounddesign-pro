import { buildApp } from './app.ts';

const PORT = Number(process.env.PORT ?? 3001);
// 127.0.0.1 por defecto: evita exponer la API a la red local/externa. Solo se usa 0.0.0.0
// si se define HOST explícitamente (p. ej. en un contenedor Docker de producción).
const HOST = process.env.HOST ?? '127.0.0.1';

const app = await buildApp();

try {
  await app.listen({ port: PORT, host: HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
