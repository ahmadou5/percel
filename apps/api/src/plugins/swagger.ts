import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export default fp(async (app) => {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Percel API',
        version: '0.0.1',
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });
});
