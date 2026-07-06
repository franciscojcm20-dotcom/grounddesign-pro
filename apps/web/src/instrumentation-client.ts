import * as Sentry from '@sentry/nextjs';

// Sin NEXT_PUBLIC_SENTRY_DSN, Sentry.init con dsn vacío deshabilita el SDK
// automáticamente — no hay dependencia dura del servicio en dev/build normal.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
