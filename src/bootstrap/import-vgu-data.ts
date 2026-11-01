import type { Core } from '@strapi/strapi';

function p(text: string, bold = false) {
  return {
    type: 'paragraph' as const,
    children: [{ type: 'text' as const, text, ...(bold ? { bold: true } : {}) }],
  };
}

function h(text: string, level: 1 | 2 | 3 | 4 | 5 | 6 = 2) {
  return {
    type: 'heading' as const,
    level,
    children: [{ type: 'text' as const, text, bold: true }],
  };
}

function ul(items: string[]) {
  return {
    type: 'list' as const,
    format: 'unordered' as const,
    children: items.map(item => ({
      type: 'list-item' as const,
      children: [{ type: 'text' as const, text: item }],
    })),
  };
}

function ol(items: string[]) {
  return {
    type: 'list' as const,
    format: 'ordered' as const,
    children: items.map(item => ({
      type: 'list-item' as const,
      children: [{ type: 'text' as const, text: item }],
    })),
  };
}

export async function importVGUData(strapi: Core.Strapi): Promise<void> {
  const uniSlug = 'vivekananda-global-university-online';

  strapi.log.info(`[VGU-Import] Starting VGU Online Data Import...`);

  // 1. Programs
  const programsData = [
    {
      name: 'Online MBA',
      slug: 'vgu-online-mba',
      full_name: 'Master of Business Administration (Online MBA)',
      duration: 2,
      duration_text: '2 Years (4 Semesters)',
      fee: 150000,
      rating: 4.7,
      short_description: [
        p('The Online MBA at Vivekananda Global University is a 2-year UGC-DEB approved postgraduate program designed to develop strategic management capabilities, leadership qualities, and modern decision-making skills.'),
        p('Specializations include Financial Management, Marketing Management, Human Resource Management, Information Technology, Healthcare Management, and Operations Management.'),
      ],
      note: 'Total 2 Years Course Fee (₹37,500/semester)',
    },
    {
      name: 'Online MCA',
      slug: 'vgu-online-mca',
      full_name: 'Master of Computer Applications (Online MCA)',
      duration: 2,
      duration_text: '2 Years (4 Semesters)',
      fee: 150000,
      rating: 4.6,
      short_description: [
        p('VGU Online MCA provides an advanced technical curriculum covering Full Stack Web Development, Cloud Computing, Artificial Intelligence, Machine Learning, and Enterprise Database Architecture.'),
        p('Graduates are equipped for elite technology roles including Software Architect, Cloud Engineer, System Specialist, and Full Stack Lead.'),
      ],
      note: 'Total 2 Years Course Fee (₹37,500/semester)',
    },
    {
      name: 'Online BCA',
      slug: 'vgu-online-bca',
      full_name: 'Bachelor of Computer Applications (Online BCA)',
      duration: 3,
      duration_text: '3 Years (6 Semesters)',
      fee: 132000,
      rating: 4.5,
      short_description: [
        p('Online BCA at VGU is a comprehensive 3-year undergraduate foundation in computer applications, programming languages (Python, Java, C++), web technologies, and database design.'),
        p('Ideal for candidates starting a rewarding journey in the software development and IT services industry.'),
      ],
      note: 'Total 3 Years Course Fee (₹22,000/semester)',
    },
    {
      name: 'Online BBA',
      slug: 'vgu-online-bba',
      full_name: 'Bachelor of Business Administration (Online BBA)',
      duration: 3,
      duration_text: '3 Years (6 Semesters)',
      fee: 132000,
      rating: 4.5,
      short_description: [
        p('VGU Online BBA provides fundamental business acumen, financial accounting, marketing strategies, and organizational behavior insights for aspiring corporate professionals and entrepreneurs.'),
      ],
      note: 'Total 3 Years Course Fee (₹22,000/semester)',
    },
    {
      name: 'Online M.Sc Mathematics',
      slug: 'vgu-online-msc-mathematics',
      full_name: 'Master of Science in Mathematics (Online M.Sc)',
      duration: 2,
      duration_text: '2 Years (4 Semesters)',
      fee: 72000,
      rating: 4.4,
      short_description: [
        p('An advanced mathematical degree covering Real Analysis, Complex Analysis, Differential Equations, Linear Algebra, and Statistical Computing with flexible remote learning.'),
      ],
      note: 'Total 2 Years Course Fee (₹18,000/semester)',
    },
    {
      name: 'Online MA English',
      slug: 'vgu-online-ma-english',
      full_name: 'Master of Arts in English (Online MA)',
      duration: 2,
      duration_text: '2 Years (4 Semesters)',
      fee: 72000,
      rating: 4.4,
      short_description: [
        p('Explore world literature, literary criticism, linguistics, and advanced communication theory through VGU Online MA English program.'),
      ],
      note: 'Total 2 Years Course Fee (₹18,000/semester)',
    },
    {
      name: 'Online BA',
      slug: 'vgu-online-ba',
      full_name: 'Bachelor of Arts (Online BA)',
      duration: 3,
      duration_text: '3 Years (6 Semesters)',
      fee: 72000,
      rating: 4.3,
      short_description: [
        p('A multi-disciplinary humanities degree encompassing Political Science, History, Sociology, and Economics for a well-rounded foundation in liberal arts and competitive civil service preparations.'),
      ],
      note: 'Total 3 Years Course Fee (₹12,000/semester)',
    },
  ];

  const programDocIds: string[] = [];

  for (const prog of programsData) {
    let existingProg = await strapi.db.query('api::program.program').findOne({
      where: { slug: prog.slug },
    });

    let docId = existingProg?.documentId;
    const progPayload = {
      name: prog.name,
      slug: prog.slug,
      full_name: prog.full_name,
      duration: prog.duration,
      duration_text: prog.duration_text,
      fee: prog.fee,
      rating: prog.rating,
      short_description: prog.short_description,
    };

    if (!docId) {
      const created = await strapi.documents('api::program.program').create({
        data: progPayload as any,
        status: 'published',
      });
      docId = created.documentId;
    } else {
      await strapi.documents('api::program.program').update({
        documentId: docId,
        data: progPayload as any,
        status: 'published',
      });
    }

    if (docId) {
      programDocIds.push(docId);
    }
  }

  // 2. University
  let existingUni = await strapi.db.query('api::university.university').findOne({
    where: { slug: uniSlug },
  });

  const uniData = {
    name: 'Vivekananda Global University',
    slug: uniSlug,
    heading: 'Vivekananda Global University (VGU Online)',
    established_year: 2012,
    rating: 4.6,
    address: 'Sector 36, NRI Road, Jagatpura',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '303012',
    show_apply_button: true,
    show_similar_universities: true,
    highlights: [
      { key: 'Accreditation', value: 'NAAC A+ Grade (CGPA 3.01)' },
      { key: 'Government Approvals', value: 'UGC-DEB, AICTE, AIU, PCI, BCI' },
      { key: 'Learning Mode', value: '100% Online with Interactive LMS' },
      { key: 'Examination System', value: 'Remote AI-Proctored Exams' },
      { key: 'Placement Network', value: '500+ Corporate Recruiting Partners' },
      { key: 'EMI Facility', value: '0% Interest Easy EMI Available' },
    ],
  };

  let uniDocId = existingUni?.documentId;
  if (!uniDocId) {
    strapi.log.info(`[VGU-Import] Creating university ${uniData.name}...`);
    const created = await strapi.documents('api::university.university').create({
      data: uniData as any,
      status: 'published',
    });
    uniDocId = created.documentId;
  } else {
    strapi.log.info(`[VGU-Import] Updating university ${uniData.name}...`);
    await strapi.documents('api::university.university').update({
      documentId: uniDocId,
      data: uniData as any,
      status: 'published',
    });
  }

  strapi.log.info(`[VGU-Import] University Document ID: ${uniDocId}`);

  // Link programs back to university
  for (const progDocId of programDocIds) {
    try {
      await strapi.documents('api::program.program').update({
        documentId: progDocId,
        data: {
          universities: [uniDocId],
        } as any,
        status: 'published',
      });
    } catch (e: any) {
      strapi.log.warn(`[VGU-Import] Could not link program: ${e.message}`);
    }
  }

  // 3. Tab Sections Content
  const tabContents = [
    {
      name: 'About',
      slug: 'vivekananda-global-university-online-about',
      secondary_slug: 'about',
      section_key: 'about',
      heading: 'About Vivekananda Global University Online',
      position: 1,
      content: [
        {
          __component: 'common.rich-text',
          body: [
            p('Established under the Rajasthan State Legislative Act No. 11/2012, Vivekananda Global University (VGU), Jaipur has emerged as one of northern India’s premier multidisciplinary institutions. Accredited with a distinguished NAAC A+ Grade (CGPA 3.01), VGU is fully approved by the University Grants Commission - Distance Education Bureau (UGC-DEB) and the All India Council for Technical Education (AICTE) to deliver world-class higher education completely online.'),
            h('A Modern Digital Learning Ecosystem', 3),
            p('VGU Online bridges the gap between academic theory and practical industry requirements. Built on a student-centric model, it delivers live interactive lectures, masterclasses with industry practitioners, digital e-libraries, and 24/7 access to recorded lectures via a cutting-edge Learning Management System (LMS).'),
            h('Why Choose Vivekananda Global University Online?', 3),
            ul([
              'Prestigious NAAC A+ Grade & UGC-DEB Approved Degree Valid Worldwide for Higher Education & Government Jobs.',
              'Interactive LMS with Recorded Lectures, Case Studies, E-Books, and Practice Assessments available anytime, anywhere.',
              '100% Proctored Online Exams: Take semester examinations from your home with utmost convenience and security.',
              'Dedicated Career Mentorship & Placement Support connecting students with 500+ top hiring organizations.',
              'Affordable, transparent fee structures accompanied by flexible zero-interest monthly installment options.',
              'Global Alumni Network spanning 30,000+ professionals working across premier multinational corporations.',
            ]),
            h('Key University Facts & Accreditations', 3),
            ul([
              'Establishment: 2012 under the Bagaria Education Trust.',
              'Location: Jaipur, Rajasthan, India.',
              'Accreditation: NAAC Grade A+ (Highest tier for private online learning).',
              'Approvals: UGC-DEB, AICTE, AIU, PCI, BCI, COA.',
              'Member: Association of Indian Universities (AIU) ensuring degree parity with regular on-campus programs.',
            ]),
          ],
        },
      ],
    },
    {
      name: 'Admissions',
      slug: 'vivekananda-global-university-online-admissions',
      secondary_slug: 'admissions',
      section_key: 'admission',
      heading: 'VGU Online Admission Process 2026',
      position: 2,
      content: [
        {
          __component: 'common.rich-text',
          body: [
            p('Admissions at Vivekananda Global University Online are streamlined into an intuitive 100% digital process. Candidates can submit their applications, upload verification documents, and pay program fees securely without visiting the physical campus.'),
            h('Step-by-Step Online Admission Flow', 3),
            ol([
              'Online Registration: Visit the official portal and sign up using your email and contact details.',
              'Program Selection & Application: Select your desired degree program, specialization, and fill in personal and educational information.',
              'Document Upload: Submit scanned copies of academic transcripts (10th, 12th, Graduation as applicable), government ID proof (Aadhaar/Passport), and passport-size photographs.',
              'Eligibility Verification: The university admission panel verifies credentials within 24 to 48 business hours.',
              'Fee Payment & LMS Access: Pay the course fee or first semester installment through UPI, Net Banking, Credit/Debit Card, or zero-interest EMI options to receive your Student ID and LMS login credentials.',
            ]),
            h('Eligibility Criteria Overview', 3),
            ul([
              'Undergraduate Programs (BBA / BCA / BA): 10+2 (Higher Secondary) pass from a recognized Central or State Board with minimum passing marks (45-50%).',
              'Postgraduate Programs (MBA / MCA / MA / M.Sc): Bachelor’s Degree in any discipline from a UGC-recognized university with at least 50% aggregate marks (Mathematics background for MCA/M.Sc).',
            ]),
          ],
        },
      ],
    },
    {
      name: 'Courses & Fees',
      slug: 'vivekananda-global-university-online-courses-fees',
      secondary_slug: 'courses-fees',
      section_key: 'fees',
      heading: 'VGU Online Courses, Specializations & Fee Structure',
      position: 3,
      content: [
        {
          __component: 'common.rich-text',
          body: [
            p('VGU Online offers competitive, all-inclusive academic fee structures designed to provide high-return executive and degree education at affordable rates with convenient semester-wise and EMI payment schemes.'),
            h('Fee Breakdown by Program (Annual & Semester)', 3),
            ul([
              'Online MBA: ₹1,50,000 total course fee (₹37,500 per semester) | 2 Years Duration | 6 Popular Specializations.',
              'Online MCA: ₹1,50,000 total course fee (₹37,500 per semester) | 2 Years Duration | AI, Cloud & Full Stack Tracks.',
              'Online BCA: ₹1,32,000 total course fee (₹22,000 per semester) | 3 Years Duration | Core IT & Programming Foundation.',
              'Online BBA: ₹1,32,000 total course fee (₹22,000 per semester) | 3 Years Duration | General Management & Marketing.',
              'Online M.Sc Mathematics: ₹72,000 total course fee (₹18,000 per semester) | 2 Years Duration.',
              'Online MA English: ₹72,000 total course fee (₹18,000 per semester) | 2 Years Duration.',
              'Online BA: ₹72,000 total course fee (₹12,000 per semester) | 3 Years Duration.',
            ]),
            h('Flexible EMI & Financial Aid', 3),
            p('Students can avail 0% interest monthly installment plans arranged through accredited banking and NBFC partners, ensuring that higher education remains accessible without financial strain.'),
          ],
        },
      ],
    },
    {
      name: 'Examinations',
      slug: 'vivekananda-global-university-online-examinations',
      secondary_slug: 'examinations',
      section_key: 'examination',
      heading: 'VGU Online Examination & Assessment System',
      position: 4,
      content: [
        {
          __component: 'common.rich-text',
          body: [
            p('Vivekananda Global University employs a modern continuous evaluation model coupled with secure, remote AI-proctored semester-end examinations. Students can take tests from any quiet room with a standard laptop/PC and webcam.'),
            h('Comprehensive Evaluation Architecture (30:70 Model)', 3),
            ul([
              'Continuous Internal Assessment (30% Weightage): Includes LMS quizzes, project submissions, case study analyses, and interactive discussion forum participation.',
              'Term-End Examinations (70% Weightage): End-of-semester proctored exams consisting of multiple-choice questions (MCQs) and descriptive problem-solving sections.',
            ]),
            h('AI-Proctored Remote Testing Protocol', 3),
            p('To maintain international standards of academic rigor, VGU’s testing platform uses dual-camera and screen-lock surveillance to verify candidate identity and prevent malpractice, allowing genuine scholars to earn recognized credentials safely.'),
          ],
        },
      ],
    },
    {
      name: 'Placements',
      slug: 'vivekananda-global-university-online-placements',
      secondary_slug: 'placements',
      section_key: 'placements',
      heading: 'VGU Online Placement Assistance & Career Network',
      position: 5,
      content: [
        {
          __component: 'common.rich-text',
          body: [
            p('VGU Online’s dedicated Corporate Resource Center (CRC) equips distance and online learners with the corporate skills required to secure high-growth career opportunities across top multinational corporations, Fortune 500 enterprises, and unicorns.'),
            h('Placement Highlights & Support Pillars', 3),
            ul([
              '500+ Corporate Recruiters participating in virtual campus drives and direct hiring rounds.',
              '1-on-1 Resume Optimization & LinkedIn Personal Branding workshops.',
              'Simulated Technical & HR Mock Interviews with senior industry executives.',
              'Soft Skills, Corporate Communication & Executive Leadership Development modules.',
              'Dedicated Job Notification Portal with continuous industry vacancies.',
            ]),
            h('Leading Recruiting Partners', 3),
            p('Top recruiters hiring VGU graduates include Tata Consultancy Services (TCS), Infosys, Wipro, HCL Technologies, ICICI Bank, Axis Bank, Reliance Industries, Samsung, Tech Mahindra, and Capgemini.'),
          ],
        },
      ],
    },
    {
      name: 'Approvals',
      slug: 'vivekananda-global-university-online-approvals',
      secondary_slug: 'approvals',
      section_key: 'about',
      heading: 'VGU Online Accreditations, Approvals & Government Recognition',
      position: 6,
      content: [
        {
          __component: 'common.rich-text',
          body: [
            p('Every degree awarded by Vivekananda Global University Online is 100% equivalent to a conventional on-campus degree under the University Grants Commission (Open and Distance Learning Programmes and Online Programmes) Regulations.'),
            h('Statutory Approvals & Accreditations', 3),
            ul([
              'University Grants Commission - Distance Education Bureau (UGC-DEB): Full statutory approval to conduct online graduate and postgraduate degree programs.',
              'National Assessment and Accreditation Council (NAAC): Accredited with Grade A+ (CGPA 3.01), affirming world-class infrastructure and pedagogical quality.',
              'All India Council for Technical Education (AICTE): Recognized for professional technical and management programs including Online MBA and Online MCA.',
              'Association of Indian Universities (AIU): Member university granting complete degree equivalence for higher studies and government employment across India.',
              'Bar Council of India (BCI) & Pharmacy Council of India (PCI): Accreditations for university-wide faculties and institutional excellence.',
            ]),
          ],
        },
      ],
    },
    {
      name: 'FAQs',
      slug: 'vivekananda-global-university-online-faqs',
      secondary_slug: 'faqs',
      section_key: 'about',
      heading: 'Frequently Asked Questions — VGU Online',
      position: 7,
      content: [
        {
          __component: 'college.faq-section',
          faqs: [
            {
              id: 101,
              title: 'Is a degree from Vivekananda Global University Online valid for government jobs?',
              description: [
                p('Yes. Degrees awarded by VGU Online are approved by UGC-DEB and AICTE. As per Government of India guidelines, UGC-DEB recognized online degrees hold full equivalence with on-campus degrees for all state and central government examinations, PSU recruitments, and UPSC exams.'),
              ],
            },
            {
              id: 102,
              title: 'Do I need to visit the Jaipur campus for exams or classes?',
              description: [
                p('No. The entire program is delivered 100% online. All lectures, study materials, internal assignments, faculty doubts, and semester examinations are conducted remotely via the LMS and online proctored exam portals.'),
              ],
            },
            {
              id: 103,
              title: 'What is the NAAC accreditation grade of VGU?',
              description: [
                p('Vivekananda Global University is accredited with a prestigious NAAC A+ Grade (CGPA 3.01), reflecting top-tier academic standards, faculty credentials, and digital infrastructure.'),
              ],
            },
            {
              id: 104,
              title: 'Are monthly EMI options available for paying the tuition fees?',
              description: [
                p('Yes, VGU Online provides zero-interest EMI financing schemes in partnership with trusted educational loan providers, allowing students to pay tuition in easy monthly installments.'),
              ],
            },
            {
              id: 105,
              title: 'What placement assistance does VGU Online provide?',
              description: [
                p('VGU Online offers extensive career support including resume building, mock interviews, virtual hiring job fairs, and direct placement opportunities across 500+ top recruiting partners including TCS, Infosys, Wipro, and ICICI Bank.'),
              ],
            },
          ],
        },
      ],
    },
  ];

  for (const tab of tabContents) {
    strapi.log.info(`[VGU-Import] Syncing tab section: ${tab.slug}...`);
    let existingTab = await strapi.db.query('api::university-content.university-content').findOne({
      where: { slug: tab.slug },
    });

    const dataPayload = {
      name: tab.name,
      slug: tab.slug,
      secondary_slug: tab.secondary_slug,
      display_name: tab.name,
      heading: tab.heading,
      section_key: tab.section_key,
      position: tab.position,
      university: uniDocId,
      content: tab.content,
    };

    if (!existingTab?.documentId) {
      await strapi.documents('api::university-content.university-content').create({
        data: dataPayload as any,
        status: 'published',
      });
      strapi.log.info(`[VGU-Import] Created section ${tab.slug}`);
    } else {
      await strapi.documents('api::university-content.university-content').update({
        documentId: existingTab.documentId,
        data: dataPayload as any,
        status: 'published',
      });
      strapi.log.info(`[VGU-Import] Updated section ${tab.slug}`);
    }
  }

  strapi.log.info(`[VGU-Import] Successfully imported all VGU data and tabs!`);
}
