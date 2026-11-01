import { createStrapi, compileStrapi } from '@strapi/strapi';

function createParagraphBlock(text: string, bold = false) {
  return {
    type: 'paragraph',
    children: [
      {
        type: 'text',
        text,
        ...(bold ? { bold: true } : {}),
      },
    ],
  };
}

function createHeadingBlock(text: string, level: 1 | 2 | 3 | 4 = 2) {
  return {
    type: 'heading',
    level,
    children: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

function createListBlock(items: string[], format: 'unordered' | 'ordered' = 'unordered') {
  return {
    type: 'list',
    format,
    children: items.map((item) => ({
      type: 'list-item',
      children: [
        {
          type: 'text',
          text: item,
        },
      ],
    })),
  };
}

async function main() {
  console.log('Starting VGU import...');
  const app = await createStrapi(await compileStrapi()).load();
  console.log('Strapi loaded successfully!');

  try {
    const docs = app.documents;

    // 1. Resolve Ownership Type (Private)
    let ownership = await docs('api::ownership-type.ownership-type' as never).findFirst({
      filters: { slug: 'private' },
    });
    if (!ownership) {
      ownership = await docs('api::ownership-type.ownership-type' as never).create({
        data: { name: 'Private', slug: 'private' } as never,
        status: 'published',
      });
    }

    // 2. Resolve Approvals
    const approvalSlugs = ['ugc', 'aicte', 'aiu', 'naac-a'];
    const approvalDocIds: string[] = [];
    for (const s of approvalSlugs) {
      let appr = await docs('api::approval.approval' as never).findFirst({
        filters: { slug: s },
      });
      if (!appr && s === 'naac-a') {
        appr = await docs('api::approval.approval' as never).create({
          data: { name: 'NAAC A+', slug: 'naac-a' } as never,
          status: 'published',
        });
      }
      if (appr && (appr as any).documentId) {
        approvalDocIds.push((appr as any).documentId);
      }
    }

    // 3. Create / Update University
    const uniSlug = 'vivekananda-global-university-online';
    let university = await docs('api::university.university' as never).findFirst({
      filters: { slug: uniSlug },
    });

    const uniData = {
      name: 'Vivekananda Global University Online',
      full_name: 'Vivekananda Global University, Jaipur',
      slug: uniSlug,
      country: 'India',
      state: 'Rajasthan',
      city: 'Jaipur',
      address: 'Sector 36, Sisyawas, NRI Road, Jagatpura, Jaipur, Rajasthan 303012',
      pincode: '303012',
      establish: '2012-01-01',
      rating: 4.6,
      position: 12,
      heading: 'Vivekananda Global University (VGU Online) — Programs, Fees & Admissions 2026',
      show_apply_button: true,
      apply_button_text: 'Apply for Admission',
      view_button_text: 'Explore Programs',
      show_similar_universities: true,
      ownership_type: (ownership as any)?.documentId,
      approvals: approvalDocIds,
    };

    if (!university) {
      university = await docs('api::university.university' as never).create({
        data: uniData as never,
        status: 'published',
      });
      console.log('Created University:', (university as any).name);
    } else {
      university = await docs('api::university.university' as never).update({
        documentId: (university as any).documentId,
        data: uniData as never,
        status: 'published',
      });
      console.log('Updated University:', (university as any).name);
    }

    const uniDocId = (university as any).documentId;

    // 4. University Content Sections (Tab Subpages)
    const sections = [
      {
        slug: 'vgu-online-about',
        secondary_slug: 'about',
        name: 'About',
        heading: 'About Vivekananda Global University Online',
        content: [
          {
            __component: 'common.rich-text',
            body: [
              createParagraphBlock(
                'Established in 2012 in Jaipur, Rajasthan, Vivekananda Global University (VGU) is a premier higher education institution recognized with a NAAC A+ Grade accreditation. VGU Online is the dedicated distance and digital learning division of the university, entitled by the University Grants Commission (UGC-DEB) to award fully accredited undergraduate and postgraduate degrees entirely over the internet.'
              ),
              createHeadingBlock('Academic Pedagogy & Flexible Learning', 3),
              createParagraphBlock(
                'VGU Online combines structured self-paced learning resources with interactive live virtual webinars conducted by experienced professors and corporate leaders. Students enjoy round-the-clock access to digital learning material, interactive e-books, self-assessment modules, and recorded lectures via a modern Learning Management System (LMS).'
              ),
              createHeadingBlock('Key University Highlights', 3),
              createListBlock([
                'NAAC A+ Grade accredited state private university.',
                'Statutory UGC-DEB entitlement ensuring 100% equivalence with on-campus degrees.',
                'Recognized by AICTE for technical and management courses (MCA, MBA, BCA).',
                'Active global network of 50,000+ students and alumni across 29+ countries.',
                'Dedicated career incubation and corporate placement assistance with 500+ hiring partners.',
              ]),
            ],
          },
        ],
      },
      {
        slug: 'vgu-online-admissions',
        secondary_slug: 'admissions',
        name: 'Admissions',
        heading: 'VGU Online Admission Process & Eligibility 2026',
        content: [
          {
            __component: 'common.rich-text',
            body: [
              createParagraphBlock(
                'Admissions at Vivekananda Global University Online are conducted 100% digitally through a streamlined, transparent portal without requiring an entrance exam. Fresh batches open bi-annually in January and July academic cycles.'
              ),
              createHeadingBlock('4-Step Direct Application Process', 3),
              createListBlock([
                'Step 1 — Online Registration: Fill in basic contact details, select your preferred degree and specialization.',
                'Step 2 — Document Upload: Submit scanned copies of academic transcripts (10th, 12th, Graduation Marksheets), Govt. ID (Aadhaar/Passport), and photograph.',
                'Step 3 — Eligibility Verification & Fee Payment: Academic coordinators verify documents; pay the semester instalment via Net Banking, UPI, or Credit/Debit cards.',
                'Step 4 — Enrolment & LMS Activation: Receive official university enrolment number, student ID, and LMS login credentials within 24-48 hours.',
              ]),
              createHeadingBlock('Eligibility Guidelines', 3),
              createListBlock([
                'Undergraduate Programs (BBA, BCA, BA): 10+2 passed from a recognized state or national education board (CBSE, ICSE, NIOS, etc.) with minimum passing marks.',
                'Postgraduate Programs (MBA, MCA, M.Sc, MA): Bachelor’s degree in any discipline from a recognized university with at least 50% aggregate marks (45% for reserved categories).',
              ]),
            ],
          },
        ],
      },
      {
        slug: 'vgu-online-courses-fees',
        secondary_slug: 'courses-fees',
        name: 'Courses & Fees',
        heading: 'VGU Online Courses, Fee Structure & Instalment Plans',
        content: [
          {
            __component: 'common.rich-text',
            body: [
              createParagraphBlock(
                'Vivekananda Global University Online follows an affordable, transparent fee structure with zero hidden charges. To make higher education easily accessible, fees can be paid on a semester-wise basis or through low-cost educational instalment schemes.'
              ),
              createHeadingBlock('Fee Instalments & Payment Options', 3),
              createParagraphBlock(
                'Students can pay course fees semester-by-semester directly through the student portal. The university also facilitates convenient 0% interest monthly instalment options with leading education financing partners, requiring no physical bank branch visits.'
              ),
              createHeadingBlock('Undergraduate Programs Fee Breakdown', 3),
              createListBlock([
                'Online BBA (3 Years / 6 Semesters): Total Fee ₹1,32,000 (₹22,000 per semester).',
                'Online BCA (3 Years / 6 Semesters): Total Fee ₹1,32,000 (₹22,000 per semester).',
                'Online BA (3 Years / 6 Semesters): Total Fee ₹72,000 (₹12,000 per semester).',
              ]),
              createHeadingBlock('Postgraduate Programs Fee Breakdown', 3),
              createListBlock([
                'Online MBA (2 Years / 4 Semesters): Total Fee ₹1,50,000 (₹37,500 per semester).',
                'Online MCA (2 Years / 4 Semesters): Total Fee ₹1,50,000 (₹37,500 per semester).',
                'Online M.Sc (2 Years / 4 Semesters): Total Fee ₹72,000 (₹18,000 per semester).',
                'Online MA (2 Years / 4 Semesters): Total Fee ₹72,000 (₹18,000 per semester).',
              ]),
            ],
          },
        ],
      },
      {
        slug: 'vgu-online-examinations',
        secondary_slug: 'examinations',
        name: 'Examinations',
        heading: 'VGU Online Examination & Remote Assessment System',
        content: [
          {
            __component: 'common.rich-text',
            body: [
              createParagraphBlock(
                'Vivekananda Global University conducts all term-end examinations and internal continuous assessments 100% online through secure, AI-proctored digital evaluation systems. Learners do not need to travel to physical examination centers.'
              ),
              createHeadingBlock('Evaluation Breakdown', 3),
              createListBlock([
                'Continuous Internal Assessment (30% Weightage): Module assignments, case study submissions, e-quizzes, and LMS discussion participation.',
                'End-Term Semester Examination (70% Weightage): Timed online exams featuring objective questions (MCQs) and structured descriptive answers.',
              ]),
              createHeadingBlock('Smart AI-Proctored Security', 3),
              createParagraphBlock(
                'Examinations are secured using dual-layer proctoring — AI-based real-time screen and webcam monitoring combined with certified live human invigilators, ensuring complete fairness and international examination integrity.'
              ),
            ],
          },
        ],
      },
      {
        slug: 'vgu-online-placements',
        secondary_slug: 'placements',
        name: 'Placements',
        heading: 'Career Assistance & Corporate Placement Partners',
        content: [
          {
            __component: 'common.rich-text',
            body: [
              createParagraphBlock(
                'VGU’s Corporate Resource Centre (CRC) actively supports online learners with end-to-end career transition assistance, professional mentorship, resume optimization, and virtual placement drives.'
              ),
              createHeadingBlock('Career Advancement Services', 3),
              createListBlock([
                'Resume & LinkedIn Profile Building: Expert feedback on crafting modern, ATS-compliant resumes.',
                'Mock Interviews & Soft Skills Training: Preparation sessions for technical rounds, aptitude tests, and leadership interviews.',
                'Virtual Recruitment Drives: Exclusive access to job postings and interview scheduling across 500+ corporate recruiters.',
              ]),
              createHeadingBlock('Top Recruitment Partners', 3),
              createListBlock([
                'KPMG, IBM, Intel, HCL Technologies, Infosys, Wipro, TCS, Justdial, Vivo, Panasonic, and Concentrix.',
              ]),
            ],
          },
        ],
      },
      {
        slug: 'vgu-online-approvals',
        secondary_slug: 'approvals',
        name: 'Approvals',
        heading: 'Accreditations & Statutory Recognitions (UGC-DEB, AICTE, NAAC A+)',
        content: [
          {
            __component: 'common.rich-text',
            body: [
              createParagraphBlock(
                'All degrees awarded by Vivekananda Global University Online carry statutory approvals from India’s top educational regulatory authorities, ensuring 100% legal validity across government jobs, corporate recruitment, and higher studies globally.'
              ),
              createHeadingBlock('Key Statutory Approvals', 3),
              createListBlock([
                'UGC-DEB: Entitled by the University Grants Commission — Distance Education Bureau under statutory online degree regulations.',
                'NAAC A+ Grade: Accredited with an A+ Grade for exemplary academic standards, robust governance, and infrastructure.',
                'AICTE: Approved by All India Council for Technical Education for professional management (MBA) and technical programs (MCA/BCA).',
                'AIU Member: Recognized by the Association of Indian Universities, ensuring worldwide degree acceptance.',
              ]),
            ],
          },
        ],
      },
      {
        slug: 'vgu-online-faqs',
        secondary_slug: 'faqs',
        name: 'FAQs',
        heading: 'Frequently Asked Questions — VGU Online',
        content: [
          {
            __component: 'college.faq-section',
            faqs: [
              {
                title: 'Is an online degree from Vivekananda Global University valid for Government jobs?',
                description: [
                  createParagraphBlock(
                    'Yes. VGU is recognized by UGC-DEB and AICTE. As per statutory UGC regulations, degrees obtained through online mode from recognized universities hold exact equivalence with regular on-campus degrees for all Central/State Government jobs, UPSC, and PSU recruitments.'
                  ),
                ],
              },
              {
                title: 'Do I need to visit the VGU campus for examinations or practicals?',
                description: [
                  createParagraphBlock(
                    'No. All term-end examinations, project evaluations, and quizzes are conducted 100% online through secure AI-proctored web interfaces. You can take exams from any location with a computer and internet connection.'
                  ),
                ],
              },
              {
                title: 'What are the fee payment options available for students?',
                description: [
                  createParagraphBlock(
                    'Students can pay course fees on a semester-wise instalment basis. Additionally, no-cost/low-cost monthly instalment plans are available with education financing partners.'
                  ),
                ],
              },
              {
                title: 'Are live lectures mandatory to attend?',
                description: [
                  createParagraphBlock(
                    'Live weekend sessions are highly recommended for interactive doubt-solving. However, all live sessions are recorded and archived in the LMS, allowing working professionals to learn at their own convenience.'
                  ),
                ],
              },
              {
                title: 'Does VGU provide career guidance and placement assistance for online students?',
                description: [
                  createParagraphBlock(
                    'Yes. The university provides comprehensive career support including resume building, mock interviews, career mentoring, and access to virtual placement drives with 500+ hiring partners.'
                  ),
                ],
              },
            ],
          },
        ],
      },
    ];

    // Insert or update all content sections linked to the university
    for (const sec of sections) {
      let existing = await docs('api::university-content.university-content' as never).findFirst({
        filters: { slug: sec.slug },
      });

      const secData = {
        name: sec.name,
        slug: sec.slug,
        secondary_slug: sec.secondary_slug,
        heading: sec.heading,
        university: uniDocId,
        content: sec.content,
      };

      if (!existing) {
        existing = await docs('api::university-content.university-content' as never).create({
          data: secData as never,
          status: 'published',
        });
        console.log(`Created Section: ${sec.name} (${sec.slug})`);
      } else {
        existing = await docs('api::university-content.university-content' as never).update({
          documentId: (existing as any).documentId,
          data: secData as never,
          status: 'published',
        });
        console.log(`Updated Section: ${sec.name} (${sec.slug})`);
      }
    }

    // 5. Create Programs for VGU Online
    const programsToCreate = [
      { name: 'Online MBA', slug: 'vgu-online-mba', fee: 150000, duration: 2 },
      { name: 'Online MCA', slug: 'vgu-online-mca', fee: 150000, duration: 2 },
      { name: 'Online BCA', slug: 'vgu-online-bca', fee: 132000, duration: 3 },
      { name: 'Online BBA', slug: 'vgu-online-bba', fee: 132000, duration: 3 },
      { name: 'Online M.Sc', slug: 'vgu-online-msc', fee: 72000, duration: 2 },
      { name: 'Online MA', slug: 'vgu-online-ma', fee: 72000, duration: 2 },
      { name: 'Online BA', slug: 'vgu-online-ba', fee: 72000, duration: 3 },
    ];

    for (const prog of programsToCreate) {
      let existingProg = await docs('api::program.program' as never).findFirst({
        filters: { slug: prog.slug },
      });

      const progData = {
        name: prog.name,
        slug: prog.slug,
        fee: prog.fee,
        duration: prog.duration,
        show_apply_button: true,
        apply_button_text: 'Apply Now',
        view_button_text: 'View Details',
        universities: [uniDocId],
      };

      if (!existingProg) {
        existingProg = await docs('api::program.program' as never).create({
          data: progData as never,
          status: 'published',
        });
        console.log(`Created Program: ${prog.name} (${prog.slug})`);
      } else {
        existingProg = await docs('api::program.program' as never).update({
          documentId: (existingProg as any).documentId,
          data: progData as never,
          status: 'published',
        });
        console.log(`Updated Program: ${prog.name} (${prog.slug})`);
      }
    }

    console.log('\n✅ ALL VGU ONLINE DATA & TAB PAGES CREATED AND PUBLISHED SUCCESSFULLY!');
  } finally {
    await app.destroy().catch(() => {});
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });
