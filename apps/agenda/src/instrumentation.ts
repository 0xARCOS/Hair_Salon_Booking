import * as Sentry from "@sentry/nextjs";

// Tracking de errores no manejados en el servidor. Se activa solo si el
// deploy define NEXT_PUBLIC_SENTRY_DSN; sin ella es un no-op.
export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({ dsn, tracesSampleRate: 0 });
}

export const onRequestError = Sentry.captureRequestError;
