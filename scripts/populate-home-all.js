const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/agrico-backend/.env' });

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    user: process.env.DATABASE_USERNAME || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'agrico',
    port: process.env.DATABASE_PORT || 3306
  });

  try {
    const [existingHomes] = await conn.query('SELECT id, document_id FROM homes LIMIT 2');
    if (existingHomes.length === 0) {
      console.log('No homes found');
      return;
    }

    const docId = existingHomes[0].document_id;
    const [draft] = await conn.query('SELECT id FROM homes WHERE document_id = ? AND published_at IS NULL', [docId]);
    const [pub] = await conn.query('SELECT id FROM homes WHERE document_id = ? AND published_at IS NOT NULL', [docId]);
    const draftId = draft[0]?.id;
    const pubId = pub[0]?.id;
    console.log('Using homes docId:', docId, 'draftId:', draftId, 'pubId:', pubId);

    // 1. FAQs
    const faqs = [
      {
        question: 'Agriculture or Agricultural Engineering: how do I choose?',
        answer: 'It depends on your interests. If you enjoy biological sciences, plant and soil systems, and working with living systems, B.Sc. Agriculture may be a good fit. If you are more interested in engineering, design and technical solutions for farming, water or food systems, Agricultural Engineering could be the right choice. Compare the actual curriculum and entry requirements at each university.'
      },
      {
        question: 'What should I compare across universities?',
        answer: 'Look at the programme curriculum, practical learning, laboratories, faculty, campus facilities, location and total cost. Check published information and ask the university about projects, field visits and student support before making your shortlist.'
      },
      {
        question: 'Where can I check current admission requirements?',
        answer: 'Use the official university admissions website and, where relevant, the official ICAR or examination portal. Eligibility, subject requirements, application routes and deadlines can differ between programmes and institutions.'
      },
      {
        question: 'Can I speak to a counsellor?',
        answer: 'Yes. Use the callback form below and choose the programme you are interested in. A counsellor can help you understand your options, compare universities and prepare questions for the admission process.'
      }
    ];

    await conn.query("DELETE FROM homes_cmps WHERE entity_id IN (?, ?) AND field = 'faqs'", [draftId, pubId]);
    await conn.query('TRUNCATE TABLE components_home_faq_items');

    for (let i = 0; i < faqs.length; i++) {
      const item = faqs[i];
      const order = i + 1;
      const [res] = await conn.query(
        'INSERT INTO components_home_faq_items (question, answer) VALUES (?, ?)',
        [item.question, item.answer]
      );
      const cmpId = res.insertId;

      await conn.query(
        "INSERT INTO homes_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, 'home.faq-item', 'faqs', ?)",
        [draftId, cmpId, order]
      );
      await conn.query(
        "INSERT INTO homes_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, 'home.faq-item', 'faqs', ?)",
        [pubId, cmpId, order]
      );
    }
    console.log(`Inserted ${faqs.length} FAQs successfully.`);

    // 2. Service Links (Help strip)
    const services = [
      {
        title: 'Explore programmes',
        description: 'Discover agriculture and agritech degrees that match your interests.',
        href: '#programmes',
        icon_name: 'BookOpen'
      },
      {
        title: 'Compare universities',
        description: 'Look at programmes, campus life and admission details side by side.',
        href: '#universities',
        icon_name: 'Building2'
      },
      {
        title: 'Admission guidance',
        description: 'Get expert support at every step of your application journey.',
        href: '#guidance',
        icon_name: 'UsersRound'
      }
    ];

    await conn.query("DELETE FROM homes_cmps WHERE entity_id IN (?, ?) AND field = 'service_links'", [draftId, pubId]);
    await conn.query('TRUNCATE TABLE components_home_service_links');

    for (let i = 0; i < services.length; i++) {
      const item = services[i];
      const order = i + 1;
      const [res] = await conn.query(
        'INSERT INTO components_home_service_links (title, description, href, icon_name) VALUES (?, ?, ?, ?)',
        [item.title, item.description, item.href, item.icon_name]
      );
      const cmpId = res.insertId;

      await conn.query(
        "INSERT INTO homes_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, 'home.service-link', 'service_links', ?)",
        [draftId, cmpId, order]
      );
      await conn.query(
        "INSERT INTO homes_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, 'home.service-link', 'service_links', ?)",
        [pubId, cmpId, order]
      );
    }
    console.log(`Inserted ${services.length} Service Links successfully.`);

    console.log('Homepage CMS population completed successfully!');
  } finally {
    await conn.end();
  }
}

run().catch(console.error);
