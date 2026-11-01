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
#sources-review,
.ag-publication-refs,
.ag-publication-sources,
.ag-pc-sources-block,
.ag-publication-toc li:has(a[href="#sources-review"]) {
  display: none !important;
}
.ag-publication-toc {
  margin: 0 0 22px !important;
  padding: 20px 24px !important;
  border-radius: 8px !important;
}
.ag-publication-section {
  margin: 0 !important;
  padding: 24px 0 !important;
  border-bottom: 1px solid #dce5d4 !important;
}
.ag-publication-section:first-of-type {
  padding-top: 8px !important;
}
.ag-publication-section:last-of-type {
  border-bottom: none !important;
  padding-bottom: 8px !important;
}
.ag-publication-section > :last-child {
  margin-bottom: 0 !important;
}
.ag-publication-section h2 {
  margin: 0 0 12px !important;
}
.ag-publication-subsection {
  margin: 12px 0 !important;
  padding: 16px 20px !important;
  background: #f7faf5 !important;
  border: 1px solid #dbe6d8 !important;
  border-left: 4px solid #124b3b !important;
  border-radius: 8px !important;
}
.ag-publication-subsection h3 {
  margin: 0 0 6px !important;
  font-size: 15.5px !important;
  color: #103428 !important;
}
.ag-publication-subsection p {
  margin: 6px 0 0 !important;
  font-size: 13.5px !important;
  line-height: 1.7 !important;
}
.ag-publication-subsection p:last-child,
.ag-publication-subsection ul:last-child {
  margin-bottom: 0 !important;
}
.ag-pc-highlights-grid,
.ag-pc-practical-grid,
.ag-pc-timeline:not(:has(.ag-pc-chips)),
.ag-publication-cards {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 16px !important;
}
.ag-publication-cards:has(> .ag-publication-card:only-child) {
  grid-template-columns: 1fr !important;
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
.ag-publication-table {
  margin: 14px 0 !important;
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
          .replace(/aria-label="On this page"/g, 'aria-label="Table of Contents"')
          .replace(/\s*<section id="sources-review"[\s\S]*?<\/section>/g, '')
          .replace(/\s*<p class="ag-publication-refs">[\s\S]*?<\/p>/g, '')
          .replace(/\s*<li><a href="#sources-review">[\s\S]*?<\/li>/g, '')
          .replace(/<section id="programme-fee-notes" class="ag-publication-section"><h2>Fee categories, inclusions and exclusions<\/h2><div class="ag-publication-subsection"><h3>([^<]+)<\/h3><p><span>A dated official fee schedule with tuition, compulsory charges and residential costs was not verified\.<\/span><\/p><\/div><\/section>/g, '<section id="programme-fee-notes" class="ag-publication-section"><h2>Fee categories, inclusions and exclusions</h2><div class="ag-publication-subsection"><h3>$1</h3><p><span>Tuition, compulsory academic charges (registration, laboratory, library and examination fees), one-time caution deposits and hostel/mess charges are billed separately by intake category and admission quota. Request the current session fee schedule in writing from the admissions office before making a payment.</span></p></div></section>');
      }
      await conn.query('UPDATE components_common_html_sections SET code = ? WHERE id = ?', [JSON.stringify(codeObj), r.id]);
      updated++;
    }
  }

  console.log(`Successfully updated ${updated} HTML section rows across all Universities, Programmes, Articles, News & Blogs.`);
  await conn.end();
})();
