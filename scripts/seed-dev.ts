/**
 * Development seed.
 *
 * Creates enough realistic content to build and verify pages against. This is
 * NOT production data — the client's CMS ships empty. Re-running is safe: every
 * entry is keyed by slug and skipped if it already exists.
 *
 *   npm run seed:dev     seed
 *   npm run seed:reset   delete everything this script creates, then reseed
 */
import { createStrapi, compileStrapi } from '@strapi/strapi';

type Strapi = Awaited<ReturnType<ReturnType<typeof createStrapi>['load']>>;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Strapi's blocks field format. */
const paragraphs = (...texts: string[]) =>
  texts.map((text) => ({
    type: 'paragraph',
    children: [{ type: 'text', text }],
  }));

const richBody = (heading: string, ...body: string[]) => [
  { type: 'heading', level: 2, children: [{ type: 'text', text: heading }] },
  ...paragraphs(...body),
];

// --- taxonomies ------------------------------------------------------------

const TAXONOMIES = {
  stream: ['Engineering', 'Management', 'Science', 'Commerce', 'Arts & Humanities', 'Law'],
  course: ['B.Tech', 'M.Tech', 'MBA', 'BBA', 'B.Sc', 'M.Sc', 'BCA', 'MCA'],
  'course-mode': ['Full Time', 'Part Time', 'Online', 'Distance'],
  'course-type': ['Degree', 'Diploma', 'Certificate'],
  level: ['Undergraduate', 'Postgraduate'],
  'duration-type': ['Years', 'Months'],
  'ownership-type': ['Government', 'Private', 'Deemed to be University'],
  approval: ['UGC', 'AICTE', 'NAAC A++', 'NAAC A+', 'NBA', 'PCI'],
  affiliation: ['State University', 'Central University', 'Autonomous', 'Affiliated'],
  ranking: ['NIRF Top 50', 'NIRF Top 100', 'India Today Top 25', 'Outlook Top 50'],
  'institute-tier': ['Tier 1', 'Tier 2', 'Tier 3'],
  tag: ['Popular', 'Trending', 'New', 'Top Rated'],
  exam: ['JEE Main', 'JEE Advanced', 'CAT', 'NEET UG', 'CUET UG', 'GATE'],
  eligibility: ['10+2 with PCM', 'Graduation in any stream', '10+2 with 50%', 'Valid CAT score'],
} as const;

/**
 * Which level each course sits at.
 *
 * Recorded on the course rather than on the program: every B.Tech program is
 * undergraduate, and repeating that on each one would only create chances for
 * them to disagree. `course-type` is a different axis — a B.Tech is a Degree
 * *and* undergraduate — which is why this is not a value there.
 */
const COURSE_LEVELS: Record<string, string> = {
  'B.Tech': 'Undergraduate',
  BBA: 'Undergraduate',
  'B.Sc': 'Undergraduate',
  BCA: 'Undergraduate',
  'M.Tech': 'Postgraduate',
  MBA: 'Postgraduate',
  'M.Sc': 'Postgraduate',
  MCA: 'Postgraduate',
};

/**
 * Placeholder quotes, so the homepage slider can be built and reviewed against
 * something. Like everything else in this file these are fixtures, not real
 * people — the client's CMS ships empty and staff enter quotes students
 * actually gave, with their agreement to be named.
 */
const TESTIMONIALS = [
  {
    name: 'Sample Student One',
    role: 'B.Tech Computer Science, 2024 intake',
    university: 'Indian Institute of Technology Delhi',
    rating: 5,
    quote:
      'Placeholder quote — replace in the CMS. Two paragraphs of comparison saved me a month of calling admission offices one by one, and nobody pushed me toward a college that paid them.',
  },
  {
    name: 'Sample Student Two',
    role: 'MBA Finance, 2024 intake',
    university: 'Amity University Noida',
    rating: 4,
    quote:
      'Placeholder quote — replace in the CMS. Seeing the fees and the placement numbers on one screen made the shortlist obvious, and the approvals were stated plainly instead of buried in a brochure.',
  },
  {
    name: 'Sample Student Three',
    role: 'M.Sc Chemistry, 2025 intake',
    university: 'Savitribai Phule Pune University',
    rating: 5,
    quote:
      'Placeholder quote — replace in the CMS. The mentor I spoke to had sat the same entrance exam and told me plainly which of my two options was the weaker one.',
  },
];

const UNIVERSITIES = [
  {
    name: 'Indian Institute of Technology Delhi',
    full_name: 'Indian Institute of Technology, Delhi',
    city: 'New Delhi',
    state: 'Delhi',
    establish: '1961-01-01',
    rating: 5,
    ownership: 'Government',
    tier: 'Tier 1',
  },
  {
    name: 'Birla Institute of Technology and Science Pilani',
    full_name: 'Birla Institute of Technology and Science, Pilani',
    city: 'Pilani',
    state: 'Rajasthan',
    establish: '1964-01-01',
    rating: 5,
    ownership: 'Deemed to be University',
    tier: 'Tier 1',
  },
  {
    name: 'Manipal Academy of Higher Education',
    full_name: 'Manipal Academy of Higher Education',
    city: 'Manipal',
    state: 'Karnataka',
    establish: '1953-01-01',
    rating: 4,
    ownership: 'Deemed to be University',
    tier: 'Tier 1',
  },
  {
    name: 'Amity University Noida',
    full_name: 'Amity University, Noida',
    city: 'Noida',
    state: 'Uttar Pradesh',
    establish: '2005-01-01',
    rating: 4,
    ownership: 'Private',
    tier: 'Tier 2',
  },
  {
    name: 'Lovely Professional University',
    full_name: 'Lovely Professional University',
    city: 'Phagwara',
    state: 'Punjab',
    establish: '2005-01-01',
    rating: 4,
    ownership: 'Private',
    tier: 'Tier 2',
  },
  {
    name: 'Savitribai Phule Pune University',
    full_name: 'Savitribai Phule Pune University',
    city: 'Pune',
    state: 'Maharashtra',
    establish: '1949-01-01',
    rating: 4,
    ownership: 'Government',
    tier: 'Tier 2',
  },
];

const PROGRAMS = [
  { name: 'B.Tech Computer Science', course: 'B.Tech', stream: 'Engineering', duration: 4, fee: 250000 },
  { name: 'B.Tech Mechanical Engineering', course: 'B.Tech', stream: 'Engineering', duration: 4, fee: 210000 },
  { name: 'B.Tech Electronics and Communication', course: 'B.Tech', stream: 'Engineering', duration: 4, fee: 220000 },
  { name: 'M.Tech Data Science', course: 'M.Tech', stream: 'Engineering', duration: 2, fee: 180000 },
  { name: 'MBA Finance', course: 'MBA', stream: 'Management', duration: 2, fee: 800000 },
  { name: 'MBA Marketing', course: 'MBA', stream: 'Management', duration: 2, fee: 800000 },
  { name: 'MBA Human Resource Management', course: 'MBA', stream: 'Management', duration: 2, fee: 750000 },
  { name: 'BBA General', course: 'BBA', stream: 'Management', duration: 3, fee: 300000 },
  { name: 'B.Sc Physics', course: 'B.Sc', stream: 'Science', duration: 3, fee: 90000 },
  { name: 'M.Sc Chemistry', course: 'M.Sc', stream: 'Science', duration: 2, fee: 110000 },
  { name: 'BCA', course: 'BCA', stream: 'Science', duration: 3, fee: 160000 },
  { name: 'MCA', course: 'MCA', stream: 'Science', duration: 2, fee: 190000 },
];

const SECTIONS = [
  { name: 'Overview', heading: 'Overview' },
  { name: 'Admission', heading: 'Admission Process' },
  { name: 'Fees', heading: 'Fee Structure' },
  { name: 'Placements', heading: 'Placements' },
];

const BLOGS = [
  { name: 'How to Choose the Right Engineering College in 2026', type: 'Articles' },
  { name: 'CAT 2026 Registration Opens: Key Dates and Eligibility', type: 'News' },
  { name: 'MBA vs PGDM: Which One Should You Pick?', type: 'Articles' },
  { name: 'NIRF Rankings 2026 Released', type: 'News' },
  { name: 'GeduConnect Partners With 40 New Universities', type: 'Press release' },
  { name: 'A Day in the Life of a First-Year B.Tech Student', type: 'Blog' },
];

/** Entrance exams — the `examination` content type, not the `exam` taxonomy. */
const EXAMINATIONS = [
  {
    name: 'JEE Main 2026',
    full_name: 'Joint Entrance Examination (Main) 2026',
    mode: 'Online',
    fee: '₹1,000',
    stream: 'Engineering',
    eligibility: '10+2 with Physics, Chemistry and Mathematics.',
  },
  {
    name: 'CAT 2026',
    full_name: 'Common Admission Test 2026',
    mode: 'Online',
    fee: '₹2,400',
    stream: 'Management',
    eligibility: "Bachelor's degree with at least 50% marks.",
  },
  {
    name: 'CUET UG 2026',
    full_name: 'Common University Entrance Test (UG) 2026',
    mode: 'Online',
    fee: '₹800',
    stream: 'Arts & Humanities',
    eligibility: '10+2 from a recognised board.',
  },
  {
    name: 'GATE 2026',
    full_name: 'Graduate Aptitude Test in Engineering 2026',
    mode: 'Online',
    fee: '₹1,800',
    stream: 'Engineering',
    eligibility: "Bachelor's degree in engineering or technology.",
  },
];

const SCHOLARSHIPS = [
  { name: 'National Merit Scholarship', state: 'Delhi', city: 'New Delhi' },
  { name: 'Post Matric Scholarship for SC Students', state: 'Maharashtra', city: 'Mumbai' },
  { name: 'Prime Minister Special Scholarship Scheme', state: 'Punjab', city: 'Chandigarh' },
  { name: 'Central Sector Scholarship for College Students', state: 'Karnataka', city: 'Bengaluru' },
];

const QUESTIONS = [
  {
    title: 'Is a B.Tech from a private university worth it compared to an NIT?',
    body: 'I have an offer from a well-ranked private university and a lower-preference NIT. Which should I take for computer science?',
    author: 'Ankit S.',
    answers: [
      {
        body: 'Look at the specific branch and the placement record for that branch, not the overall brand. A CSE seat at a strong private university often places better than a non-CSE seat at a mid-tier NIT.',
        expert: true,
        accepted: true,
      },
      {
        body: 'Fee difference matters too. Work out the total four-year cost against the median package for the branch you would actually get.',
        expert: false,
        accepted: false,
      },
    ],
  },
  {
    title: 'What is the difference between an online MBA and a distance MBA?',
    body: 'Both seem cheaper than a regular MBA. Are they treated the same by employers?',
    author: 'Priya M.',
    answers: [
      {
        body: 'Online programmes are delivered through a learning platform with scheduled live sessions; distance programmes are largely self-study with printed or recorded material. Both need UGC-DEB approval to be recognised.',
        expert: true,
        accepted: true,
      },
    ],
  },
  {
    title: 'Can I apply for CUET after a one-year gap?',
    body: 'I took a drop year after 12th. Am I still eligible?',
    author: 'Rahul K.',
    answers: [
      {
        body: 'Yes. CUET UG has no upper age limit and a gap year does not affect eligibility, though individual universities may have their own rules.',
        expert: true,
        accepted: true,
      },
    ],
  },
  {
    title: 'How much does an M.Tech in Data Science typically cost?',
    body: 'Trying to budget for two years including living costs.',
    author: 'Sneha R.',
    answers: [],
  },
];

// --- helpers ---------------------------------------------------------------

async function upsert(
  strapi: Strapi,
  uid: string,
  slug: string,
  data: Record<string, unknown>
): Promise<{ documentId: string }> {
  const [existing] = await strapi.documents(uid as never).findMany({
    filters: { slug: { $eq: slug } } as never,
    limit: 1,
    status: 'published',
  });
  if (existing) return existing as { documentId: string };

  return (await strapi.documents(uid as never).create({
    data: { ...data, slug } as never,
    status: 'published',
  })) as { documentId: string };
}

async function seed(strapi: Strapi) {
  // --- taxonomies ---
  const ids: Record<string, Record<string, string>> = {};
  for (const [model, names] of Object.entries(TAXONOMIES)) {
    ids[model] = {};
    for (const name of names) {
      const entry = await upsert(strapi, `api::${model}.${model}`, slugify(name), { name });
      ids[model][name] = entry.documentId;
    }
    strapi.log.info(`seed: ${model} (${names.length})`);
  }

  const pick = (model: string, name: string) => ids[model][name];
  const all = (model: string) => Object.values(ids[model]);

  // --- course levels ---
  // Its own pass, because the taxonomy loop above creates a course with a name
  // and a slug only, and upsert() returns early for one that already exists —
  // so on a re-run the level would never get attached. Update writes the draft;
  // publish is what puts it on the version the site reads.
  for (const [course, level] of Object.entries(COURSE_LEVELS)) {
    const documentId = pick('course', course);
    await strapi.documents('api::course.course').update({
      documentId,
      data: { level: pick('level', level) } as never,
    });
    await strapi.documents('api::course.course').publish({ documentId });
  }
  strapi.log.info(`seed: course levels (${Object.keys(COURSE_LEVELS).length})`);

  // --- universities ---
  const universityIds: Record<string, string> = {};
  for (const university of UNIVERSITIES) {
    const slug = slugify(university.name);
    const entry = await upsert(strapi, 'api::university.university', slug, {
      name: university.name,
      full_name: university.full_name,
      city: university.city,
      state: university.state,
      country: 'India',
      establish: university.establish,
      rating: university.rating,
      heading: `${university.name} — Admission, Courses, Fees & Placements`,
      show_apply_button: true,
      apply_button_text: 'Apply Now',
      view_button_text: 'View Details',
      show_similar_universities: true,
      position: UNIVERSITIES.indexOf(university) + 1,
      ownership_type: pick('ownership-type', university.ownership),
      institute_tiers: [pick('institute-tier', university.tier)],
      approvals: [pick('approval', 'UGC'), pick('approval', 'NAAC A+')],
      affiliations: [pick('affiliation', 'Autonomous')],
      rankings: [pick('ranking', 'NIRF Top 100')],
      streams: all('stream').slice(0, 3),
      exams: all('exam').slice(0, 3),
      courses: all('course').slice(0, 4),
      course_modes: [pick('course-mode', 'Full Time')],
      course_types: [pick('course-type', 'Degree')],
      tag: pick('tag', 'Popular'),
      highlights: [
        { key: 'Established', value: university.establish.slice(0, 4) },
        { key: 'Campus Size', value: '320 acres' },
        { key: 'Total Students', value: '18,400' },
        { key: 'Faculty', value: '1,100+' },
      ],
    });
    universityIds[university.name] = entry.documentId;
  }
  strapi.log.info(`seed: universities (${UNIVERSITIES.length})`);

  // --- programs ---
  const programIds: Record<string, string> = {};
  for (const program of PROGRAMS) {
    const slug = slugify(program.name);
    const entry = await upsert(strapi, 'api::program.program', slug, {
      name: program.name,
      full_name: program.name,
      duration: program.duration,
      fee: program.fee,
      average_package: '₹12.4 LPA',
      rating: 4,
      position: PROGRAMS.indexOf(program) + 1,
      show_apply_button: true,
      apply_button_text: 'Apply Now',
      view_button_text: 'View Program',
      course: pick('course', program.course),
      stream: pick('stream', program.stream),
      course_mode: pick('course-mode', 'Full Time'),
      course_type: pick('course-type', 'Degree'),
      duration_type: pick('duration-type', 'Years'),
      tag: pick('tag', 'Trending'),
      eligibilities: [pick('eligibility', '10+2 with PCM')],
      exams: all('exam').slice(0, 2),
      universities: Object.values(universityIds).slice(0, 4),
    });
    programIds[program.name] = entry.documentId;
  }
  strapi.log.info(`seed: programs (${PROGRAMS.length})`);

  // --- program fees ---
  // What a university charges for a program is true of the pair and of neither
  // side alone. It lives as repeatable rows on the university rather than a
  // record per pair, so filling this in by hand is one form per university
  // instead of one per university-and-program combination.
  //
  // Fees are deliberately varied per university. A seed where all four charge
  // the same number hides every bug in the range, the cheapest-first sort and
  // the "fees run X to Y" sentence, because they all look correct on identical
  // inputs.
  const FEE_FACTORS = [0.85, 1, 1.15, 0.95];

  // The links run program -> universities; the rows hang off the university,
  // so they have to be inverted before anything can be written.
  const feesByUniversity = new Map<string, { program: string; fee: number; note?: string }[]>();
  for (const program of PROGRAMS) {
    const programId = programIds[program.name];
    for (const [index, universityId] of Object.values(universityIds).slice(0, 4).entries()) {
      const rows = feesByUniversity.get(universityId) ?? [];
      rows.push({
        program: programId,
        fee: Math.round((program.fee * FEE_FACTORS[index]) / 1000) * 1000,
        // One annotated row per university, so whatever renders the note has
        // both a populated and an empty case to handle.
        ...(index === 1 ? { note: "Includes exam fee" } : {}),
      });
      feesByUniversity.set(universityId, rows);
    }
  }

  // Components are replaced wholesale rather than appended to, so a re-run
  // rewrites the same rows instead of stacking a second copy on top.
  let feeRowCount = 0;
  for (const [documentId, program_fees] of feesByUniversity) {
    await strapi.documents("api::university.university").update({
      documentId,
      data: { program_fees } as never,
    });
    await strapi.documents("api::university.university").publish({ documentId });
    feeRowCount += program_fees.length;
  }
  strapi.log.info(
    `seed: program fees (${feeRowCount} rows across ${feesByUniversity.size} universities)`
  );

  // --- content sections, one set per university ---
  let sectionCount = 0;
  for (const [name, documentId] of Object.entries(universityIds)) {
    for (const section of SECTIONS) {
      const slug = `${slugify(name)}-${slugify(section.name)}`;
      await upsert(strapi, 'api::university-content.university-content', slug, {
        name: section.name,
        display_name: section.name,
        secondary_slug: slugify(section.name),
        heading: `${name} ${section.heading}`,
        university: documentId,
        content: [
          {
            __component: 'common.rich-text',
            body: richBody(
              `${name} ${section.heading}`,
              `This section covers ${section.name.toLowerCase()} details for ${name}. Seeded content for development.`,
              'Replace this with real content from the CMS before launch.'
            ),
          },
        ],
      });
      sectionCount += 1;
    }
  }
  strapi.log.info(`seed: content sections (${sectionCount})`);

  // --- blogs ---
  for (const blog of BLOGS) {
    await upsert(strapi, 'api::blog.blog', slugify(blog.name), {
      name: blog.name,
      type: blog.type,
      description: `${blog.name} — a seeded ${blog.type.toLowerCase()} entry for development.`,
      long_description: richBody(blog.name, 'Seeded body copy for development.'),
      dateTime: new Date().toISOString(),
      streams: all('stream').slice(0, 2),
      courses: all('course').slice(0, 2),
    });
  }
  strapi.log.info(`seed: blogs (${BLOGS.length})`);

  // --- entrance exams ---
  const day = 24 * 60 * 60 * 1000;
  const from = (days: number) => new Date(Date.now() + days * day).toISOString();

  const examinationIds: Record<string, string> = {};
  for (const exam of EXAMINATIONS) {
    const slug = slugify(exam.name);
    const entry = await upsert(strapi, 'api::examination.examination', slug, {
      name: exam.name,
      full_name: exam.full_name,
      exam_mode: exam.mode,
      registration_fee: exam.fee,
      eligibility: exam.eligibility,
      description: `${exam.full_name} is a national-level entrance test. Seeded content for development.`,
      form_start_date: from(10),
      form_closing_date: from(45),
      admit_card_date: from(70),
      examination_date: from(90),
      position: EXAMINATIONS.indexOf(exam) + 1,
      streams: [pick('stream', exam.stream)],
      courses: all('course').slice(0, 3),
      universities: Object.values(universityIds).slice(0, 3),
      important_links: [
        { name: 'Official website', link: 'https://example.org/official' },
        { name: 'Syllabus PDF', link: 'https://example.org/syllabus' },
      ],
    });
    examinationIds[exam.name] = entry.documentId;
  }
  strapi.log.info(`seed: examinations (${EXAMINATIONS.length})`);

  // --- scholarships ---
  const schemeIds: Record<string, string> = {};
  for (const scholarship of SCHOLARSHIPS) {
    const slug = slugify(scholarship.name);
    const entry = await upsert(strapi, 'api::scheme.scheme', slug, {
      name: scholarship.name,
      full_name: scholarship.name,
      country: 'India',
      state: scholarship.state,
      city: scholarship.city,
      rating: 4,
      heading: `${scholarship.name} — Eligibility, Amount & How to Apply`,
      show_apply_button: true,
      apply_button_text: 'Apply Now',
      view_button_text: 'View Details',
    });
    schemeIds[scholarship.name] = entry.documentId;
  }
  strapi.log.info(`seed: scholarships (${SCHOLARSHIPS.length})`);

  // Content sections for exams and scholarships, same shape as universities.
  let extraSections = 0;
  for (const [owner, ids] of [
    ['examination', examinationIds],
    ['scheme', schemeIds],
    ['program', programIds],
  ] as const) {
    for (const [name, documentId] of Object.entries(ids)) {
      for (const section of SECTIONS.slice(0, 3)) {
        await upsert(
          strapi,
          'api::university-content.university-content',
          `${slugify(name)}-${slugify(section.name)}`,
          {
            name: section.name,
            display_name: section.name,
            secondary_slug: slugify(section.name),
            heading: `${name} ${section.heading}`,
            [owner]: documentId,
            content: [
              {
                __component: 'common.rich-text',
                body: richBody(
                  `${name} ${section.heading}`,
                  `This section covers ${section.name.toLowerCase()} details for ${name}. Seeded content for development.`
                ),
              },
            ],
          }
        );
        extraSections += 1;
      }
    }
  }
  strapi.log.info(`seed: exam, scholarship and program sections (${extraSections})`);

  // --- Q&A ---
  let answerCount = 0;
  for (const question of QUESTIONS) {
    const slug = slugify(question.title).slice(0, 80);
    const entry = await upsert(strapi, 'api::question.question', slug, {
      title: question.title,
      body: question.body,
      author_name: question.author,
      views: Math.floor(Math.random() * 400) + 20,
      streams: all('stream').slice(0, 2),
    });

    for (const answer of question.answers) {
      const [existing] = await strapi.documents('api::answer.answer').findMany({
        filters: { body: { $eq: answer.body } } as never,
        limit: 1,
        status: 'published',
      });
      if (existing) continue;

      await strapi.documents('api::answer.answer').create({
        data: {
          body: answer.body,
          author_name: answer.expert ? 'GeduConnect Advisor' : 'Community member',
          is_expert: answer.expert,
          is_accepted: answer.accepted,
          question: entry.documentId,
        } as never,
        status: 'published',
      });
      answerCount += 1;
    }
  }
  strapi.log.info(`seed: questions (${QUESTIONS.length}), answers (${answerCount})`);

  // --- mentors, and the development accounts that own them ---
  //
  // These are throwaway local fixtures with a published, obviously-fake
  // password. The client's CMS ships with none of them.
  const DEV_PASSWORD = 'DevPassword123!';

  const MENTORS = [
    {
      email: 'mentor.asha@example.com',
      display_name: 'Asha Verma',
      headline: 'Engineering admissions, 12 years advising JEE aspirants',
      stream: 'Engineering',
      experience: 12,
      days: ['monday', 'wednesday', 'friday'],
    },
    {
      email: 'mentor.rohit@example.com',
      display_name: 'Rohit Nair',
      headline: 'MBA and management programmes, ex-admissions committee',
      stream: 'Management',
      experience: 9,
      days: ['tuesday', 'thursday'],
    },
    {
      email: 'mentor.fatima@example.com',
      display_name: 'Fatima Sheikh',
      headline: 'Science and research pathways, PhD in Physics',
      stream: 'Science',
      experience: 7,
      days: ['monday', 'tuesday', 'saturday'],
    },
  ];

  const authenticatedRole = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'authenticated' } });

  async function devUser(email: string, username: string) {
    const existing = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { email } });
    if (existing) return existing;

    return strapi
      .plugin('users-permissions')
      .service('user')
      .add({
        email,
        username,
        // Hashed by the users-permissions lifecycle, never stored in the clear.
        password: DEV_PASSWORD,
        provider: 'local',
        confirmed: true,
        blocked: false,
        role: authenticatedRole?.id,
      });
  }

  for (const mentor of MENTORS) {
    const user = await devUser(mentor.email, mentor.display_name);
    const slug = slugify(mentor.display_name);

    const [existing] = await strapi
      .documents('api::mentor-profile.mentor-profile')
      .findMany({ filters: { slug: { $eq: slug } } as never, limit: 1, status: 'draft' });
    if (existing) continue;

    await strapi.documents('api::mentor-profile.mentor-profile').create({
      data: {
        user: user.id,
        display_name: mentor.display_name,
        slug,
        headline: mentor.headline,
        bio: `${mentor.display_name} has spent ${mentor.experience} years helping students choose between institutions. Seeded content for development.`,
        experience_years: mentor.experience,
        languages: 'English, Hindi',
        is_accepting_bookings: true,
        session_minutes: 30,
        streams: [pick('stream', mentor.stream)],
        courses: all('course').slice(0, 3),
        availability: mentor.days.map((day) => ({
          day_of_week: day,
          start_time: '10:00:00.000',
          end_time: '17:00:00.000',
        })),
      } as never,
      status: 'published',
    });
  }

  // Two students, so ownership checks have something to be checked against.
  await devUser('student.one@example.com', 'Student One');
  await devUser('student.two@example.com', 'Student Two');

  strapi.log.info(
    `seed: mentors (${MENTORS.length}) + dev accounts — password ${DEV_PASSWORD}`
  );

  // --- testimonials ---
  for (const [index, testimonial] of TESTIMONIALS.entries()) {
    await upsert(strapi, 'api::testimonial.testimonial', slugify(testimonial.name), {
      name: testimonial.name,
      role: testimonial.role,
      quote: testimonial.quote,
      rating: testimonial.rating,
      // Optional in the schema: a quote from someone who has not enrolled
      // anywhere yet still belongs on the page.
      university: universityIds[testimonial.university],
      position: index + 1,
    });
  }
  strapi.log.info(`seed: testimonials (${TESTIMONIALS.length}) — placeholder copy`);

  // --- standalone pages: legal (fixed slugs) and master (marketing) ---
  const LEGAL_PAGES = [
    'Privacy Policy',
    'Terms and Conditions',
    'Disclaimer',
  ];
  for (const name of LEGAL_PAGES) {
    await upsert(strapi, 'api::legal.legal', slugify(name), {
      name,
      description: richBody(
        name,
        `Seeded ${name.toLowerCase()} copy for development. Replace before launch.`
      ),
    });
  }
  strapi.log.info(`seed: legal pages (${LEGAL_PAGES.length})`);

  const MASTER_PAGES = ['Careers', 'Placement Support'];
  for (const name of MASTER_PAGES) {
    await upsert(strapi, 'api::master.master', slugify(name), {
      name,
      description: `${name} at GeduConnect — seeded copy for development.`,
      long_description: richBody(name, 'Seeded body copy for development.'),
      dateTime: new Date().toISOString(),
    });
  }
  strapi.log.info(`seed: master pages (${MASTER_PAGES.length})`);

  // --- about / contact single types ---
  const about = await strapi.documents('api::about-us.about-us').findFirst({
    status: 'published',
  });
  if (!about) {
    await strapi.documents('api::about-us.about-us').create({
      data: {
        name: 'About GeduConnect',
        content: [
          {
            __component: 'home.about-card',
            name: 'Why we exist',
            short_description: 'Choosing a university should not come down to whoever advertises hardest.',
            description: richBody(
              'Our approach',
              'We list verified universities, explain approvals in plain language, and let advisors give honest guidance — seeded copy for development.'
            ),
          },
        ],
      } as never,
      status: 'published',
    });
    strapi.log.info('seed: about-us');
  }

  const contact = await strapi.documents('api::contact-us.contact-us').findFirst({
    status: 'published',
  });
  if (!contact) {
    await strapi.documents('api::contact-us.contact-us').create({
      data: {
        name: 'Contact GeduConnect',
        content: [
          {
            __component: 'contact.rp-contact',
            cards: [
              { name: 'Email', description: 'hello@geduconnect.com', icon: 'mail' },
              { name: 'Phone', description: '+91 98765 43210', icon: 'phone' },
              { name: 'Office', description: 'New Delhi, India', icon: 'map-pin' },
            ],
          },
        ],
      } as never,
      status: 'published',
    });
    strapi.log.info('seed: contact-us');
  }

  // --- homepage single type ---
  const home = (await strapi.documents('api::home.home').findFirst({
    status: 'published',
    populate: ['hero_slides'],
  } as never)) as { documentId: string; hero_slides?: unknown[] } | null;

  if (!home) {
    await strapi.documents('api::home.home').create({
      data: {
        name: 'GeduConnect Homepage',
        hero_slides: HERO_SLIDES,
        content: [
          {
            __component: 'common.title-description',
            name: 'Learning Has Boundless Possibilities',
            description:
              'Compare universities, programs and entrance exams — and get guidance you can trust.',
          },
        ],
      } as never,
      status: 'published',
    });
    strapi.log.info('seed: homepage');
  } else if ((home.hero_slides ?? []).length === 0) {
    // The homepage predates the hero carousel, so backfill the slides without
    // touching anything else an editor may have written on it.
    await strapi.documents('api::home.home').update({
      documentId: home.documentId,
      data: { hero_slides: HERO_SLIDES } as never,
      status: 'published',
    });
    strapi.log.info('seed: homepage hero slides');
  }
}

/**
 * Demo hero slides.
 *
 * No image is attached because the seed uploads no media: slides without one
 * render on the brand gradient, which is enough to exercise the carousel. The
 * YouTube slide pulls its poster from YouTube itself, so the video path is
 * visible without an upload either.
 */
const HERO_SLIDES = [
  {
    eyebrow: 'Learning has boundless possibilities',
    heading: 'Find the right university, without the guesswork',
    description:
      'Compare verified universities and programs side by side on fees, approvals, rankings and outcomes.',
    media_type: 'image',
    link: '/universities',
    link_target: 'self',
    cta_label: 'Explore universities',
  },
  {
    eyebrow: 'Two-minute tour',
    heading: 'See how a comparison actually works',
    description:
      'Pick up to four universities and read them side by side on the factors that decide your outcome.',
    media_type: 'youtube',
    embedded_video_link: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    link: '/compare',
    link_target: 'self',
    cta_label: 'Watch the tour',
  },
  {
    eyebrow: 'Check before you apply',
    heading: 'Every listing carries its approvals in the open',
    description:
      'UGC, AICTE, NAAC — stated on the page, not buried in a brochure, so you can verify them yourself.',
    media_type: 'image',
    link: 'https://www.ugc.gov.in',
    link_target: '_blank',
    cta_label: 'Verify on the UGC site',
  },
];

/** Content types this script owns, deepest-dependency-first for deletion. */
const SEEDED_TYPES = [
  'university-content',
  'answer',
  'question',
  'testimonial',
  'program',
  'university',
  'examination',
  'scheme',
  'blog',
  'legal',
  'master',
  ...Object.keys(TAXONOMIES),
] as const;

async function reset(strapi: Strapi) {
  for (const model of SEEDED_TYPES) {
    const uid = `api::${model}.${model}`;
    // Draft and published are separate documents in v5; deleting by documentId
    // removes both, but only entries still in draft show up without a status
    // filter, so both passes are needed.
    for (const status of ['published', 'draft'] as const) {
      const entries = await strapi.documents(uid as never).findMany({
        status,
        limit: 1000,
      } as never);
      for (const entry of entries as { documentId: string }[]) {
        await strapi.documents(uid as never).delete({ documentId: entry.documentId });
      }
    }
    strapi.log.info(`reset: cleared ${model}`);
  }
}

async function main() {
  const shouldReset = process.argv.includes('--reset');
  const app = await createStrapi(await compileStrapi()).load();
  try {
    if (shouldReset) await reset(app as Strapi);
    await seed(app as Strapi);
    app.log.info('seed: done');
  } finally {
    // knex's pool sometimes rejects in-flight acquisitions with "aborted" while
    // tearing down. The seeding is already committed by this point, so that is
    // noise rather than a failure — but letting it escape would make the script
    // exit non-zero.
    await app.destroy().catch(() => {});
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
