const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config({ path: 'd:/agrico-backend/.env' });

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    user: process.env.DATABASE_USERNAME || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'agrico',
    port: process.env.DATABASE_PORT || 3306
  });

  // Read the updated agrico-programme-content.css from frontend
  const updatedCss = fs.readFileSync('d:/agrico-frontend/src/components/agrico/agrico-programme-content.css', 'utf8') + `
.ag-eyebrow {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
}
.ag-publication-table table {
  width: 100% !important;
  table-layout: auto !important;
  min-width: 0 !important;
}
.ag-publication-table thead th,
.ag-publication-table tbody th,
.ag-publication-table tbody td {
  white-space: normal !important;
  word-break: normal !important;
  overflow-wrap: break-word !important;
  max-width: none !important;
}
.ag-publication-table tbody th {
  width: 26% !important;
  min-width: 165px !important;
}
`;

  // Clean up orphaned components_common_html_sections not referenced by university_contents_cmps
  await conn.query(`
    DELETE FROM components_common_html_sections
    WHERE id NOT IN (
      SELECT cmp_id FROM university_contents_cmps WHERE component_type = 'common.html-section'
    )
  `);

  const [rows] = await conn.query('SELECT id, code FROM components_common_html_sections');
  console.log(`Updating CSS in ${rows.length} active components_common_html_sections rows...`);

  let updated = 0;
  for (const r of rows) {
    const codeObj = typeof r.code === 'string' ? JSON.parse(r.code) : r.code;
    if (codeObj && typeof codeObj === 'object') {
      codeObj.css = updatedCss;
      await conn.query('UPDATE components_common_html_sections SET code = ? WHERE id = ?', [JSON.stringify(codeObj), r.id]);
      updated++;
    }
  }

  console.log(`Successfully updated ${updated} HTML section rows across all Universities, Programmes, Articles, News & Blogs.`);
  await conn.end();
})();

