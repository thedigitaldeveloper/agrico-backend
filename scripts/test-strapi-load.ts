import { createStrapi, compileStrapi } from '@strapi/strapi';
import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync('import-debug.log', line, 'utf8');
}

async function run() {
  fs.writeFileSync('import-debug.log', 'Starting debug run...\n');
  log('Loading dotenv...');
  config();
  log(`DATABASE_HOST=${process.env.DATABASE_HOST}, DATABASE_NAME=${process.env.DATABASE_NAME}`);

  log('Calling compileStrapi()...');
  const compiled = await compileStrapi();
  log('compileStrapi() completed successfully.');

  log('Calling createStrapi().load()...');
  const app = await createStrapi(compiled).load();
  log('createStrapi().load() completed successfully!');

  const uniCount = await app.documents('api::university.university' as never).count();
  log(`Current university count via DocumentService: ${uniCount}`);

  await app.destroy();
  log('App destroyed. Test completed successfully.');
}

run().catch(err => {
  log(`ERROR: ${err.message}\n${err.stack}`);
  process.exit(1);
});

