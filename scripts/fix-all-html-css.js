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

  const updatedCss = fs.readFileSync('d:/agrico-frontend/src/components/agrico/agrico-programme-content.css', 'utf8') + `
.ag-eyebrow {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
}
.ag-pc-highlights-grid,
.ag-pc-practical-grid,
.ag-pc-timeline:not(:has(.ag-pc-chips)),
.ag-publication-cards {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 16px !important;
}
@media (max-width: 640px) {
  .ag-pc-highlights-grid,
  .ag-pc-practical-grid,
  .ag-pc-timeline:not(:has(.ag-pc-chips)),
  .ag-publication-cards {
    grid-template-columns: 1fr !important;
  }
}
.ag-publication-toc ol,
.ag-publication-sources {
  list-style: decimal !important;
  padding-left: 22px !important;
}
.ag-publication-toc li,
.ag-publication-sources li {
  display: list-item !important;
  list-style-type: decimal !important;
  padding-left: 4px !important;
}
.ag-publication-toc li::marker,
.ag-publication-sources li::marker {
  color: #215945;
  font-weight: 700;
  font-size: 13px;
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

  const [rows] = await conn.query('SELECT id, code FROM components_common_html_sections');
  console.log(`Updating TOC heading & numbered list CSS in ${rows.length} active components_common_html_sections rows...`);

  let updated = 0;
  for (const r of rows) {
    const codeObj = typeof r.code === 'string' ? JSON.parse(r.code) : r.code;
    if (codeObj && typeof codeObj === 'object') {
      codeObj.css = updatedCss;
      if (typeof codeObj.html === 'string') {
        codeObj.html = codeObj.html
          .replace(/<h2>Find what you need<\/h2>/g, '<h2>Table of Contents</h2>')
          .replace(/aria-label="On this page"/g, 'aria-label="Table of Contents"');
      }
      await conn.query('UPDATE components_common_html_sections SET code = ? WHERE id = ?', [JSON.stringify(codeObj), r.id]);
      updated++;
    }
  }

  console.log(`Successfully updated ${updated} HTML section rows across all Universities, Programmes, Articles, News & Blogs.`);
  await conn.end();
})();
