/** Configure only the isolated local Agrico CMS. Safe to re-run. */
import { createStrapi } from '@strapi/strapi';
import { config, parse } from 'dotenv';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
config();
if (process.env.NODE_ENV === 'production' || process.env.DATABASE_NAME !== 'agrico' || !['127.0.0.1', 'localhost'].includes(process.env.DATABASE_HOST || '')) {
  throw new Error('Local configuration requires the non-production agrico database on localhost.');
}
const blocks = (...texts: string[]) => texts.map(text => ({ type: 'paragraph', children: [{ type: 'text', text }] }));
async function main() {
  const frontend = resolve(process.cwd(), '../agrico-frontend');
  const envPath = resolve(frontend, '.env.local');
  let envText = await readFile(envPath, 'utf8');
  let secret = parse(envText).REVALIDATE_SECRET;
  if (!secret?.trim()) {
    secret = randomBytes(32).toString('hex');
    envText = /^REVALIDATE_SECRET=.*$/m.test(envText)
      ? envText.replace(/^REVALIDATE_SECRET=.*$/m, `REVALIDATE_SECRET=${secret}`)
      : `${envText.trimEnd()}\nREVALIDATE_SECRET=${secret}\n`;
    await writeFile(envPath, envText);
    console.log('Created a local revalidation secret; restart the frontend if already running.');
  }
  // Run npm run build first. Reuse that output instead of compiling the CMS again.
  await stat(resolve(process.cwd(), 'dist/src/index.js'));
  const app = await createStrapi({ appDir: process.cwd(), distDir: resolve(process.cwd(), 'dist') }).load();
  try {
    const webhookName = 'Agrico local frontend';
    const webhookData = {
      name: webhookName, url: 'http://127.0.0.1:3003/api/revalidate',
      headers: { 'x-revalidate-secret': secret },
      events: ['entry.create', 'entry.update', 'entry.delete', 'entry.publish', 'entry.unpublish', 'media.create', 'media.update', 'media.delete'],
      isEnabled: true,
    };
    const existing = (await app.get('webhookStore').findWebhooks()).find(item => item.name === webhookName);
    const webhook = existing
      ? await app.get('webhookStore').updateWebhook(existing.id, { ...existing, ...webhookData })
      : await app.get('webhookStore').createWebhook(webhookData as never);
    if (!webhook) throw new Error('Local webhook could not be configured.');
    if (existing) app.get('webhookRunner').update(webhook); else app.get('webhookRunner').add(webhook);

    const upload = async (filename: string, name: string, alternativeText: string) => {
      const found = await app.db.query('plugin::upload.file').findOne({ where: { name } });
      if (found) return found.id as number;
      const filepath = resolve(frontend, 'public/images/rs', filename);
      const file = { filepath, originalFilename: filename, mimetype: 'image/png', size: (await stat(filepath)).size };
      const files = await app.plugin('upload').service('upload').upload({
        data: { fileInfo: { name, alternativeText, caption: 'Generated illustration for the local Agrico preview. It does not depict a named university.' } },
        files: [file],
      });
      return files[0].id as number;
    };
    const students = await upload('student-life.png', 'rs-student-life-preview.png', 'Illustration of students studying together');
    const campus = await upload('campus-life.png', 'rs-campus-life-preview.png', 'Illustrative campus architecture, not a named university');
    const homeDocs = app.documents('api::home.home');
    const home = await homeDocs.findFirst({ populate: ['hero_slides', 'faqs', 'how_it_works_steps'] });
    const homeData: Record<string, unknown> = {};
    if (!home?.name) homeData.name = 'Agrico';
    if (!home?.hero_slides?.length) homeData.hero_slides = [{
      eyebrow: 'DEGREES. UNIVERSITIES. ADMISSION GUIDANCE.', heading: 'Your degree. Your next big move.',
      description: 'Explore university programmes and get help choosing your next step.',
      media_type: 'image', desktop_image: students, mobile_image: students,
      link: '#programmes', link_target: 'self', cta_label: 'Explore programmes',
    }];
    if (!home?.how_it_works_steps?.length) homeData.how_it_works_steps = [
      { step_number: '01', title: 'Start with your programme', description: 'Tell us what you would like to study and what matters to you.', highlights: [] },
      { step_number: '02', title: 'Compare your options', description: 'Review university programmes, study modes and the information available.', highlights: [] },
      { step_number: '03', title: 'Take the next step', description: 'Request guidance and confirm the current details before you apply.', highlights: [] },
    ];
    if (!home?.faqs?.length) homeData.faqs = [
      { question: 'Should I choose a programme or a university first?', answer: 'Start with the programme you want to study. Then compare the universities offering it and the study modes that fit your routine.' },
      { question: 'Can I compare online, distance and regular options?', answer: 'Use the study mode filter when options are available. Confirm the delivery format for the exact programme and admission session.' },
      { question: 'How can I confirm fees and admission requirements?', answer: 'Request the current details for your shortlisted university programme and verify the full fee schedule and eligibility before applying.' },
      { question: 'Can I speak with someone before applying?', answer: 'Use the guidance form to send your questions and request a callback from Agrico.' },
    ];
    if (!home) await homeDocs.create({ data: homeData, status: 'published' } as never);
    else if (Object.keys(homeData).length) {
      // Do not publish an editor draft; fill the local published preview only.
      await homeDocs.update({ documentId: home.documentId, data: homeData, ...(home.publishedAt ? { status: 'published' } : {}) } as never);
    }

    const aboutDocs = app.documents('api::about-us.about-us');
    if (!await aboutDocs.findFirst()) await aboutDocs.create({ data: { name: 'About Agrico', content: [{
      __component: 'home.about-card', name: 'Your programme. Your next chapter.',
      short_description: 'Explore your study options with clarity.', image: students,
      description: blocks('Agrico brings university programmes into one place so you can explore, compare and ask the questions that matter to you.', 'Start with what you want to study, review the options available and request current information before taking your next step.'),
    }] }, status: 'published' } as never);
    const contactDocs = app.documents('api::contact-us.contact-us');
    if (!await contactDocs.findFirst()) await contactDocs.create({ data: { name: 'Contact Agrico', content: [] }, status: 'published' });

    const blogDocs = app.documents('api::blog.blog');
    const demoPosts = await blogDocs.findMany({ status: 'published', filters: { slug: { $in: ['a-practical-checklist-for-your-programme-shortlist', 'questions-to-ask-before-you-choose-a-study-mode', 'what-to-keep-ready-before-you-apply', 'rs-education-local-platform-preview-is-ready', 'programme-comparison-added-to-the-preview', 'student-accounts-available-in-the-local-preview'] } }, populate: ['image', 'thumbnail'] } as never);
    for (const [index, post] of demoPosts.entries()) {
      const data: Record<string, number> = {};
      if (!post.image) data.image = index % 2 ? campus : students;
      if (!post.thumbnail) data.thumbnail = data.image || post.image.id;
      if (Object.keys(data).length) await blogDocs.update({ documentId: post.documentId, data, status: 'published' } as never);
    }
    const delivery = await app.get('webhookRunner').run(webhook, 'entry.publish', { model: 'home', entry: { documentId: home?.documentId || 'local-home' } });
    console.log(JSON.stringify({ configured: true, genericMedia: 2, previewPosts: demoPosts.length, webhookStatus: delivery.statusCode }));
    if (delivery.statusCode !== 200) console.warn('Frontend revalidation did not acknowledge the test. Verify the frontend is running and reload its local environment.');
  } finally { await app.destroy(); }
}
main().then(() => process.exit(0)).catch(error => { console.error(error instanceof Error ? error.message : 'RS local configuration failed'); process.exit(1); });
