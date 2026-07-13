import * as Sentry from "@sentry/nextjs";

// Tracking de errores no manejados en el navegador. Se activa solo si el
// deploy define NEXT_PUBLIC_SENTRY_DSN; sin ella es un no-op.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({ dsn, tracesSampleRate: 0 });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
