import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const targetRoot = process.cwd();
const sourceRoot = path.resolve(targetRoot, '../geduconnectbknd');
if (path.basename(targetRoot).toLowerCase() !== 'rs-education-backend') throw new Error('Run from the RS backend repository.');
const targetPackage = JSON.parse(await fs.readFile(path.join(targetRoot, 'package.json'), 'utf8'));
if (targetPackage.name !== 'rs-education-backend') throw new Error('Unexpected target package.');
const sourceEnv = dotenv.parse(await fs.readFile(path.join(sourceRoot, '.env')));
const targetEnv = dotenv.parse(await fs.readFile(path.join(targetRoot, '.env')));
const local = value => ['127.0.0.1', 'localhost', '::1'].includes(value || 'localhost');
for (const env of [sourceEnv, targetEnv]) {
  if (!local(env.DATABASE_HOST) || !['mysql', undefined].includes(env.DATABASE_CLIENT)) throw new Error('Only local MySQL inspection is supported.');
}
if (targetEnv.DATABASE_NAME !== 'agrico' || sourceEnv.DATABASE_NAME === targetEnv.DATABASE_NAME || targetEnv.NODE_ENV === 'production') throw new Error('Database isolation guard failed.');
const out = path.join(targetRoot, 'exports', 'rs-catalogue-import');
await fs.mkdir(out, { recursive: true });
const excludedTypes = new Set(['student-profile', 'enquiry', 'session-booking', 'answer', 'question']);
const preservedSingletons = new Set(['home', 'site-setting']);
const identifier = value => '`' + String(value).replaceAll('`', '``') + '`';
const connect = env => mysql.createConnection({host: env.DATABASE_HOST || 'localhost',port: Number(env.DATABASE_PORT || 3306),database: env.DATABASE_NAME,user: env.DATABASE_USERNAME,password: env.DATABASE_PASSWORD || '',connectTimeout: 20000});
async function schemas(root) {
  const result = [];
  for (const type of await fs.readdir(path.join(root, 'src/api'))) {
    const file = path.join(root, 'src/api', type, 'content-types', type, 'schema.json');
    try { const schema = JSON.parse(await fs.readFile(file, 'utf8')); result.push({type, ...schema}); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return result;
}
async function files(root) {
  const result = [];
  async function walk(dir, rel = '') { for (const item of await fs.readdir(dir, {withFileTypes:true})) {
    const relative = path.join(rel,item.name); const absolute = path.join(dir,item.name);
    if (item.isDirectory()) await walk(absolute,relative); else { const stat=await fs.stat(absolute); result.push({path:relative,size:stat.size}); }
  }}
  try { await walk(root); } catch(error) { if(error.code !== 'ENOENT') throw error; }
  return result;
}
async function inventory(root, env) {
 const db = await connect(env);
 try {
  await db.query('SET SESSION TRANSACTION READ ONLY'); await db.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
  const [tables] = await db.query('SELECT TABLE_NAME AS name, ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',[env.DATABASE_NAME]);
  const [columns] = await db.query('SELECT TABLE_NAME AS tableName,COLUMN_NAME AS name,COLUMN_TYPE AS type,IS_NULLABLE AS nullable,COLUMN_KEY AS columnKey FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME,ORDINAL_POSITION',[env.DATABASE_NAME]);
  const [foreignKeys] = await db.query('SELECT TABLE_NAME AS tableName,COLUMN_NAME AS columnName,REFERENCED_TABLE_NAME AS targetTable,REFERENCED_COLUMN_NAME AS targetColumn FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL',[env.DATABASE_NAME]);
  const models=await schemas(root); const modelCounts=[];
  for(const model of models) {
   const table=model.collectionName; if(!tables.some(t=>t.name===table)) { modelCounts.push({type:model.type,table,missing:true}); continue; }
   const fields=columns.filter(c=>c.tableName===table).map(c=>c.name);
   const [count]=await db.query(`SELECT COUNT(*) AS rowCount${fields.includes('document_id')?', COUNT(DISTINCT document_id) AS documents':''}${fields.includes('published_at')?', SUM(published_at IS NOT NULL) AS publishedRows':''} FROM ${identifier(table)}`);
   modelCounts.push({type:model.type,table,kind:model.kind,scope:excludedTypes.has(model.type)?'preserve-private':preservedSingletons.has(model.type)?'preserve-rs-controls':'import-content',...count[0]});
  }
  const [media]=await db.query('SELECT COUNT(*) AS files, COALESCE(SUM(size),0) AS totalKilobytes FROM files');
  await db.rollback();
  const uploadFiles=await files(path.join(root,'public/uploads'));
  return {database:env.DATABASE_NAME,local:true,models:modelCounts,media:media[0],physicalMedia:{files:uploadFiles.length,bytes:uploadFiles.reduce((a,f)=>a+f.size,0)},tables,columns,foreignKeys,schemas:models,uploadFiles};
 } finally { await db.end(); }
}
const source=await inventory(sourceRoot,sourceEnv); const target=await inventory(targetRoot,targetEnv);
const compatibility=source.schemas.map(model=>{const other=target.schemas.find(m=>m.type===model.type);return {type:model.type,missingTarget:!other,sourceOnlyFields:other?Object.keys(model.attributes).filter(k=>!Object.hasOwn(other.attributes,k)):[],targetOnlyFields:other?Object.keys(other.attributes).filter(k=>!Object.hasOwn(model.attributes,k)):[]};});
const report={generatedAt:new Date().toISOString(),mode:'read-only inventory',source,target,compatibility};
await fs.writeFile(path.join(out,'inventory-private.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({source:{database:source.database,models:source.models,media:source.media,physicalMedia:source.physicalMedia},target:{database:target.database,models:target.models,media:target.media,physicalMedia:target.physicalMedia},compatibility},null,2));

if(process.argv.includes('--backup')) {
 const stamp=new Date().toISOString().replace(/[:.]/g,'-'); const backup=path.join(out,'backups',stamp); await fs.mkdir(backup,{recursive:true});
 const candidates=['D:/xammp/mysql/bin/mysqldump.exe','C:/xampp/mysql/bin/mysqldump.exe','D:/xampp/mysql/bin/mysqldump.exe','G:/xampp/mysql/bin/mysqldump.exe']; let executable;
 for(const file of candidates) { try { await fs.access(file); executable=file;break; } catch {} }
 if(!executable) throw new Error('mysqldump was not found; no backup marked complete.');
 const optionsFile=path.join(backup,'.mysql-options.cnf');
 const quote=value=>'"'+String(value).replaceAll('\\','\\\\').replaceAll('"','\\"').replaceAll('\n','\\n').replaceAll('\r','\\r')+'"';
 await fs.writeFile(optionsFile,`[client]\nhost=${quote(targetEnv.DATABASE_HOST||'localhost')}\nport=${Number(targetEnv.DATABASE_PORT||3306)}\nuser=${quote(targetEnv.DATABASE_USERNAME)}\npassword=${quote(targetEnv.DATABASE_PASSWORD||'')}\n`);
 const dump=path.join(backup,'agrico.sql');
 try { await new Promise((resolve,reject)=>{const child=spawn(executable,[`--defaults-extra-file=${optionsFile}`,'--single-transaction','--skip-lock-tables','--routines','--triggers','--events','--hex-blob',`--result-file=${dump}`,'--databases','agrico'],{windowsHide:true,stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',chunk=>stderr+=chunk.toString());child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`Backup process exited ${code}; diagnostic withheld to avoid credentials.`)));}); } finally { await fs.rm(optionsFile,{force:true}); }
 const uploadSource=path.join(targetRoot,'public/uploads'); const uploadBackup=path.join(backup,'uploads'); await fs.cp(uploadSource,uploadBackup,{recursive:true,errorOnExist:true,force:false});
 const manifest=[];
 for(const item of target.uploadFiles) {const original=await fs.readFile(path.join(uploadSource,item.path)); const copied=await fs.readFile(path.join(uploadBackup,item.path));const digest=value=>crypto.createHash('sha256').update(value).digest('hex');if(digest(original)!==digest(copied))throw new Error('Upload backup verification failed.');manifest.push({...item,sha256:digest(copied)});}
 const sql=await fs.readFile(dump); const verification={createdAt:new Date().toISOString(),database:'agrico',sqlBytes:sql.length,sqlSha256:crypto.createHash('sha256').update(sql).digest('hex'),uploads:manifest};
 await fs.writeFile(path.join(backup,'verified-backup.json'),JSON.stringify(verification,null,2));
 console.log(JSON.stringify({backup:path.relative(targetRoot,backup),sqlBytes:sql.length,verifiedUploads:manifest.length}));
}