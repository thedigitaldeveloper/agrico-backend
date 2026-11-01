/** Default read-only; --apply repairs only imported published roots' same-document links. */
import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { normalizePublishedRelations } from './lib/rs-import-relations.mjs';
const root = await fs.realpath(process.cwd());
const env = dotenv.parse(await fs.readFile('.env'));
if (path.basename(root) !== 'rs-education-backend' || env.DATABASE_NAME !== 'agrico' || !['localhost', '127.0.0.1'].includes(env.DATABASE_HOST) || env.PORT !== '1338' || env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production') throw new Error('Local RS only.');
const out = path.join(root, 'exports/rs-catalogue-import');
const inventory = JSON.parse(await fs.readFile(path.join(out, 'inventory-private.json')));
const plan = JSON.parse(await fs.readFile(path.join(out, 'import-plan.json')));
const db = await mysql.createConnection({ host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT || 3306), database: env.DATABASE_NAME, user: env.DATABASE_USERNAME, password: env.DATABASE_PASSWORD || '' });
const apply = process.argv.includes('--apply');
try {
  if (!apply) await db.query('SET SESSION TRANSACTION READ ONLY');
  await db.beginTransaction();
  const relations = await normalizePublishedRelations({ db, inventory, modelTables: plan.modelPlans.map(model => model.table), apply });
  const report = { checkedAt: new Date().toISOString(), mode: apply ? 'applied' : 'read-only', relations, total: relations.reduce((sum, relation) => sum + relation.corrected, 0) };
  if (apply) await db.commit(); else await db.rollback();
  await fs.writeFile(path.join(out, apply ? 'published-relations-repair.json' : 'published-relations-audit.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) { await db.rollback(); throw error; } finally { await db.end(); }