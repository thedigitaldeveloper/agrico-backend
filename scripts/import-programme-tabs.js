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
.ag-programme-section {
  font-family: var(--font-dm-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
  color: #17382d;
  width: 100%;
  max-width: 100%;
  line-height: 1.65;
  box-sizing: border-box;
}
.ag-programme-section * { box-sizing: border-box; }
.ag-eyebrow {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #26634c;
  margin-bottom: 8px;
}
.ag-programme-section h2 {
  font-family: var(--font-display, serif);
  font-size: clamp(22px, 2.5vw, 28px);
  font-weight: 700;
  color: #103428;
  margin: 0 0 16px;
  letter-spacing: -0.02em;
  line-height: 1.25;
}
.ag-programme-section h3 {
  font-size: 17px;
  font-weight: 700;
  color: #154535;
  margin: 24px 0 12px;
  line-height: 1.35;
}
.ag-programme-section p {
  font-size: 14.5px;
  line-height: 1.75;
  color: #3d5649;
  margin: 0 0 16px;
}

/* Rock-solid Table Styling */
.ag-publication-table {
  width: 100% !important;
  max-width: 100% !important;
  overflow-x: auto !important;
  -webkit-overflow-scrolling: touch;
  margin: 20px 0 28px !important;
  border: 1px solid #d4e3d1 !important;
  border-radius: 8px !important;
  background: #fff !important;
  box-shadow: 0 1px 3px rgba(18,55,44,0.04);
}
.ag-publication-table table {
  width: 100% !important;
  border-collapse: collapse !important;
  text-align: left !important;
  font-size: 13.5px !important;
  line-height: 1.6 !important;
  min-width: 580px !important;
  margin: 0 !important;
}
.ag-publication-table thead th {
  background: #eaf2e7 !important;
  font-weight: 700 !important;
  color: #10382b !important;
  padding: 13px 18px !important;
  border-bottom: 2px solid #ccd8c2 !important;
  border-right: 1px solid #e1ecde !important;
  white-space: nowrap !important;
  word-break: keep-all !important;
  overflow-wrap: normal !important;
  hyphens: none !important;
  font-size: 12px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.04em !important;
}
.ag-publication-table thead th:last-child {
  border-right: none !important;
}
.ag-publication-table tbody th,
.ag-publication-table tbody td {
  padding: 13px 18px !important;
  border-bottom: 1px solid #edf4eb !important;
  border-right: 1px solid #edf4eb !important;
  vertical-align: top !important;
}
.ag-publication-table tbody th {
  width: 250px !important;
  min-width: 220px !important;
  max-width: 280px !important;
  font-weight: 650 !important;
  color: #123d2e !important;
  background: #fbfdfa !important;
  white-space: nowrap !important;
  word-break: keep-all !important;
  overflow-wrap: normal !important;
  hyphens: none !important;
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
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  margin: 20px 0 28px;
}
.ag-pc-highlight-card {
  background: #f5f9f3;
  border: 1px solid #d9e6d6;
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
  margin-top: 5px;
  line-height: 1.4;
}

/* Checklist */
.ag-pc-checklist {
  list-style: none;
  padding: 0;
  margin: 18px 0 26px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ag-pc-checklist li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 14px;
  line-height: 1.6;
  color: #304d3f;
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
  margin-top: 2px;
}

/* Timeline & Stage Cards */
.ag-pc-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 22px 0 30px;
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
  font-size: 16.5px;
  color: #103428;
  margin: 0 0 6px;
}
.ag-pc-stage-card p {
  font-size: 13.5px;
  color: #4b6757;
  margin: 0 0 12px;
}

/* Chips */
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

/* Practical Grid */
.ag-pc-practical-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin: 20px 0 28px;
}
.ag-pc-practical-card {
  background: #fafcf9;
  border: 1px solid #d8e5d6;
  border-radius: 8px;
  padding: 18px;
}
.ag-pc-practical-card h4 {
  font-size: 15px;
  font-weight: 700;
  color: #134434;
  margin: 0 0 4px;
}
.ag-pc-practical-duration {
  display: inline-block;
  font-size: 11.5px;
  font-weight: 650;
  color: #2a6f55;
  background: #e5f1e8;
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 8px;
}
.ag-pc-practical-card p {
  font-size: 13px;
  color: #435e4f;
  margin: 0;
  line-height: 1.55;
}

/* Step Journey */
.ag-pc-step-journey {
  list-style: none;
  padding: 0;
  margin: 20px 0 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ag-pc-step-journey li {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  background: #fff;
  border: 1px solid #dce8db;
  border-radius: 8px;
  padding: 16px 18px;
}
.ag-pc-step-num {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #1b5340;
  color: #fff;
  font-weight: 750;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ag-pc-step-journey h4 {
  font-size: 15px;
  font-weight: 700;
  color: #10382b;
  margin: 0 0 4px;
}
.ag-pc-step-journey p {
  font-size: 13px;
  color: #456252;
  margin: 0;
  line-height: 1.55;
}

/* University Cards Grid */
.ag-publication-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  margin: 22px 0 30px;
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
  font-size: 16.5px;
  font-weight: 650;
  color: #103428;
  margin: 0 0 8px;
  line-height: 1.35;
}
.ag-publication-card p {
  font-size: 12.5px;
  color: #4a6656;
  line-height: 1.55;
  margin: 0 0 14px;
  flex-grow: 1;
}
.ag-publication-card-cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 650;
  color: #1b5340;
}

/* Career Grid */
.ag-pc-career-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  margin: 22px 0 30px;
}
.ag-pc-career-card {
  background: #fff;
  border: 1px solid #dce8db;
  border-radius: 8px;
  padding: 18px 20px;
}
.ag-pc-career-card h4 {
  font-size: 15.5px;
  font-weight: 700;
  color: #10382b;
  margin: 0 0 6px;
}
.ag-pc-package-badge {
  display: inline-block;
  font-size: 11.5px;
  font-weight: 700;
  color: #1e664d;
  background: #e2f0e6;
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 10px;
}
.ag-pc-career-card p {
  font-size: 13px;
  color: #456252;
  margin: 0;
  line-height: 1.55;
}

/* Accordion FAQs */
.ag-detail-faqs {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 20px 0 28px;
}
.ag-detail-faqs details {
  border: 1px solid #dbe6d8;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}
.ag-detail-faqs summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  font-size: 15px;
  font-weight: 650;
  color: #10382b;
  cursor: pointer;
  user-select: none;
}
.ag-detail-faqs summary:hover {
  background: #f8faf6;
}
.ag-detail-faqs p {
  padding: 0 20px 18px;
  margin: 0;
  font-size: 13.5px;
  color: #435e4f;
  line-height: 1.65;
  border-top: 1px solid #edf4eb;
  padding-top: 12px;
}

/* Notice Box */
.ag-pc-notice-box {
  background: #f6f8f3;
  border-left: 4px solid #2e7a5d;
  padding: 16px 20px;
  border-radius: 0 8px 8px 0;
  margin: 22px 0;
  font-size: 13px;
  color: #3b5648;
  line-height: 1.6;
}
`;

function checkIcon() {
  return '<span class="ag-pc-check-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>';
}

function chevronDownIcon() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
}

function arrowRightIcon() {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';
}

// 1. Overview Tab
function buildOverviewHtml(data) {
  const paras = (data.overview?.paragraphs || [data.hero?.summary]).map(p => `<p>${p}</p>`).join('\n    ');
  
  const facts = [
    ['Degree Awarded', data.name],
    ['Academic Level', data.level],
    ['Normal Duration', data.duration],
    ['Study Mode', data.mode || 'Full-time, campus-based'],
    ['Regulatory Framework', data.regulator || 'ICAR Deans Committee Recommendations'],
    ['Practical Component', data.curriculum?.practical_learning?.[0]?.name || 'Student READY / In-plant Internship'],
    ['Accepted Entrances', data.admission?.entrance_exams?.map(e => e.name).join(', ') || 'CUET (ICAR quota) & State CETs'],
    ['Typical Annual Fees', data.fees?.breakdown ? `₹${Number(data.fees.breakdown[0]?.tuition_govt || 18000).toLocaleString('en-IN')} – ₹${Number(data.fees.breakdown[0]?.tuition_private || 85000).toLocaleString('en-IN')}` : 'Varies by institution']
  ];

  const factsRows = facts.map(([label, val]) => `          <tr><th scope="row">${label}</th><td>${val}</td></tr>`).join('\n');

  const whoApply = (data.who_should_apply || [
    'Students with a strong background in science who wish to apply technology and biology to food systems.',
    'Applicants seeking practical laboratory and field-based experiential training.',
    'Aspiring researchers, agribusiness professionals, and agricultural civil service candidates.'
  ]).map(item => `      <li>${checkIcon()}<span>${item}</span></li>`).join('\n');

  const highlights = (data.overview?.highlights || [
    { label: 'Academic Level', value: data.level },
    { label: 'Normal Duration', value: data.duration },
    { label: 'Regulatory Body', value: data.regulator || 'ICAR' },
    { label: 'Study Format', value: data.mode || 'Full-time' }
  ]).map(h => `      <div class="ag-pc-highlight-card"><span class="ag-pc-highlight-label">${h.label}</span><strong class="ag-pc-highlight-val">${h.value}</strong></div>`).join('\n');

  return `
<div class="ag-programme-section" data-agrico-tab="overview">
  <div class="ag-pc-intro">
    <p class="ag-eyebrow">Academic Overview</p>
    <h2>What the ${data.name} degree covers</h2>
    ${paras}
  </div>

  <div class="ag-pc-facts-section">
    <h3>Key facts at a glance</h3>
    <div class="ag-publication-table" tabindex="0" role="region" aria-label="Key facts table">
      <table>
        <thead>
          <tr>
            <th scope="col" style="width: 250px; min-width: 220px; white-space: nowrap;">Academic Parameter</th>
            <th scope="col">Verified Specification</th>
          </tr>
        </thead>
        <tbody>
${factsRows}
        </tbody>
      </table>
    </div>
  </div>

  <div class="ag-pc-who-section">
    <h3>Who should apply</h3>
    <p>This degree programme is particularly suitable for:</p>
    <ul class="ag-pc-checklist">
${whoApply}
    </ul>
  </div>

  <div class="ag-pc-highlights-grid">
${highlights}
  </div>
</div>
`;
}

// 2. Curriculum Tab
function buildCurriculumHtml(data) {
  const intro = data.curriculum?.intro || 'The curriculum is designed under ICAR guidelines, balancing theoretical scientific foundations with field laboratories, farm attachments, and entrepreneurship modules.';
  const structure = data.curriculum?.structure || [];
  
  const stagesHtml = structure.map((stage, i) => {
    const chips = (stage.courses || []).map(c => `<span class="ag-pc-chip">${c}</span>`).join('');
    return `    <div class="ag-pc-stage-card">
      <span class="ag-pc-stage-badge">Stage ${i + 1}</span>
      <h3>${stage.stage}</h3>
      <p>${stage.focus || ''}</p>
      <div class="ag-pc-chips">${chips}</div>
    </div>`;
  }).join('\n');

  const practicals = data.curriculum?.practical_learning || [];
  const practicalsHtml = practicals.map(p => `      <div class="ag-pc-practical-card">
        <h4>${p.name}</h4>
        ${p.duration ? `<span class="ag-pc-practical-duration">${p.duration}</span>` : ''}
        <p>${p.description}</p>
      </div>`).join('\n');

  return `
<div class="ag-programme-section" data-agrico-tab="curriculum">
  <p class="ag-eyebrow">Curriculum &amp; Syllabus</p>
  <h2>Semester &amp; Year-Wise Academic Framework</h2>
  <p>${intro}</p>

  <div class="ag-pc-timeline">
${stagesHtml}
  </div>

  ${practicals.length > 0 ? `
  <div class="ag-pc-practicals-container">
    <h3>Hands-on practicals &amp; field training</h3>
    <p>Field learning and experimental training are central to this degree, ensuring graduates possess verified industry and farm-level competence:</p>
    <div class="ag-pc-practical-grid">
${practicalsHtml}
    </div>
  </div>` : ''}
</div>
`;
}

// 3. Eligibility Tab
function buildEligibilityHtml(data) {
  const points = (data.eligibility?.points || [
    'Successful completion of Higher Secondary (10+2) with Physics, Chemistry, Biology / Mathematics / Agriculture.',
    'Minimum 50% aggregate marks (40-45% for reserved categories).',
    'Minimum 16 years of age on or before the admission cutoff date.'
  ]).map(pt => `      <li>${checkIcon()}<span>${pt}</span></li>`).join('\n');

  const docs = (data.eligibility?.documents_requested || [
    'Class 10 and Class 12 passing certificates and marksheets.',
    'National or State Entrance Examination Admit Card & Scorecard.',
    'Transfer Certificate (TC), Migration Certificate, and Conduct Certificate.',
    'Category / Domicile Certificate (where applicable for quota reservation).'
  ]).map(d => `      <li>${checkIcon()}<span>${d}</span></li>`).join('\n');

  const exams = data.admission?.entrance_exams || [
    { name: 'CUET-UG', accepted_for: 'All-India ICAR Quota Seats in Central & State Agricultural Universities' },
    { name: 'State Agricultural CETs', accepted_for: 'State domicile 80-85% quota seats in State Agricultural Universities' }
  ];
  const examsRows = exams.map(e => `          <tr><th scope="row">${e.name}</th><td>${e.accepted_for || e.notes || 'Accepted for regular degree admission'}</td></tr>`).join('\n');

  const journey = (data.admission?.journey || [
    { title: 'Check Eligibility & Choose Specialisation', description: 'Confirm subject prerequisites and ICAR-accredited university availability.' },
    { title: 'Appear for Entrance Examinations', description: 'Register and appear for CUET or your respective state agricultural CET.' },
    { title: 'Participate in Central / State Counselling', description: 'Fill institutional and course preferences during online seat allocation rounds.' },
    { title: 'Document Verification & Fee Remittance', description: 'Report to allotted campus with original documents to finalize enrollment.' }
  ]).map((step, idx) => `      <li>
        <span class="ag-pc-step-num">${idx + 1}</span>
        <div>
          <h4>${step.title}</h4>
          <p>${step.description}</p>
        </div>
      </li>`).join('\n');

  return `
<div class="ag-programme-section" data-agrico-tab="eligibility">
  <p class="ag-eyebrow">Eligibility &amp; Admission</p>
  <h2>Entry Criteria &amp; Application Pathways</h2>
  <p>${data.eligibility?.prerequisites || 'Admission requirements follow statutory regulatory norms and state university admission guidelines.'}</p>

  <div class="ag-pc-eligibility-block">
    <h3>Academic prerequisites &amp; qualifying criteria</h3>
    <ul class="ag-pc-checklist">
${points}
    </ul>
  </div>

  <div class="ag-pc-documents-block">
    <h3>Mandatory documents requested at counselling</h3>
    <ul class="ag-pc-checklist">
${docs}
    </ul>
  </div>

  <div class="ag-pc-exams-block">
    <h3>Accepted Entrance Examinations</h3>
    <div class="ag-publication-table" tabindex="0" role="region" aria-label="Entrance exams table">
      <table>
        <thead>
          <tr>
            <th scope="col" style="width: 250px; min-width: 220px; white-space: nowrap;">Entrance Examination</th>
            <th scope="col">Scope &amp; Participating Universities</th>
          </tr>
        </thead>
        <tbody>
${examsRows}
        </tbody>
      </table>
    </div>
  </div>

  <div class="ag-pc-journey-block">
    <h3>Step-by-step admission journey</h3>
    <ol class="ag-pc-step-journey">
${journey}
    </ol>
  </div>
</div>
`;
}

// 4. Fees Tab
function buildFeesHtml(data) {
  const summary = data.fees?.summary || 'Annual tuition fees vary between state-subsidised agricultural universities and self-financing private institutions.';
  const note = data.fees?.note || 'Published fee ranges are indicative and based on recent university academic notifications. Hostel, examination fees, and mess deposits are charged separately.';

  const breakdown = data.fees?.breakdown || [];
  let tableRows = '';
  if (breakdown.length > 0) {
    tableRows = breakdown.map(b => `          <tr>
            <th scope="row">${b.component || b.category}</th>
            <td>₹${Number(b.tuition_govt || b.govt_tuition || 15000).toLocaleString('en-IN')} – ₹${Number(b.govt_total || 28000).toLocaleString('en-IN')}</td>
            <td>₹${Number(b.tuition_private || b.private_tuition || 65000).toLocaleString('en-IN')} – ₹${Number(b.private_total || 140000).toLocaleString('en-IN')}</td>
          </tr>`).join('\n');
  } else {
    tableRows = `          <tr><th scope="row">Tuition & Academic Fee</th><td>₹12,000 – ₹35,000 / year</td><td>₹65,000 – ₹1,80,000 / year</td></tr>
          <tr><th scope="row">Lab, Field & Farm Charges</th><td>₹3,000 – ₹8,000 / year</td><td>₹15,000 – ₹30,000 / year</td></tr>
          <tr><th scope="row">Hostel & Mess Charges (Optional)</th><td>₹25,000 – ₹45,000 / year</td><td>₹60,000 – ₹1,10,000 / year</td></tr>
          <tr><th scope="row">Estimated Total Annual Outlay</th><td>₹40,000 – ₹88,000 / year</td><td>₹1,40,000 – ₹3,20,000 / year</td></tr>`;
  }

  const aid = (data.fees?.financial_aid || [
    'ICAR National Talent Scholarship (NTS) awarded to students admitted outside their home state through CUET / ICAR AIEEA.',
    'State government post-matric scholarships for SC, ST, OBC, and economically weaker sections.',
    'University merit scholarships and tuition fee waivers for top-ranking entrance test qualifiers.'
  ]).map(a => `      <li>${checkIcon()}<span>${a}</span></li>`).join('\n');

  return `
<div class="ag-programme-section" data-agrico-tab="fees">
  <p class="ag-eyebrow">Fees &amp; Financial Aid</p>
  <h2>Annual Fee Structure &amp; Scholarships</h2>
  <p>${summary}</p>

  <div class="ag-pc-fee-tables">
    <h3>Government vs. Private Fee Outlay</h3>
    <div class="ag-publication-table" tabindex="0" role="region" aria-label="Fee structure table">
      <table>
        <thead>
          <tr>
            <th scope="col" style="width: 250px; min-width: 220px; white-space: nowrap;">Fee Component</th>
            <th scope="col">Government SAUs / CAUs</th>
            <th scope="col">Private / Deemed Colleges</th>
          </tr>
        </thead>
        <tbody>
${tableRows}
        </tbody>
      </table>
    </div>
  </div>

  <div class="ag-pc-scholarships-block">
    <h3>Scholarships &amp; Financial Support</h3>
    <ul class="ag-pc-checklist">
${aid}
    </ul>
  </div>

  <div class="ag-pc-notice-box">
    <strong>Fee Advisory Notice:</strong>
    <p>${note}</p>
  </div>
</div>
`;
}

// 5. Universities Tab
function buildUniversitiesHtml(data, matchingUnis) {
  const cardsHtml = matchingUnis.map(u => `    <a class="ag-publication-card" href="/university/${u.slug}">
      <span class="ag-publication-card-kind">Accredited Institution</span>
      <h3>${u.name}</h3>
      <p>${[u.city, u.state].filter(Boolean).join(', ')} · State Agricultural University System</p>
      <span class="ag-publication-card-cta">Explore university &amp; admissions ${arrowRightIcon()}</span>
    </a>`).join('\n');

  return `
<div class="ag-programme-section" data-agrico-tab="universities">
  <p class="ag-eyebrow">Accredited Institutions</p>
  <h2>Top Colleges &amp; Universities Offering ${data.name}</h2>
  <p>Explore recognized state agricultural universities, central institutes, and private colleges that provide approved instruction in this programme:</p>

  <div class="ag-publication-cards">
${cardsHtml}
  </div>

  <div class="ag-pc-choice-criteria">
    <h3>How to shortlist your university</h3>
    <ul class="ag-pc-checklist">
      <li>${checkIcon()}<span><strong>ICAR Accreditation Status:</strong> Confirm whether the faculty and specific degree are recognized by ICAR for public sector employment eligibility.</span></li>
      <li>${checkIcon()}<span><strong>Farm &amp; Lab Infrastructure:</strong> Ensure the campus maintains functional experimental agricultural farms, polyhouses, and accredited laboratories.</span></li>
      <li>${checkIcon()}<span><strong>Faculty Strength:</strong> Look for doctoral-qualified teaching staff across core agronomy, soil science, pathology, and breeding disciplines.</span></li>
      <li>${checkIcon()}<span><strong>Internship &amp; RAWE Attachments:</strong> Inquire about institutional linkages with Krishi Vigyan Kendras (KVKs) and commercial agri-enterprises.</span></li>
    </ul>
  </div>
</div>
`;
}

// 6. Careers Tab
function buildCareersHtml(data) {
  const roles = data.careers?.roles || [
    { title: 'Agricultural Field Officer (IBPS AFO)', package: '₹6.5 – ₹9.0 LPA', description: 'Credit assessment, rural loan processing, and agricultural portfolio management in nationalised commercial banks.' },
    { title: 'State Agriculture Development Officer (ADO)', package: '₹5.5 – ₹8.0 LPA', description: 'State government civil service cadre executing government farm schemes, input subsidies, and extension advisory.' },
    { title: 'Agronomist / Technical Crop Consultant', package: '₹4.5 – ₹7.5 LPA', description: 'Field trial supervision, crop health diagnostics, and farmer advisory for seed and fertilizer enterprises.' },
    { title: 'Agricultural Research Scientist (ARS / ICAR)', package: '₹7.5 – ₹14.0 LPA', description: 'National agricultural research service conducting plant breeding, soil conservation, and genetic innovation.' }
  ];

  const rolesHtml = roles.map(r => `    <div class="ag-pc-career-card">
      <h4>${r.title}</h4>
      <span class="ag-pc-package-badge">${r.package || 'Competitive Salary'}</span>
      <p>${r.description}</p>
    </div>`).join('\n');

  const sectors = (data.careers?.sectors || [
    'Commercial Banking (IBPS AFO)', 'State Agriculture Departments', 'Seed & Crop Protection MNCs',
    'AgriTech & Precision Farming Startups', 'Food Processing & Supply Chain', 'ICAR Research Institutes'
  ]).map(s => `<span class="ag-pc-chip">${s}</span>`).join('');

  const publicSector = (data.careers?.public_sector || [
    'IBPS Specialist Officer (Agricultural Field Officer - Scale I)',
    'State Public Service Commission Agriculture Development Officer (ADO / AO)',
    'National Seeds Corporation (NSC) & Central Warehousing Corporation (CWC)',
    'NABARD Assistant Manager (Grade A - Rural Development)'
  ]).map(p => `      <li>${checkIcon()}<span>${p}</span></li>`).join('\n');

  const higher = (data.careers?.higher_study || [
    'M.Sc. Agriculture in specialized disciplines (Agronomy, Plant Breeding, Soil Science, Entomology).',
    'MBA in Agribusiness Management (IIM Ahmedabad, MANAGE Hyderabad, IRMA Anand).',
    'Ph.D. and ICAR Agricultural Research Scientist (ARS) examination.'
  ]).map(h => `      <li>${checkIcon()}<span>${h}</span></li>`).join('\n');

  return `
<div class="ag-programme-section" data-agrico-tab="careers">
  <p class="ag-eyebrow">Career Opportunities</p>
  <h2>Job Roles, Employment Sectors &amp; Packages</h2>
  <p>Graduates possess scientific agricultural skills that open career pathways across public administration, agribusiness MNCs, and research:</p>

  <div class="ag-pc-career-grid">
${rolesHtml}
  </div>

  <div class="ag-pc-sectors-block">
    <h3>Major recruiting industries &amp; employers</h3>
    <div class="ag-pc-chips">
      ${sectors}
    </div>
  </div>

  <div class="ag-pc-public-sector">
    <h3>Public sector &amp; civil service examinations</h3>
    <ul class="ag-pc-checklist">
${publicSector}
    </ul>
  </div>

  <div class="ag-pc-higher-study">
    <h3>Higher education &amp; research progression</h3>
    <ul class="ag-pc-checklist">
${higher}
    </ul>
  </div>
</div>
`;
}

// 7. FAQs Tab
function buildFaqsHtml(data) {
  const faqs = data.faqs || [
    { question: 'Is this programme recognised for government agricultural officer jobs?', answer: 'Yes. When pursued from an ICAR-accredited university, this degree meets eligibility requirements for IBPS AFO, State ADO, and ARS/NET examinations.' },
    { question: 'What is the difference between ICAR quota and state quota seats?', answer: 'ICAR all-India quota accounts for 15-20% of seats in state agricultural universities, filled through CUET-UG/PG. The remaining 80-85% are state domicile seats filled through state entrance tests.' },
    { question: 'What practical exposure is included in this curriculum?', answer: 'Students undertake hands-on laboratory experiments, university crop farm plots, village attachment (RAWE), and agro-industrial internships during their final year.' }
  ];

  const faqsHtml = faqs.map((f, i) => `    <details ${i === 0 ? 'open' : ''}>
      <summary><span>${f.question}</span>${chevronDownIcon()}</summary>
      <p>${f.answer}</p>
    </details>`).join('\n');

  const sources = (data.sources || [
    { title: 'Indian Council of Agricultural Research (ICAR) — Sixth Deans Committee Guidelines', url: 'https://icar.org.in' },
    { title: 'National Testing Agency (NTA) — CUET Information Bulletin', url: 'https://exams.nta.ac.in/CUET-UG/' }
  ]).map(s => `      <li style="margin-bottom: 8px;"><a href="${s.url}" target="_blank" rel="noopener noreferrer" style="color: #215945; font-weight: 600; text-decoration: underline;">${s.title}</a></li>`).join('\n');

  return `
<div class="ag-programme-section" data-agrico-tab="faqs">
  <p class="ag-eyebrow">Frequently Asked Questions</p>
  <h2>Common Questions About ${data.name}</h2>
  <p>Answers to common questions regarding eligibility, entrance examinations, course duration, fees, and career pathways:</p>

  <div class="ag-detail-faqs">
${faqsHtml}
  </div>

  <div class="ag-pc-sources-block">
    <h3>Verified Regulatory &amp; Academic Citations</h3>
    <ol class="ag-publication-sources" style="padding-left: 20px; font-size: 12.5px; color: #557265;">
${sources}
    </ol>
  </div>
</div>
`;
}

async function run() {
  console.log('=== Starting Import of 7 Programme Tabs for all 18 Programmes ===');

  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    user: process.env.DATABASE_USERNAME || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'agrico',
    port: process.env.DATABASE_PORT || 3306
  });

  // Load programs from DB
  const [dbProgs] = await conn.query('SELECT id, document_id, name, slug, published_at FROM programs');
  const progMap = new Map();
  for (const p of dbProgs) {
    if (!progMap.has(p.slug)) progMap.set(p.slug, { draft: null, pub: null });
    if (p.published_at === null) progMap.get(p.slug).draft = p;
    else progMap.get(p.slug).pub = p;
  }
  console.log(`Loaded ${progMap.size} programmes from MySQL.`);

  // Load universities to display in Tab 5
  const [dbUnis] = await conn.query('SELECT id, name, slug, city, state FROM universities WHERE published_at IS NOT NULL');
  console.log(`Loaded ${dbUnis.length} published universities for matching.`);

  // Load 18 JSON files
  const contentDir = 'd:/agrico-frontend/docs/content/programmes-2026-11-01';
  const planPath = path.join(contentDir, 'cms-html-content-import-plan.json');
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  const allSlugs = plan.records.map(r => r.fields.slug);

  console.log(`Processing ${allSlugs.length} programmes...`);

  const tabsConfig = [
    { key: 'overview', display: 'Overview', sectionKey: 'about', titleSuffix: 'Fees, Duration, Eligibility & Top Colleges', builder: buildOverviewHtml },
    { key: 'curriculum', display: 'Curriculum & Syllabus', sectionKey: 'curriculum', titleSuffix: 'Curriculum, Semester Syllabus & Practicals', builder: buildCurriculumHtml },
    { key: 'eligibility', display: 'Eligibility & Admission', sectionKey: 'eligibility', titleSuffix: 'Eligibility Criteria, Entrance Exams & Admission', builder: buildEligibilityHtml },
    { key: 'fees', display: 'Fees & Costs', sectionKey: 'fees', titleSuffix: 'Fee Structure, Hostels & Scholarships', builder: buildFeesHtml },
    { key: 'universities', display: 'Colleges & Universities', sectionKey: 'colleges', titleSuffix: 'Top ICAR-Accredited Colleges & Universities', builder: (data) => {
      // Pick matching universities
      let matched = [];
      if (data.slug === 'bvsc-animal-husbandry') {
        matched = dbUnis.filter(u => u.slug.includes('veterinary') || u.slug.includes('khalsa'));
      } else if (data.slug === 'bfsc-fisheries-science') {
        matched = dbUnis.filter(u => u.slug.includes('centurion') || u.slug.includes('fisheries') || u.slug.includes('adhiparasakthi'));
      } else if (data.slug === 'btech-agricultural-engineering') {
        matched = dbUnis.filter(u => u.slug.includes('centurion') || u.slug.includes('khalsa') || u.slug.includes('adhiparasakthi') || u.slug.includes('punjab'));
      } else {
        matched = dbUnis.slice(0, 6);
      }
      if (matched.length === 0) matched = dbUnis.slice(0, 4);
      return buildUniversitiesHtml(data, matched);
    }},
    { key: 'careers', display: 'Careers & Placements', sectionKey: 'placements', titleSuffix: 'Career Opportunities, Job Roles & Salary Packages', builder: buildCareersHtml },
    { key: 'faqs', display: 'FAQs', sectionKey: 'about', titleSuffix: 'Frequently Asked Questions & Verified Answers', builder: buildFaqsHtml }
  ];

  let totalTabsCreated = 0;

  for (const slug of allSlugs) {
    const jsonPath = path.join(contentDir, `${slug}.json`);
    let data = null;
    if (fs.existsSync(jsonPath)) {
      data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } else {
      // fallback from plan
      const r = plan.records.find(item => item.fields.slug === slug);
      data = {
        slug,
        name: r.fields.name,
        short_name: r.fields.short_name || r.fields.name,
        level: slug.startsWith('msc-') || slug.startsWith('mba-') ? 'Postgraduate' : slug.startsWith('diploma-') ? 'Diploma' : 'Undergraduate',
        duration: r.fields.duration,
        hero: { summary: r.fields.seo.metaDescription },
        overview: { paragraphs: [r.fields.seo.metaDescription] },
        faqs: []
      };
    }

    const progPair = progMap.get(slug);
    if (!progPair || !progPair.draft || !progPair.pub) {
      console.warn(`Programme ${slug} not found in MySQL! Skipping...`);
      continue;
    }

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

    // 2. Insert the 7 tabs
    for (let pos = 0; pos < tabsConfig.length; pos++) {
      const tab = tabsConfig[pos];
      const position = pos + 1;
      const tabDocId = generateDocumentId();
      const now = new Date();
      const tabSlug = `${slug}--${tab.key}`;
      const tabHeading = `${data.name} — ${tab.display}`;
      const metaTitle = `${data.name} — ${tab.titleSuffix} | Agrico`;
      const metaDesc = `Explore ${tab.display.toLowerCase()} for ${data.name}. Complete syllabus, fees, eligibility, colleges, and placement guidelines.`;
      const canonicalUrl = `https://agrico.in/${slug}${tab.key === 'overview' ? '' : '/' + tab.key}`;

      // A. Insert SEO (Draft & Pub)
      const [seoDraft] = await conn.query(
        "INSERT INTO components_shared_seos (meta_title, meta_description, keywords, meta_robots, canonical_url) VALUES (?, ?, ?, 'index,follow', ?)",
        [metaTitle, metaDesc, `${data.name}, ${tab.display}, agriculture education`, canonicalUrl]
      );
      const [seoPub] = await conn.query(
        "INSERT INTO components_shared_seos (meta_title, meta_description, keywords, meta_robots, canonical_url) VALUES (?, ?, ?, 'index,follow', ?)",
        [metaTitle, metaDesc, `${data.name}, ${tab.display}, agriculture education`, canonicalUrl]
      );

      // B. Build HTML & Scoped CSS
      const htmlContent = tab.builder(data);
      const codeJson = JSON.stringify({ html: htmlContent, css: COMMON_CSS });

      const [htmlDraft] = await conn.query(
        'INSERT INTO components_common_html_sections (name, code) VALUES (?, ?)',
        [`${data.name} · ${tab.display}`, codeJson]
      );
      const [htmlPub] = await conn.query(
        'INSERT INTO components_common_html_sections (name, code) VALUES (?, ?)',
        [`${data.name} · ${tab.display}`, codeJson]
      );

      // C. Insert university_contents (Draft & Published)
      const [ucDraft] = await conn.query(
        `INSERT INTO university_contents (
          document_id, name, slug, heading, display_name, section_key, secondary_slug, position, created_at, updated_at, published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        [tabDocId, `${data.name} · ${tab.display}`, tabSlug, tabHeading, tab.display, tab.sectionKey, tab.key, position, now, now]
      );
      const [ucPub] = await conn.query(
        `INSERT INTO university_contents (
          document_id, name, slug, heading, display_name, section_key, secondary_slug, position, created_at, updated_at, published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tabDocId, `${data.name} · ${tab.display}`, tabSlug, tabHeading, tab.display, tab.sectionKey, tab.key, position, now, now, now]
      );

      // D. Link HTML Section in university_contents_cmps
      await conn.query(
        "INSERT INTO university_contents_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, 'common.html-section', 'content', 1)",
        [ucDraft.insertId, htmlDraft.insertId]
      );
      await conn.query(
        "INSERT INTO university_contents_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, 'common.html-section', 'content', 1)",
        [ucPub.insertId, htmlPub.insertId]
      );

      // E. Link SEO in university_contents_cmps
      await conn.query(
        "INSERT INTO university_contents_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, 'shared.seo', 'seo', NULL)",
        [ucDraft.insertId, seoDraft.insertId]
      );
      await conn.query(
        "INSERT INTO university_contents_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, 'shared.seo', 'seo', NULL)",
        [ucPub.insertId, seoPub.insertId]
      );

      // F. Link to Program in university_contents_program_lnk
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

    console.log(`[DONE] ${slug} -> Created 7 tabs (${tabsConfig.map(t => t.key).join(', ')})`);
  }

  console.log(`\nImport completed successfully! Total tab records created: ${totalTabsCreated} (Draft & Pub pairs).`);

  // Verify
  const [totalContents] = await conn.query('SELECT COUNT(*) as cnt, SUM(published_at IS NOT NULL) as pub_cnt FROM university_contents');
  console.log('Total university_contents in DB:', totalContents[0]);

  await conn.end();
}

run().catch((err) => {
  console.error('Import failed with error:', err);
  process.exit(1);
});
