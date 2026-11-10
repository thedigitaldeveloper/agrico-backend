const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

function resolveContentDir() {
  const candidates = [
    process.env.AGRICO_CONTENT_DIR,
    path.resolve(__dirname, '../../agrico-frontend/docs/content/universities-2026-10-30'),
    'd:/agrico-frontend/docs/content/universities-2026-10-30',
    '/home/agrishodh/htdocs/agrishodh.com/docs/content/universities-2026-10-30',
    '/home/agrishodh/agrico-frontend/docs/content/universities-2026-10-30',
    path.resolve(__dirname, '../content-sync'),
  ].filter(Boolean);
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'publication.json'))) return dir;
  }
  throw new Error('Could not locate universities-2026-10-30 content directory. Set AGRICO_CONTENT_DIR.');
}

function genDocId() {
  return crypto.randomBytes(12).toString('hex');
}

function cleanNextImageUrls(html) {
  if (typeof html !== 'string') return html;
  return html
    .replace(/\s+srcSet="[^"]*"/gi, '')
    .replace(/\s+srcset="[^"]*"/gi, '')
    .replace(/\s+style="color:transparent"/gi, '')
    .replace(/src="\/_next\/image\?url=([^"&]+)(?:&amp;|&)[^"]*"/gi, (_m, encoded) => {
      try {
        return `src="${decodeURIComponent(encoded)}"`;
      } catch {
        return _m;
      }
    });
}

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    user: process.env.DATABASE_USERNAME || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'agrico',
    port: Number(process.env.DATABASE_PORT || 3306),
  });

  const contentDir = resolveContentDir();
  const pub = JSON.parse(
    fs.readFileSync(path.join(contentDir, 'publication.json'), 'utf8')
  );
  const contentPlan = JSON.parse(
    fs.readFileSync(path.join(contentDir, 'cms-content-import-plan.json'), 'utf8')
  );
  const htmlPlan = JSON.parse(
    fs.readFileSync(path.join(contentDir, 'cms-html-content-import-plan.json'), 'utf8')
  );

  const now = new Date('2026-11-01T10:00:00.000Z');

  // 1. Ensure all 74 universities exist in `universities` (both draft & published)
  const [existingUniRows] = await conn.query('SELECT id, document_id, slug, published_at FROM universities');
  const uniBySlug = new Map();
  for (const r of existingUniRows) {
    const entry = uniBySlug.get(r.slug) || { docId: r.document_id, draftId: null, pubId: null };
    if (r.published_at) entry.pubId = r.id;
    else entry.draftId = r.id;
    uniBySlug.set(r.slug, entry);
  }

  let insertedUnis = 0;
  let updatedUnis = 0;
  for (let i = 0; i < contentPlan.universities.length; i++) {
    const u = contentPlan.universities[i];
    const f = u.fields;
    const existing = uniBySlug.get(u.slug);
    if (!existing) {
      const docId = genDocId();
      const [resDraft] = await conn.query(
        `INSERT INTO universities (document_id, name, full_name, slug, country, state, city, address, established_year, heading, show_apply_button, show_similar_universities, position, agriculture_content, created_at, updated_at, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?, ?, NULL)`,
        [
          docId,
          f.name,
          f.name,
          f.slug,
          f.country || 'India',
          f.state,
          f.city,
          f.address,
          f.established_year,
          f.name,
          i + 1,
          JSON.stringify(f.agriculture_content),
          now,
          now,
        ]
      );
      const [resPub] = await conn.query(
        `INSERT INTO universities (document_id, name, full_name, slug, country, state, city, address, established_year, heading, show_apply_button, show_similar_universities, position, agriculture_content, created_at, updated_at, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?, ?, ?)`,
        [
          docId,
          f.name,
          f.name,
          f.slug,
          f.country || 'India',
          f.state,
          f.city,
          f.address,
          f.established_year,
          f.name,
          i + 1,
          JSON.stringify(f.agriculture_content),
          now,
          now,
          now,
        ]
      );
      uniBySlug.set(u.slug, { docId, draftId: resDraft.insertId, pubId: resPub.insertId });
      insertedUnis++;
    } else {
      await conn.query('UPDATE universities SET agriculture_content = ? WHERE slug = ?', [
        JSON.stringify(f.agriculture_content),
        u.slug,
      ]);
      updatedUnis++;
    }
  }
  console.log(`Universities in MySQL: inserted ${insertedUnis} new (draft+pub), updated ${updatedUnis} existing.`);

  // 2. Ensure all 814 (74 x 11) university_contents + components_common_html_sections exist
  const [existingUcRows] = await conn.query(`
    SELECT uc.id, uc.document_id, uc.secondary_slug, uc.published_at, u.slug AS uni_slug
    FROM university_contents uc
    JOIN university_contents_university_lnk lnk ON lnk.university_content_id = uc.id
    JOIN universities u ON u.id = lnk.university_id
  `);
  const ucMap = new Map();
  for (const r of existingUcRows) {
    const key = `${r.uni_slug}::${r.secondary_slug}`;
    const entry = ucMap.get(key) || { docId: r.document_id, draftId: null, pubId: null };
    if (r.published_at) entry.pubId = r.id;
    else entry.draftId = r.id;
    ucMap.set(key, entry);
  }

  let insertedTabs = 0;
  for (const rec of htmlPlan.records) {
    const uniSlug = rec.matching_key.university_slug;
    const secSlug = rec.matching_key.secondary_slug;
    const key = `${uniSlug}::${secSlug}`;
    const uEntry = uniBySlug.get(uniSlug);
    if (!uEntry) continue;

    const comp = rec.fields.content[0];
    const cleanCode = {
      html: cleanNextImageUrls(comp.code.html),
      css: comp.code.css,
    };

    const existingUc = ucMap.get(key);
    if (!existingUc) {
      const docId = genDocId();
      const insertUcVariant = async (uniRowId, pubDate) => {
        if (!uniRowId) return;
        const [ucRes] = await conn.query(
          `INSERT INTO university_contents (document_id, name, slug, heading, display_name, position, secondary_slug, created_at, updated_at, published_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            docId,
            rec.fields.name,
            rec.fields.slug,
            rec.fields.heading,
            rec.fields.display_name,
            rec.fields.position,
            secSlug,
            now,
            now,
            pubDate,
          ]
        );
        const ucId = ucRes.insertId;
        await conn.query(
          `INSERT INTO university_contents_university_lnk (university_content_id, university_id, university_content_ord)
           VALUES (?, ?, ?)`,
          [ucId, uniRowId, rec.fields.position + 1]
        );
        const [cmpRes] = await conn.query(
          `INSERT INTO components_common_html_sections (name, code) VALUES (?, ?)`,
          [comp.name, JSON.stringify(cleanCode)]
        );
        await conn.query(
          `INSERT INTO university_contents_cmps (entity_id, cmp_id, component_type, field, \`order\`)
           VALUES (?, ?, 'common.html-section', 'content', 1)`,
          [ucId, cmpRes.insertId]
        );
      };

      await insertUcVariant(uEntry.draftId, null);
      await insertUcVariant(uEntry.pubId, now);
      insertedTabs++;
    }
  }
  console.log(`Inserted ${insertedTabs} new university tab records (draft+pub) into university_contents.`);

  // 3. Ensure all 117 editorial posts exist in `blogs`
  const [existingBlogs] = await conn.query('SELECT id, slug FROM blogs');
  const existingBlogSlugs = new Set(existingBlogs.map((b) => b.slug));
  const htmlPostBySlug = new Map(htmlPlan.posts.map((p) => [p.matching_key.slug, p]));
  let insertedBlogs = 0;

  for (const postPlan of contentPlan.posts) {
    if (existingBlogSlugs.has(postPlan.slug)) continue;
    const f = postPlan.fields;
    const htmlRec = htmlPostBySlug.get(postPlan.slug);
    const bodyHtml = htmlRec?.fields?.body_html;
    const cleanCode = bodyHtml
      ? { html: cleanNextImageUrls(bodyHtml.code.html), css: bodyHtml.code.css }
      : null;

    const docId = genDocId();
    const revDate = new Date(f.reviewed_at || '2026-10-31T00:00:00.000Z');

    for (const pubDate of [null, now]) {
      const [bRes] = await conn.query(
        `INSERT INTO blogs (document_id, name, slug, date_time, author_name, reviewed_at, description, type, editorial_content, created_at, updated_at, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          docId,
          f.name,
          f.slug,
          revDate,
          f.author_name || 'Agrico Editorial',
          revDate,
          f.description,
          f.type,
          JSON.stringify(f.editorial_content),
          now,
          now,
          pubDate,
        ]
      );
      if (cleanCode) {
        const [cmpRes] = await conn.query(
          `INSERT INTO components_common_html_sections (name, code) VALUES (?, ?)`,
          [bodyHtml.name || 'Agrico · Editorial', JSON.stringify(cleanCode)]
        );
        await conn.query(
          `INSERT INTO blogs_cmps (entity_id, cmp_id, component_type, field, \`order\`)
           VALUES (?, ?, 'common.html-section', 'body_html', 1)`,
          [bRes.insertId, cmpRes.insertId]
        );
      }
    }
    insertedBlogs++;
  }
  console.log(`Inserted ${insertedBlogs} new editorial posts into blogs.`);

  // 4. Populate `files` and `files_related_mph` for all 74 universities
  const [allUniRows] = await conn.query('SELECT id, slug FROM universities');
  const uniIdsBySlug = new Map();
  for (const r of allUniRows) {
    const arr = uniIdsBySlug.get(r.slug) || [];
    arr.push(r.id);
    uniIdsBySlug.set(r.slug, arr);
  }

  await conn.query("DELETE FROM files_related_mph WHERE related_type = 'api::university.university'");
  await conn.query("DELETE FROM files WHERE folder_path = '/institutions'");

  let mediaFilesCreated = 0;
  let mediaLinksCreated = 0;

  for (const inst of pub.institutions) {
    const uIds = uniIdsBySlug.get(inst.slug) || [];
    if (!uIds.length) continue;

    const logo = inst.hero_media?.find((m) => m.role === 'logo') || inst.hero_media?.find((m) => m.role === 'card_logo');
    const cardLogo = inst.hero_media?.find((m) => m.role === 'card_logo') || logo;
    const campus = inst.hero_media?.find((m) => m.role === 'campus_primary');

    const insertMedia = async (m, roleLabel) => {
      if (!m || !m.src) return null;
      const extMatch = m.src.match(/(\.[a-z0-9]+)$/i);
      const ext = extMatch ? extMatch[1].toLowerCase() : '.png';
      const mime =
        ext === '.svg'
          ? 'image/svg+xml'
          : ext === '.jpg' || ext === '.jpeg'
          ? 'image/jpeg'
          : ext === '.webp'
          ? 'image/webp'
          : 'image/png';
      const hash = `${inst.slug}_${roleLabel}`;
      const [res] = await conn.query(
        `INSERT INTO files (document_id, name, alternative_text, caption, width, height, hash, ext, mime, size, url, provider, folder_path, created_at, updated_at, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 24.5, ?, 'local', '/institutions', ?, ?, ?)`,
        [
          genDocId(),
          `${inst.name} — ${roleLabel}`,
          m.alt || inst.name,
          m.caption || m.alt || inst.name,
          m.width || 400,
          m.height || 300,
          hash,
          ext,
          mime,
          m.src,
          now,
          now,
          now,
        ]
      );
      mediaFilesCreated++;
      return res.insertId;
    };

    const logoFileId = await insertMedia(logo, 'logo');
    const cardLogoFileId = cardLogo && cardLogo.src !== logo?.src ? await insertMedia(cardLogo, 'card_logo') : logoFileId;
    const campusFileId = await insertMedia(campus, 'campus');

    for (const uId of uIds) {
      if (logoFileId) {
        await conn.query(
          "INSERT INTO files_related_mph (file_id, related_id, related_type, field, `order`) VALUES (?, ?, 'api::university.university', 'logo', 1)",
          [logoFileId, uId]
        );
        mediaLinksCreated++;
      }
      if (cardLogoFileId) {
        await conn.query(
          "INSERT INTO files_related_mph (file_id, related_id, related_type, field, `order`) VALUES (?, ?, 'api::university.university', 'card_logo', 1)",
          [cardLogoFileId, uId]
        );
        mediaLinksCreated++;
      }
      if (campusFileId) {
        await conn.query(
          "INSERT INTO files_related_mph (file_id, related_id, related_type, field, `order`) VALUES (?, ?, 'api::university.university', 'image', 1)",
          [campusFileId, uId]
        );
        mediaLinksCreated++;
      }
    }
  }
  console.log(`Created ${mediaFilesCreated} media files and ${mediaLinksCreated} university media links for ${pub.institutions.length} universities.`);

  // 5. Link all 74 universities to their programmes in `programs_universities_lnk`
  const rawPack = JSON.parse(
    fs.readFileSync(path.join(contentDir, 'institutions.json'), 'utf8')
  );
  const [progRows] = await conn.query('SELECT id, slug FROM programs');
  const progIdsBySlug = new Map();
  for (const r of progRows) {
    const arr = progIdsBySlug.get(r.slug) || [];
    arr.push(r.id);
    progIdsBySlug.set(r.slug, arr);
  }

  await conn.query('DELETE FROM programs_universities_lnk');
  let progLinks = 0;

  const mapProgSlug = (name) => {
    if (/agricultur.*engineer|engineer.*agricultur/i.test(name)) return 'btech-agricultural-engineering';
    if (/diploma/i.test(name) && /agricultur/i.test(name)) return 'diploma-agriculture';
    if (/M\.?\s*B\.?\s*A/i.test(name) && /agri/i.test(name)) return 'mba-agribusiness';
    if (/M\.?\s*Sc/i.test(name) && /agronomy|agricultur/i.test(name)) return 'msc-agronomy';
    if (/B\.?\s*Sc/i.test(name) && /horticultur/i.test(name)) return 'bsc-horticulture';
    if (/B\.?\s*Sc/i.test(name) && /agricultur/i.test(name)) return 'bsc-agriculture';
    return null;
  };

  for (const inst of rawPack.institutions) {
    const uIds = uniIdsBySlug.get(inst.slug) || [];
    if (!uIds.length) continue;
    const matchedProgSlugs = new Set(
      (inst.programmes || []).map((p) => mapProgSlug(p.name)).filter(Boolean)
    );
    for (const pSlug of matchedProgSlugs) {
      const pIds = progIdsBySlug.get(pSlug) || [];
      for (const pId of pIds) {
        for (const uId of uIds) {
          await conn.query(
            'INSERT INTO programs_universities_lnk (program_id, university_id) VALUES (?, ?)',
            [pId, uId]
          );
          progLinks++;
        }
      }
    }
  }
  console.log(`Linked ${progLinks} rows in programs_universities_lnk across all 74 universities.`);

  await conn.end();
})();
