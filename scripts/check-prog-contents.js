const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/agrico-backend/.env' });

async function check() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: 'agrico'
  });
  const [rows] = await conn.query(`
    SELECT uc.id, uc.slug, uc.secondary_slug, uc.display_name, uc.published_at
    FROM university_contents uc
    JOIN university_contents_program_lnk lnk ON uc.id = lnk.university_content_id
    JOIN programs p ON lnk.program_id = p.id
    WHERE p.slug = 'bsc-agriculture'
  `);
  console.log('bsc-agriculture university_contents:', rows);
  await conn.end();
}

check().catch(console.error);

