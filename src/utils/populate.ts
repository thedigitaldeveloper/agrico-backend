import { anonymousPublished } from './published-read';
/**
 * Populate presets.
 *
 * The previous site let the frontend decide what to populate, which produced
 * 2 kB query strings and, worse, `populate=deep` — a recursive traversal that
 * took roughly four seconds on a university page. The fix is structural: the
 * shape of every response is decided here, on the server, and the middleware
 * below *overwrites* whatever populate a caller sent. A client can filter, sort
 * and paginate; it cannot ask the database to walk the whole graph.
 *
 * Presets come in two sizes per entity — `card` for listings, `detail` for a
 * single entry — because a listing of 24 universities does not need brochures,
 * SEO components or section indexes.
 */
import type { Core } from '@strapi/strapi';

type Populate = Record<string, unknown>;

/** Only the media fields next/image actually consumes. */
const IMAGE = {
  fields: ['url', 'alternativeText', 'width', 'height', 'formats', 'updatedAt'],
} as const;

const FILE = { fields: ['url', 'name', 'ext', 'size'] } as const;

/** Lookup tables — always just a label and a slug. */
const TAXONOMY = { fields: ['name', 'slug'] } as const;

const SEO = {
  populate: {
    metaImage: IMAGE,
    metaSocial: { populate: { image: IMAGE } },
  },
} as const;

// --- dynamic zone ----------------------------------------------------------

/**
 * Components omitted from `on` are dropped from the response entirely, so every
 * component allowed in the zone has to be listed here.
 */
const CONTENT_ZONE = {
  on: {
    'common.html-section': { populate: '*' },
    'common.custom-section': { populate: { image: IMAGE } },
    'common.rich-text': { populate: '*' },
    'common.title-description': { populate: '*' },
    'college.fee-structure': { populate: '*' },
    'common.notification': { populate: '*' },
    'common.bullet-list': { populate: { items: { populate: '*' } } },
    'common.highlight-list': { populate: { items: { populate: '*' } } },
    'college.steps-section': { populate: { steps: { populate: '*' } } },
    'college.faq-section': { populate: { faqs: { populate: '*' } } },
    'college.images': {
      populate: {
        images: { populate: { desktop_image: IMAGE, mobile_image: IMAGE } },
      },
    },
    'college.featured': {
      populate: {
        cards: { populate: { image: IMAGE, mob_image: IMAGE } },
      },
    },
    'college.campus-tour': {
      populate: {
        video: { populate: { desktop_image: IMAGE, mobile_image: IMAGE } },
        googlemap: { populate: '*' },
      },
    },
  },
} as const;

// --- university ------------------------------------------------------------

const UNIVERSITY_CARD = {
  logo: IMAGE,
  card_logo: IMAGE,
  fav_icon: IMAGE,
  ownership_type: TAXONOMY,
  course_modes: TAXONOMY,
  approvals: TAXONOMY,
  affiliations: TAXONOMY,
  rankings: TAXONOMY,
  streams: TAXONOMY,
  tag: TAXONOMY,
} satisfies Populate;

const UNIVERSITY_DETAIL = {
  ...UNIVERSITY_CARD,
  approvals: { fields: ['name', 'slug'], populate: { logo: IMAGE } },
  image: IMAGE,
  banners: {
    fields: ['heading', 'media_type'],
    populate: { desktop_image: IMAGE, mobile_image: IMAGE },
  },
  brochure: FILE,
  seo: SEO,
  highlights: { populate: '*' },
  exams: TAXONOMY,
  courses: TAXONOMY,
  course_modes: TAXONOMY,
  course_types: TAXONOMY,
  institute_tiers: TAXONOMY,
  faculties: { populate: { photo: IMAGE }, sort: ['position:asc'] },
  recruiters: { populate: { logo: IMAGE } },
  program_fees: { populate: { program: { fields: ['name', 'slug'] } } },
  editorial_posts: {
    fields: ['name', 'slug', 'description', 'type', 'publishedAt'],
    sort: ['publishedAt:desc'],
  },
  university_contents: {
    fields: ['name', 'slug', 'secondary_slug', 'display_name', 'heading', 'position'],
    sort: ['position:asc', 'id:asc'],
  },
} satisfies Populate;

/** A bounded catalogue projection for the curated homepage; no detail bodies. */
const UNIVERSITY_HOMEPAGE = {
  ...UNIVERSITY_CARD,
  image: IMAGE,
  program_fees: {
    fields: ['fee', 'note'],
    populate: { program: { fields: ['slug'] } },
  },
} satisfies Populate;

// --- program ---------------------------------------------------------------

const COURSE = { fields: ['name', 'slug'], populate: { level: TAXONOMY } } as const;

const PROGRAM_CARD = {
  universities: { fields: ['name', 'slug'] },
  program_icon: IMAGE,
  thumbnail: IMAGE,
  course: COURSE,
  stream: TAXONOMY,
  course_mode: TAXONOMY,
  course_type: TAXONOMY,
  duration_type: TAXONOMY,
  tag: TAXONOMY,
} satisfies Populate;

const PROGRAM_DETAIL = {
  ...PROGRAM_CARD,
  brochure: FILE,
  syllabus: FILE,
  seo: SEO,
  highlights: { populate: '*' },
  eligibilities: TAXONOMY,
  exams: TAXONOMY,
  universities: {
    populate: {
      ...UNIVERSITY_CARD,
      program_fees: { populate: { program: { fields: ['name', 'slug'] } } },
    },
  },
  university_contents: {
    fields: ['name', 'slug', 'secondary_slug', 'display_name', 'heading', 'position'],
    sort: ['position:asc', 'id:asc'],
  },
} satisfies Populate;

const PROGRAM_HOMEPAGE = {
  ...PROGRAM_CARD,
  syllabus: FILE,
  eligibilities: TAXONOMY,
} satisfies Populate;

// --- course -----------------------------------------------------------

const COURSE_CARD = {
  icon: IMAGE,
  stream: TAXONOMY,
  level: TAXONOMY,
} satisfies Populate;

const COURSE_DETAIL = {
  ...COURSE_CARD,
  seo: SEO,
  programs: { populate: PROGRAM_CARD, sort: ['position:asc'] },
} satisfies Populate;

// --- other entities --------------------------------------------------------

const EXAMINATION_CARD = {
  logo: IMAGE,
  streams: TAXONOMY,
  courses: TAXONOMY,
  tags: TAXONOMY,
} satisfies Populate;

const EXAMINATION_DETAIL = {
  ...EXAMINATION_CARD,
  seo: SEO,
  important_links: { populate: '*' },
  universities: { populate: UNIVERSITY_CARD },
  university_contents: {
    fields: ['name', 'slug', 'secondary_slug', 'display_name', 'heading', 'position'],
    sort: ['position:asc', 'id:asc'],
  },
} satisfies Populate;

const SCHEME_CARD = { image: IMAGE, logo: IMAGE } satisfies Populate;

const SCHEME_DETAIL = {
  ...SCHEME_CARD,
  seo: SEO,
  university_contents: {
    fields: ['name', 'slug', 'secondary_slug', 'display_name', 'heading', 'position'],
    sort: ['position:asc', 'id:asc'],
  },
} satisfies Populate;

const BLOG_CARD = {
  image: IMAGE,
  thumbnail: IMAGE,
  tags: TAXONOMY,
} satisfies Populate;

const BLOG_DETAIL = {
  ...BLOG_CARD,
  seo: SEO,
  download: FILE,
  courses: TAXONOMY,
  exams: TAXONOMY,
  streams: TAXONOMY,
} satisfies Populate;

// --- Q&A -------------------------------------------------------------------

const QUESTION_CARD = {
  streams: TAXONOMY,
  courses: TAXONOMY,
} satisfies Populate;

const QUESTION_DETAIL = {
  ...QUESTION_CARD,
  universities: { fields: ['name', 'slug'] },
  answers: {
    fields: ['body', 'author_name', 'is_expert', 'is_accepted', 'createdAt'],
    sort: ['is_accepted:desc', 'createdAt:asc'],
  },
} satisfies Populate;

/** A single content section, with its body. This is the one deep read. */
const CONTENT_DETAIL = {
  seo: SEO,
  content: CONTENT_ZONE,
  university: { fields: ['name', 'slug'] },
  program: { fields: ['name', 'slug'] },
  examination: { fields: ['name', 'slug'] },
  scheme: { fields: ['name', 'slug'] },
} satisfies Populate;

// --- testimonials ----------------------------------------------------------

const TESTIMONIAL_CARD = {
  photo: IMAGE,
  university: { fields: ['name', 'slug'] },
} satisfies Populate;

// --- mentors ---------------------------------------------------------------

const MENTOR_CARD = {
  photo: IMAGE,
  streams: TAXONOMY,
  courses: TAXONOMY,
} satisfies Populate;

const MENTOR_DETAIL = {
  ...MENTOR_CARD,
  seo: SEO,
  availability: { populate: '*' },
} satisfies Populate;

// --- editorial single types ------------------------------------------------

const ABOUT_PAGE = {
  seo: SEO,
  content: {
    on: {
      'home.about-card': { populate: { image: IMAGE } },
      'common.videocard': {
        populate: { desktop_image: IMAGE, mobile_image: IMAGE },
      },
      'contact.rp-contact': {
        populate: { cards: { populate: { button: { populate: '*' } } } },
      },
    },
  },
} satisfies Populate;

const CONTACT_PAGE = {
  seo: SEO,
  content: {
    on: {
      'common.gmapcard': { populate: '*' },
      'contact.rp-contact': {
        populate: { cards: { populate: { button: { populate: '*' } } } },
      },
      'contact.social-section': {
        populate: {
          button: { populate: '*' },
          sociallinks: { populate: { socials: { fields: ['name', 'link', 'icon'] } } },
        },
      },
    },
  },
} satisfies Populate;

export const PRESETS = {
  university: { card: UNIVERSITY_CARD, detail: UNIVERSITY_DETAIL, homepage: UNIVERSITY_HOMEPAGE },
  'about-us': { card: ABOUT_PAGE, detail: ABOUT_PAGE },
  'contact-us': { card: CONTACT_PAGE, detail: CONTACT_PAGE },
  program: { card: PROGRAM_CARD, detail: PROGRAM_DETAIL, homepage: PROGRAM_HOMEPAGE },
  course: { card: COURSE_CARD, detail: COURSE_DETAIL },
  examination: { card: EXAMINATION_CARD, detail: EXAMINATION_DETAIL },
  scheme: { card: SCHEME_CARD, detail: SCHEME_DETAIL },
  blog: { card: BLOG_CARD, detail: BLOG_DETAIL },
  'university-content': { card: {}, detail: CONTENT_DETAIL },
  question: { card: QUESTION_CARD, detail: QUESTION_DETAIL },
  'mentor-profile': { card: MENTOR_CARD, detail: MENTOR_DETAIL },
  testimonial: { card: TESTIMONIAL_CARD, detail: TESTIMONIAL_CARD },
  taxonomy: { card: {}, detail: {} },
} as const;

// --- middleware ------------------------------------------------------------

/**
 * Replaces the request's populate with a preset. Deliberately an overwrite and
 * not a merge: merging would leave the door open for a caller to re-introduce
 * the deep traversal this exists to prevent.
 */
export function withPopulate(populate: Populate, homepage?: Populate): Core.MiddlewareHandler {
  return async (ctx, next) => {
    // Only explicitly supported routes accept this named view. The supplied
    // populate is still overwritten, so callers cannot request a deep graph.
    const { view, ...query } = ctx.query;
    ctx.query = {
      ...(homepage ? query : ctx.query),
      populate: (homepage && view === 'homepage' ? homepage : populate) as never,
    };
    await anonymousPublished(ctx, next);
  };
}
