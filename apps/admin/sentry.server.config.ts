import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://ccdcc01f5af54da34f65681c0e301ca3@o4511425672970240.ingest.de.sentry.io/4511425676050512",
  tracesSampleRate: 1,
  debug: false,
});
