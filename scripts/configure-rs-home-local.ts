/** Add editable homepage selections to the isolated local preview without replacing editor content. */
import { createStrapi } from '@strapi/strapi';
import { configureRsMedia } from './configure-rs-media-local';
import { config } from 'dotenv';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
config();
if (process.env.NODE_ENV === 'production' || process.env.DATABASE_NAME !== 'agrico' || !['127.0.0.1', 'localhost'].includes(process.env.DATABASE_HOST || '')) {
  throw new Error('Homepage configuration requires the non-production agrico database on localhost.');
}

type Entry = Record<string, any>;
const componentKeys = ['featured_offerings', 'featured_universities', 'comparison_offerings', 'comparison_universities', 'spotlight_offering', 'service_links', 'programs_header', 'universities_header', 'compare_header', 'news_header', 'articles_header', 'faqs_header', 'bottom_banner', 'how_it_works', 'why_gedu', 'how_it_works_steps'];
const header = (eyebrow: string, heading: string, description: string, cta_label?: string, cta_link?: string) => ({ eyebrow, heading, description, ...(cta_label ? { cta_label, cta_link } : {}) });
const previousSummary = 'Local sample catalogue for Agrico. Confirm the current admission session, eligibility, fees and programme availability directly with the university before applying.';
const programmeSummaries: Record<string, string> = {
  MBA: 'Explore business and management studies.',
  BBA: 'Build a foundation in business studies.',
  MCA: 'Explore programming and software applications.',
};
const services = [
  { title: 'Explore programmes', description: 'Know about fees, eligibility and more.', href: '#programmes', icon_name: 'FileText' },
  { title: 'Compare your options', description: 'Explore and compare university programmes.', href: '#programme-comparison', icon_name: 'Scale' },
  { title: 'Get admission guidance', description: 'Speak to a counsellor about your next step.', href: '#guidance', icon_name: 'UsersRound' },
];

async function main() {
  // Build once before running this script; loading the existing dist avoids another compiler run.
  await stat(resolve(process.cwd(), 'dist/src/index.js'));
  console.log('Loading the existing RS backend build and synchronizing local schema.');
  const app = await createStrapi({ appDir: process.cwd(), distDir: resolve(process.cwd(), 'dist') }).load();
  console.log('RS backend loaded; configuring existing homepage content.');
  let serving = false;
  try {
    const homeDocs = app.documents('api::home.home');
    const home = await homeDocs.findFirst({ status: 'published', populate: {
      ...Object.fromEntries(componentKeys.map(key => [key, true])),
      hero_slides: { populate: ['desktop_image', 'mobile_image', 'video_file', 'mobile_video_file', 'offering_program', 'offering_university'] },
      spotlight_offering: { populate: ['program', 'university', 'image'] },
    } } as never) as Entry | null;
    if (!home) throw new Error('Create and publish the local homepage with configure:local before adding selections.');

    const fixtureSlugs = [
      ['manipal-university-jaipur', 'manipal-university-jaipur-online-mba'],
      ['chandigarh-university', 'chandigarh-university-online-bba'],
      ['amity-university', 'amity-university-online-mca'],
      ['lovely-professional-university', 'lovely-professional-university-online-mba'],
    ];
    const offerings: Array<{ program: string; university: string }> = [];
    const updatedProgrammes: string[] = [];
    let spotlightProgramName = '';
    let spotlightPreviousName = '';
    for (const [universitySlug, programSlug] of fixtureSlugs) {
      const [university, program] = await Promise.all([
        app.documents('api::university.university').findFirst({ status: 'published', filters: { slug: universitySlug } }),
        app.documents('api::program.program').findFirst({ status: 'published', filters: { slug: programSlug } }),
      ]);
      if (university && program) {
        const summary = (program.short_description as Entry[] | null)?.map(block => (block.children || []).map((child: Entry) => child.text || '').join('')).join('\n');
        if (summary === previousSummary && programmeSummaries[program.course_code || '']) {
          await app.documents('api::program.program').update({ documentId: program.documentId, status: 'published', data: {
            short_description: [{ type: 'paragraph', children: [{ type: 'text', text: programmeSummaries[program.course_code!] }] }],
          } } as never);
          updatedProgrammes.push(programSlug);
        }
        if (!offerings.length) {
          spotlightProgramName = program.full_name || program.name || '';
          spotlightPreviousName = program.name || '';
        }
        offerings.push({ university: university.documentId, program: program.documentId });
      }
    }
    if (!offerings.length) throw new Error('No existing local sample programme pairs were found. Run seed:local first.');
    const students = await app.db.query('plugin::upload.file').findOne({ where: { name: 'rs-student-life-preview.png' } });
    const data: Record<string, unknown> = {};
    const fill = (key: string, value: unknown) => {
      if (home[key] == null || (Array.isArray(home[key]) && !home[key].length)) data[key] = value;
    };
    fill('featured_offerings', offerings.slice(0, 3));
    fill('featured_universities', offerings.map(({ university }) => ({ university })));
    const comparison = offerings.length > 3 ? [offerings[0], offerings[3]] : offerings.slice(0, 2);
    fill('comparison_offerings', comparison);
    fill('comparison_universities', comparison.map(({ university }) => ({ university })));
    fill('spotlight_offering', {
      ...offerings[0], eyebrow: 'PROGRAMME SPOTLIGHT', heading: 'Online MBA',
      description: spotlightProgramName,
      ...(students ? { image: students.id } : {}),
    });
    // Upgrade only the exact earlier local preview copy to the approved full
    // programme name; leave any independently edited spotlight untouched.
    const spotlight = home.spotlight_offering;
    if (spotlight?.heading === 'Online MBA' && spotlight.description === spotlightPreviousName &&
        spotlight.program?.documentId === offerings[0].program && spotlight.university?.documentId === offerings[0].university) {
      data.spotlight_offering = {
        program: spotlight.program.documentId, university: spotlight.university.documentId,
        eyebrow: spotlight.eyebrow, heading: spotlight.heading, description: spotlightProgramName,
        ...(spotlight.image ? { image: spotlight.image.id } : {}),
      };
    }
    fill('programs_header', header('', 'Find the programme that fits you.', 'Explore individual programmes from universities.', 'Explore all programmes', '/programs'));
    fill('universities_header', header('', 'Get to know your next university.', 'Explore the university and the programmes you can choose.', 'View all universities', '/universities'));
    fill('compare_header', header('', 'Two good options. One clearer decision.', 'Compare the exact university programmes you are considering.', 'Open comparison', '/compare'));
    fill('news_header', header('', 'News & updates.', 'Updates from the Agrico platform and the world of higher education.', 'View all news', '/news'));
    fill('articles_header', header('', 'From the RS blog.', 'Practical reading for your programme shortlist and application journey.', 'Explore the blog', '/blogs'));
    fill('faqs_header', header('', 'A little more clarity.', 'Find answers before you choose your next step.', 'Talk to a counsellor', '#guidance'));
    fill('bottom_banner', {
      eyebrow: '', heading: 'Let’s find your next step.',
      description: 'Tell us what you would like to study. Our team will help you explore the programme details and plan your next step.',
      primary_cta_label: 'Request a callback', primary_cta_link: '#guidance',
      secondary_cta_label: 'Explore programmes', secondary_cta_link: '/programs',
    });
    fill('service_links', services);
    const oldServiceTitles = ['Find your programme', 'Compare your options', 'Get personal guidance'];
    const oldServiceDescriptions = ['Explore options around what you want to study.', 'Bring university programmes side by side.', 'Ask your questions before the next step.'];
    if (home.service_links?.length === services.length && home.service_links.every((item: Entry, index: number) => item.title === oldServiceTitles[index] && item.description === oldServiceDescriptions[index] && item.href === services[index].href && item.icon_name === services[index].icon_name)) {
      data.service_links = services;
    }
    for (const [key, oldDescription, description] of [
      ['programs_header', 'Start with what you want to study, then choose the university and study format that fit your plans.', 'Explore individual programmes from universities.'],
      ['universities_header', 'Get to know the universities behind your shortlisted programmes.', 'Explore the university and the programmes you can choose.'],
    ]) {
      if (home[key]?.description === oldDescription) {
        const { id, ...existing } = home[key];
        data[key] = { ...existing, description };
      }
    }
    fill('how_it_works', {
      eyebrow: '', heading: 'From shortlist to your next step.',
      description: 'Choose what you want to study, compare the details and request the guidance you need.',
      cta_label: 'Start exploring', cta_link: '/programs',
    });
    fill('why_gedu', {
      eyebrow: '', heading: 'Clarity for a decision that matters.',
      description: 'Keep your programme, university and study format together while you explore your options.',
      cards: [
        { title: 'Programme-led discovery', tag: 'Explore', description: 'Begin with what you want to study, then review the available universities.', icon_name: 'GraduationCap', points: [] },
        { title: 'Useful comparisons', tag: 'Compare', description: 'Review university programme details side by side before you decide.', icon_name: 'GitCompareArrows', points: [] },
        { title: 'A conversation when you need it', tag: 'Connect', description: 'Request current information and discuss questions with the Agrico team.', icon_name: 'MessagesSquare', points: [] },
      ],
      primary_cta_label: 'Explore programmes', primary_cta_link: '/programs', secondary_cta_label: 'Talk to us', secondary_cta_link: '#guidance',
    });

    const slides = home.hero_slides as Entry[] | undefined;
    const oldHeading = 'The right programme. A future that is yours.';
    const missingHeroOffering = slides?.length && !slides[0].offering_program && !slides[0].offering_university;
    if (slides?.length && (missingHeroOffering || slides.some(slide => slide.heading === oldHeading))) {
      // Preserve every media/copy/link field; published component IDs belong to
      // a different version and cannot be reused when updating the draft.
      data.hero_slides = slides.map((slide, index) => {
        const output: Entry = {};
        for (const key of ['eyebrow', 'heading', 'description', 'media_type', 'embedded_video_link', 'link', 'link_target', 'cta_label']) {
          if (slide[key] !== undefined) output[key] = slide[key];
        }
        for (const key of ['desktop_image', 'mobile_image', 'video_file', 'mobile_video_file']) {
          if (slide[key]) output[key] = slide[key].id;
        }
        for (const key of ['offering_program', 'offering_university']) {
          if (slide[key]) output[key] = slide[key].documentId;
        }
        if (index === 0 && missingHeroOffering) { output.offering_program = offerings[0].program; output.offering_university = offerings[0].university; }
        if (slide.heading === oldHeading) {
          output.heading = 'Your degree. Your next big move.';
          if (slide.eyebrow === 'YOUR NEXT CHAPTER STARTS HERE') output.eyebrow = 'DEGREES. UNIVERSITIES. ADMISSION GUIDANCE.';
          if (slide.description === 'Discover university programmes, compare your options and take your next step with clarity.') output.description = 'Explore university programmes and get help choosing your next step.';
        }
        return output;
      });
    }
    if (Object.keys(data).length) await homeDocs.update({ documentId: home.documentId, data, status: 'published' } as never);
    console.log(JSON.stringify({ configured: true, updatedFields: Object.keys(data), updatedProgrammes, sampleOfferingCount: offerings.length }));
    if (process.argv.includes('--types')) {
      const { generators } = await import('@strapi/typescript-utils');
      await generators.generate({ strapi: app, pwd: process.cwd(), artifacts: { contentTypes: true, components: true }, logger: { silent: true } });
    }
    if (process.argv.includes('--media')) await configureRsMedia(app);
    if (process.argv.includes('--serve')) {
      await app.start();
      serving = true;
      console.log('RS backend is serving using the configured instance.');
    }
  } finally { if (!serving) await app.destroy(); }
}
main().then(() => { if (!process.argv.includes('--serve')) process.exit(0); }).catch(error => { console.error(error instanceof Error ? error.message : 'Local homepage configuration failed'); process.exit(1); });
