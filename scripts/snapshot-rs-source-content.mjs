import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
const root=process.cwd(); if(path.basename(root)!=='rs-education-backend')throw new Error('RS only.');
const sourceRoot=path.resolve(root,'../geduconnectbknd'); const env=dotenv.parse(await fs.readFile(path.join(sourceRoot,'.env')));
if(!['127.0.0.1','localhost'].includes(env.DATABASE_HOST||'localhost')||env.DATABASE_NAME!=='geduconnect')throw new Error('Source must be known local original.');
const out=path.join(root,'exports/rs-catalogue-import'); const inventory=JSON.parse(await fs.readFile(path.join(out,'inventory-private.json'),'utf8'));
const db=await mysql.createConnection({host:env.DATABASE_HOST||'localhost',port:Number(env.DATABASE_PORT||3306),database:env.DATABASE_NAME,user:env.DATABASE_USERNAME,password:env.DATABASE_PASSWORD||'',dateStrings:true});
const modelTables=inventory.source.models.filter(m=>m.scope!=='preserve-private').map(m=>m.table);
const tables=inventory.source.tables.filter(t=>modelTables.includes(t.name)||modelTables.some(m=>t.name.startsWith(m+'_'))||t.name.startsWith('components_')||['files','files_related_mph'].includes(t.name)).map(t=>t.name);
const data={};
try {await db.query('SET SESSION TRANSACTION READ ONLY');await db.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');for(const table of tables){const [rows]=await db.query('SELECT * FROM `'+table+'`');data[table]=rows;}await db.rollback();}finally{await db.end();}
const snapshot={generatedAt:new Date().toISOString(),database:'geduconnect',tables:data};
await fs.writeFile(path.join(out,'source-content-snapshot.json'),JSON.stringify(snapshot));
const published=data.university_contents.filter(r=>r.published_at); const dist={};for(const r of published)dist[r.section_key||'unset']=(dist[r.section_key||'unset']||0)+1;
const distribution={contentSections:dist,richTextComponents:data.components_common_rich_texts.length,richTextExample:data.components_common_rich_texts.slice(0,3),universities:data.universities.filter(r=>r.published_at).map(({id,name,slug})=>({id,name,slug})),programmes:data.programs.filter(r=>r.published_at).map(({id,name,slug,short_description})=>({id,name,slug,short_description})),blogs:data.blogs.filter(r=>r.published_at).map(({id,name,type,description})=>({id,name,type,description})),componentCounts:Object.fromEntries(Object.entries(data).filter(([t])=>t.startsWith('components_')&&!t.endsWith('_lnk')&&!t.endsWith('_cmps')).map(([t,rs])=>[t,rs.length])),allTables:tables.length};
await fs.writeFile(path.join(out,'editorial-distribution.json'),JSON.stringify(distribution,null,2));
console.log(JSON.stringify({...distribution,programmes:distribution.programmes.slice(0,8)},null,2));