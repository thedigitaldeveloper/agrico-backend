const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/agrico-backend/.env' });

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    user: process.env.DATABASE_USERNAME || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'agrico',
    port: process.env.DATABASE_PORT || 3306
  });

  const [rows] = await conn.query(`
    SELECT uc.id, uc.name, uc.slug, uc.secondary_slug, uc.display_name, uc.section_key 
    FROM university_contents uc 
    JOIN university_contents_university_lnk lnk ON uc.id = lnk.university_content_id 
    JOIN universities u ON lnk.university_id = u.id 
    WHERE u.slug = 'adhiparasakthi-agricultural-college' AND uc.published_at IS NOT NULL
  `);
  console.log('Sections for adhiparasakthi-agricultural-college:', rows);

  const [tabs] = await conn.query(`
    SELECT DISTINCT secondary_slug, display_name, section_key FROM university_contents WHERE published_at IS NOT NULL LIMIT 20
  `);
  console.log('Sample distinct section types across university_contents:', tabs);

  await conn.end();
}

check().catch(console.error);

