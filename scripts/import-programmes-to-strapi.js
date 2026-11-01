const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: 'd:/agrico-backend/.env' });

function generateDocumentId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 24; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function toStrapiBlocks(text) {
  return JSON.stringify([
    {
      type: 'paragraph',
      children: [
        {
          type: 'text',
          text: text || ''
        }
      ]
    }
  ]);
}

async function run() {
  console.log('--- Starting Agrico CMS Programme Import ---');

  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    user: process.env.DATABASE_USERNAME || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'agrico',
    port: process.env.DATABASE_PORT || 3306
  });

  const importPlanPath = 'd:/agrico-frontend/docs/content/programmes-2026-11-01/cms-html-content-import-plan.json';
  const importPlan = JSON.parse(fs.readFileSync(importPlanPath, 'utf8'));
  console.log(`Loaded import plan with ${importPlan.records.length} records.`);

  // Load publication universities to match
  const [dbUnis] = await conn.query('SELECT id, document_id, name, slug, published_at FROM universities');
  const uniDraftMap = new Map();
  const uniPubMap = new Map();
  for (const u of dbUnis) {
    if (u.published_at === null) {
      uniDraftMap.set(u.slug, u.id);
    } else {
      uniPubMap.set(u.slug, u.id);
    }
  }
  console.log(`Loaded ${uniPubMap.size} published universities from DB.`);

  // 1. Ensure Taxonomies: course_modes, course_types, duration_types, streams, levels
  async function getOrCreateTaxonomy(table, name, slug) {
    const [existing] = await conn.query(`SELECT id, document_id, published_at FROM \`${table}\` WHERE slug = ?`, [slug]);
    if (existing.length >= 2) {
      const draft = existing.find(r => r.published_at === null);
      const pub = existing.find(r => r.published_at !== null);
      return { draftId: draft.id, pubId: pub.id, docId: draft.document_id };
    }
    const docId = generateDocumentId();
    const now = new Date();
    const [dRes] = await conn.query(
      `INSERT INTO \`${table}\` (document_id, name, slug, created_at, updated_at, published_at) VALUES (?, ?, ?, ?, ?, NULL)`,
      [docId, name, slug, now, now]
    );
    const [pRes] = await conn.query(
      `INSERT INTO \`${table}\` (document_id, name, slug, created_at, updated_at, published_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [docId, name, slug, now, now, now]
    );
    return { draftId: dRes.insertId, pubId: pRes.insertId, docId };
  }

  // Levels
  const levelUG = await getOrCreateTaxonomy('levels', 'Undergraduate', 'undergraduate');
  const levelPG = await getOrCreateTaxonomy('levels', 'Postgraduate', 'postgraduate');
  const levelDip = await getOrCreateTaxonomy('levels', 'Diploma', 'diploma');

  // Course Mode
  const modeFullTime = await getOrCreateTaxonomy('course_modes', 'Full-time, campus-based', 'full-time-campus');

  // Course Type
  const typeDegree = await getOrCreateTaxonomy('course_types', 'Degree Programme', 'degree');
  const typeDiploma = await getOrCreateTaxonomy('course_types', 'Diploma Programme', 'diploma');

  // Duration Type
  const durationYears = await getOrCreateTaxonomy('duration_types', 'Years', 'years');

  // Streams
  const streams = {
    agriculture: await getOrCreateTaxonomy('streams', 'Agriculture', 'agriculture'),
    horticulture: await getOrCreateTaxonomy('streams', 'Horticulture', 'horticulture'),
    engineering: await getOrCreateTaxonomy('streams', 'Agricultural Engineering', 'agricultural-engineering'),
    fisheries: await getOrCreateTaxonomy('streams', 'Fisheries Science', 'fisheries-science'),
    veterinary: await getOrCreateTaxonomy('streams', 'Veterinary Science & Animal Husbandry', 'veterinary-science-animal-husbandry'),
    agribusiness: await getOrCreateTaxonomy('streams', 'Agribusiness Management', 'agribusiness-management')
  };

  // Courses
  const courses = {
    bscAgri: await getOrCreateTaxonomy('courses', 'B.Sc. (Hons.) Agriculture', 'bsc-agriculture'),
    bscHort: await getOrCreateTaxonomy('courses', 'B.Sc. (Hons.) Horticulture', 'bsc-horticulture'),
    btechEng: await getOrCreateTaxonomy('courses', 'B.Tech. Agricultural Engineering', 'btech-agricultural-engineering'),
    bfscFish: await getOrCreateTaxonomy('courses', 'Bachelor of Fisheries Science (B.F.Sc.)', 'bfsc-fisheries-science'),
    bvscVet: await getOrCreateTaxonomy('courses', 'B.V.Sc. & A.H.', 'bvsc-animal-husbandry'),
    bscAgriBus: await getOrCreateTaxonomy('courses', 'B.Sc. (Hons.) Agribusiness Management', 'bsc-agribusiness'),
    mscAgri: await getOrCreateTaxonomy('courses', 'M.Sc. Agriculture', 'msc-agriculture'),
    mbaAgri: await getOrCreateTaxonomy('courses', 'MBA Agribusiness Management', 'mba-agribusiness'),
    dipAgri: await getOrCreateTaxonomy('courses', 'Diploma in Agriculture', 'diploma-agriculture')
  };

  // Link courses to levels
  async function linkCourseLevel(courseTax, levelTax) {
    const [cDraft] = await conn.query('SELECT id FROM courses_level_lnk WHERE course_id = ?', [courseTax.draftId]);
    if (cDraft.length === 0) {
      await conn.query('INSERT INTO courses_level_lnk (course_id, level_id, course_ord) VALUES (?, ?, 1)', [courseTax.draftId, levelTax.draftId]);
    }
    const [cPub] = await conn.query('SELECT id FROM courses_level_lnk WHERE course_id = ?', [courseTax.pubId]);
    if (cPub.length === 0) {
      await conn.query('INSERT INTO courses_level_lnk (course_id, level_id, course_ord) VALUES (?, ?, 1)', [courseTax.pubId, levelTax.pubId]);
    }
  }

  await linkCourseLevel(courses.bscAgri, levelUG);
  await linkCourseLevel(courses.bscHort, levelUG);
  await linkCourseLevel(courses.btechEng, levelUG);
  await linkCourseLevel(courses.bfscFish, levelUG);
  await linkCourseLevel(courses.bvscVet, levelUG);
  await linkCourseLevel(courses.bscAgriBus, levelUG);
  await linkCourseLevel(courses.mscAgri, levelPG);
  await linkCourseLevel(courses.mbaAgri, levelPG);
  await linkCourseLevel(courses.dipAgri, levelDip);

  console.log('Base taxonomies verified.');

  // Clean old program entries for these 18 slugs
  for (const record of importPlan.records) {
    const slug = record.fields.slug;
    const [oldProgs] = await conn.query('SELECT id, document_id FROM programs WHERE slug = ?', [slug]);
    if (oldProgs.length > 0) {
      const progIds = oldProgs.map(p => p.id);
      console.log(`Cleaning old entries for slug: ${slug} (IDs: ${progIds.join(', ')})`);
      
      // Delete from link tables
      await conn.query(`DELETE FROM programs_cmps WHERE entity_id IN (${progIds.map(() => '?').join(',')})`, progIds);
      await conn.query(`DELETE FROM programs_universities_lnk WHERE program_id IN (${progIds.map(() => '?').join(',')})`, progIds);
      await conn.query(`DELETE FROM programs_course_lnk WHERE program_id IN (${progIds.map(() => '?').join(',')})`, progIds);
      await conn.query(`DELETE FROM programs_stream_lnk WHERE program_id IN (${progIds.map(() => '?').join(',')})`, progIds);
      await conn.query(`DELETE FROM programs_course_mode_lnk WHERE program_id IN (${progIds.map(() => '?').join(',')})`, progIds);
      await conn.query(`DELETE FROM programs_course_type_lnk WHERE program_id IN (${progIds.map(() => '?').join(',')})`, progIds);
      await conn.query(`DELETE FROM programs_duration_type_lnk WHERE program_id IN (${progIds.map(() => '?').join(',')})`, progIds);
      await conn.query(`DELETE FROM university_contents_program_lnk WHERE program_id IN (${progIds.map(() => '?').join(',')})`, progIds);
      await conn.query(`DELETE FROM programs WHERE id IN (${progIds.map(() => '?').join(',')})`, progIds);
    }

    // Clean old university_contents for this slug
    const contentSlug = `${slug}--overview`;
    const [oldContents] = await conn.query('SELECT id FROM university_contents WHERE slug = ?', [contentSlug]);
    if (oldContents.length > 0) {
      const contentIds = oldContents.map(c => c.id);
      await conn.query(`DELETE FROM university_contents_cmps WHERE entity_id IN (${contentIds.map(() => '?').join(',')})`, contentIds);
      await conn.query(`DELETE FROM university_contents_program_lnk WHERE university_content_id IN (${contentIds.map(() => '?').join(',')})`, contentIds);
      await conn.query(`DELETE FROM university_contents WHERE id IN (${contentIds.map(() => '?').join(',')})`, contentIds);
    }
  }

  // 2. Import each programme
  let count = 0;
  for (let i = 0; i < importPlan.records.length; i++) {
    const record = importPlan.records[i];
    const fields = record.fields;
    const slug = fields.slug;
    const jsonPath = path.join('d:/agrico-frontend/docs/content/programmes-2026-11-01', `${slug}.json`);
    let richJson = null;
    if (fs.existsSync(jsonPath)) {
      richJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }

    const docId = generateDocumentId();
    const now = new Date();

    // Map duration and fee
    let durationNumber = 4.0;
    if (slug.startsWith('msc-') || slug === 'mba-agribusiness') durationNumber = 2.0;
    else if (slug === 'bvsc-animal-husbandry') durationNumber = 5.5;
    else if (slug === 'diploma-agriculture') durationNumber = 2.0;

    let feeNumber = 45000.0;
    if (slug.startsWith('msc-')) feeNumber = 35000.0;
    else if (slug === 'mba-agribusiness') feeNumber = 120000.0;
    else if (slug === 'btech-agricultural-engineering') feeNumber = 85000.0;
    else if (slug === 'bvsc-animal-husbandry') feeNumber = 60000.0;
    else if (slug === 'diploma-agriculture') feeNumber = 18000.0;

    let avgPackage = '₹4.5 - ₹8.5 LPA';
    if (slug === 'mba-agribusiness') avgPackage = '₹6.5 - ₹12.5 LPA';
    else if (slug.startsWith('msc-')) avgPackage = '₹5.5 - ₹9.5 LPA';
    else if (slug === 'diploma-agriculture') avgPackage = '₹2.5 - ₹4.0 LPA';

    const shortDesc = richJson?.hero?.summary || fields.seo.metaDescription;

    // A. Insert SEO Component (Draft & Published)
    const [seoDraftRes] = await conn.query(
      `INSERT INTO components_shared_seos (meta_title, meta_description, keywords, meta_robots, canonical_url) VALUES (?, ?, ?, 'index,follow', ?)`,
      [fields.seo.metaTitle, fields.seo.metaDescription, fields.seo.keywords, `https://agrico.in/${slug}`]
    );
    const seoDraftId = seoDraftRes.insertId;

    const [seoPubRes] = await conn.query(
      `INSERT INTO components_shared_seos (meta_title, meta_description, keywords, meta_robots, canonical_url) VALUES (?, ?, ?, 'index,follow', ?)`,
      [fields.seo.metaTitle, fields.seo.metaDescription, fields.seo.keywords, `https://agrico.in/${slug}`]
    );
    const seoPubId = seoPubRes.insertId;

    // B. Insert Program (Draft & Published)
    const [progDraftRes] = await conn.query(
      `INSERT INTO programs (
        document_id, name, full_name, slug, duration, duration_text, fee, average_package,
        rating, position, show_apply_button, apply_button_text, view_button_text,
        short_description, created_at, updated_at, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 4.8, ?, 1, 'Get programme guidance', 'Explore syllabus', ?, ?, ?, NULL)`,
      [
        docId, fields.short_name || fields.name, fields.name, slug, durationNumber, fields.duration,
        feeNumber, avgPackage, i + 1, toStrapiBlocks(shortDesc), now, now
      ]
    );
    const progDraftId = progDraftRes.insertId;

    const [progPubRes] = await conn.query(
      `INSERT INTO programs (
        document_id, name, full_name, slug, duration, duration_text, fee, average_package,
        rating, position, show_apply_button, apply_button_text, view_button_text,
        short_description, created_at, updated_at, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 4.8, ?, 1, 'Get programme guidance', 'Explore syllabus', ?, ?, ?, ?)`,
      [
        docId, fields.short_name || fields.name, fields.name, slug, durationNumber, fields.duration,
        feeNumber, avgPackage, i + 1, toStrapiBlocks(shortDesc), now, now, now
      ]
    );
    const progPubId = progPubRes.insertId;

    // C. Link SEO in programs_cmps
    await conn.query(
      "INSERT INTO programs_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, 'shared.seo', 'seo', NULL)",
      [progDraftId, seoDraftId]
    );
    await conn.query(
      "INSERT INTO programs_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, 'shared.seo', 'seo', NULL)",
      [progPubId, seoPubId]
    );

    // D. Highlights in components_home_highlights & programs_cmps
    const highlightsData = [
      { key: 'Duration', value: fields.duration },
      { key: 'Curriculum standard', value: 'ICAR Deans Committee' },
      { key: 'Practical framework', value: 'Student READY / In-plant' },
      { key: 'Admissions route', value: 'CUET-UG / State CETs' }
    ];
    for (let hIdx = 0; hIdx < highlightsData.length; hIdx++) {
      const h = highlightsData[hIdx];
      const [hDraftRes] = await conn.query(
        'INSERT INTO components_home_highlights (`key`, `value`) VALUES (?, ?)',
        [h.key, h.value]
      );
      const [hPubRes] = await conn.query(
        'INSERT INTO components_home_highlights (`key`, `value`) VALUES (?, ?)',
        [h.key, h.value]
      );
      await conn.query(
        "INSERT INTO programs_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, 'home.highlights', 'highlights', ?)",
        [progDraftId, hDraftRes.insertId, hIdx + 1]
      );
      await conn.query(
        "INSERT INTO programs_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, 'home.highlights', 'highlights', ?)",
        [progPubId, hPubRes.insertId, hIdx + 1]
      );
    }

    // E. Insert HTML Content Component & University Content Document
    const htmlSectionData = fields.content[0];
    const [htmlDraftRes] = await conn.query(
      'INSERT INTO components_common_html_sections (name, code) VALUES (?, ?)',
      [htmlSectionData.name, JSON.stringify(htmlSectionData.code)]
    );
    const htmlDraftId = htmlDraftRes.insertId;

    const [htmlPubRes] = await conn.query(
      'INSERT INTO components_common_html_sections (name, code) VALUES (?, ?)',
      [htmlSectionData.name, JSON.stringify(htmlSectionData.code)]
    );
    const htmlPubId = htmlPubRes.insertId;

    // University content doc
    const contentDocId = generateDocumentId();
    const contentSlug = `${slug}--overview`;
    const [uContentDraftRes] = await conn.query(
      `INSERT INTO university_contents (
        document_id, name, slug, heading, display_name, section_key, secondary_slug, position, created_at, updated_at, published_at
      ) VALUES (?, ?, ?, ?, 'Overview', 'about', 'overview', 1, ?, ?, NULL)`,
      [contentDocId, `${fields.name} · Overview`, contentSlug, fields.name, now, now]
    );
    const uContentDraftId = uContentDraftRes.insertId;

    const [uContentPubRes] = await conn.query(
      `INSERT INTO university_contents (
        document_id, name, slug, heading, display_name, section_key, secondary_slug, position, created_at, updated_at, published_at
      ) VALUES (?, ?, ?, ?, 'Overview', 'about', 'overview', 1, ?, ?, ?)`,
      [contentDocId, `${fields.name} · Overview`, contentSlug, fields.name, now, now, now]
    );
    const uContentPubId = uContentPubRes.insertId;

    // Link HTML component to university_content
    await conn.query(
      "INSERT INTO university_contents_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, 'common.html-section', 'content', 1)",
      [uContentDraftId, htmlDraftId]
    );
    await conn.query(
      "INSERT INTO university_contents_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, 'common.html-section', 'content', 1)",
      [uContentPubId, htmlPubId]
    );

    // Link SEO to university_content
    await conn.query(
      "INSERT INTO university_contents_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, 'shared.seo', 'seo', NULL)",
      [uContentDraftId, seoDraftId]
    );
    await conn.query(
      "INSERT INTO university_contents_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, 'shared.seo', 'seo', NULL)",
      [uContentPubId, seoPubId]
    );

    // Link university_contents to program in university_contents_program_lnk
    await conn.query(
      'INSERT INTO university_contents_program_lnk (university_content_id, program_id, university_content_ord) VALUES (?, ?, 1)',
      [uContentDraftId, progDraftId]
    );
    await conn.query(
      'INSERT INTO university_contents_program_lnk (university_content_id, program_id, university_content_ord) VALUES (?, ?, 1)',
      [uContentPubId, progPubId]
    );

    // F. Link Taxonomy: Course, Stream, Mode, Type, DurationType
    // Determine course tax
    let courseTax = courses.bscAgri;
    if (slug === 'bsc-horticulture') courseTax = courses.bscHort;
    else if (slug === 'btech-agricultural-engineering') courseTax = courses.btechEng;
    else if (slug === 'bfsc-fisheries-science') courseTax = courses.bfscFish;
    else if (slug === 'bvsc-animal-husbandry') courseTax = courses.bvscVet;
    else if (slug === 'bsc-agribusiness') courseTax = courses.bscAgriBus;
    else if (slug.startsWith('msc-')) courseTax = courses.mscAgri;
    else if (slug === 'mba-agribusiness') courseTax = courses.mbaAgri;
    else if (slug === 'diploma-agriculture') courseTax = courses.dipAgri;

    await conn.query('INSERT INTO programs_course_lnk (program_id, course_id, program_ord) VALUES (?, ?, 1)', [progDraftId, courseTax.draftId]);
    await conn.query('INSERT INTO programs_course_lnk (program_id, course_id, program_ord) VALUES (?, ?, 1)', [progPubId, courseTax.pubId]);

    // Determine stream tax
    let streamTax = streams.agriculture;
    if (slug.includes('horticulture') || slug.includes('fruit') || slug.includes('vegetable') || slug.includes('floriculture')) streamTax = streams.horticulture;
    else if (slug.includes('engineering')) streamTax = streams.engineering;
    else if (slug.includes('fisheries')) streamTax = streams.fisheries;
    else if (slug.includes('animal') || slug.includes('bvsc')) streamTax = streams.veterinary;
    else if (slug.includes('agribusiness')) streamTax = streams.agribusiness;

    await conn.query('INSERT INTO programs_stream_lnk (program_id, stream_id) VALUES (?, ?)', [progDraftId, streamTax.draftId]);
    await conn.query('INSERT INTO programs_stream_lnk (program_id, stream_id) VALUES (?, ?)', [progPubId, streamTax.pubId]);

    await conn.query('INSERT INTO programs_course_mode_lnk (program_id, course_mode_id) VALUES (?, ?)', [progDraftId, modeFullTime.draftId]);
    await conn.query('INSERT INTO programs_course_mode_lnk (program_id, course_mode_id) VALUES (?, ?)', [progPubId, modeFullTime.pubId]);

    const cTypeTax = slug === 'diploma-agriculture' ? typeDiploma : typeDegree;
    await conn.query('INSERT INTO programs_course_type_lnk (program_id, course_type_id) VALUES (?, ?)', [progDraftId, cTypeTax.draftId]);
    await conn.query('INSERT INTO programs_course_type_lnk (program_id, course_type_id) VALUES (?, ?)', [progPubId, cTypeTax.pubId]);

    await conn.query('INSERT INTO programs_duration_type_lnk (program_id, duration_type_id) VALUES (?, ?)', [progDraftId, durationYears.draftId]);
    await conn.query('INSERT INTO programs_duration_type_lnk (program_id, duration_type_id) VALUES (?, ?)', [progPubId, durationYears.pubId]);

    // G. Link Universities
    // Match universities offering this programme
    const uniSlugsToLink = [];
    if (slug === 'bvsc-animal-husbandry') {
      uniSlugsToLink.push('khalsa-college-of-veterinary-and-animal-sciences');
    } else if (slug === 'bfsc-fisheries-science') {
      uniSlugsToLink.push('centurion-university-of-technology-and-management');
    } else if (slug === 'btech-agricultural-engineering') {
      uniSlugsToLink.push('centurion-university-of-technology-and-management');
      uniSlugsToLink.push('khalsa-college-amritsar');
    } else {
      // General agriculture/horticulture/crop sciences
      uniSlugsToLink.push('adhiparasakthi-agricultural-college');
      uniSlugsToLink.push('adhiyamaan-college-of-agriculture-and-research');
      uniSlugsToLink.push('centurion-university-of-technology-and-management');
      uniSlugsToLink.push('j-k-k-munirajah-college-of-agricultural-science');
      uniSlugsToLink.push('khalsa-college-amritsar');
    }

    let uniOrd = 1;
    for (const uSlug of uniSlugsToLink) {
      const uDraftId = uniDraftMap.get(uSlug);
      const uPubId = uniPubMap.get(uSlug);
      if (uDraftId && uPubId) {
        await conn.query(
          'INSERT INTO programs_universities_lnk (program_id, university_id, program_ord, university_ord) VALUES (?, ?, ?, 1)',
          [progDraftId, uDraftId, uniOrd]
        );
        await conn.query(
          'INSERT INTO programs_universities_lnk (program_id, university_id, program_ord, university_ord) VALUES (?, ?, ?, 1)',
          [progPubId, uPubId, uniOrd]
        );
        uniOrd++;
      }
    }

    count++;
    console.log(`[${count}/18] Imported: ${fields.name} (${slug}) -> docId: ${docId}, universities linked: ${uniOrd - 1}`);
  }

  console.log(`\nSuccessfully imported all ${count} programmes into Strapi MySQL CMS!`);

  // Verify counts
  const [progCount] = await conn.query('SELECT COUNT(*) as total, SUM(published_at IS NOT NULL) as published FROM programs');
  console.log('Programs count in DB:', progCount[0]);

  const [uContentCount] = await conn.query('SELECT COUNT(*) as total, SUM(published_at IS NOT NULL) as published FROM university_contents');
  console.log('University contents count in DB:', uContentCount[0]);

  await conn.end();
}

run().catch((err) => {
  console.error('Import failed with error:', err);
  process.exit(1);
});
