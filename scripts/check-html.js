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
    SELECT chs.name, chs.code
    FROM components_common_html_sections chs
    JOIN university_contents_cmps cmps ON chs.id = cmps.cmp_id AND cmps.component_type = 'common.html-section'
    JOIN university_contents uc ON cmps.entity_id = uc.id
    WHERE uc.slug = 'bsc-agriculture--overview'
    LIMIT 1
  `);
  if (rows.length > 0) {
    const code = typeof rows[0].code === 'string' ? JSON.parse(rows[0].code) : rows[0].code;
    const html = code.html || '';
    const match = html.match(/<section id="quick-facts"[\s\S]*?<\/section>/);
    console.log('quick-facts HTML:\n', match ? match[0].slice(0, 600) : 'not found');
  }
  await conn.end();
}

check().catch(console.error);

