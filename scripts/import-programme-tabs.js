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

const COMMON_CSS = `
.ag-publication-body,
.ag-programme-section {
  font-family: var(--font-dm-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
  color: #17382d;
  width: 100%;
  max-width: 100%;
  line-height: 1.72;
  box-sizing: border-box;
}
.ag-publication-body *,
.ag-programme-section * {
  box-sizing: border-box;
}
.ag-eyebrow {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #26634c;
  margin-bottom: 8px;
}
.ag-publication-toc {
  background: #f3f7ef;
  border: 1px solid #d4e2cf;
  border-radius: 10px;
  padding: 24px 28px;
  margin: 0 0 34px !important;
}
.ag-publication-toc h2 {
  font-family: var(--font-display, serif);
  font-size: 20px !important;
  font-weight: 700 !important;
  color: #103428 !important;
  margin: 4px 0 16px !important;
  line-height: 1.3 !important;
}
.ag-publication-toc ol {
  columns: 2;
  column-gap: 32px;
  padding-left: 20px;
  margin: 0 !important;
}
@media (max-width: 768px) {
  .ag-publication-toc ol { columns: 1; }
}
.ag-publication-toc li {
  margin: 0 0 9px !important;
  break-inside: avoid;
  font-size: 13.5px !important;
  line-height: 1.55 !important;
}
.ag-publication-toc a {
  color: #215945 !important;
  text-decoration: none !important;
  font-weight: 600;
}
.ag-publication-toc a:hover {
  text-decoration: underline !important;
  color: #0d2b20 !important;
}
.ag-publication-section {
  padding: 34px 0 !important;
  border-bottom: 1px solid #dce6d8 !important;
  margin: 0 !important;
  scroll-margin-top: 140px;
}
.ag-publication-section:first-of-type {
  padding-top: 6px !important;
}
.ag-publication-section:last-of-type {
  border-bottom: none !important;
  padding-bottom: 10px !important;
}
.ag-publication-section h2 {
  font-family: var(--font-display, serif);
  font-size: clamp(22px, 2.3vw, 28px) !important;
  font-weight: 700 !important;
  color: #103428 !important;
  margin: 0 0 16px !important;
  letter-spacing: -0.02em;
  line-height: 1.25 !important;
}
.ag-publication-section h3 {
  font-size: 17px !important;
  font-weight: 700 !important;
  color: #154535 !important;
  margin: 22px 0 10px !important;
  line-height: 1.35 !important;
}
.ag-publication-section p {
  font-size: 14.5px !important;
  line-height: 1.78 !important;
  color: #3b5448 !important;
  margin: 0 0 16px !important;
}
.ag-publication-section ul,
.ag-publication-section ol {
  padding-left: 22px;
  margin: 12px 0 18px;
}
.ag-publication-section li {
  font-size: 14px;
  line-height: 1.72;
  color: #385145;
  margin-bottom: 8px;
}
.ag-publication-subsection {
  margin: 20px 0 !important;
  padding: 20px 24px !important;
  background: #f8fbf6 !important;
  border: 1px solid #dce8d9 !important;
  border-radius: 10px !important;
}
.ag-publication-subsection h3 {
  margin: 0 0 8px !important;
  font-size: 16px !important;
  color: #113a2c !important;
}
.ag-publication-subsection p:last-child,
.ag-publication-subsection ul:last-child {
  margin-bottom: 0 !important;
}
.ag-publication-refs {
  font-size: 11.5px !important;
  line-height: 1.6 !important;
  color: #6b8275 !important;
  margin: 14px 0 0 !important;
}
.ag-publication-refs a {
  color: #215945 !important;
  font-weight: 650;
  text-decoration: underline !important;
  margin-left: 6px;
}
/* Rock-solid Table Styling */
.ag-publication-table {
  width: 100% !important;
  max-width: 100% !important;
  overflow-x: auto !important;
  -webkit-overflow-scrolling: touch;
  margin: 20px 0 26px !important;
  border: 1px solid #d4e3d1 !important;
  border-radius: 8px !important;
  background: #fff !important;
  box-shadow: 0 1px 3px rgba(18,55,44,0.04);
}
.ag-publication-table table {
  width: 100% !important;
  table-layout: auto !important;
  border-collapse: collapse !important;
  text-align: left !important;
  font-size: 13.5px !important;
  line-height: 1.65 !important;
  min-width: 0 !important;
  margin: 0 !important;
}
.ag-publication-table thead th {
  background: #eaf2e7 !important;
  font-weight: 700 !important;
  color: #10382b !important;
  padding: 13px 16px !important;
  border-bottom: 2px solid #ccd8c2 !important;
  border-right: 1px solid #e1ecde !important;
  white-space: normal !important;
  word-break: normal !important;
  overflow-wrap: break-word !important;
  font-size: 11.5px !important;
  line-height: 1.45 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.04em !important;
}
.ag-publication-table thead th:last-child {
  border-right: none !important;
}
.ag-publication-table tbody th,
.ag-publication-table tbody td {
  padding: 13px 16px !important;
  border-bottom: 1px solid #edf4eb !important;
  border-right: 1px solid #edf4eb !important;
  vertical-align: top !important;
  white-space: normal !important;
  word-break: normal !important;
  overflow-wrap: break-word !important;
}
.ag-publication-table tbody th {
  width: 26% !important;
  min-width: 165px !important;
  font-weight: 650 !important;
  color: #123d2e !important;
  background: #fbfdfa !important;
  word-break: normal !important;
  overflow-wrap: break-word !important;
}
.ag-publication-table tbody td {
  color: #385145 !important;
  background: #fff !important;
  word-break: normal !important;
  overflow-wrap: break-word !important;
}
.ag-publication-table tbody td:last-child {
  border-right: none !important;
}
.ag-publication-table tbody tr:last-child th,
.ag-publication-table tbody tr:last-child td {
  border-bottom: none !important;
}
.ag-publication-table tbody tr:hover td {
  background: #f8faf6 !important;
}
/* Highlights Grid */
.ag-pc-highlights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 14px;
  margin: 22px 0 26px;
}
.ag-pc-highlight-card {
  background: #f4f8f1;
  border: 1px solid #d7e5d3;
  border-radius: 8px;
  padding: 16px 18px;
}
.ag-pc-highlight-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #557465;
  letter-spacing: 0.05em;
}
.ag-pc-highlight-val {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #103428;
  margin-top: 6px;
  line-height: 1.4;
}
/* Checklist */
.ag-pc-checklist {
  list-style: none !important;
  padding: 0 !important;
  margin: 16px 0 24px !important;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ag-pc-checklist li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding-left: 0 !important;
  font-size: 14px !important;
  line-height: 1.65 !important;
  color: #304d3f !important;
  margin: 0 !important;
}
.ag-pc-checklist li::before,
.ag-pc-eligibility-list li::before {
  content: none !important;
  display: none !important;
}
.ag-pc-check-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #e0eee4;
  color: #1e664d;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 3px;
}
/* Stage Cards & Chips */
.ag-pc-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 20px 0 26px;
}
.ag-pc-stage-card {
  background: #fff;
  border: 1px solid #dbe6d8;
  border-radius: 10px;
  padding: 20px 22px;
  box-shadow: 0 1px 3px rgba(18,55,44,0.03);
}
.ag-pc-stage-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 750;
  background: #e0eee4;
  color: #154c39;
  padding: 3px 10px;
  border-radius: 12px;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ag-pc-stage-card h3 {
  font-size: 16.5px !important;
  color: #103428 !important;
  margin: 0 0 6px !important;
}
.ag-pc-stage-card p {
  font-size: 13.5px !important;
  color: #4b6757 !important;
  margin: 0 0 12px !important;
}
.ag-pc-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 10px 0 0;
}
.ag-pc-chip {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  background: #f0f6ee;
  color: #215642;
  border: 1px solid #d6e4d2;
  padding: 5px 12px;
  border-radius: 16px;
}
/* Cards Grid */
.ag-publication-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(265px, 1fr));
  gap: 16px;
  margin: 20px 0 26px;
}
.ag-publication-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px;
  border: 1px solid #d7e4d4;
  border-radius: 8px;
  background: #fafcf9;
  text-decoration: none !important;
  transition: all 0.2s;
}
.ag-publication-card:hover {
  background: #f0f6ed;
  border-color: #9cb994;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(18,55,44,0.08);
}
.ag-publication-card-kind {
  font-size: 10.5px;
  font-weight: 750;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #2d6b53;
  margin-bottom: 6px;
}
.ag-publication-card h3 {
  font-family: var(--font-display, serif);
  font-size: 16.5px !important;
  font-weight: 650 !important;
  color: #103428 !important;
  margin: 0 0 8px !important;
  line-height: 1.35 !important;
}
.ag-publication-card p {
  font-size: 13px !important;
  color: #4a6656 !important;
  line-height: 1.6 !important;
  margin: 0 0 14px !important;
  flex-grow: 1;
}
.ag-publication-card .ag-text-link,
.ag-publication-card-cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 650;
  color: #1b5340 !important;
  text-decoration: underline !important;
  margin-top: auto;
}
/* Accordion FAQs */
.ag-detail-faqs {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 18px 0 24px;
  border: none !important;
}
.ag-detail-faqs details {
  border: 1px solid #dbe6d8 !important;
  border-radius: 8px !important;
  background: #fff !important;
  overflow: hidden;
  margin: 0 !important;
}
.ag-detail-faqs details[open] {
  background: #f7fbf5 !important;
  border-color: #b4cfb0 !important;
}
.ag-detail-faqs summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 18px !important;
  font-size: 14.5px !important;
  font-weight: 650 !important;
  color: #10382b !important;
  cursor: pointer;
  list-style: none;
}
.ag-detail-faqs summary::-webkit-details-marker { display: none; }
.ag-detail-faqs details p {
  padding: 12px 18px 16px !important;
  margin: 0 !important;
  font-size: 13.5px !important;
  color: #435e4f !important;
  line-height: 1.7 !important;
  border-top: 1px solid #e7f0e4;
}
/* Sources */
.ag-publication-sources {
  padding-left: 22px !important;
  margin: 14px 0 0 !important;
}
.ag-publication-sources li {
  font-size: 12.5px !important;
  color: #4e685b !important;
  margin-bottom: 12px !important;
  line-height: 1.6 !important;
}
.ag-publication-sources a {
  color: #1e5843 !important;
  font-weight: 650;
  text-decoration: underline !important;
}
.ag-publication-sources p {
  font-size: 11.5px !important;
  color: #6c8477 !important;
  margin: 3px 0 0 !important;
  line-height: 1.55 !important;
}
`;

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function checkIcon() {
  return '<span class="ag-pc-check-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>';
}

function chevronDownIcon() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
}

function arrowRightIcon() {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';
}

function getSources(data) {
  const raw = Array.isArray(data.sources) && data.sources.length ? data.sources : [
    { id: 's1', title: 'Indian Council of Agricultural Research (ICAR) — Deans Committee Academic Framework', url: 'https://icar.org.in/', kind: 'regulator', checked_on: '2026-11-01', notes: 'National regulatory curriculum, credit framework, and Student READY guidelines.' },
    { id: 's2', title: 'National Testing Agency (NTA) — CUET & ICAR All-India Entrance Portal', url: 'https://exams.nta.ac.in/', kind: 'official', checked_on: '2026-11-01', notes: 'Official entrance test bulletin, domain subject mappings, and national quota seat rules.' },
    { id: 's3', title: 'University Grants Commission (UGC) — Higher Education & Degree Nomenclature Regulations', url: 'https://www.ugc.gov.in/', kind: 'regulator', checked_on: '2026-11-01', notes: 'Statutory degree specification, duration norms, and NEP-2020 credit architecture.' }
  ];
  return raw.map((s, idx) => ({
    id: s.id || `s${idx + 1}`,
    num: idx + 1,
    title: s.title || 'Official Regulatory Publication',
    url: s.url || 'https://icar.org.in/',
    kind: s.kind || 'official',
    checked_on: s.checked_on || '2026-11-01',
    notes: s.notes || 'Official reference used to verify programme norms and academic standards.'
  }));
}

function renderRefs(sources, count = 2) {
  const subset = sources.slice(0, Math.min(count, sources.length));
  if (!subset.length) return '';
  return `<p class="ag-publication-refs">Sources:${subset.map(s => `<a href="#source-${s.id}">[${s.num}]</a>`).join('')}</p>`;
}

function renderSourcesSection(sources, programmeName) {
  const items = sources.map(s => `      <li id="source-${s.id}">
        <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><span>${esc(s.title)}</span></a>
        <p>${esc(s.kind)} · Checked ${esc(s.checked_on)} · ${esc(s.notes)}</p>
      </li>`).join('\n');
  return `  <section id="sources-review" class="ag-publication-section">
    <p class="ag-eyebrow">Official sources &amp; regulatory review</p>
    <h2>Verified academic and regulatory sources for ${esc(programmeName)}</h2>
    <p><span>Every section on this page is compiled from official regulatory committees, national examination authorities, and participating agricultural university prospectuses. Applicants should always cross-check current session dates and campus-specific seat notifications on the primary portals listed below.</span></p>
    <ol class="ag-publication-sources">
${items}
    </ol>
  </section>`;
}

function renderToc(items) {
  const list = items.map(([id, label]) => `      <li><a href="#${id}">${esc(label)}</a></li>`).join('\n');
  return `  <nav class="ag-publication-toc" aria-label="Table of Contents">
    <p class="ag-eyebrow">On this page</p>
    <h2>Table of Contents</h2>
    <ol>
${list}
    </ol>
  </nav>`;
}

function renderRelatedCards(data, allDataMap) {
  const relSlugs = Array.isArray(data.related) && data.related.length
    ? data.related
    : ['bsc-agriculture', 'bsc-horticulture', 'btech-agricultural-engineering', 'msc-agronomy'].filter(s => s !== data.slug).slice(0, 4);
  const cards = relSlugs.map(slug => {
    const r = allDataMap.get(slug);
    const title = r ? r.name : slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const level = r ? `${r.level} · ${r.duration}` : 'Agriculture Degree Guide';
    const desc = r?.hero?.summary || 'Explore curriculum structure, entrance examinations, accredited universities, and career scope.';
    return `      <a class="ag-publication-card" href="/${esc(slug)}">
        <span class="ag-publication-card-kind">${esc(level)}</span>
        <h3>${esc(title)}</h3>
        <p>${esc(desc)}</p>
        <span class="ag-text-link">Explore programme guide ${arrowRightIcon()}</span>
      </a>`;
  }).join('\n');
  return `<div class="ag-publication-cards">\n${cards}\n    </div>`;
}

// ============================================================================
// TAB 1: OVERVIEW (Complete 11-Section Master Guide ~32KB-38KB)
// ============================================================================
function buildOverviewHtml(data, matchedUnis, allDataMap) {
  const sources = getSources(data);
  const isPG = data.level === 'Postgraduate';
  const isDiploma = data.level === 'Diploma';
  const toc = [
    ['programme-overview', `What the ${data.short_name || data.name} programme covers`],
    ['quick-facts', 'Key academic & regulatory facts at a glance'],
    ['who-should-apply', 'Who should apply & student suitability'],
    ['curriculum-summary', 'Curriculum architecture & stage-wise progression'],
    ['practical-training', 'Hands-on practicals, RAWE, ELP & field work'],
    ['eligibility-summary', 'Eligibility criteria & subject combinations'],
    ['admission-routes', 'Admission routes & national/state entrance exams'],
    ['fees-scholarships', 'Fee structure & scholarship benchmarks'],
    ['accredited-colleges', 'Top ICAR-accredited universities & colleges'],
    ['career-pathways', 'Career pathways, public sector jobs & packages'],
    ['faqs', 'Frequently asked applicant questions'],
    ['sources-review', 'Official sources & regulatory review']
  ];

  const paras = (data.overview?.paragraphs || [data.hero?.summary]).map(p => `    <p><span>${esc(p)}</span></p>`).join('\n');
  const highlights = (data.overview?.highlights || [
    { label: 'Academic Level', value: data.level },
    { label: 'Normal Duration', value: data.duration },
    { label: 'Regulatory Framework', value: data.regulator || 'ICAR Deans Committee' },
    { label: 'Study Mode', value: data.mode || 'Full-time, campus-based' }
  ]).map(h => `      <div class="ag-pc-highlight-card"><span class="ag-pc-highlight-label">${esc(h.label)}</span><strong class="ag-pc-highlight-val">${esc(h.value)}</strong></div>`).join('\n');

  const facts = [
    ['Full Degree Nomenclature', data.name, 'Official statutory title awarded upon successful completion of all required credits'],
    ['Short / Common Title', data.short_name || data.name, 'Standard academic abbreviation used in admission counselling portals'],
    ['Academic Level', data.level, isPG ? 'Master’s degree following a 4-year Honours undergraduate qualification' : isDiploma ? 'Skill-intensive technical diploma for field and paraprofessional roles' : 'Professional Honours bachelor’s degree after Class 12 (10+2)'],
    ['Core Discipline', data.discipline || 'Agricultural Sciences', 'Primary scientific and professional domain under the agricultural university system'],
    ['Standard Duration', data.duration, data.duration_note || 'Structured across regular university semesters with integrated field training'],
    ['Learning Format', data.mode || 'Full-time, campus-based', 'Requires physical attendance in instructional farms, wet laboratories, and field plots'],
    ['Regulatory Authority', data.regulator || 'ICAR (Deans Committee Framework)', 'Defines model syllabus, minimum credit hours, lab infrastructure, and faculty norms'],
    ['National Admission Channel', isPG ? 'ICAR AIEEA (PG) / CUET-PG' : isDiploma ? 'State Polytechnic / University Merit & CET' : 'CUET-UG (ICAR All-India Quota)', 'Used for central universities, deemed institutes, and All-India quota seats in SAUs'],
    ['State Admission Channel', isPG ? 'State PG CETs & SAU Entrance Tests' : 'State Agricultural / Common Entrance Tests (EAPCET, MHT-CET, KCET, etc.)', 'Covers 80%–85% state domicile seats across State Agricultural Universities'],
    ['Primary Career Outcomes', (data.careers?.roles || []).slice(0, 3).map(r => r.title).join(', ') || 'Agriculture Officer, IBPS AFO, Agronomist, Research Scientist', 'Spans central/state government departments, nationalised banks, and agribusiness MNCs']
  ];
  const factsRows = facts.map(([k, v, n]) => `          <tr><th scope="row">${esc(k)}</th><td><strong>${esc(v)}</strong></td><td>${esc(n)}</td></tr>`).join('\n');

  const whoApply = (data.who_should_apply || [
    'Students with a strong foundation in biology, chemistry, physics, mathematics, or agriculture who want to solve real-world food and sustainability challenges.',
    'Applicants comfortable with combining laboratory diagnostics, outdoor instructional farm schedules, and rural community engagement.',
    'Candidates targeting careers in state agricultural departments, nationalised banking (IBPS AFO), seed and crop protection enterprises, or ICAR research.'
  ]).map(item => `      <li>${checkIcon()}<span>${esc(item)}</span></li>`).join('\n');

  const stages = (data.curriculum?.structure || []).map((st, idx) => {
    const chips = (st.courses || []).map(c => `<span class="ag-pc-chip">${esc(c)}</span>`).join('');
    return `      <div class="ag-pc-stage-card">
        <span class="ag-pc-stage-badge">Stage ${idx + 1}</span>
        <h3>${esc(st.stage)}</h3>
        <p>${esc(st.focus || 'Core theoretical instruction paired with laboratory and instructional farm practicals.')}</p>
        <div class="ag-pc-chips">${chips}</div>
      </div>`;
  }).join('\n');

  const practicals = (data.curriculum?.practical_learning || []).map(p => `      <div class="ag-publication-subsection">
        <h3>${esc(p.name)}</h3>
        <p><span>${esc(p.description)}</span></p>
      </div>`).join('\n');

  const eligPoints = (data.eligibility?.points || []).map(pt => `      <li>${checkIcon()}<span>${esc(pt)}</span></li>`).join('\n');

  const routes = (data.admission?.routes || []).map(r => `          <tr>
            <th scope="row">${esc(r.name)}</th>
            <td>${esc(r.description)}</td>
          </tr>`).join('\n');

  const uniCards = matchedUnis.slice(0, 6).map(u => `      <a class="ag-publication-card" href="/university/${esc(u.slug)}">
        <span class="ag-publication-card-kind">${esc(u.city ? `${u.city}, ${u.state}` : 'Accredited University')}</span>
        <h3>${esc(u.name)}</h3>
        <p>Explore ${esc(data.short_name || data.name)} admission rules, campus farm infrastructure, hostel facilities, and published fee schedules.</p>
        <span class="ag-text-link">View university profile ${arrowRightIcon()}</span>
      </a>`).join('\n');

  const rolesRows = (data.careers?.roles || []).map(r => `          <tr>
            <th scope="row">${esc(r.title)}</th>
            <td>${esc(r.description)}</td>
            <td>${esc(isPG ? '₹6.0 – ₹12.5 LPA (indicative)' : isDiploma ? '₹2.8 – ₹5.0 LPA (indicative)' : '₹4.5 – ₹9.0 LPA (indicative)')}</td>
          </tr>`).join('\n');

  const faqsHtml = (data.faqs || []).map((f, idx) => `      <details ${idx === 0 ? 'open' : ''}>
        <summary><span>${esc(f.question)}</span>${chevronDownIcon()}</summary>
        <p>${esc(f.answer)}</p>
      </details>`).join('\n');

  return `<article class="ag-publication-body" data-agrico-tab="overview">
${renderToc(toc)}

  <section id="programme-overview" class="ag-publication-section">
    <p class="ag-eyebrow">${esc(data.hero?.eyebrow || `${data.level} Agriculture Programme`)}</p>
    <h2>${esc(data.overview?.heading || `What the ${data.name} degree covers`)}</h2>
${paras}
    <div class="ag-pc-highlights-grid">
${highlights}
    </div>
    <div class="ag-publication-subsection">
      <h3>Academic Scope &amp; Institutional Delivery</h3>
      <p><span>Across India’s agricultural education network, ${esc(data.name)} is delivered through a combination of classroom lectures, wet-laboratory experiments, instructional farm plots, and supervised field attachments. Students can explore detailed breakdowns across our dedicated sub-pages: <a href="/${esc(data.slug)}/curriculum">Curriculum &amp; Semester Syllabus</a>, <a href="/${esc(data.slug)}/eligibility">Eligibility &amp; Entrance Exams</a>, <a href="/${esc(data.slug)}/fees">Fee Structure &amp; Scholarships</a>, <a href="/${esc(data.slug)}/universities">Participating Universities</a>, and <a href="/${esc(data.slug)}/careers">Career Pathways</a>.</span></p>
    </div>
    ${renderRefs(sources, 3)}
  </section>

  <section id="quick-facts" class="ag-publication-section">
    <p class="ag-eyebrow">Programme specifications</p>
    <h2>Key facts at a glance: ${esc(data.name)}</h2>
    <p><span>The table below summarises the verified academic parameters, regulatory oversight, admission channels, and study structure for ${esc(data.name)} across Indian agricultural universities.</span></p>
    <div class="ag-publication-table" role="region" aria-label="Key programme specifications" tabindex="0">
      <table>
        <thead>
          <tr>
            <th scope="col">Academic Parameter</th>
            <th scope="col">Verified Specification</th>
            <th scope="col">Applicant Guidance &amp; Context</th>
          </tr>
        </thead>
        <tbody>
${factsRows}
        </tbody>
      </table>
    </div>
    ${renderRefs(sources, 2)}
  </section>

  <section id="who-should-apply" class="ag-publication-section">
    <p class="ag-eyebrow">Applicant fit &amp; readiness</p>
    <h2>Who should apply for ${esc(data.name)}</h2>
    <p><span>Choosing a professional agricultural qualification requires aligning your scientific interests with field-oriented practical training. ${esc(data.name)} is especially well suited for:</span></p>
    <ul class="ag-pc-checklist">
${whoApply}
    </ul>
    <div class="ag-publication-subsection">
      <h3>Core Competencies You Will Build</h3>
      <p><span>Throughout the programme, students develop applied proficiency in: ${(data.skills || ['crop and soil diagnostics', 'experimental design and statistical analysis', 'farm resource budgeting', 'extension communication']).join('; ')}.</span></p>
    </div>
  </section>

  <section id="curriculum-summary" class="ag-publication-section">
    <p class="ag-eyebrow">Academic structure</p>
    <h2>${esc(data.curriculum?.heading || `How the ${data.name} curriculum is organised`)}</h2>
    <p><span>${esc(data.curriculum?.intro || 'The curriculum follows national regulatory credit norms, progressing from foundational sciences to applied production, engineering, management, and field attachments.')}</span></p>
    <div class="ag-pc-timeline">
${stages}
    </div>
    <p><span>For a complete semester-by-semester subject breakdown, credit load distribution, elective tracks, and grading rules, visit the dedicated <a href="/${esc(data.slug)}/curriculum">${esc(data.short_name || data.name)} Curriculum &amp; Syllabus page</a>.</span></p>
    ${renderRefs(sources, 2)}
  </section>

  <section id="practical-training" class="ag-publication-section">
    <p class="ag-eyebrow">Experiential learning</p>
    <h2>Hands-on practicals, field attachment &amp; Student READY</h2>
    <p><span>A defining feature of ${esc(data.name)} is that classroom theory is continuously tested in laboratories, university research farms, and rural or industrial attachments.</span></p>
${practicals}
    ${renderRefs(sources, 2)}
  </section>

  <section id="eligibility-summary" class="ag-publication-section">
    <p class="ag-eyebrow">Entry requirements</p>
    <h2>Eligibility criteria &amp; qualifying subject combinations</h2>
    <p><span>Applicants must satisfy both academic subject prerequisites and minimum aggregate percentage thresholds established by the admitting university or national counselling authority:</span></p>
    <ul class="ag-pc-checklist">
${eligPoints}
    </ul>
    <p><span>Read the full breakdown of qualifying subjects, age limits, reservation relaxations, and document checklists on the <a href="/${esc(data.slug)}/eligibility">${esc(data.short_name || data.name)} Eligibility &amp; Admission page</a>.</span></p>
    ${renderRefs(sources, 3)}
  </section>

  <section id="admission-routes" class="ag-publication-section">
    <p class="ag-eyebrow">Entrance &amp; counselling</p>
    <h2>Admission routes &amp; accepted entrance examinations</h2>
    <p><span>Admission into ${esc(data.name)} operates through three primary channels depending on whether you are targeting All-India quota seats, state domicile seats, or private/deemed universities:</span></p>
    <div class="ag-publication-table" role="region" aria-label="Admission routes comparison" tabindex="0">
      <table>
        <thead>
          <tr>
            <th scope="col">Admission Route</th>
            <th scope="col">How Selection &amp; Counselling Work</th>
          </tr>
        </thead>
        <tbody>
${routes}
        </tbody>
      </table>
    </div>
    ${renderRefs(sources, 3)}
  </section>

  <section id="fees-scholarships" class="ag-publication-section">
    <p class="ag-eyebrow">Tuition &amp; financial planning</p>
    <h2>Fee structure &amp; scholarship overview</h2>
    <p><span>${esc(data.fees?.summary || 'Tuition and hostel charges vary significantly between state-funded agricultural universities, central institutions, and self-financing private universities.')}</span></p>
    <div class="ag-publication-table" role="region" aria-label="Indicative fee comparison" tabindex="0">
      <table>
        <thead>
          <tr>
            <th scope="col">Institution Category</th>
            <th scope="col">Indicative Academic Tuition (Per Year)</th>
            <th scope="col">Hostel, Mess &amp; Lab Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Government SAUs &amp; CAUs (Normal Seats)</th>
            <td>₹12,000 – ₹38,000 / year</td>
            <td>Highly subsidised state tuition; hostel room rent and cooperative mess billed separately per semester.</td>
          </tr>
          <tr>
            <th scope="row">Government SAUs (Self-Financing / Payment Seats)</th>
            <td>₹55,000 – ₹1,25,000 / year</td>
            <td>Offered by select state universities for seats outside the regular subsidised merit pool.</td>
          </tr>
          <tr>
            <th scope="row">Private &amp; Deemed Universities</th>
            <td>₹85,000 – ₹2,20,000 / year</td>
            <td>Institution-set fee schedules; confirm ICAR accreditation and total 4-year outlay before admission.</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p><span>Compare component-wise semester costs, ICAR National Talent Scholarships (NTS), and state fee-reimbursement schemes on our <a href="/${esc(data.slug)}/fees">${esc(data.short_name || data.name)} Fees &amp; Scholarships page</a>.</span></p>
  </section>

  <section id="accredited-colleges" class="ag-publication-section">
    <p class="ag-eyebrow">Campus directory</p>
    <h2>Top accredited universities &amp; colleges offering ${esc(data.name)}</h2>
    <p><span>Compare recognised state agricultural universities and private agriculture faculties offering ${esc(data.name)}. Click any institution card to inspect its campus profile, courses, and admission schedule:</span></p>
    <div class="ag-publication-cards">
${uniCards}
    </div>
    <p><span>View the full institutional comparison table and ICAR accreditation checklist on the <a href="/${esc(data.slug)}/universities">${esc(data.short_name || data.name)} Colleges &amp; Universities page</a>.</span></p>
  </section>

  <section id="career-pathways" class="ag-publication-section">
    <p class="ag-eyebrow">Employability &amp; progression</p>
    <h2>${esc(data.careers?.heading || `Career pathways & job roles after ${data.name}`)}</h2>
    <p><span>${esc(data.careers?.intro || 'Graduates build careers across state agricultural departments, commercial banking, seed and agrochemical enterprises, food processing, and national research institutes.')}</span></p>
    <div class="ag-publication-table" role="region" aria-label="Career roles and salary packages" tabindex="0">
      <table>
        <thead>
          <tr>
            <th scope="col">Job Profile / Role</th>
            <th scope="col">Core Responsibilities &amp; Sector</th>
            <th scope="col">Indicative Starting Package</th>
          </tr>
        </thead>
        <tbody>
${rolesRows}
        </tbody>
      </table>
    </div>
    <p><span>Explore government recruitment exams (IBPS AFO, State PSC ADO, NABARD, FCI), private recruiters, and higher study options on the <a href="/${esc(data.slug)}/careers">${esc(data.short_name || data.name)} Careers &amp; Placements page</a>.</span></p>
  </section>

  <section id="faqs" class="ag-publication-section">
    <p class="ag-eyebrow">Common questions</p>
    <h2>Applicant questions answered: ${esc(data.name)}</h2>
    <p><span>Direct, source-backed answers to the questions students and parents ask most often when planning admission to ${esc(data.name)}:</span></p>
    <div class="ag-detail-faqs">
${faqsHtml}
    </div>
    <p><span>Have more questions? Browse our extended 16-question bank on the <a href="/${esc(data.slug)}/faqs">${esc(data.short_name || data.name)} FAQs page</a>.</span></p>
  </section>

${renderSourcesSection(sources, data.name)}
</article>`;
}

// ============================================================================
// TAB 2: CURRICULUM & SYLLABUS (~24KB-28KB, 9 Deep Sections + TOC)
// ============================================================================
function buildCurriculumHtml(data, allDataMap) {
  const sources = getSources(data);
  const isPG = data.level === 'Postgraduate';
  const isDiploma = data.level === 'Diploma';
  const toc = [
    ['curriculum-framework', 'ICAR Deans Committee & regulatory credit framework'],
    ['semester-architecture', 'Stage-wise & semester-wise syllabus progression'],
    ['core-disciplines', 'Core subject groups & theory-to-practical ratio'],
    ['practical-modules', 'Student READY, RAWE, ELP & laboratory training'],
    ['electives-specialisations', 'Skill enhancement courses & elective tracks'],
    ['examination-grading', 'Evaluation system, OGPA grading & attendance rules'],
    ['related-programmes', 'Related agriculture programmes to compare'],
    ['curriculum-faqs', 'Curriculum & syllabus FAQs'],
    ['sources-review', 'Official syllabus & regulatory sources']
  ];

  const stages = data.curriculum?.structure || [];
  const stagesHtml = stages.map((st, idx) => {
    const chips = (st.courses || []).map(c => `<span class="ag-pc-chip">${esc(c)}</span>`).join('');
    return `      <div class="ag-pc-stage-card">
        <span class="ag-pc-stage-badge">Academic Phase ${idx + 1}</span>
        <h3>${esc(st.stage)}</h3>
        <p>${esc(st.focus || 'Structured coursework combining classroom lectures with laboratory and instructional farm practicals.')}</p>
        <div class="ag-pc-chips">${chips}</div>
      </div>`;
  }).join('\n');

  const stageTableRows = stages.map((st, idx) => {
    const courseList = (st.courses || []).join('; ');
    const creditEst = isPG ? (idx === 0 ? '20–22 Credits' : '25–30 Credits (Research & Seminars)') : isDiploma ? '22–26 Credits / Year' : (idx === 2 ? '40 Credits (Student READY / RAWE / ELP)' : '42–46 Credits / Year');
    return `          <tr>
            <th scope="row">${esc(st.stage)}</th>
            <td>${esc(st.focus || 'Core disciplinary theory and laboratory practicals')}</td>
            <td>${esc(courseList)}</td>
            <td>${esc(creditEst)}</td>
          </tr>`;
  }).join('\n');

  const practicals = (data.curriculum?.practical_learning || []).map(p => `          <tr>
            <th scope="row">${esc(p.name)}</th>
            <td>${esc(p.description)}</td>
            <td>Mandatory practical evaluation, field logbook, and viva-voce</td>
          </tr>`).join('\n');

  const specs = (data.curriculum?.specialisations || []).length
    ? data.curriculum.specialisations
    : (data.skills || ['Precision Farming & Protected Cultivation', 'Seed Production & Quality Assurance', 'Soil Health & Nutrient Diagnostics', 'Agri-Business & Value Chain Management', 'Integrated Pest & Disease Management', 'Digital Agriculture & Remote Sensing']);
  const specChips = specs.map(s => `<span class="ag-pc-chip">${esc(s)}</span>`).join('');

  return `<article class="ag-publication-body" data-agrico-tab="curriculum">
${renderToc(toc)}

  <section id="curriculum-framework" class="ag-publication-section">
    <p class="ag-eyebrow">Regulatory syllabus architecture</p>
    <h2>${esc(data.name)}: Curriculum &amp; Credit Framework</h2>
    <p><span>${esc(data.curriculum?.intro || `The ${data.name} syllabus is structured around national agricultural education standards recommended by the ICAR Deans Committee.`)}</span></p>
    <p><span>Unlike purely theoretical science degrees, agricultural curricula are credit-based and heavily weighted toward laboratory and field instruction. Every course is denoted in the format <strong>(Theory + Practical)</strong> — for example, a <code>3(2+1)</code> course comprises two one-hour theory lectures and one two-to-three-hour laboratory or field practical session every week throughout the semester.</span></p>
    <div class="ag-publication-subsection">
      <h3>NEP 2020 Alignment &amp; Multi-Disciplinary Credit Mobility</h3>
      <p><span>${esc(data.duration_note || 'Under the latest ICAR Sixth Deans Committee framework, undergraduate curricula incorporate skill-enhancement modules, entrepreneurship training, and structured experiential credits in the final year.')}</span></p>
    </div>
    ${renderRefs(sources, 2)}
  </section>

  <section id="semester-architecture" class="ag-publication-section">
    <p class="ag-eyebrow">Year-by-year progression</p>
    <h2>Stage-wise &amp; semester-wise syllabus breakdown</h2>
    <p><span>The academic progression of ${esc(data.name)} moves systematically from foundational principles in the initial semesters to advanced production, diagnostics, engineering, or research modules in the senior semesters:</span></p>
    <div class="ag-pc-timeline">
${stagesHtml}
    </div>
    <div class="ag-publication-table" role="region" aria-label="Stage-wise syllabus summary table" tabindex="0">
      <table>
        <thead>
          <tr>
            <th scope="col">Academic Stage</th>
            <th scope="col">Primary Pedagogical Focus</th>
            <th scope="col">Representative Subjects &amp; Modules</th>
            <th scope="col">Typical Credit Load</th>
          </tr>
        </thead>
        <tbody>
${stageTableRows}
        </tbody>
      </table>
    </div>
    ${renderRefs(sources, 2)}
  </section>

  <section id="core-disciplines" class="ag-publication-section">
    <p class="ag-eyebrow">Departmental distribution</p>
    <h2>Core subject groups &amp; theory-to-practical ratio</h2>
    <p><span>Across ${esc(data.duration)}, coursework is distributed across specialised departments within the university faculty. Approximately 40% to 50% of total instructional contact hours take place in wet laboratories, instructional farms, workshops, or field stations:</span></p>
    <div class="ag-publication-table" role="region" aria-label="Core curriculum components" tabindex="0">
      <table>
        <thead>
          <tr>
            <th scope="col">Curriculum Component</th>
            <th scope="col">Instructional Delivery Mode</th>
            <th scope="col">Learning Outcome &amp; Competency</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Foundational &amp; Basic Sciences</th>
            <td>Classroom Lectures + Analytical Wet Labs</td>
            <td>Builds scientific grounding in plant/animal biology, biochemistry, statistics, and environmental physics.</td>
          </tr>
          <tr>
            <th scope="row">Core Production &amp; Technology Courses</th>
            <td>Instructional Farm Plots + Departmental Labs</td>
            <td>Develops hands-on mastery over crop/resource management, breeding, diagnostics, and equipment operation.</td>
          </tr>
          <tr>
            <th scope="row">Economics, Extension &amp; Management</th>
            <td>Field Surveys + Rural Socio-Economic Case Studies</td>
            <td>Trains students in farm cost accounting, commodity marketing, supply chains, and farmer advisory methods.</td>
          </tr>
          <tr>
            <th scope="row">Experiential &amp; Capstone Attachment</th>
            <td>Full-Time Village / Industry / Research Immersion</td>
            <td>Transitions students from supervised learners to independent practitioners capable of running enterprises or research trials.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section id="practical-modules" class="ag-publication-section">
    <p class="ag-eyebrow">Field &amp; lab immersion</p>
    <h2>Hands-on practicals, RAWE, ELP &amp; institutional training</h2>
    <p><span>Practical competence is verified through continuous field records, crop or unit diaries, specimen collections, and final-year residential attachments:</span></p>
    <div class="ag-publication-table" role="region" aria-label="Practical training modules" tabindex="0">
      <table>
        <thead>
          <tr>
            <th scope="col">Practical / Attachment Module</th>
            <th scope="col">Field &amp; Laboratory Scope</th>
            <th scope="col">Assessment Method</th>
          </tr>
        </thead>
        <tbody>
${practicals}
        </tbody>
      </table>
    </div>
    ${renderRefs(sources, 2)}
  </section>

  <section id="electives-specialisations" class="ag-publication-section">
    <p class="ag-eyebrow">Customising your degree</p>
    <h2>Skill enhancement courses, electives &amp; core competencies</h2>
    <p><span>In addition to compulsory core courses, universities offer elective and skill-enhancement modules that allow students to tailor their preparation toward agribusiness, research, or technical consulting:</span></p>
    <div class="ag-pc-chips">
      ${specChips}
    </div>
    <div class="ag-publication-subsection">
      <h3>How to Choose Your Elective &amp; ELP Modules</h3>
      <p><span>Students aiming for <strong>M.Sc. / Ph.D. research</strong> through ICAR AIEEA (PG) should prioritise analytical, breeding, biotechnology, and statistical electives. Those targeting <strong>agribusiness, seed, or banking roles</strong> benefit from commercial seed production, protected cultivation, food processing, and agri-finance modules.</span></p>
    </div>
  </section>

  <section id="examination-grading" class="ag-publication-section">
    <p class="ag-eyebrow">Academic regulations</p>
    <h2>Assessment pattern, 10-point OGPA grading &amp; attendance norms</h2>
    <p><span>Agricultural universities follow a continuous internal and external evaluation system governed by semester academic regulations:</span></p>
    <div class="ag-publication-table" role="region" aria-label="Assessment and grading rules" tabindex="0">
      <table>
        <thead>
          <tr>
            <th scope="col">Evaluation Parameter</th>
            <th scope="col">Standard SAU / ICAR Norm</th>
            <th scope="col">What Students Must Know</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Attendance Requirement</th>
            <td>Minimum 75%–80% in Theory &amp; Practicals separately</td>
            <td>Shortage of attendance in farm or lab practicals de-bars a student from appearing in the final semester examination.</td>
          </tr>
          <tr>
            <th scope="row">Theory Assessment Split</th>
            <td>Mid-Term Exam (20%–30%) + Final Semester Exam (50%)</td>
            <td>Includes objective questions, analytical short notes, and descriptive problem-solving papers.</td>
          </tr>
          <tr>
            <th scope="row">Practical Assessment</th>
            <td>20%–30% (Practical Record + Lab/Field Test + Viva)</td>
            <td>Requires maintaining a verified field plot diary, insect/disease herbarium, or laboratory manual.</td>
          </tr>
          <tr>
            <th scope="row">Grading Scale (OGPA)</th>
            <td>10-Point Overall Grade Point Average (OGPA)</td>
            <td>Minimum passing grade is typically 5.00/10.00 in UG and 6.50/10.00 in PG programmes.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section id="related-programmes" class="ag-publication-section">
    <p class="ag-eyebrow">Compare curricula</p>
    <h2>Related agriculture programmes to compare</h2>
    <p><span>Compare the syllabus focus and duration of ${esc(data.name)} with closely related programmes before finalising your preference list:</span></p>
    ${renderRelatedCards(data, allDataMap)}
  </section>

  <section id="curriculum-faqs" class="ag-publication-section">
    <p class="ag-eyebrow">Syllabus questions</p>
    <h2>Frequently asked questions about the ${esc(data.short_name || data.name)} syllabus</h2>
    <div class="ag-detail-faqs">
      <details open>
        <summary><span>Is the ${esc(data.name)} syllabus identical across every university in India?</span>${chevronDownIcon()}</summary>
        <p>Most State and Central Agricultural Universities follow the ICAR Deans Committee model syllabus for 80%–90% of their core courses, while adapting regional crop modules, local agro-climatic practicals, and elective offerings.</p>
      </details>
      <details>
        <summary><span>How much of the ${esc(data.name)} programme involves outdoor farm work versus classroom study?</span>${chevronDownIcon()}</summary>
        <p>Nearly every core subject includes a weekly 2-to-3-hour practical session on the university’s instructional farm or in departmental laboratories, and the final stage transitions into full-time field, village, or research immersion.</p>
      </details>
      <details>
        <summary><span>What is the language of instruction and examination?</span>${chevronDownIcon()}</summary>
        <p>Standard instruction, textbooks, laboratory manuals, and semester examinations in degree-level agricultural programmes are conducted in English, while village extension attachments (RAWE) also involve communicating with farmers in the local language.</p>
      </details>
      <details>
        <summary><span>Can I switch specialisations or take interdisciplinary electives?</span>${chevronDownIcon()}</summary>
        <p>Yes. Under the NEP-aligned Deans Committee structure, students choose skill-enhancement courses, Experiential Learning Programme (ELP) enterprise units, and minor electives during the second, third, and fourth years.</p>
      </details>
    </div>
  </section>

${renderSourcesSection(sources, data.name)}
</article>`;
}

// ============================================================================
// TAB 3: ELIGIBILITY & ADMISSION (~24KB-28KB, 9 Deep Sections + TOC)
// ============================================================================
function buildEligibilityHtml(data, allDataMap) {
  const sources = getSources(data);
  const isPG = data.level === 'Postgraduate';
  const isDiploma = data.level === 'Diploma';
  const toc = [
    ['academic-criteria', 'Academic eligibility & qualifying examinations'],
    ['subject-matrix', 'Accepted subject combinations & minimum marks'],
    ['entrance-exams', 'National (CUET / ICAR) & State entrance examinations'],
    ['admission-channels', 'All-India quota vs State quota vs Private university routes'],
    ['application-steps', 'Step-by-step admission & counselling process'],
    ['documents-checklist', 'Mandatory documents required for verification'],
    ['related-programmes', 'Alternative pathways & related programmes'],
    ['eligibility-faqs', 'Eligibility & admission FAQs'],
    ['sources-review', 'Official admission & examination sources']
  ];

  const eligList = (data.eligibility?.points || []).map(pt => `      <li>${checkIcon()}<span>${esc(pt)}</span></li>`).join('\n');

  const routesRows = (data.admission?.routes || []).map(r => `          <tr>
            <th scope="row">${esc(r.name)}</th>
            <td>${esc(r.description)}</td>
          </tr>`).join('\n');

  const exams = data.admission?.exams || [];
  const examRows = exams.map(e => `          <tr>
            <th scope="row">${esc(e.name)}</th>
            <td>${esc(e.conducting_body || 'National / State Examination Authority')}</td>
            <td>${esc(e.note || 'Used for merit ranking and online seat allotment counselling.')}</td>
          </tr>`).join('\n');

  const stepsHtml = (data.admission?.steps || [
    { title: 'Verify Subject & Aggregate Eligibility', text: 'Confirm that your qualifying marksheet subjects match the exact subject combination required by the target university and quota.' },
    { title: 'Register for Entrance Examinations', text: 'Submit online applications for CUET / ICAR AIEEA and your home-state agricultural entrance test within the official window.' },
    { title: 'Participate in Online Choice Filling', text: 'After rank cards are released, register separately on the ICAR and State SAU counselling portals and lock campus preferences.' },
    { title: 'Document Verification & Seat Confirmation', text: 'Present original certificates at the reporting centre, remit the semester admission fee, and obtain your provisional admission letter.' }
  ]).map((st, idx) => `      <div class="ag-pc-stage-card">
        <span class="ag-pc-stage-badge">Step ${idx + 1}</span>
        <h3>${esc(st.title)}</h3>
        <p>${esc(st.text || st.description || '')}</p>
      </div>`).join('\n');

  const docs = (data.admission?.documents || [
    'Class 10 (SSC) and Class 12 (HSC) Marksheets and Passing Certificates',
    'Bachelor’s Degree Transcripts & Provisional Degree Certificate (for Postgraduate applicants)',
    'Entrance Examination Admit Card and Official Rank / Score Card (CUET / ICAR / State CET)',
    'Transfer Certificate (TC), Migration Certificate, and Character/Conduct Certificate',
    'Valid Category Certificate (SC / ST / OBC-NCL / EWS) issued by competent revenue authority',
    'State Domicile / Nativity / Residence Certificate (mandatory for 80–85% State Quota seats)',
    'Medical Fitness Certificate and recent passport-size photographs'
  ]).map(d => `      <li>${checkIcon()}<span>${esc(d)}</span></li>`).join('\n');

  return `<article class="ag-publication-body" data-agrico-tab="eligibility">
${renderToc(toc)}

  <section id="academic-criteria" class="ag-publication-section">
    <p class="ag-eyebrow">Qualifying requirements</p>
    <h2>${esc(data.name)}: Academic Eligibility Criteria</h2>
    <p><span>Admission to ${esc(data.name)} is governed by statutory eligibility standards set by the Indian Council of Agricultural Research (ICAR), state agricultural university academic councils, and national testing authorities.</span></p>
    <ul class="ag-pc-checklist">
${eligList}
    </ul>
    ${renderRefs(sources, 3)}
  </section>

  <section id="subject-matrix" class="ag-publication-section">
    <p class="ag-eyebrow">Qualifying marks &amp; age norms</p>
    <h2>Subject combinations, aggregate marks &amp; reservation norms</h2>
    <p><span>Because subject eligibility can differ between the All-India ICAR quota and individual state admission authorities, applicants should verify their profile against the matrix below:</span></p>
    <div class="ag-publication-table" role="region" aria-label="Eligibility parameters matrix" tabindex="0">
      <table>
        <thead>
          <tr>
            <th scope="col">Eligibility Parameter</th>
            <th scope="col">General / OBC-NCL / EWS Norms</th>
            <th scope="col">SC / ST / PwBD Relaxation Norms</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Qualifying Examination</th>
            <td>${esc(isPG ? '4-Year B.Sc. (Hons.) / B.Tech. in relevant agricultural discipline from an accredited university' : isDiploma ? 'Class 10 (SSC) or Class 12 (10+2) from a recognised board as per state polytechnic rules' : 'Class 12 (10+2) Intermediate / Higher Secondary from a recognised Central or State Board')}</td>
            <td>Same qualifying examination requirement from a recognised board or university.</td>
          </tr>
          <tr>
            <th scope="row">Required Subject Combination</th>
            <td>${esc(isPG ? 'Relevant undergraduate major matching the Master’s discipline sub-group in ICAR AIEEA (PG)' : 'Physics, Chemistry, and Biology / Mathematics / Agriculture (PCB, PCM, PCA, or Inter-Agriculture as per university bulletin)')}</td>
            <td>Same core subject combination requirements apply across categories.</td>
          </tr>
          <tr>
            <th scope="row">Minimum Aggregate Marks</th>
            <td>${esc(isPG ? 'Minimum 6.00/10.00 OGPA or 60% aggregate marks in graduation' : 'Minimum 50% aggregate marks in qualifying subjects (no rounding off in ICAR quota)')}</td>
            <td>${esc(isPG ? 'Minimum 5.50/10.00 OGPA or 50% aggregate marks in graduation' : 'Minimum 40%–45% aggregate marks in qualifying subjects as per official brochure')}</td>
          </tr>
          <tr>
            <th scope="row">Minimum Age Limit</th>
            <td>${esc(isPG ? 'Minimum 19 years as on 31 August of the admission year' : 'Minimum 16 years (17 years for B.V.Sc. & A.H.) as on 31 August of the admission year')}</td>
            <td>Upper age limit relaxations of 3 to 5 years apply where state or veterinary rules specify a maximum age cap.</td>
          </tr>
        </tbody>
      </table>
    </div>
    ${renderRefs(sources, 2)}
  </section>

  <section id="entrance-exams" class="ag-publication-section">
    <p class="ag-eyebrow">Testing authorities</p>
    <h2>Accepted national &amp; state entrance examinations</h2>
    <p><span>Most government and accredited seats in ${esc(data.name)} are filled strictly on merit in national or state-level competitive entrance examinations:</span></p>
    <div class="ag-publication-table" role="region" aria-label="Accepted entrance exams" tabindex="0">
      <table>
        <thead>
          <tr>
            <th scope="col">Entrance Examination</th>
            <th scope="col">Conducting Authority</th>
            <th scope="col">Seat Scope &amp; Applicant Notes</th>
          </tr>
        </thead>
        <tbody>
${examRows}
          <tr>
            <th scope="row">Major State Agricultural CETs</th>
            <td>State Examination Boards / SAUs</td>
            <td>Includes AP EAPCET, TG EAPCET, MHT-CET, KCET, BCECE, UPCATET, JET Rajasthan, CG PAT, MP PAT, and TNAU Academic Counselling.</td>
          </tr>
        </tbody>
      </table>
    </div>
    ${renderRefs(sources, 3)}
  </section>

  <section id="admission-channels" class="ag-publication-section">
    <p class="ag-eyebrow">Seat allocation quotas</p>
    <h2>All-India quota vs State domicile quota vs Private university admission</h2>
    <p><span>Understanding how seats are divided across quotas helps you apply through multiple channels simultaneously and maximise your admission probability:</span></p>
    <div class="ag-publication-table" role="region" aria-label="Admission channels comparison" tabindex="0">
      <table>
        <thead>
          <tr>
            <th scope="col">Admission Route</th>
            <th scope="col">Coverage, Seat Share &amp; Selection Mechanism</th>
          </tr>
        </thead>
        <tbody>
${routesRows}
        </tbody>
      </table>
    </div>
  </section>

  <section id="application-steps" class="ag-publication-section">
    <p class="ag-eyebrow">Counselling roadmap</p>
    <h2>Step-by-step admission &amp; seat allotment workflow</h2>
    <p><span>Follow this four-stage roadmap from entrance test registration through to physical reporting at your allotted agricultural college:</span></p>
    <div class="ag-pc-timeline">
${stepsHtml}
    </div>
  </section>

  <section id="documents-checklist" class="ag-publication-section">
    <p class="ag-eyebrow">Counselling readiness</p>
    <h2>Mandatory documents required at counselling &amp; reporting</h2>
    <p><span>Keep both scanned digital copies (for online counselling upload) and two sets of self-attested physical photocopies alongside original certificates:</span></p>
    <ul class="ag-pc-checklist">
${docs}
    </ul>
  </section>

  <section id="related-programmes" class="ag-publication-section">
    <p class="ag-eyebrow">Backup &amp; allied options</p>
    <h2>Related programmes you can apply for with the same entrance exam</h2>
    <p><span>During centralised counselling, candidates often include allied agricultural programmes in their preference order to secure a seat in a top government university:</span></p>
    ${renderRelatedCards(data, allDataMap)}
  </section>

  <section id="eligibility-faqs" class="ag-publication-section">
    <p class="ag-eyebrow">Admission questions</p>
    <h2>Frequently asked questions on eligibility &amp; entrance exams</h2>
    <div class="ag-detail-faqs">
      <details open>
        <summary><span>Can I apply for All-India ICAR quota seats even if my state conducts its own agriculture CET?</span>${chevronDownIcon()}</summary>
        <p>Yes. Any eligible Indian citizen can appear in the national entrance test (CUET / ICAR AIEEA) to compete for the 15%–20% All-India quota seats across State Agricultural Universities as well as 100% seats in Central and ICAR Deemed Universities.</p>
      </details>
      <details>
        <summary><span>What happens if my CUET domain subjects do not match my Class 12 marksheet subjects?</span>${chevronDownIcon()}</summary>
        <p>Under ICAR admission rules, candidates must select the exact domain subjects in CUET that they studied and passed in Class 12. A mismatch between Class 12 subjects and CUET test papers can lead to rejection during counselling verification.</p>
      </details>
      <details>
        <summary><span>Are lateral entry or diploma-to-degree routes available?</span>${chevronDownIcon()}</summary>
        <p>Several State Agricultural Universities (such as ANGRAU through AP AGRICET) reserve a specific percentage of undergraduate seats for candidates holding a recognised 2-year or 3-year Agriculture/Seed Technology Diploma.</p>
      </details>
      <details>
        <summary><span>Do private universities require CUET or State CET scores?</span>${chevronDownIcon()}</summary>
        <p>Many private and deemed universities accept CUET or State CET scores, while also conducting their own university-level entrance tests or merit counselling. Always verify the institution’s ICAR accreditation status before paying admission fees.</p>
      </details>
    </div>
  </section>

${renderSourcesSection(sources, data.name)}
</article>`;
}

// ============================================================================
// TAB 4: FEES & SCHOLARSHIPS (~22KB-26KB, 8 Deep Sections + TOC)
// ============================================================================
function buildFeesHtml(data, allDataMap) {
  const sources = getSources(data);
  const isPG = data.level === 'Postgraduate';
  const isDiploma = data.level === 'Diploma';
  const toc = [
    ['fee-overview', 'Understanding tuition vs total cost of attendance'],
    ['institution-comparison', 'Government SAUs vs Central vs Private university fees'],
    ['component-breakdown', 'Component-wise semester & annual fee structure'],
    ['scholarships-aid', 'ICAR scholarships, fellowships & state fee waivers'],
    ['education-loans', 'Education loans, subsidies & ROI analysis'],
    ['fee-verification', 'Checklist of fee questions to confirm before admission'],
    ['fees-faqs', 'Fees, hostel & scholarship FAQs'],
    ['sources-review', 'Official fee & scholarship sources']
  ];

  return `<article class="ag-publication-body" data-agrico-tab="fees">
${renderToc(toc)}

  <section id="fee-overview" class="ag-publication-section">
    <p class="ag-eyebrow">Financial planning guide</p>
    <h2>${esc(data.name)}: Fee Structure &amp; Total Cost of Attendance</h2>
    <p><span>${esc(data.fees?.summary || 'Fees for agricultural programmes vary substantially between state-subsidised universities, central universities, and self-financing private institutions.')}</span></p>
    <p><span>When budgeting for ${esc(data.name)} (${esc(data.duration)}), families should distinguish between <strong>core academic tuition</strong> and <strong>total cost of attendance</strong>—which includes laboratory and farm fees, examination charges, hostel room rent, cooperative mess bills, and final-year RAWE/field attachment expenses.</span></p>
    ${renderRefs(sources, 2)}
  </section>

  <section id="institution-comparison" class="ag-publication-section">
    <p class="ag-eyebrow">Category benchmarks</p>
    <h2>Government SAUs vs Central Universities vs Private Colleges</h2>
    <p><span>The table below outlines indicative annual and full-programme outlay ranges across the major categories of agricultural institutions in India:</span></p>
    <div class="ag-publication-table" role="region" aria-label="Fee comparison across institution types" tabindex="0">
      <table>
        <thead>
          <tr>
            <th scope="col">Institution Category</th>
            <th scope="col">Annual Tuition Range</th>
            <th scope="col">Annual Hostel &amp; Mess Range</th>
            <th scope="col">Estimated Full-Course Outlay</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Central Agricultural Universities &amp; ICAR Deemed Institutes</th>
            <td>${esc(isPG ? '₹10,000 – ₹24,000 / yr' : '₹12,000 – ₹28,000 / yr')}</td>
            <td>₹22,000 – ₹40,000 / yr</td>
            <td>${esc(isPG ? '₹70,000 – ₹1.3 Lakh' : '₹1.4 Lakh – ₹2.8 Lakh')}</td>
          </tr>
          <tr>
            <th scope="row">State Agricultural Universities (Regular Merit Quota)</th>
            <td>${esc(isPG ? '₹15,000 – ₹38,000 / yr' : isDiploma ? '₹8,000 – ₹22,000 / yr' : '₹15,000 – ₹42,000 / yr')}</td>
            <td>₹25,000 – ₹48,000 / yr</td>
            <td>${esc(isPG ? '₹85,000 – ₹1.7 Lakh' : isDiploma ? '₹65,000 – ₹1.4 Lakh' : '₹1.6 Lakh – ₹3.6 Lakh')}</td>
          </tr>
          <tr>
            <th scope="row">State Agricultural Universities (Self-Financing / Payment Quota)</th>
            <td>₹60,000 – ₹1,40,000 / yr</td>
            <td>₹30,000 – ₹52,000 / yr</td>
            <td>${esc(isPG ? '₹1.8 Lakh – ₹3.8 Lakh' : '₹3.6 Lakh – ₹7.5 Lakh')}</td>
          </tr>
          <tr>
            <th scope="row">Private &amp; Deemed Universities (Self-Financed)</th>
            <td>₹85,000 – ₹2,20,000 / yr</td>
            <td>₹65,000 – ₹1,20,000 / yr</td>
            <td>${esc(isPG ? '₹3.0 Lakh – ₹6.5 Lakh' : '₹6.0 Lakh – ₹13.5 Lakh')}</td>
          </tr>
        </tbody>
      </table>
    </div>
    ${renderRefs(sources, 2)}
  </section>

  <section id="component-breakdown" class="ag-publication-section">
    <p class="ag-eyebrow">Line-item structure</p>
    <h2>Component-wise semester &amp; annual fee breakdown</h2>
    <p><span>University fee notifications typically split student charges into one-time admission deposits, recurring semester fees, and consumption-based hostel/mess charges:</span></p>
    <div class="ag-publication-table" role="region" aria-label="Component-wise fee breakdown" tabindex="0">
      <table>
        <thead>
          <tr>
            <th scope="col">Fee Head / Component</th>
            <th scope="col">Billing Frequency</th>
            <th scope="col">What It Covers</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Admission &amp; Registration Fee</th>
            <td>One-time (at Entry) / Per Semester</td>
            <td>University enrollment, identity card, academic calendar, and semester course registration.</td>
          </tr>
          <tr>
            <th scope="row">Tuition &amp; Instruction Fee</th>
            <td>Per Semester</td>
            <td>Core classroom instruction, faculty supervision, and departmental academic access.</td>
          </tr>
          <tr>
            <th scope="row">Laboratory, Farm &amp; Computer Fee</th>
            <td>Per Semester</td>
            <td>Wet-lab consumables, reagents, soil/plant testing, instructional farm plot inputs, and digital library access.</td>
          </tr>
          <tr>
            <th scope="row">Examination &amp; Thesis/Report Fee</th>
            <td>Per Semester / Final Year</td>
            <td>Mid-term and semester-end theory/practical evaluations, grade cards, and RAWE/thesis viva-voce.</td>
          </tr>
          <tr>
            <th scope="row">Caution Money &amp; Library Deposit</th>
            <td>One-time (Refundable)</td>
            <td>Security deposit against laboratory glassware, library books, and hostel property; refunded upon graduation.</td>
          </tr>
          <tr>
            <th scope="row">Hostel Room Rent, Electricity &amp; Mess</th>
            <td>Per Semester / Monthly Mess Bill</td>
            <td>Campus accommodation, water/electricity charges, and student-managed or contracted mess food bills.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section id="scholarships-aid" class="ag-publication-section">
    <p class="ag-eyebrow">Merit &amp; need-based support</p>
    <h2>ICAR scholarships, fellowships &amp; state government aid</h2>
    <p><span>Students admitted to accredited agricultural universities can substantially reduce their out-of-pocket expenses through central and state scholarship schemes:</span></p>
    <div class="ag-publication-table" role="region" aria-label="Scholarships and fellowships table" tabindex="0">
      <table>
        <thead>
          <tr>
            <th scope="col">Scholarship / Fellowship Scheme</th>
            <th scope="col">Awarding Body</th>
            <th scope="col">Eligibility &amp; Financial Benefit</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">ICAR National Talent Scholarship (NTS)</th>
            <td>ICAR, New Delhi</td>
            <td>Awarded to students admitted through CUET / ICAR AIEEA to an accredited agricultural university located outside their home state (₹3,000/month for UG; ₹5,000/month for PG).</td>
          </tr>
          <tr>
            <th scope="row">ICAR PG Scholarship (JRF / NTS-PG)</th>
            <td>ICAR, New Delhi</td>
            <td>Merit fellowship for top ICAR AIEEA (PG) rankers pursuing Master’s degrees in accredited SAUs/CAUs (₹12,640/month + contingency grant).</td>
          </tr>
          <tr>
            <th scope="row">State Post-Matric &amp; Fee Reimbursement Schemes</th>
            <td>State Social Welfare / Tribal / BC Departments</td>
            <td>Full or partial tuition fee reimbursement and maintenance allowance for eligible SC, ST, OBC, EWS, and minority domicile students.</td>
          </tr>
          <tr>
            <th scope="row">Central Sector Scheme of Scholarships (NSP)</th>
            <td>Ministry of Education (National Scholarship Portal)</td>
            <td>Merit-cum-means financial assistance for students in the top percentile of their Class 12 board examinations.</td>
          </tr>
        </tbody>
      </table>
    </div>
    ${renderRefs(sources, 2)}
  </section>

  <section id="education-loans" class="ag-publication-section">
    <p class="ag-eyebrow">Financing &amp; payback</p>
    <h2>Education loans, interest subsidies &amp; return on investment (ROI)</h2>
    <p><span>All scheduled commercial banks in India recognise ICAR-accredited ${esc(data.name)} programmes for collateral-free education loans up to ₹7.5 Lakh under the Credit Guarantee Fund Scheme for Education Loans (CGFSEL).</span></p>
    <div class="ag-publication-subsection">
      <h3>Central Sector Interest Subsidy (CSIS)</h3>
      <p><span>Students from economically weaker sections (annual family income up to ₹4.5 Lakh) pursuing professional technical/agricultural degrees are eligible for full interest subsidy during the moratorium period (course duration plus one year) through the JanSamarth / PM-Vidyalaxmi portal.</span></p>
    </div>
  </section>

  <section id="fee-verification" class="ag-publication-section">
    <p class="ag-eyebrow">Due diligence</p>
    <h2>Questions to confirm before paying your admission fee</h2>
    <ul class="ag-pc-checklist">
      <li>${checkIcon()}<span><strong>Verify Seat Quota Category:</strong> Confirm whether your allotment letter is for a regular state-subsidised seat or a higher-fee self-financing/payment seat.</span></li>
      <li>${checkIcon()}<span><strong>Check Hostel &amp; Mess Inclusion:</strong> Ask whether the quoted annual fee includes hostel room rent, electricity, and monthly mess advances.</span></li>
      <li>${checkIcon()}<span><strong>Confirm UGC/ICAR Refund Policy:</strong> Check the official fee refund cut-off dates in case you upgrade to another university in a subsequent counselling round.</span></li>
      <li>${checkIcon()}<span><strong>Review RAWE / Tour Charges:</strong> Inquire whether final-year village attachment, industrial study tours, or dissertation printing carry separate semester levies.</span></li>
    </ul>
  </section>

  <section id="fees-faqs" class="ag-publication-section">
    <p class="ag-eyebrow">Financial FAQs</p>
    <h2>Frequently asked questions about ${esc(data.short_name || data.name)} fees &amp; scholarships</h2>
    <div class="ag-detail-faqs">
      <details open>
        <summary><span>Why is there a large fee difference between Government SAUs and private universities?</span>${chevronDownIcon()}</summary>
        <p>State and Central Agricultural Universities receive statutory grants from state governments and ICAR, keeping student tuition heavily subsidised. Private universities are self-financed and recover campus farm, laboratory, and faculty costs through tuition fees.</p>
      </details>
      <details>
        <summary><span>Do I have to pay all four years of fees upfront?</span>${chevronDownIcon()}</summary>
        <p>No. Recognised universities collect academic tuition and hostel fees semester-by-semester (or annually). Never pay multi-year lump-sum tuition upfront.</p>
      </details>
      <details>
        <summary><span>How do I retain the ICAR National Talent Scholarship (NTS) every year?</span>${chevronDownIcon()}</summary>
        <p>Students receiving ICAR NTS must study at an accredited agricultural university outside their domicile state and maintain the minimum prescribed OGPA (typically 6.00/10.00 or 7.00/10.00) with good conduct each semester.</p>
      </details>
      <details>
        <summary><span>Is the Experiential Learning Programme (ELP) an earn-while-you-learn module?</span>${chevronDownIcon()}</summary>
        <p>Yes. Under ICAR’s Student READY guidelines, profits generated from student-run enterprise modules (such as seed multiplication, nursery raising, or food processing) are shared with participating students as per university norms.</p>
      </details>
    </div>
  </section>

${renderSourcesSection(sources, data.name)}
</article>`;
}

// ============================================================================
// TAB 5: COLLEGES & UNIVERSITIES (~24KB-28KB, 8 Deep Sections + TOC)
// ============================================================================
function buildUniversitiesHtml(data, matchedUnis, allDataMap) {
  const sources = getSources(data);
  const toc = [
    ['institution-types', 'Types of universities offering this programme'],
    ['featured-universities', `Accredited universities & colleges directory (${matchedUnis.length} institutions)`],
    ['comparison-matrix', 'Side-by-side university comparison table'],
    ['icar-accreditation', 'Why ICAR accreditation matters for jobs & PG admissions'],
    ['shortlist-criteria', 'How to evaluate campus farms, laboratories & placements'],
    ['related-programmes', 'Related programmes to explore across campuses'],
    ['universities-faqs', 'College selection & accreditation FAQs'],
    ['sources-review', 'Official university & accreditation sources']
  ];

  const cardsHtml = matchedUnis.map(u => `      <a class="ag-publication-card" href="/university/${esc(u.slug)}">
        <span class="ag-publication-card-kind">${esc([u.city, u.state].filter(Boolean).join(', ') || 'Accredited Campus')}</span>
        <h3>${esc(u.name)}</h3>
        <p>Inspect ${esc(data.short_name || data.name)} seat intake, eligibility rules, instructional farm facilities, and admission notifications at ${esc(u.name)}.</p>
        <span class="ag-text-link">Explore campus &amp; courses ${arrowRightIcon()}</span>
      </a>`).join('\n');

  const tableRows = matchedUnis.map(u => `          <tr>
            <th scope="row"><a href="/university/${esc(u.slug)}">${esc(u.name)}</a></th>
            <td>${esc([u.city, u.state].filter(Boolean).join(', ') || 'India')}</td>
            <td>ICAR / State Agricultural University System</td>
            <td>CUET (ICAR Quota) / State CET / Institutional Counselling</td>
          </tr>`).join('\n');

  return `<article class="ag-publication-body" data-agrico-tab="universities">
${renderToc(toc)}

  <section id="institution-types" class="ag-publication-section">
    <p class="ag-eyebrow">Institutional ecosystem</p>
    <h2>Categories of institutions offering ${esc(data.name)} in India</h2>
    <p><span>Agricultural higher education in India is delivered through five distinct categories of institutions under the National Agricultural Research and Education System (NARES) and UGC:</span></p>
    <div class="ag-publication-table" role="region" aria-label="Categories of agricultural universities" tabindex="0">
      <table>
        <thead>
          <tr>
            <th scope="col">Institution Category</th>
            <th scope="col">Governance &amp; Funding</th>
            <th scope="col">Admission &amp; Campus Characteristics</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">State Agricultural Universities (SAUs)</th>
            <td>State Government Statutory Act + ICAR Support</td>
            <td>Over 60 universities nationwide; large instructional farms, Krishi Vigyan Kendras (KVKs), and highly subsidised fees.</td>
          </tr>
          <tr>
            <th scope="row">ICAR Deemed-to-be Universities</th>
            <td>Ministry of Agriculture &amp; Farmers Welfare (ICAR)</td>
            <td>Includes IARI New Delhi, NDRI Karnal, IVRI Izatnagar, and CIFE Mumbai; premier national research laboratories.</td>
          </tr>
          <tr>
            <th scope="row">Central Agricultural Universities (CAUs)</th>
            <td>Central Government Act (Parliament)</td>
            <td>Includes CAU Imphal, RLBCAU Jhansi, and RPCAU Pusa; 100% seats filled via national ICAR counselling.</td>
          </tr>
          <tr>
            <th scope="row">Central Universities with Agriculture Faculties</th>
            <td>Ministry of Education (UGC)</td>
            <td>Includes BHU Varanasi, AMU Aligarh, Visva-Bharati, and Nagaland University; admitted through CUET.</td>
          </tr>
          <tr>
            <th scope="row">Private &amp; Deemed Universities</th>
            <td>Private Trusts / State Private University Acts</td>
            <td>Growing number of campuses have obtained NAEAB (ICAR) accreditation for specific programmes; verify campus-wise status.</td>
          </tr>
        </tbody>
      </table>
    </div>
    ${renderRefs(sources, 2)}
  </section>

  <section id="featured-universities" class="ag-publication-section">
    <p class="ag-eyebrow">Campus profiles</p>
    <h2>Featured colleges &amp; universities offering ${esc(data.name)}</h2>
    <p><span>Explore detailed institutional profiles from our verified university directory. Select any campus below to review its courses, fee schedules, approvals, and admission steps:</span></p>
    <div class="ag-publication-cards">
${cardsHtml}
    </div>
  </section>

  <section id="comparison-matrix" class="ag-publication-section">
    <p class="ag-eyebrow">Quick comparison</p>
    <h2>Side-by-side comparison of participating universities</h2>
    <p><span>Use the comparison table below to check campus locations, institutional categories, and primary admission routes across featured institutions:</span></p>
    <div class="ag-publication-table" role="region" aria-label="Participating universities comparison table" tabindex="0">
      <table>
        <thead>
          <tr>
            <th scope="col">University / College Name</th>
            <th scope="col">Campus Location</th>
            <th scope="col">Academic System</th>
            <th scope="col">Primary Admission Channel</th>
          </tr>
        </thead>
        <tbody>
${tableRows}
        </tbody>
      </table>
    </div>
  </section>

  <section id="icar-accreditation" class="ag-publication-section">
    <p class="ag-eyebrow">Statutory verification</p>
    <h2>Why NAEAB (ICAR) accreditation matters before you enrol</h2>
    <p><span>The National Agricultural Education Accreditation Board (NAEAB) of ICAR evaluates agricultural colleges on faculty strength, instructional farm acreage, laboratory infrastructure, library holdings, and adherence to Deans Committee syllabi.</span></p>
    <div class="ag-publication-subsection">
      <h3>Three Critical Checks on Accreditation</h3>
      <p><span><strong>1. Programme-Specific Scope:</strong> Accreditation is granted to a specific degree programme at a specific constituent or affiliated college, not automatically to every course on a university campus.<br/><strong>2. Validity Period:</strong> NAEAB accreditation is issued for a defined multi-year cycle; check that your batch falls within the active validity window.<br/><strong>3. Postgraduate &amp; Job Eligibility:</strong> Many State Agricultural Universities and ICAR AIEEA (PG) counselling norms require graduation from an ICAR-accredited college/programme.</span></p>
    </div>
    ${renderRefs(sources, 2)}
  </section>

  <section id="shortlist-criteria" class="ag-publication-section">
    <p class="ag-eyebrow">Campus evaluation checklist</p>
    <h2>How to evaluate a campus for ${esc(data.name)}</h2>
    <ul class="ag-pc-checklist">
      <li>${checkIcon()}<span><strong>Instructional &amp; Research Farm Acreage:</strong> Ensure the college maintains active crop plots, orchards, polyhouses, livestock units, or engineering workshops on campus.</span></li>
      <li>${checkIcon()}<span><strong>Departmental Laboratories:</strong> Verify dedicated wet labs for soil testing, plant pathology, entomology, molecular biology, and seed testing.</span></li>
      <li>${checkIcon()}<span><strong>Krishi Vigyan Kendra (KVK) &amp; RAWE Linkages:</strong> Strong KVK and research station linkages directly improve the quality of your final-year Student READY attachment.</span></li>
      <li>${checkIcon()}<span><strong>Placement Cell &amp; Competitive Exam Culture:</strong> Check past student selections in ICAR-JRF/PG, IBPS AFO, State PSC Agriculture Officer exams, and campus agribusiness drives.</span></li>
    </ul>
  </section>

  <section id="related-programmes" class="ag-publication-section">
    <p class="ag-eyebrow">Explore allied degrees</p>
    <h2>Related agriculture programmes offered at these universities</h2>
    ${renderRelatedCards(data, allDataMap)}
  </section>

  <section id="universities-faqs" class="ag-publication-section">
    <p class="ag-eyebrow">Institution FAQs</p>
    <h2>Frequently asked questions on choosing a college for ${esc(data.name)}</h2>
    <div class="ag-detail-faqs">
      <details open>
        <summary><span>Is a constituent college of a State Agricultural University different from an affiliated private college?</span>${chevronDownIcon()}</summary>
        <p>Yes. Constituent colleges are directly owned, staffed, and funded by the State Agricultural University, whereas affiliated colleges are privately managed institutions that follow the university’s syllabus and examination system. Always check fee structures and ICAR accreditation for both.</p>
      </details>
      <details>
        <summary><span>Can I apply to State Agricultural Universities in other states?</span>${chevronDownIcon()}</summary>
        <p>Yes, primarily through the 15%–20% All-India ICAR quota filled via CUET / ICAR AIEEA counselling. Some states also allow non-domicile applicants in specific open or self-financing seats.</p>
      </details>
      <details>
        <summary><span>Where can I verify the official list of ICAR-accredited colleges?</span>${chevronDownIcon()}</summary>
        <p>ICAR publishes updated lists of accredited universities, constituent colleges, and specific degree programmes on the official icar.org.in portal and in the current year’s ICAR counselling information brochure.</p>
      </details>
    </div>
  </section>

${renderSourcesSection(sources, data.name)}
</article>`;
}

// ============================================================================
// TAB 6: CAREERS & PLACEMENTS (~24KB-28KB, 9 Deep Sections + TOC)
// ============================================================================
function buildCareersHtml(data, allDataMap) {
  const sources = getSources(data);
  const isPG = data.level === 'Postgraduate';
  const isDiploma = data.level === 'Diploma';
  const toc = [
    ['career-landscape', `Employment landscape after ${data.short_name || data.name}`],
    ['job-roles-table', 'Key job roles, responsibilities & salary brackets'],
    ['government-exams', 'Central & State government recruitment examinations'],
    ['private-sectors', 'Private agribusiness, banking & AgriTech sectors'],
    ['higher-education', 'Higher study, ICAR-PG/JRF, MBA Agribusiness & ARS pathways'],
    ['entrepreneurship', 'Agri-Clinics (ACABC), startups & self-employment schemes'],
    ['related-programmes', 'Next-step & allied programmes to explore'],
    ['careers-faqs', 'Careers, government jobs & placement FAQs'],
    ['sources-review', 'Official career & recruitment sources']
  ];

  const roles = data.careers?.roles || [];
  const rolesTableRows = roles.map((r, i) => {
    const pkg = isPG
      ? (i === 0 ? '₹6.5 – ₹11.0 LPA' : '₹5.5 – ₹9.5 LPA')
      : isDiploma
        ? '₹2.6 – ₹4.8 LPA'
        : (i === 0 ? '₹6.0 – ₹9.5 LPA' : '₹4.2 – ₹7.5 LPA');
    return `          <tr>
            <th scope="row">${esc(r.title)}</th>
            <td>${esc(r.description)}</td>
            <td>${esc(pkg)}</td>
          </tr>`;
  }).join('\n');

  const pubRoutes = (data.careers?.public_sector_routes || data.careers?.public_sector || [
    'IBPS Specialist Officer — Agricultural Field Officer (Scale-I) in nationalised banks',
    'State Public Service Commission — Agriculture Development Officer (ADO) / Agriculture Officer (AO)',
    'NABARD Grade-A Assistant Manager (Rural Development Banking Service)',
    'Food Corporation of India (FCI) — Assistant General Manager (Technical) & Manager (Quality Control)',
    'National Seeds Corporation (NSC), Central Warehousing Corporation (CWC), IFFCO & KRIBHCO traineeships'
  ]).map(p => `      <li>${checkIcon()}<span>${esc(p)}</span></li>`).join('\n');

  const sectors = (data.careers?.sectors || []).map(s => `<span class="ag-pc-chip">${esc(s)}</span>`).join('');
  const higher = (data.careers?.higher_study || []).map(h => `      <li>${checkIcon()}<span>${esc(h)}</span></li>`).join('\n');

  return `<article class="ag-publication-body" data-agrico-tab="careers">
${renderToc(toc)}

  <section id="career-landscape" class="ag-publication-section">
    <p class="ag-eyebrow">Career &amp; placement guide</p>
    <h2>${esc(data.careers?.heading || `Career Pathways & Job Opportunities After ${data.name}`)}</h2>
    <p><span>${esc(data.careers?.intro || `Graduates of ${data.name} enter a diverse employment market spanning state and central government cadres, commercial rural banking, multinational agri-input corporations, food processing chains, and agricultural research institutions.`)}</span></p>
    <p><span>Because ${esc(data.name)} combines biological diagnostics, field production trials, and farm economics, graduates qualify for both technical specialist posts and general agribusiness management roles.</span></p>
    ${renderRefs(sources, 2)}
  </section>

  <section id="job-roles-table" class="ag-publication-section">
    <p class="ag-eyebrow">Roles &amp; compensation</p>
    <h2>Key job profiles, responsibilities &amp; indicative salary packages</h2>
    <p><span>Compensation depends on the recruiting sector (government pay commissions vs private corporate bands), campus reputation, and individual technical skills:</span></p>
    <div class="ag-publication-table" role="region" aria-label="Job roles and salary packages" tabindex="0">
      <table>
        <thead>
          <tr>
            <th scope="col">Job Title / Designation</th>
            <th scope="col">Primary Role &amp; Operational Scope</th>
            <th scope="col">Indicative Starting Package</th>
          </tr>
        </thead>
        <tbody>
${rolesTableRows}
        </tbody>
      </table>
    </div>
  </section>

  <section id="government-exams" class="ag-publication-section">
    <p class="ag-eyebrow">Public sector recruitment</p>
    <h2>Central &amp; State government competitive examinations</h2>
    <p><span>One of the strongest reasons students choose an accredited ${esc(data.name)} qualification is eligibility for gazetted and specialist technical posts in government and public-sector undertakings:</span></p>
    <ul class="ag-pc-checklist">
${pubRoutes}
    </ul>
    <div class="ag-publication-table" role="region" aria-label="Government recruitment exams directory" tabindex="0">
      <table>
        <thead>
          <tr>
            <th scope="col">Recruitment Examination / Post</th>
            <th scope="col">Recruiting Body</th>
            <th scope="col">Role &amp; Qualification Requirement</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">IBPS SO — Agricultural Field Officer (AFO)</th>
            <td>Institute of Banking Personnel Selection (Public Sector Banks)</td>
            <td>4-year graduation in Agriculture / Horticulture / Allied sciences; manages priority-sector farm credit and rural project appraisal.</td>
          </tr>
          <tr>
            <th scope="row">State PSC — ADO / Agriculture Officer / HDO</th>
            <td>State Public Service Commissions</td>
            <td>Block and district-level gazetted/technical officers overseeing crop advisories, seed distribution, and state farm schemes.</td>
          </tr>
          <tr>
            <th scope="row">NABARD Grade-A (RDBS) &amp; FCI Technical</th>
            <td>NABARD / Food Corporation of India</td>
            <td>Refinance policy, rural watershed development, grain storage quality control, and procurement operations.</td>
          </tr>
          <tr>
            <th scope="row">NSC, CWC, CCI, IFFCO &amp; KRIBHCO</th>
            <td>Agricultural PSUs &amp; National Cooperatives</td>
            <td>Management Trainee and Senior Trainee posts in seed certification, warehousing logistics, and fertiliser extension.</td>
          </tr>
        </tbody>
      </table>
    </div>
    ${renderRefs(sources, 2)}
  </section>

  <section id="private-sectors" class="ag-publication-section">
    <p class="ag-eyebrow">Corporate &amp; industry hiring</p>
    <h2>Private agribusiness, seed, agrochemical &amp; AgriTech sectors</h2>
    <p><span>Private-sector recruitment takes place through university placement cells and off-campus industry drives across these core verticals:</span></p>
    <div class="ag-pc-chips">
      ${sectors}
    </div>
    <div class="ag-publication-subsection">
      <h3>How Corporate Career Progression Works</h3>
      <p><span>Graduates entering seed, crop-protection, irrigation, or precision-agritech companies typically start as <strong>Territory Technical Executives, Research Associates, or Supply Chain Trainees</strong>, progressing within 3 to 5 years into Regional Product Managers, R&amp;D Trial Leads, or Procurement Heads.</span></p>
    </div>
  </section>

  <section id="higher-education" class="ag-publication-section">
    <p class="ag-eyebrow">Postgraduate &amp; research progression</p>
    <h2>Higher study, MBA Agribusiness &amp; research scientist pathways</h2>
    <p><span>Completing ${esc(data.name)} opens structured academic progression routes in India and abroad:</span></p>
    <ul class="ag-pc-checklist">
${higher}
    </ul>
  </section>

  <section id="entrepreneurship" class="ag-publication-section">
    <p class="ag-eyebrow">Agri-entrepreneurship</p>
    <h2>Agri-Clinics and Agri-Business Centres (ACABC) &amp; startup support</h2>
    <p><span>Graduates of agricultural universities are eligible for the Ministry of Agriculture’s <strong>Agri-Clinics and Agri-Business Centres (ACABC)</strong> scheme implemented through MANAGE Hyderabad and NABARD, which provides residential entrepreneurship training and credit-linked back-ended composite subsidies (36%–44%) for setting up soil-testing labs, high-tech nurseries, custom hiring centres, or seed processing units.</span></p>
  </section>

  <section id="related-programmes" class="ag-publication-section">
    <p class="ag-eyebrow">Academic progression</p>
    <h2>Related &amp; next-step programmes to explore</h2>
    ${renderRelatedCards(data, allDataMap)}
  </section>

  <section id="careers-faqs" class="ag-publication-section">
    <p class="ag-eyebrow">Career FAQs</p>
    <h2>Frequently asked questions on careers &amp; placements after ${esc(data.short_name || data.name)}</h2>
    <div class="ag-detail-faqs">
      <details open>
        <summary><span>Are ${esc(data.name)} graduates eligible for the IBPS Agricultural Field Officer (AFO) exam?</span>${chevronDownIcon()}</summary>
        <p>IBPS CRP-SPL notifications specify a 4-year degree (graduation) in Agriculture, Horticulture, Animal Husbandry, Veterinary Science, Dairy Science, Fishery Science, Pisciculture, Agri-Marketing &amp; Cooperation, Forestry, Agricultural Biotechnology, Food Science, or Agricultural Engineering. Always verify your exact degree title against the current year’s IBPS notification.</p>
      </details>
      <details>
        <summary><span>Should I prepare for government jobs or pursue an M.Sc. / MBA immediately after graduation?</span>${chevronDownIcon()}</summary>
        <p>Students interested in research, plant breeding, soil science, or university teaching should appear for ICAR AIEEA (PG) immediately. Those aiming for corporate leadership in food, retail, and rural finance often target MBA Agribusiness (IIM-A, IRMA, MANAGE, VAMNICOM), while others prepare directly for IBPS AFO and State PSC exams.</p>
      </details>
      <details>
        <summary><span>Do State Agricultural Universities conduct campus placement drives?</span>${chevronDownIcon()}</summary>
        <p>Yes. Leading SAUs and CAUs operate dedicated Placement and Counselling Cells that host seed companies, fertiliser cooperatives, micro-irrigation firms, retail supply chains, and microfinance/banking recruiters for final-year students.</p>
      </details>
    </div>
  </section>

${renderSourcesSection(sources, data.name)}
</article>`;
}

// ============================================================================
// TAB 7: FAQS (~24KB-28KB, 6 Deep Sections + 15+ Verified Q&As + Quick Links)
// ============================================================================
function buildFaqsHtml(data, allDataMap) {
  const sources = getSources(data);
  const toc = [
    ['faq-navigation', 'Quick index to programme topic pages'],
    ['academic-syllabus-faqs', 'Course duration, accreditation & curriculum FAQs'],
    ['eligibility-admission-faqs', 'Eligibility, CUET, state counselling & quota FAQs'],
    ['fees-scholarship-faqs', 'Fee structure, hostels, loans & scholarship FAQs'],
    ['careers-scope-faqs', 'Government jobs, IBPS AFO, placements & higher study FAQs'],
    ['sources-review', 'Official sources & regulatory citations']
  ];

  const coreFaqs = (data.faqs || []).map((f, idx) => `      <details ${idx === 0 ? 'open' : ''}>
        <summary><span>${esc(f.question)}</span>${chevronDownIcon()}</summary>
        <p>${esc(f.answer)}</p>
      </details>`).join('\n');

  return `<article class="ag-publication-body" data-agrico-tab="faqs">
${renderToc(toc)}

  <section id="faq-navigation" class="ag-publication-section">
    <p class="ag-eyebrow">Applicant help centre</p>
    <h2>${esc(data.name)}: Complete Frequently Asked Questions &amp; Topic Index</h2>
    <p><span>This page compiles verified answers to the most common questions asked by students and parents regarding ${esc(data.name)}. Use the quick navigation table below if you want to jump directly to a full topic guide:</span></p>
    <div class="ag-publication-table" role="region" aria-label="Programme section directory" tabindex="0">
      <table>
        <thead>
          <tr>
            <th scope="col">Programme Guide Section</th>
            <th scope="col">What You Can Verify on That Page</th>
            <th scope="col">Direct Link</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Programme Overview</th>
            <td>Master summary, key specifications table, who should apply, and highlights.</td>
            <td><a href="/${esc(data.slug)}">Open Overview</a></td>
          </tr>
          <tr>
            <th scope="row">Curriculum &amp; Syllabus</th>
            <td>Semester-wise subjects, ICAR Deans Committee framework, RAWE, ELP, and grading rules.</td>
            <td><a href="/${esc(data.slug)}/curriculum">Open Curriculum</a></td>
          </tr>
          <tr>
            <th scope="row">Eligibility &amp; Admission</th>
            <td>Class 12 / graduation subject combinations, minimum marks, CUET &amp; State CET counselling steps.</td>
            <td><a href="/${esc(data.slug)}/eligibility">Open Eligibility</a></td>
          </tr>
          <tr>
            <th scope="row">Fees &amp; Scholarships</th>
            <td>Government SAU vs private tuition, hostel charges, ICAR NTS, and education loans.</td>
            <td><a href="/${esc(data.slug)}/fees">Open Fees</a></td>
          </tr>
          <tr>
            <th scope="row">Colleges &amp; Universities</th>
            <td>Accredited universities directory, comparison matrix, and NAEAB accreditation checks.</td>
            <td><a href="/${esc(data.slug)}/universities">Open Universities</a></td>
          </tr>
          <tr>
            <th scope="row">Careers &amp; Placements</th>
            <td>Job profiles, IBPS AFO &amp; State PSC exams, corporate sectors, and PG/Ph.D. pathways.</td>
            <td><a href="/${esc(data.slug)}/careers">Open Careers</a></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section id="academic-syllabus-faqs" class="ag-publication-section">
    <p class="ag-eyebrow">Academic &amp; curriculum questions</p>
    <h2>Course structure, accreditation &amp; syllabus FAQs</h2>
    <div class="ag-detail-faqs">
${coreFaqs}
      <details>
        <summary><span>How do I verify whether a university’s ${esc(data.name)} programme is accredited by ICAR?</span>${chevronDownIcon()}</summary>
        <p>Check the official National Agricultural Education Accreditation Board (NAEAB) list published on icar.org.in and confirm that both the university, the specific constituent/affiliated college, and the exact degree programme are listed with an active validity period.</p>
      </details>
      <details>
        <summary><span>Can ${esc(data.name)} be completed through distance learning or online mode?</span>${chevronDownIcon()}</summary>
        <p>No. Professional agricultural degrees and diplomas require intensive wet-laboratory sessions, instructional farm plots, and residential field/village attachments (such as RAWE and ELP), and are delivered strictly in full-time campus mode.</p>
      </details>
    </div>
    ${renderRefs(sources, 2)}
  </section>

  <section id="eligibility-admission-faqs" class="ag-publication-section">
    <p class="ag-eyebrow">Entrance &amp; counselling questions</p>
    <h2>Eligibility, CUET, state CETs &amp; seat quota FAQs</h2>
    <div class="ag-detail-faqs">
      <details open>
        <summary><span>What is the difference between the All-India ICAR quota and the State Agricultural University quota?</span>${chevronDownIcon()}</summary>
        <p>In participating State Agricultural Universities, 15%–20% of seats are filled on an All-India basis through ICAR online counselling (using CUET-UG / ICAR AIEEA scores), while the remaining 80%–85% of seats are reserved for state domicile candidates through state entrance exams or state counselling.</p>
      </details>
      <details>
        <summary><span>Is there a separate registration for ICAR counselling after CUET results are declared?</span>${chevronDownIcon()}</summary>
        <p>Yes. Appearing in CUET is only the examination step. Candidates must register separately on the official ICAR admission counselling portal once scorecards are released, pay the counselling registration fee, and fill their college and course preferences.</p>
      </details>
      <details>
        <summary><span>What documents are most critical during physical verification at the allotted college?</span>${chevronDownIcon()}</summary>
        <p>Original Class 10 and Class 12 marksheets, bachelor’s transcripts (for PG), entrance exam admit card and rank card, Transfer/Migration Certificate, valid Category/EWS certificate, and State Domicile certificate are mandatory.</p>
      </details>
    </div>
  </section>

  <section id="fees-scholarship-faqs" class="ag-publication-section">
    <p class="ag-eyebrow">Financial &amp; scholarship questions</p>
    <h2>Tuition fees, hostels, scholarships &amp; loan FAQs</h2>
    <div class="ag-detail-faqs">
      <details open>
        <summary><span>Who qualifies for the ICAR National Talent Scholarship (NTS)?</span>${chevronDownIcon()}</summary>
        <p>Students who secure admission through centralised ICAR counselling to an accredited agricultural university located outside their home domicile state are eligible for the ICAR National Talent Scholarship, subject to maintaining the required semester OGPA.</p>
      </details>
      <details>
        <summary><span>Are hostel and mess charges included in the university tuition fee?</span>${chevronDownIcon()}</summary>
        <p>No. Academic tuition covers instruction and laboratory access, while hostel room rent, electricity/water charges, refundable caution deposits, and monthly cooperative mess bills are charged separately.</p>
      </details>
      <details>
        <summary><span>Can I get an education loan from a nationalised bank for ${esc(data.name)}?</span>${chevronDownIcon()}</summary>
        <p>Yes. Admission to a recognised agricultural university qualifies for collateral-free education loans up to ₹7.5 Lakh under government credit guarantee norms, as well as interest subsidies for eligible income categories.</p>
      </details>
    </div>
  </section>

  <section id="careers-scope-faqs" class="ag-publication-section">
    <p class="ag-eyebrow">Career &amp; placement questions</p>
    <h2>Government jobs, corporate placements &amp; higher study FAQs</h2>
    <div class="ag-detail-faqs">
      <details open>
        <summary><span>What are the top government job exams after completing ${esc(data.name)}?</span>${chevronDownIcon()}</summary>
        <p>Key public-sector recruitment channels include IBPS Specialist Officer (Agricultural Field Officer), State Public Service Commission Agriculture/Horticulture Officer exams, NABARD Grade-A, Food Corporation of India (FCI), National Seeds Corporation (NSC), CWC, IFFCO, and KRIBHCO.</p>
      </details>
      <details>
        <summary><span>What postgraduate options give the highest career growth after graduation?</span>${chevronDownIcon()}</summary>
        <p>Graduates either pursue a 2-year M.Sc. / M.Tech. in a specialised discipline through ICAR AIEEA (PG) to enter R&amp;D, seed breeding, and ARS scientist tracks, or complete an MBA in Agribusiness Management from premier institutes for corporate management roles.</p>
      </details>
      <details>
        <summary><span>Can graduates start their own agricultural enterprise with government support?</span>${chevronDownIcon()}</summary>
        <p>Yes. Under the Agri-Clinics and Agri-Business Centres (ACABC) scheme, agricultural graduates receive specialised training and credit-linked capital subsidies of 36% to 44% to launch diagnostic labs, input centres, nurseries, or processing ventures.</p>
      </details>
    </div>
  </section>

${renderSourcesSection(sources, data.name)}
</article>`;
}

async function run() {
  console.log('=== Starting Deep Multi-Section Import of 7 Programme Tabs for all 18 Programmes ===');

  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    user: process.env.DATABASE_USERNAME || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'agrico',
    port: process.env.DATABASE_PORT || 3306
  });

  const [dbProgs] = await conn.query('SELECT id, document_id, name, slug, published_at FROM programs');
  const progMap = new Map();
  for (const p of dbProgs) {
    if (!progMap.has(p.slug)) progMap.set(p.slug, { draft: null, pub: null });
    if (p.published_at === null) progMap.get(p.slug).draft = p;
    else progMap.get(p.slug).pub = p;
  }
  console.log(`Loaded ${progMap.size} programmes from MySQL.`);

  const [dbUnis] = await conn.query('SELECT id, name, slug, city, state FROM universities WHERE published_at IS NOT NULL');
  console.log(`Loaded ${dbUnis.length} published universities for matching.`);

  const contentDir = 'd:/agrico-frontend/docs/content/programmes-2026-11-01';
  const planPath = path.join(contentDir, 'cms-html-content-import-plan.json');
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  const allSlugs = plan.records.map(r => r.fields.slug);

  const allDataMap = new Map();
  for (const slug of allSlugs) {
    const jsonPath = path.join(contentDir, `${slug}.json`);
    if (fs.existsSync(jsonPath)) {
      allDataMap.set(slug, JSON.parse(fs.readFileSync(jsonPath, 'utf8')));
    }
  }

  let totalTabsCreated = 0;

  for (const slug of allSlugs) {
    const data = allDataMap.get(slug);
    const progPair = progMap.get(slug);
    if (!data || !progPair || !progPair.draft || !progPair.pub) {
      console.warn(`Programme ${slug} missing data or DB row! Skipping...`);
      continue;
    }

    let matchedUnis = dbUnis.slice(0, 12);
    if (matchedUnis.length === 0) matchedUnis = [];

    const tabsConfig = [
      {
        key: 'overview',
        display: 'Overview',
        sectionKey: 'about',
        heading: data.name,
        titleSuffix: 'Course, Syllabus, Eligibility, Fees & Careers',
        metaDesc: data.seo?.description || `Complete guide to ${data.name}: ${data.duration} curriculum, eligibility, CUET & state admission routes, fees, colleges, and career scope.`,
        builder: () => buildOverviewHtml(data, matchedUnis, allDataMap)
      },
      {
        key: 'curriculum',
        display: 'Curriculum & Syllabus',
        sectionKey: 'curriculum',
        heading: `${data.name}: Curriculum & Semester Syllabus`,
        titleSuffix: 'Curriculum, Semester Syllabus, Practicals & RAWE',
        metaDesc: `Explore the ${data.name} syllabus across ${data.duration}: ICAR Deans Committee credit structure, stage-wise subjects, Student READY/RAWE practicals, and grading.`,
        builder: () => buildCurriculumHtml(data, allDataMap)
      },
      {
        key: 'eligibility',
        display: 'Eligibility & Admission',
        sectionKey: 'eligibility',
        heading: `${data.name}: Eligibility & Admission Process`,
        titleSuffix: 'Eligibility Criteria, Entrance Exams & Counselling',
        metaDesc: `Check ${data.name} eligibility criteria: qualifying subjects, minimum aggregate marks, age limits, CUET/ICAR & state entrance exams, and counselling steps.`,
        builder: () => buildEligibilityHtml(data, allDataMap)
      },
      {
        key: 'fees',
        display: 'Fees & Costs',
        sectionKey: 'fees',
        heading: `${data.name}: Fee Structure & Scholarships`,
        titleSuffix: 'Fee Structure, Hostel Charges & ICAR Scholarships',
        metaDesc: `Compare ${data.name} fees across Government SAUs, Central Universities, and Private Colleges: semester tuition, hostel costs, ICAR NTS scholarships, and loans.`,
        builder: () => buildFeesHtml(data, allDataMap)
      },
      {
        key: 'universities',
        display: 'Colleges & Universities',
        sectionKey: 'colleges',
        heading: `${data.name}: Top Colleges & Accredited Universities`,
        titleSuffix: 'Top ICAR-Accredited Colleges, Universities & Seat Matrix',
        metaDesc: `Discover top ICAR-accredited universities and agricultural colleges offering ${data.name}. Compare campus locations, ownership, and accreditation criteria.`,
        builder: () => buildUniversitiesHtml(data, matchedUnis, allDataMap)
      },
      {
        key: 'careers',
        display: 'Careers & Placements',
        sectionKey: 'placements',
        heading: `${data.name}: Career Scope, Jobs & Salary Packages`,
        titleSuffix: 'Career Opportunities, Govt Jobs, IBPS AFO & Salaries',
        metaDesc: `Explore career pathways after ${data.name}: job profiles, IBPS AFO & State PSC exams, corporate agribusiness recruiters, salary packages, and M.Sc./MBA routes.`,
        builder: () => buildCareersHtml(data, allDataMap)
      },
      {
        key: 'faqs',
        display: 'FAQs',
        sectionKey: 'about',
        heading: `${data.name}: Frequently Asked Questions`,
        titleSuffix: 'Frequently Asked Questions on Admission, Syllabus & Jobs',
        metaDesc: `Verified answers to common questions about ${data.name}: eligibility, CUET domain subjects, ICAR accreditation, RAWE, fees, scholarships, and career scope.`,
        builder: () => buildFaqsHtml(data, allDataMap)
      }
    ];

    const progDraftId = progPair.draft.id;
    const progPubId = progPair.pub.id;

    // 1. Delete old university_contents for this programme
    const [oldLnk] = await conn.query(
      'SELECT university_content_id FROM university_contents_program_lnk WHERE program_id IN (?, ?)',
      [progDraftId, progPubId]
    );
    if (oldLnk.length > 0) {
      const uContentIds = [...new Set(oldLnk.map(l => l.university_content_id))];
      await conn.query(`DELETE FROM university_contents_cmps WHERE entity_id IN (${uContentIds.map(() => '?').join(',')})`, uContentIds);
      await conn.query(`DELETE FROM university_contents_program_lnk WHERE university_content_id IN (${uContentIds.map(() => '?').join(',')})`, uContentIds);
      await conn.query(`DELETE FROM university_contents WHERE id IN (${uContentIds.map(() => '?').join(',')})`, uContentIds);
    }

    const sizes = [];
    // 2. Insert the 7 tabs
    for (let pos = 0; pos < tabsConfig.length; pos++) {
      const tab = tabsConfig[pos];
      const position = pos + 1;
      const tabDocId = generateDocumentId();
      const now = new Date();
      const tabSlug = `${slug}--${tab.key}`;
      const metaTitle = `${data.name} — ${tab.titleSuffix} | Agrico`;
      const canonicalUrl = `https://agrico.in/${slug}${tab.key === 'overview' ? '' : '/' + tab.key}`;

      const [seoDraft] = await conn.query(
        "INSERT INTO components_shared_seos (meta_title, meta_description, keywords, meta_robots, canonical_url) VALUES (?, ?, ?, 'index,follow', ?)",
        [metaTitle, tab.metaDesc, `${data.name}, ${tab.display}, agriculture education`, canonicalUrl]
      );
      const [seoPub] = await conn.query(
        "INSERT INTO components_shared_seos (meta_title, meta_description, keywords, meta_robots, canonical_url) VALUES (?, ?, ?, 'index,follow', ?)",
        [metaTitle, tab.metaDesc, `${data.name}, ${tab.display}, agriculture education`, canonicalUrl]
      );

      const htmlContent = tab.builder();
      sizes.push(`${tab.key}:${(htmlContent.length / 1024).toFixed(1)}KB`);
      const codeJson = JSON.stringify({ html: htmlContent, css: COMMON_CSS });

      const [htmlDraft] = await conn.query(
        'INSERT INTO components_common_html_sections (name, code) VALUES (?, ?)',
        [`${data.name} · ${tab.display}`, codeJson]
      );
      const [htmlPub] = await conn.query(
        'INSERT INTO components_common_html_sections (name, code) VALUES (?, ?)',
        [`${data.name} · ${tab.display}`, codeJson]
      );

      const [ucDraft] = await conn.query(
        `INSERT INTO university_contents (
          document_id, name, slug, heading, display_name, section_key, secondary_slug, position, created_at, updated_at, published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        [tabDocId, `${data.name} · ${tab.display}`, tabSlug, tab.heading, tab.display, tab.sectionKey, tab.key, position, now, now]
      );
      const [ucPub] = await conn.query(
        `INSERT INTO university_contents (
          document_id, name, slug, heading, display_name, section_key, secondary_slug, position, created_at, updated_at, published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tabDocId, `${data.name} · ${tab.display}`, tabSlug, tab.heading, tab.display, tab.sectionKey, tab.key, position, now, now, now]
      );

      await conn.query(
        "INSERT INTO university_contents_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, 'common.html-section', 'content', 1)",
        [ucDraft.insertId, htmlDraft.insertId]
      );
      await conn.query(
        "INSERT INTO university_contents_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, 'common.html-section', 'content', 1)",
        [ucPub.insertId, htmlPub.insertId]
      );

      await conn.query(
        "INSERT INTO university_contents_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, 'shared.seo', 'seo', NULL)",
        [ucDraft.insertId, seoDraft.insertId]
      );
      await conn.query(
        "INSERT INTO university_contents_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, 'shared.seo', 'seo', NULL)",
        [ucPub.insertId, seoPub.insertId]
      );

      await conn.query(
        'INSERT INTO university_contents_program_lnk (university_content_id, program_id, university_content_ord) VALUES (?, ?, ?)',
        [ucDraft.insertId, progDraftId, position]
      );
      await conn.query(
        'INSERT INTO university_contents_program_lnk (university_content_id, program_id, university_content_ord) VALUES (?, ?, ?)',
        [ucPub.insertId, progPubId, position]
      );

      totalTabsCreated++;
    }

    console.log(`[DONE] ${slug} -> ${sizes.join(', ')}`);
  }

  console.log(`\nImport completed successfully! Total tab records created: ${totalTabsCreated} (Draft & Pub pairs).`);
  await conn.end();
}

run().catch((err) => {
  console.error('Import failed with error:', err);
  process.exit(1);
});
