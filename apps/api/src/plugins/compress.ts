import fp from 'fastify-plugin';
import compress from '@fastify/compress';

export default fp(async (app) => {
  await app.register(compress, {
    global: true,
    encodings: ['br', 'gzip'],
  });
});
