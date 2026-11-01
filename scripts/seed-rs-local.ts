/** Small, repeatable Agrico catalogue for the isolated XAMPP database only. */
import { createStrapi, compileStrapi } from '@strapi/strapi';
import { config } from 'dotenv';
config();
const allowed = process.env.NODE_ENV !== 'production' && process.env.DATABASE_NAME === 'agrico' && ['127.0.0.1', 'localhost'].includes(process.env.DATABASE_HOST || '');
if (!allowed) throw new Error('Local seed requires a non-production agrico database on localhost.');
const blocks = (...texts: string[]) => texts.map(text => ({type:'paragraph',children:[{type:'text',text}]}));
const slugify = (s:string) => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
async function main() {
 const app = await createStrapi(await compileStrapi()).load();
 try {
  const upsert = async (model:string,slug:string,data:Record<string,unknown>) => {
   const docs=app.documents(`api::${model}.${model}` as never);
   const found=await docs.findFirst({filters:{slug},status:'published'} as never);
   if(found)return found.documentId;
   const draft=await docs.findFirst({filters:{slug}} as never);
   if(draft){await docs.publish({documentId:draft.documentId});return draft.documentId;}
   const created=await docs.create({data:{...data,slug},status:'published'} as never);
   return created.documentId;
  };
  const taxonomy=async(model:string,name:string,extra={})=>upsert(model,slugify(name),{name,...extra});
  const online=await taxonomy('course-mode','Online');
  await taxonomy('course-mode','Distance');await taxonomy('course-mode','Regular');
  const years=await taxonomy('duration-type','Years'), degree=await taxonomy('course-type','Degree');
  const ug=await taxonomy('level','Undergraduate'),pg=await taxonomy('level','Postgraduate');
  const courses:Record<string,string>={};
  for(const [name,full_name,level] of [['MBA','Master of Business Administration',pg],['BBA','Bachelor of Business Administration',ug],['MCA','Master of Computer Applications',pg]]) courses[name]=await taxonomy('course',name,{full_name,level});
  const fixtures=[
   {name:'Manipal University Jaipur',city:'Jaipur',state:'Rajasthan',code:'MBA',full:'Master of Business Administration',duration:2},
   {name:'Chandigarh University',city:'Mohali',state:'Punjab',code:'BBA',full:'Bachelor of Business Administration',duration:3},
   {name:'Amity University',city:'Noida',state:'Uttar Pradesh',code:'MCA',full:'Master of Computer Applications',duration:2},
   {name:'Lovely Professional University',city:'Phagwara',state:'Punjab',code:'MBA',full:'Master of Business Administration',duration:2},
  ];
  for(const [position,u] of fixtures.entries()){
   const slug=slugify(u.name);
   const university=await upsert('university',slug,{name:u.name,full_name:u.name,city:u.city,state:u.state,country:'India',position:position+1,rating:null,course_modes:[online],course_types:[degree],courses:[courses[u.code]],show_apply_button:true,apply_button_text:'Request programme details',view_button_text:'Explore university'});
   const summary=u.code==='MBA'?'Explore business and management studies.':u.code==='BBA'?'Build a foundation in business studies.':'Explore programming and software applications.';
   const program=await upsert('program',slug+'-online-'+u.code.toLowerCase(),{name:u.name+' — Online '+u.code,full_name:u.full,course_code:u.code,duration:u.duration,duration_text:u.duration+' years',duration_type:years,course_mode:online,course_type:degree,course:courses[u.code],universities:[university],position:position+1,fee:null,rating:null,show_apply_button:true,apply_button_text:'Request details',view_button_text:'View programme',short_description:blocks(summary)});
   await upsert('university-content',slug+'-about',{name:u.name+' overview',display_name:'Overview',heading:'About this university listing',section_key:'about',position:1,university,content:[{__component:'common.rich-text',heading:'Plan your next step',body:blocks('This is an illustrative listing in the local Agrico setup. Published fees, official images and admission information will be added after client verification.','Explore the programme details and request guidance to discuss your requirements.')} ]});
   await upsert('university-content',slug+'-programme-overview',{name:u.full+' overview',display_name:'Overview',heading:u.full,section_key:'about',position:1,program,content:[{__component:'common.rich-text',heading:'Programme overview',body:blocks('Review the study format, entry requirements, assessments and complete fee schedule before choosing a university programme. This local sample does not represent an admission offer.')} ]});
  }
  const stories=[
   ['Blog','A practical checklist for your programme shortlist','Start with what you want to study, then compare the universities offering it.','Write down your study goal, available time and budget. Ask each university for the current syllabus, admission requirements and full fee schedule.'],
   ['Blog','Questions to ask before you choose a study mode','Understand how classes, support and examinations fit your routine.','Ask about live and recorded sessions, attendance, learning material, examination location and academic support. Confirm these details for the exact programme and session.'],
   ['Blog','What to keep ready before you apply','A little preparation makes the application process easier.','Check the official document list and keep readable copies ready. Make sure your name and contact details match your application documents.'],
   ['News','Agrico local platform preview is ready','Our new programme discovery layout is available for review.','This is a local development update. University information, fees and admissions announcements will be published after verification.'],
   ['News','Programme comparison added to the preview','Explore two university programmes side by side.','The local preview now lets you compare available programme details and request further guidance. Missing information is clearly marked.'],
   ['News','Student accounts available in the local preview','Test registration and sign-in on the new Agrico platform.','This development update describes the local setup. Student accounts and CMS administration use separate sign-in screens.'],
  ];
  for(const [type,name,description,body] of stories)await upsert('blog',slugify(name),{name,type,description,dateTime:'2026-10-11T00:00:00.000Z',long_description:blocks(body,'Local preview content — review and replace before public launch.')});
  for(const [slug,name] of [['privacy-policy','Privacy Policy'],['terms-and-conditions','Terms and Conditions'],['disclaimer','Disclaimer']])await upsert('legal',slug,{name,description:blocks('Local development placeholder for Agrico. The final client-approved policy will be published before launch.','This local preview stores test accounts and enquiry submissions in the Agrico database on this computer. Use test information while reviewing the platform.')});
  app.log.info('RS local catalogue ready: four university programme examples, three study modes, six original preview posts. No fees, ratings or partnership claims seeded.');
 } finally {await app.destroy();}
}
main().then(()=>process.exit(0)).catch(error=>{console.error(error);process.exit(1)});
