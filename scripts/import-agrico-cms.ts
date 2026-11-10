/**
 * Repeatable Agrico On-Campus Agriculture CMS bootstrap & seed script.
 *
 * Seeds core agriculture taxonomies (streams, approvals, ownership types,
 * regular on-campus mode), flagship agricultural universities, degree
 * programmes, entrance exams, scholarships, academic mentors, and statutory
 * legal pages into the Agrico Strapi database.
 */
import { createStrapi, compileStrapi } from '@strapi/strapi';
import { config } from 'dotenv';

config();

const blocks = (...texts: string[]) =>
  texts.map((text) => ({
    type: 'paragraph',
    children: [{ type: 'text', text }],
  }));

async function main() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  try {
    const upsert = async (
      model: string,
      slug: string,
      data: Record<string, unknown>
    ): Promise<string> => {
      const docs = app.documents(`api::${model}.${model}` as never);
      const found = await docs.findFirst({
        filters: { slug },
        status: 'published',
      } as never);
      if (found) return found.documentId;

      const draft = await docs.findFirst({ filters: { slug } } as never);
      if (draft) {
        await docs.update({
          documentId: draft.documentId,
          data: { ...data, slug } as never,
          status: 'published',
        } as never);
        return draft.documentId;
      }

      const created = await docs.create({
        data: { ...data, slug },
        status: 'published',
      } as never);
      return created.documentId;
    };

    // 1. Core Agriculture Taxonomies
    const regularMode = await upsert('course-mode', 'regular', {
      name: 'On-Campus (Regular)',
    });
    const yearsType = await upsert('duration-type', 'years', { name: 'Years' });
    const degreeType = await upsert('course-type', 'degree', { name: 'Degree' });
    const ugLevel = await upsert('level', 'undergraduate', {
      name: 'Undergraduate (UG)',
    });
    const pgLevel = await upsert('level', 'postgraduate', {
      name: 'Postgraduate (PG)',
    });

    const agriStream = await upsert('stream', 'agriculture-allied-sciences', {
      name: 'Agriculture & Allied Sciences',
    });
    const engStream = await upsert('stream', 'agricultural-engineering', {
      name: 'Agricultural Engineering & Tech',
    });
    const abmStream = await upsert('stream', 'agribusiness-management', {
      name: 'Agribusiness Management',
    });

    const icarApproval = await upsert('approval', 'icar', {
      name: 'ICAR Accredited',
    });
    const ugcApproval = await upsert('approval', 'ugc', {
      name: 'UGC Recognized',
    });

    const sauOwnership = await upsert(
      'ownership-type',
      'state-agricultural-university',
      { name: 'State Agricultural University (SAU)' }
    );
    const deemedOwnership = await upsert(
      'ownership-type',
      'central-icar-deemed-university',
      { name: 'Central / ICAR Deemed University' }
    );

    // 2. Courses
    const bscAgriCourse = await upsert('course', 'bsc-agriculture', {
      name: 'B.Sc. (Hons.) Agriculture',
      full_name: 'Bachelor of Science (Honours) in Agriculture',
      level: ugLevel,
    });
    const btechAgriCourse = await upsert(
      'course',
      'btech-agricultural-engineering',
      {
        name: 'B.Tech. Agricultural Engineering',
        full_name: 'Bachelor of Technology in Agricultural Engineering',
        level: ugLevel,
      }
    );
    const mscAgroCourse = await upsert('course', 'msc-agronomy', {
      name: 'M.Sc. Agriculture (Agronomy)',
      full_name: 'Master of Science in Agriculture (Agronomy)',
      level: pgLevel,
    });

    // 3. Entrance Exams
    await upsert('exam', 'icar-cuet-ug', {
      name: 'CUET (ICAR-UG)',
      short_description:
        'National entrance examination conducted by NTA for All-India Quota (AIQ) undergraduate seats in Agriculture and Allied Sciences across SAUs and ICAR Deemed Universities.',
    });
    await upsert('exam', 'icar-aieea-pg', {
      name: 'ICAR AIEEA (PG)',
      short_description:
        'All India Entrance Examination for Admission to Master’s degree programmes (M.Sc. Agriculture, Horticulture, Forestry, M.Tech. Agricultural Engineering) and ICAR PG Scholarships.',
    });

    // 4. Scholarships
    await upsert('scholarship', 'icar-national-talent-scholarship-ug', {
      name: 'ICAR National Talent Scholarship (NTS-UG)',
      provider: 'Indian Council of Agricultural Research (ICAR), New Delhi',
      amount: '₹3,000 per month (₹36,000 / year)',
      eligibility:
        'Students admitted through CUET (ICAR-UG) All-India Quota to an ICAR-accredited agricultural university located outside their state of domicile.',
    });

    // 5. Flagship Agricultural Universities & Offerings
    const universities = [
      {
        slug: 'punjab-agricultural-university',
        name: 'Punjab Agricultural University',
        city: 'Ludhiana',
        state: 'Punjab',
        ownership: sauOwnership,
      },
      {
        slug: 'tamil-nadu-agricultural-university',
        name: 'Tamil Nadu Agricultural University',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        ownership: sauOwnership,
      },
      {
        slug: 'indian-agricultural-research-institute',
        name: 'ICAR–Indian Agricultural Research Institute',
        city: 'New Delhi',
        state: 'Delhi',
        ownership: deemedOwnership,
      },
    ];

    for (const [idx, u] of universities.entries()) {
      const uniDocId = await upsert('university', u.slug, {
        name: u.name,
        full_name: u.name,
        city: u.city,
        state: u.state,
        country: 'India',
        position: idx + 1,
        ownership_type: u.ownership,
        approvals: [icarApproval, ugcApproval],
        streams: [agriStream, engStream, abmStream],
        course_modes: [regularMode],
        course_types: [degreeType],
        courses: [bscAgriCourse, btechAgriCourse, mscAgroCourse],
        show_apply_button: true,
        apply_button_text: 'Enquire now',
        view_button_text: 'Explore campus',
      });

      await upsert('program', `${u.slug}-bsc-agriculture`, {
        name: `${u.name} — B.Sc. (Hons.) Agriculture`,
        full_name: 'Bachelor of Science (Honours) in Agriculture',
        course_code: 'B.Sc. (Hons.) Ag.',
        duration: 4,
        duration_text: '4 years (8 semesters)',
        duration_type: yearsType,
        course_mode: regularMode,
        course_type: degreeType,
        course: bscAgriCourse,
        stream: agriStream,
        universities: [uniDocId],
        position: idx + 1,
        show_apply_button: true,
        apply_button_text: 'Check eligibility',
        view_button_text: 'View programme',
        short_description: blocks(
          'Four-year on-campus undergraduate degree structured around the ICAR 6th Deans’ Committee syllabus, instructional farm practicals, and RAWE village attachment.'
        ),
      });
    }

    // 6. Statutory Legal Pages
    const legalPages = [
      [
        'privacy-policy',
        'Privacy Policy',
        'Agrico operates an independent academic discovery and admission guidance platform focused on on-campus agriculture and allied sciences education in India.',
      ],
      [
        'terms-and-conditions',
        'Terms & Conditions',
        'Agrico provides structured editorial information, syllabus summaries, accreditation checks, and admission counselling for on-campus agricultural programmes in India.',
      ],
      [
        'disclaimer',
        'Editorial & Affiliation Disclaimer',
        'Agrico is an independent higher-education information and admission guidance portal dedicated to agriculture and allied sciences in India.',
      ],
    ] as const;

    for (const [slug, name, summary] of legalPages) {
      await upsert('legal', slug, {
        name,
        description: blocks(summary),
      });
    }

    app.log.info('Agrico On-Campus Agriculture CMS baseline seeded successfully.');
  } finally {
    await app.destroy();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

