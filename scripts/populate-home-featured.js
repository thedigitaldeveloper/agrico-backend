const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config({ path: 'd:/agrico-backend/.env' });

function randomDocId() {
  return crypto.randomBytes(12).toString('hex');
}

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    user: process.env.DATABASE_USERNAME || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'agrico',
    port: process.env.DATABASE_PORT || 3306
  });

  try {
    const topSlugs = [
      'lovely-professional-university',
      'chandigarh-university',
      'amrita-vishwa-vidyapeetham',
      'centurion-university-of-technology-and-management',
      'adhiparasakthi-agricultural-college'
    ];

    const [publishedUnis] = await conn.query(
      'SELECT id, name, slug FROM universities WHERE slug IN (?) AND published_at IS NOT NULL',
      [topSlugs]
    );

    // Maintain exact order
    const orderedUnis = topSlugs
      .map(s => publishedUnis.find(u => u.slug === s))
      .filter(Boolean);

    console.log('Selected Top 5 Universities:', orderedUnis.map(u => u.name));

    // Check if homes already exists
    const [existingHomes] = await conn.query('SELECT id, document_id FROM homes LIMIT 2');
    
    let draftId, pubId, docId;
    const now = new Date();

    if (existingHomes.length > 0) {
      docId = existingHomes[0].document_id;
      const [draft] = await conn.query('SELECT id FROM homes WHERE document_id = ? AND published_at IS NULL', [docId]);
      const [pub] = await conn.query('SELECT id FROM homes WHERE document_id = ? AND published_at IS NOT NULL', [docId]);
      draftId = draft[0]?.id;
      pubId = pub[0]?.id;
      console.log('Using existing homes docId:', docId, 'draftId:', draftId, 'pubId:', pubId);
    } else {
      docId = randomDocId();
      // Insert draft
      const [draftRes] = await conn.query(
        'INSERT INTO homes (document_id, name, created_at, updated_at, published_at) VALUES (?, ?, ?, ?, NULL)',
        [docId, 'Agrico — Agriculture Education Platform', now, now]
      );
      draftId = draftRes.insertId;

      // Insert published
      const [pubRes] = await conn.query(
        'INSERT INTO homes (document_id, name, created_at, updated_at, published_at) VALUES (?, ?, ?, ?, ?)',
        [docId, 'Agrico — Agriculture Education Platform', now, now, now]
      );
      pubId = pubRes.insertId;
      console.log('Created homes rows. docId:', docId, 'draftId:', draftId, 'pubId:', pubId);
    }

    // Clean existing homes_cmps for featured_universities
    await conn.query("DELETE FROM homes_cmps WHERE entity_id IN (?, ?) AND field = 'featured_universities'", [draftId, pubId]);

    // Insert selections
    for (let i = 0; i < orderedUnis.length; i++) {
      const u = orderedUnis[i];
      const order = i + 1;

      // Create component row
      const [cmpRes] = await conn.query('INSERT INTO components_home_university_selections () VALUES ()');
      const cmpId = cmpRes.insertId;

      // Link to university
      await conn.query(
        'INSERT INTO components_home_university_selections_university_lnk (university_selection_id, university_id) VALUES (?, ?)',
        [cmpId, u.id]
      );

      // Link to draft home
      await conn.query(
        "INSERT INTO homes_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, 'home.university-selection', 'featured_universities', ?)",
        [draftId, cmpId, order]
      );

      // Link to published home
      await conn.query(
        "INSERT INTO homes_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, 'home.university-selection', 'featured_universities', ?)",
        [pubId, cmpId, order]
      );
    }

    console.log('Successfully linked Top 5 Universities into Strapi CMS featured_universities!');
  } finally {
    await conn.end();
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});

