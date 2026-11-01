import fs from 'node:fs/promises';
const out='exports/rs-catalogue-import';
const get=async route=>{const response=await fetch('http://127.0.0.1:1340'+route,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('HTTP '+response.status);return response.json();};
const rows=[];for(let page=1;page<=2;page++){const result=await get('/api/programs?view=homepage&pagination[pageSize]=100&pagination[page]='+page);rows.push(...result.data);}
const sample=rows.find(row=>row.slug==='online-mba-advertising-and-branding');
const filtered=await get('/api/programs?view=homepage&filters[course_mode][slug][$eq]=online&pagination[pageSize]=1');
const detail=await get('/api/programs/'+sample.documentId);
const report={checkedAt:new Date().toISOString(),programmes:rows.length,withMode:rows.filter(row=>row.course_mode?.slug==='online').length,withDurationType:rows.filter(row=>row.duration_type?.slug).length,onlineFilteredCount:filtered.meta.pagination.total,sample:{slug:sample.slug,mode:sample.course_mode,durationType:sample.duration_type,detailSectionCount:detail.data.university_contents?.length},remainingVersionRepairs:JSON.parse(await fs.readFile(out+'/published-relations-audit.json')).total};
if(report.programmes!==141||report.withMode!==141||report.withDurationType!==141||report.onlineFilteredCount!==141||!report.sample.detailSectionCount||report.remainingVersionRepairs!==0)throw Error(JSON.stringify(report));
await fs.writeFile(out+'/published-relations-public-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));