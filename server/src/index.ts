import 'dotenv/config';
import { buildApp } from './app';

async function main() {
  const fastify = await buildApp();
  await fastify.ready();
  await fastify.listen({ port: 3000, host: '0.0.0.0' });
}

main();
