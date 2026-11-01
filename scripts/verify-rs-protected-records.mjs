/** Read-only comparison of protected identity records against the verified pre-import SQL backup. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
const root=await fs.realpath(process.cwd()),out=path.join(root,'exports/rs-catalogue-import');
const env=dotenv.parse(await fs.readFile('.env'));
if(path.basename(root)!=='rs-education-backend'||env.DATABASE_NAME!=='agrico'||!['localhost','127.0.0.1'].includes(env.DATABASE_HOST))throw Error('Local RS only.');
const backup='2026-10-11T19-46-05-366Z';
const verification=JSON.parse(await fs.readFile(path.join(out,'backups',backup,'verified-backup.json')));
const bytes=await fs.readFile(path.join(out,'backups',backup,'agrico.sql'));
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
if(digest(bytes)!==verification.sqlSha256)throw Error('Backup hash differs.');
const sql=bytes.toString('utf8');
const inventory=JSON.parse(await fs.readFile(path.join(out,'inventory-private.json')));
const tables=inventory.target.tables.map(t=>t.name).filter(name=>/^(admin_(users|roles|permissions)(?:_|$)|up_(users|roles|permissions)(?:_|$)|student_profiles(?:_|$)|enquiries(?:_|$)|session_bookings(?:_|$))/.test(name));
function parseValues(text){const result=[];let row=[],token='',quoted=false,wasQuoted=false;const value=()=>{const raw=token.trim();row.push(wasQuoted?token:raw==='NULL'?null:raw);token='';wasQuoted=false;};for(let i=0;i<text.length;i++){const char=text[i];if(quoted){if(char==='\\'){const next=text[++i];token+=({n:'\n',r:'\r',t:'\t','0':'\0',b:'\b',Z:'\x1a'}[next]??next);}else if(char==="'"){if(text[i+1]==="'"){token+="'";i++;}else quoted=false;}else token+=char;continue;}if(char==="'"){quoted=true;wasQuoted=true;}else if(char==='('){row=[];token='';}else if(char===','){if(text[i-1]!==')')value();}else if(char===')'){value();result.push(row);}else if(char!==';')token+=char;}return result;}
const backupPrograms=[...sql.matchAll(/INSERT INTO `programs` VALUES ([^\n]+);/g)].flatMap(match=>parseValues(match[1]));
const programmeColumns=inventory.target.columns.filter(c=>c.tableName==='programs').map(c=>c.name);
const policy=JSON.parse(await fs.readFile(path.join(root,'docs/catalogue-import-policy.json')));
const db=await mysql.createConnection({host:env.DATABASE_HOST,port:Number(env.DATABASE_PORT||3306),database:env.DATABASE_NAME,user:env.DATABASE_USERNAME,password:env.DATABASE_PASSWORD||'',dateStrings:true});
const report={checkedAt:new Date().toISOString(),backup,backupHashValid:true,tables:[],runtimeSessionsExcluded:true};
try{await db.query('SET SESSION TRANSACTION READ ONLY');await db.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');for(const table of tables){const columns=inventory.target.columns.filter(c=>c.tableName===table).map(c=>c.name);const insert=new RegExp('INSERT INTO `'+table+'` VALUES ([^\\n]+);','g');const before=[...sql.matchAll(insert)].flatMap(match=>parseValues(match[1]));const [after]=await db.query('SELECT * FROM `'+table+'`');const byId=new Map(after.map(row=>[String(row.id),row]));const idIndex=columns.indexOf('id');let checked=0,expectedVersionCleanup=0;const changed=[];for(const row of before){if(row.length!==columns.length)throw Error('Backup column mismatch in '+table);const actual=byId.get(String(row[idIndex]));if(!actual){
 if(table==='enquiries_program_lnk'){
  const prior=backupPrograms.find(programme=>String(programme[programmeColumns.indexOf('id')])===String(row[columns.indexOf('program_id')]));
  const priorDocument=prior?.[programmeColumns.indexOf('document_id')];
  const priorSlug=prior?.[programmeColumns.indexOf('slug')];
  const wasPublished=prior?.[programmeColumns.indexOf('published_at')];
  if(wasPublished&&Object.hasOwn(policy.programmeRedirects,priorSlug)){
   const [preserved]=await db.query('SELECT link.id FROM enquiries_program_lnk link JOIN programs p ON p.id=link.program_id WHERE link.enquiry_id=? AND p.document_id=? AND p.published_at IS NULL',[row[columns.indexOf('enquiry_id')],priorDocument]);
   if(preserved.length===1){expectedVersionCleanup++;continue;}
  }
 }
 changed.push({missing:true});continue;
}const oldRecord=columns.map((_,index)=>row[index]===null?null:String(row[index]));const current=columns.map(name=>actual[name]===null?null:String(actual[name]));if(digest(JSON.stringify(oldRecord))!==digest(JSON.stringify(current)))changed.push({fields:columns.filter((name,index)=>oldRecord[index]!==current[index])});else checked++;}report.tables.push({table,baselineRows:before.length,currentRows:after.length,baselineHashMatches:checked,expectedArchivedVersionLinks:expectedVersionCleanup,addedRows:Math.max(0,after.length-before.length),changes:changed});}await db.rollback();await fs.writeFile(path.join(out,'protected-records-verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(report.tables.some(table=>table.changes.length))throw Error('A protected baseline record differs; see sanitized field report.');}finally{await db.end();}