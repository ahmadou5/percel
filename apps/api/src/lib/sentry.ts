import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

import { env } from '../config/env.js';

export function initSentry() {
  if (!env.SENTRY_DSN) return;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    release: env.GIT_SHA || undefined,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1,
    profilesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1,
    integrations: [nodeProfilingIntegration()],
  });
}

export { Sentry };
