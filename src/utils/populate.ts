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
  /**
   * Overrides the card's text-only approvals, because the detail page draws
   * accreditation as trust-marks rather than chips. Written here and not on
   * TAXONOMY: that constant is shared by some thirty relations, and Strapi
   * rejects a populate naming an attribute the target lacks — a logo on
   * TAXONOMY would 400 every read of streams, tags, levels and the rest.
   * A listing of 24 universities also has no use for 24 sets of logo formats.
   */
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
  editorial_posts: {
    fields: ['name', 'slug', 'description', 'type', 'dateTime', 'publishedAt'],
    filters: { publishedAt: { $notNull: true } },
    sort: ['dateTime:desc'],
  },
  /**
   * What this university charges, per program. Rows on the university and
   * not a record per university-and-program pair, so one university is one
   * form — the difference between 155 screens and 1,550.
   */
  program_fees: { populate: { program: { fields: ['name', 'slug'] } } },
  /**
   * The section *index* only. Bodies are fetched one at a time from
   * university-content, so opening a university does not drag every tab's
   * content across the wire.
   */
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

/**
 * The one lookup that carries a nested relation.
 *
 * Undergraduate/postgraduate is recorded once on the course rather than on
 * every program under it, so a program only knows its level through here — one
 * extra join, against re-stating the level on twelve programs per course.
 */
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
    fields: ['name', 'slug', 'secondary_slug', 'display_name', 'heading'],
  },
} satisfies Populate;

const PROGRAM_HOMEPAGE = {
  ...PROGRAM_CARD,
  syllabus: FILE,
  eligibilities: TAXONOMY,
} satisfies Populate;

// --- course -----------------------------------------------------------

/**
 * A course is the page a visitor lands on — "Online MBA" — and the programs
 * beneath it are what they choose between. The card is for rails and menus,
 * so it stops at the icon and the two lookups.
 */
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
    fields: ['name', 'slug', 'secondary_slug', 'display_name', 'heading'],
  },
} satisfies Populate;

const SCHEME_CARD = { image: IMAGE, logo: IMAGE } satisfies Populate;

const SCHEME_DETAIL = {
  ...SCHEME_CARD,
  seo: SEO,
  university_contents: {
    fields: ['name', 'slug', 'secondary_slug', 'display_name', 'heading'],
  },
} satisfies Populate;

const BLOG_CARD = {
  image: IMAGE,
  thumbnail: IMAGE,
  tags: TAXONOMY,
} satisfies Populate;

const BLOG_DETAIL = {
  ...BLOG_CARD,
  body_html: true,
  seo: SEO,
  download: FILE,
  courses: TAXONOMY,
  exams: TAXONOMY,
  streams: TAXONOMY,
  universities: TAXONOMY,
  programs: TAXONOMY,
} satisfies Populate;

// --- Q&A -------------------------------------------------------------------

const QUESTION_CARD = {
  streams: TAXONOMY,
  courses: TAXONOMY,
} satisfies Populate;

const QUESTION_DETAIL = {
  ...QUESTION_CARD,
  universities: { fields: ['name', 'slug'] },
  /**
   * `author_email` is marked private in the schema, so Strapi strips it from
   * every response regardless of what is populated here.
   */
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

/**
 * One preset, no detail form: a quote has no page of its own. The university is
 * populated so the card can credit where the student actually studied.
 */
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
  /**
   * Availability is public so the booking form can show real slots. The linked
   * `user` is deliberately absent — a mentor's account email is not something
   * the public listing should carry.
   */
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
    // A listing needs card fields, not every university's complete tab library.
    // Detail and by-slug reads retain the full structured editorial document.
    const collection = ctx.path.match(/^\/api\/(universities|blogs)\/?$/)?.[1];
    if (collection && !ctx.query.fields) {
      const uid = collection === 'universities' ? 'api::university.university' : 'api::blog.blog';
      const attributes = strapi.contentType(uid).attributes as Record<string, { type: string; private?: boolean }>;
      ctx.query.fields = Object.entries(attributes)
        .filter(([name, attribute]) => !['agriculture_content', 'editorial_content'].includes(name) && !attribute.private && !['relation', 'media', 'component', 'dynamiczone'].includes(attribute.type))
        .map(([name]) => name);
    }
    await anonymousPublished(ctx, next);
  };
}
