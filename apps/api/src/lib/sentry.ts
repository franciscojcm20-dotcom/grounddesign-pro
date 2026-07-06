import * as Sentry from '@sentry/node';

// Sin SENTRY_DSN, todo este módulo es un no-op — no hay dependencia dura del
// servicio: la API arranca y funciona igual en dev/tests sin ninguna cuenta
// externa configurada.
const DSN = process.env.SENTRY_DSN;

export const sentryEnabled = Boolean(DSN);

export function initSentry(): void {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
  });
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!DSN) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}
