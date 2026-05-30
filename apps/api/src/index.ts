import { buildApp } from './app.js';
import { env } from './config/env.js';
import { Sentry, initSentry } from './lib/sentry.js';

initSentry();

function reportFatal(error: unknown) {
  Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
}

async function start() {
  const app = await buildApp();


  process.once('unhandledRejection', (reason) => {
    reportFatal(reason);
    app.log.error({ reason }, 'unhandled.rejection');
    void app.close().finally(() => process.exit(1));
  });

  process.once('uncaughtException', (error) => {
    reportFatal(error);
    app.log.error(error, 'uncaught.exception');
    void app.close().finally(() => process.exit(1));
  });

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'Shutting down API');
    try {
      await app.close();
      process.exit(0);
    } catch (error) {
      app.log.error(error);
      process.exit(1);
    }
  };

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info({ port: env.PORT }, 'API listening');
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
