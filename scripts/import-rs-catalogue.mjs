/**
 * Local RS content import. Default is validation only.
 * Execute only after the coordinated frontend phases and editorial review:
 * node scripts/import-rs-catalogue.mjs --execute --acknowledge-local-rs
 * Source is never connected for writes; all writes are confined to agrico.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { normalizePublishedRelations } from './lib/rs-import-relations.mjs';
const root=await fs.realpath(process.cwd());const out=path.join(root,'exports/rs-catalogue-import');
const assert=(ok,message)=>{if(!ok)throw new Error(message);};const json=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const digest=value=>crypto.createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const qi=value=>'`'+String(value).replaceAll('`','``')+'`';
assert(path.basename(root).toLowerCase()==='rs-education-backend','Run only from the RS backend.');
const env=dotenv.parse(await fs.readFile(path.join(root,'.env')));
assert(env.DATABASE_NAME==='agrico'&&['127.0.0.1','localhost'].includes(env.DATABASE_HOST||'localhost')&&env.PORT==='1338'&&env.NODE_ENV!=='production'&&process.env.NODE_ENV!=='production','Local RS database/server isolation guard failed.');
const [plan,inventory,graph,snapshot,policy,overrides,editorial]=await Promise.all([json(path.join(out,'import-plan.json')),json(path.join(out,'inventory-private.json')),json(path.join(out,'reachable-source-graph.json')),json(path.join(out,'source-content-snapshot.json')),json(path.join(root,'docs/catalogue-import-policy.json')),json(path.join(out,'editorial-overrides.json')),json(path.join(out,'editorial-rewrite-report.json'))]);
assert(plan.targetDatabase==='agrico'&&plan.sourceDatabase==='geduconnect','Unexpected plan identity.');assert(!plan.conflicts.length&&!plan.media.collisions.length&&!plan.media.missing.length,'Import has unresolved conflicts or missing media.');
const modelPlans=new Map(plan.modelPlans.map(m=>[m.table,m]));const models=new Map(inventory.source.models.map(m=>[m.table,m]));
const uidTables=new Map(inventory.source.schemas.map(m=>[`api::${m.type}.${m.type}`,m.collectionName]));
for(const group of await fs.readdir(path.join(root,'src/components')))for(const file of await fs.readdir(path.join(root,'src/components',group))){if(file.endsWith('.json'))uidTables.set(`${group}.${file.slice(0,-5)}`,(await json(path.join(root,'src/components',group,file))).collectionName);}
const rowsByTable={...graph.tables,files:snapshot.tables.files};
for(const model of inventory.source.models)if(!modelPlans.has(model.table)){delete rowsByTable[model.table];for(const table of Object.keys(rowsByTable))if(table.startsWith(model.table+'_'))delete rowsByTable[table];}
// Keep explicit source samples and unverified personnel as drafts from the first write.
const quarantine=new Map();const omittedVersions=new Map();
for(const table of ['blogs','testimonials','mentor_profiles']){const selected=new Set();for(const row of rowsByTable[table]||[]){if(table==='mentor_profiles'||table==='testimonials'&&/placeholder|sample student/i.test((row.quote||'')+' '+(row.name||''))||table==='blogs'&&(policy.draftOnlyBlogSlugs.includes(row.slug)||/seeded (?:news|press release) entry/i.test(row.description||'')))selected.add(row.document_id);}quarantine.set(table,selected);const preferred=new Map();for(const row of rowsByTable[table]||[])if(selected.has(row.document_id)&&(!preferred.has(row.document_id)||!row.published_at))preferred.set(row.document_id,row);const skipped=new Map();rowsByTable[table]=(rowsByTable[table]||[]).filter(row=>{const chosen=preferred.get(row.document_id);if(chosen&&chosen.id!==row.id){skipped.set(row.id,chosen.id);return false;}return true;});omittedVersions.set(table,skipped);}
const baseTables=Object.keys(rowsByTable).filter(t=>!t.endsWith('_lnk')&&!t.endsWith('_cmps')&&t!=='files_related_mph');
const links=Object.keys(rowsByTable).filter(t=>t.endsWith('_lnk')||t.endsWith('_cmps')||t==='files_related_mph');
const sourceUploads=path.resolve(root,'../geduconnectbknd/public/uploads');const targetUploads=path.join(root,'public/uploads');
const latestBackups=(await fs.readdir(path.join(out,'backups'))).sort().reverse();let backup;
for(const folder of latestBackups){try{backup=await json(path.join(out,'backups',folder,'verified-backup.json'));backup.folder=folder;break;}catch{}}
assert(backup?.database==='agrico'&&backup.sqlBytes>0,'A verified local RS backup is required.');
assert(digest(await fs.readFile(path.join(out,'backups',backup.folder,'agrico.sql')))===backup.sqlSha256,'Backup SQL digest does not match.');
const columnGaps=[];
for(const [table,rows]of Object.entries(rowsByTable)){const cols=new Set(inventory.target.columns.filter(c=>c.tableName===table).map(c=>c.name));if(!cols.size){columnGaps.push({table,reason:'missing target table'});continue;}for(const col of new Set(rows.flatMap(r=>Object.keys(r))))if(!cols.has(col)&&rows.some(r=>r[col]!==null))columnGaps.push({table,column:col,reason:'nonempty source column absent in target'});}
assert(!columnGaps.length,'Source columns would be lost: '+JSON.stringify(columnGaps));
console.log(JSON.stringify({mode:process.argv.includes('--execute')?'execution-requested':'validation-only',rootModels:plan.modelPlans.length,baseTables:baseTables.length,relationTables:links.length,sourceUniversities:17,sourceProgrammes:141,sourceContentDocuments:1093,mediaRecords:snapshot.tables.files.length,mediaFiles:plan.media.files.length,editorialOverrides:Object.keys(overrides).length,editorialReviewComplete:editorial.reviewComplete,backup:backup.folder,columnsCompatible:true}));
if(!process.argv.includes('--execute'))process.exit(0);
assert(process.argv.includes('--acknowledge-local-rs'),'Explicit local execution acknowledgement is required.');
assert(editorial.reviewComplete===true,'Editorial rewrite review is still pending.');
const db=await mysql.createConnection({host:env.DATABASE_HOST||'localhost',port:Number(env.DATABASE_PORT||3306),database:'agrico',user:env.DATABASE_USERNAME,password:env.DATABASE_PASSWORD||'',dateStrings:true});
const protectedTables=inventory.target.tables.map(t=>t.name).filter(t=>/^(admin_|up_|enquiries(?:_|$)|student_profiles(?:_|$)|session_bookings(?:_|$)|homes$|site_settings(?:_|$))/.test(t));
const protectedHash=async()=>{const result={};for(const table of protectedTables){const [rows]=await db.query('SELECT * FROM '+qi(table)+' ORDER BY id');result[table]=digest(rows);}return result;};
const rowMaps=new Map();const targetRows=new Map();const inserted={};const merged={};const map=(table,id)=>rowMaps.get(table)?.get(Number(id));
const localLinks=value=>typeof value!=='string'?value:value.replace(/https?:\/\/(?:www\.)?geduconnect\.in(?=\/)/gi,'').replace(/https?:\/\/(?:localhost|127\.0\.0\.1):1337(?=\/uploads\/)/gi,'').replace(/\/(universities|university)\/([a-z0-9-]+)/gi,(whole,route,slug)=>`/${route}/${policy.universityAliases[slug]||slug}`).replace(/\/(programs|programmes|program)\/([a-z0-9-]+)/gi,(whole,route,slug)=>`/${route}/${policy.programmeRedirects[slug]||slug}`);
try{
 const before=await protectedHash();
 await db.query('CREATE TABLE IF NOT EXISTS rs_catalogue_import_map (source_table VARCHAR(160) NOT NULL, source_id BIGINT NOT NULL, target_id BIGINT NOT NULL, source_hash CHAR(64) NOT NULL, updated_at DATETIME NOT NULL, PRIMARY KEY (source_table,source_id)) ENGINE=InnoDB');
 await db.beginTransaction();
 const [ledger]=await db.query('SELECT * FROM rs_catalogue_import_map');const ledgerByKey=new Map(ledger.map(r=>[r.source_table+':'+r.source_id,r]));
 for(const table of baseTables){const [existing]=await db.query('SELECT * FROM '+qi(table));targetRows.set(table,existing);rowMaps.set(table,new Map());const model=modelPlans.get(table);const targetCols=new Set(inventory.target.columns.filter(c=>c.tableName===table).map(c=>c.name));
  for(const source of rowsByTable[table]){const item=model?.items.find(i=>i.sourceDocumentId===source.document_id);const known=ledgerByKey.get(table+':'+source.id);let target=known?existing.find(r=>r.id===known.target_id):null;
   if(!target&&item)target=existing.find(r=>r.document_id===item.targetDocumentId&&Boolean(r.published_at)===Boolean(quarantine.get(table)?.has(source.document_id)?null:source.published_at));
   if(!target&&table==='files')target=existing.find(r=>r.hash===source.hash&&r.url===source.url);
   if(known)assert(target,'Import ledger points to missing target row.');
   const output={};for(const [field,value]of Object.entries(source)){if(field==='id'||!targetCols.has(field))continue;let next=Object.hasOwn(overrides,`${table}:${source.id}:${field}`)?overrides[`${table}:${source.id}:${field}`]:value;if(field==='created_by_id'||field==='updated_by_id')next=target?.[field]??null;if(field==='document_id'&&item)next=item.targetDocumentId;if(field==='slug'&&item?.targetSlug)next=item.targetSlug;if(field==='published_at'&&quarantine.get(table)?.has(source.document_id))next=null;if(table==='files'&&field==='folder_path')next='/';output[field]=localLinks(next);}
   let id;if(target){id=target.id;const fields=Object.keys(output);await db.query('UPDATE '+qi(table)+' SET '+fields.map(f=>qi(f)+'=?').join(',')+' WHERE id=?',[...fields.map(f=>output[f]),id]);merged[table]=(merged[table]||0)+1;}else{const fields=Object.keys(output);const [result]=await db.query('INSERT INTO '+qi(table)+' ('+fields.map(qi).join(',')+') VALUES ('+fields.map(()=>'?').join(',')+')',fields.map(f=>output[f]));id=result.insertId;existing.push({id,...output});inserted[table]=(inserted[table]||0)+1;}
   rowMaps.get(table).set(Number(source.id),Number(id));await db.query('INSERT INTO rs_catalogue_import_map (source_table,source_id,target_id,source_hash,updated_at) VALUES (?,?,?,?,NOW()) ON DUPLICATE KEY UPDATE target_id=VALUES(target_id),source_hash=VALUES(source_hash),updated_at=NOW()',[table,source.id,id,digest(source)]);
  }
 }
 for(const [table,aliases]of omittedVersions)for(const [sourceId,preferredId]of aliases){const targetId=map(table,preferredId);assert(targetId,'Missing draft quarantine mapping.');rowMaps.get(table).set(sourceId,targetId);const original=graph.tables[table].find(r=>r.id===sourceId);await db.query('INSERT INTO rs_catalogue_import_map (source_table,source_id,target_id,source_hash,updated_at) VALUES (?,?,?,?,NOW()) ON DUPLICATE KEY UPDATE target_id=VALUES(target_id),source_hash=VALUES(source_hash),updated_at=NOW()',[table,sourceId,targetId,digest(original)]);}
 // Replace only the imported roots' own relations. RS Home/auth relations stay intact.
 for(const table of links){const sourceRows=rowsByTable[table];const foreignKeys=inventory.source.foreignKeys.filter(k=>k.tableName===table);const mappedRows=[];
  for(const source of sourceRows){const sourceOwner=foreignKeys.find(k=>table.startsWith(k.targetTable+'_'))||foreignKeys[0];if(sourceOwner&&omittedVersions.get(sourceOwner.targetTable)?.has(source[sourceOwner.columnName]))continue;if(table==='files_related_mph'&&omittedVersions.get(uidTables.get(source.related_type))?.has(source.related_id))continue;const output={...source};delete output.id;let valid=true;
   for(const fk of foreignKeys){const mapped=map(fk.targetTable,source[fk.columnName]);if(mapped===undefined){valid=false;break;}output[fk.columnName]=mapped;}
   if(table.endsWith('_cmps')){const childTable=uidTables.get(source.component_type);const mapped=map(childTable,source.cmp_id);if(mapped===undefined)valid=false;else output.cmp_id=mapped;}
   if(table==='files_related_mph'){const ownerTable=uidTables.get(source.related_type);const owner=map(ownerTable,source.related_id);const file=map('files',source.file_id);if(owner===undefined||file===undefined)valid=false;else{output.related_id=owner;output.file_id=file;}}
   if(valid)mappedRows.push(output);
  }
  if(table==='files_related_mph'){const groups=new Map();for(const row of mappedRows){const key=`${row.related_type}:${row.related_id}:${row.field}`;groups.set(key,row);}for(const row of groups.values())await db.query('DELETE FROM files_related_mph WHERE related_type=? AND related_id=? AND field=?',[row.related_type,row.related_id,row.field]);}
  else{const owner=foreignKeys.find(k=>table.startsWith(k.targetTable+'_'))||foreignKeys[0];if(owner){const ids=[...new Set(mappedRows.map(r=>r[owner.columnName]))];if(ids.length)await db.query('DELETE FROM '+qi(table)+' WHERE '+qi(owner.columnName)+' IN ('+ids.map(()=>'?').join(',')+')',ids);}}
  const unique=new Map(mappedRows.map(row=>[JSON.stringify(row),row]));for(const row of unique.values()){const fields=Object.keys(row);await db.query('INSERT INTO '+qi(table)+' ('+fields.map(qi).join(',')+') VALUES ('+fields.map(()=>'?').join(',')+')',fields.map(f=>row[f]));}
  inserted[table]=unique.size;
 }
 // Normalize source draft-row links without changing the related document identity.
 const publishedRelationRepairs=await normalizePublishedRelations({db,inventory,modelTables:plan.modelPlans.map(model=>model.table),apply:true});
 // Redirect only Home component programme references to verified same-institution offerings.
 const remappedHome=[];for(const remap of plan.programmeRemaps){const [oldRows]=await db.query('SELECT id,published_at,document_id FROM programs WHERE slug=?',[remap.oldProgrammeSlug]);const newPlan=modelPlans.get('programs').items.find(i=>i.sourceSlug===remap.newProgrammeSlug);const [newRows]=await db.query('SELECT id,published_at FROM programs WHERE document_id=?',[newPlan.targetDocumentId]);for(const old of oldRows){const current=newRows.find(r=>Boolean(r.published_at)===Boolean(old.published_at))||newRows.find(r=>r.published_at);assert(current,'Missing canonical programme version.');for(const fk of inventory.target.foreignKeys.filter(k=>k.targetTable==='programs'&&k.tableName.startsWith('components_home_'))){const [result]=await db.query('UPDATE '+qi(fk.tableName)+' SET '+qi(fk.columnName)+'=? WHERE '+qi(fk.columnName)+'=?',[current.id,old.id]);if(result.affectedRows)remappedHome.push({table:fk.tableName,count:result.affectedRows,from:remap.oldProgrammeSlug,to:remap.newProgrammeSlug});}}}
 const after=await protectedHash();assert(JSON.stringify(before)===JSON.stringify(after),'Protected RS accounts/private records/Home rows changed; rolling back.');
 // Verify/copy original bytes before commit; no generated or transformed images.
 let copied=0;for(const media of plan.media.files){const source=path.resolve(sourceUploads,media.path);const target=path.resolve(targetUploads,media.path);assert(source.startsWith(sourceUploads+path.sep)&&target.startsWith(targetUploads+path.sep),'Unsafe upload path.');const bytes=await fs.readFile(source);assert(digest(bytes)===media.sha256,'Source media changed after plan.');try{const present=await fs.readFile(target);assert(digest(present)===media.sha256,'Target media collision.');}catch(error){if(error.code!=='ENOENT')throw error;await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes,{flag:'wx'});copied++;}}
 await db.commit();const result={completedAt:new Date().toISOString(),database:'agrico',protectedRowsUnchanged:true,inserted,merged,remappedHome,publishedRelationRepairs,mediaCopied:copied,postImportRequired:'Unpublish recognized legacy sample programmes/content and unverified source sample posts through Strapi Document Service; run public read verification and frontend cache invalidation.'};await fs.writeFile(path.join(out,'import-execution-result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}catch(error){await db.rollback().catch(()=>{});throw error;}finally{await db.end();}