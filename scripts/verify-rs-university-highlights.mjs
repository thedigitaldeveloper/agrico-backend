import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();if(path.basename(root)!=='rs-education-backend')throw Error('RS repository required.');
const get=async route=>{const response=await fetch('http://127.0.0.1:1340'+route,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('HTTP '+response.status);return response.json();};
const reviewed=JSON.parse(await fs.readFile('docs/catalogue-university-highlight-rewrites.json'));
const expected=new Set(reviewed.map(row=>JSON.stringify([row.key,row.value])));
const listing=await get('/api/universities?pagination[pageSize]=100');
const universities=[];for(const row of listing.data){const detail=await get('/api/universities/'+row.documentId);universities.push(detail.data);}
const findings=[];let highlights=0;for(const row of universities)for(const highlight of row.highlights||[]){highlights++;if(!expected.has(JSON.stringify([highlight.key,highlight.value])))findings.push({university:row.slug,reason:'Highlight does not match reviewed copy'});if(/100%|0%|massive|affordable excellence|world.class|highest|guarantee/i.test(highlight.key+' '+highlight.value))findings.push({university:row.slug,reason:'Promotional guarantee or superlative remains'});}
const report={checkedAt:new Date().toISOString(),universities:universities.length,publishedHighlights:highlights,reviewedPairs:reviewed.length,issues:findings,sample:universities.find(row=>row.slug==='parul-university-online')?.highlights?.map(({key,value})=>({key,value}))};
await fs.writeFile('exports/rs-catalogue-import/university-highlights-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(universities.length!==17||highlights!==68||findings.length)throw Error('University highlight verification failed.');