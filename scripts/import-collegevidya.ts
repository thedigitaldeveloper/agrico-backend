/**
 * One-way import of the scraped CollegeVidya reference data.
 *
 * Source lives outside this repo, in the frontend's gitignored scrape:
 *   D:\geduconnect\data-scrape\collegevidya\
 *
 * The mapping follows this project's model, not CollegeVidya's:
 *
 *   CollegeVidya course "Online MBA"   ->  api::course        (the page)
 *   CollegeVidya specialisations (91)  ->  api::program       (under that course)
 *   CollegeVidya university            ->  api::university
 *   per-university fee                 ->  university.program_fees rows
 *
 * There is no specialisation entity here: a specialisation of an MBA *is* a
 * program, and the MBA itself is the course above them.
 *
 * Re-running is safe. Everything is keyed by slug and skipped or updated in
 * place, never duplicated.
 *
 *   npx tsx scripts/import-collegevidya.ts            import
 *   npx tsx scripts/import-collegevidya.ts --dry-run  report what it would do
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createStrapi, compileStrapi } from '@strapi/strapi';

type Strapi = Awaited<ReturnType<ReturnType<typeof createStrapi>['load']>>;

const SCRAPE = 'D:/geduconnect/data-scrape/collegevidya';
const COURSE_DIR = path.join(SCRAPE, '_courses', 'online-mba', 'raw');
const UNI_DIR = path.join(SCRAPE, 'upes-online', 'raw');

const DRY = process.argv.includes('--dry-run');
const SKIP_MEDIA = process.argv.includes('--skip-media');

/** Where the scrape's relative media paths resolve to. */
const CDN = 'https://cdn.collegevidya.com/';

/**
 * Which scraped tab becomes which content section.
 *
 * Only tabs that are genuinely prose are listed. The courses and fees tabs
 * carry structured arrays already modelled as programs and
 * university.program_fees; re-importing those as rich text would put the same
 * facts in two places and let them drift apart.
 *
 * `key` must be a legal value of university-content.section_key.
 */
const SECTIONS: { file: string; fields: string[]; key: string; name: string; heading: string }[] = [
  { file: 'about', fields: ['about'], key: 'about', name: 'Overview', heading: 'Overview' },
  { file: 'admission-open', fields: ['admission_open'], key: 'admission', name: 'Admission', heading: 'Admission Process' },
  { file: 'examination-pattern', fields: ['exam_pattern', 'examination'], key: 'examination', name: 'Examination', heading: 'Examination Pattern' },
  { file: 'emi-details', fields: ['emi_description'], key: 'fees', name: 'Fees & EMI', heading: 'Fees and EMI' },
  { file: 'placement-partners', fields: ['placement_partners'], key: 'placements', name: 'Placements', heading: 'Placements' },
];

/**
 * The university's own tree and the generic course page disagree on a few
 * slugs for the same specialisation. Only genuine synonyms belong here — a
 * specialisation the generic page simply does not carry gets its own program
 * created from the university's data instead of being bent onto a near-match.
 */
const SLUG_ALIASES: Record<string, string> = {
  'human-resource-management': 'hr-management',
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const readProps = (file: string) =>
  JSON.parse(fs.readFileSync(file, 'utf8')).props.pageProps as Record<string, never>;

// --- HTML -> Strapi blocks -------------------------------------------------

/**
 * The scrape carries editorial as HTML strings; `blocks` fields cannot take
 * those. This converts the block-level structure the source actually uses —
 * paragraphs, headings and lists — and keeps bold and links inline. Anything
 * else (tables, embedded scripts, images) is dropped rather than mangled:
 * `blocks` has no table node, so a table cannot survive this crossing at all.
 */
const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

type Child = { type: 'text'; text: string; bold?: true } | { type: 'link'; url: string; children: { type: 'text'; text: string }[] };

function inlineChildren(html: string): Child[] {
  const out: Child[] = [];
  // One pass over the inline tags worth keeping; everything else is stripped
  // to text so a stray <span> never becomes a visible tag.
  const re = /<(a|strong|b)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  const push = (text: string) => {
    const t = decode(text.replace(/<[^>]+>/g, ''));
    if (t) out.push({ type: 'text', text: t });
  };
  while ((m = re.exec(html))) {
    push(html.slice(last, m.index));
    const inner = decode(m[3].replace(/<[^>]+>/g, ''));
    if (inner) {
      if (m[1].toLowerCase() === 'a') {
        const href = /href\s*=\s*["']([^"']+)["']/i.exec(m[2] ?? '')?.[1];
        out.push(
          href && !href.startsWith('javascript:')
            ? { type: 'link', url: href, children: [{ type: 'text', text: inner }] }
            : { type: 'text', text: inner }
        );
      } else {
        out.push({ type: 'text', text: inner, bold: true });
      }
    }
    last = m.index + m[0].length;
  }
  push(html.slice(last));
  return out.length ? out : [{ type: 'text', text: '' }];
}

function htmlToBlocks(html: string | null | undefined): unknown[] | null {
  if (!html || typeof html !== 'string') return null;
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<table[\s\S]*?<\/table>/gi, '');

  const blocks: unknown[] = [];
  const re = /<(h[1-6]|p|ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned))) {
    const tag = m[1].toLowerCase();
    const body = m[2];

    if (tag === 'ul' || tag === 'ol') {
      const items = [...body.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
        .map((li) => inlineChildren(li[1]))
        .filter((children) => children.some((c) => ('text' in c ? c.text : true)));
      if (items.length) {
        blocks.push({
          type: 'list',
          format: tag === 'ul' ? 'unordered' : 'ordered',
          children: items.map((children) => ({ type: 'list-item', children })),
        });
      }
      continue;
    }

    const children = inlineChildren(body);
    if (!children.some((c) => ('text' in c ? c.text : true))) continue;

    if (tag === 'p') {
      blocks.push({ type: 'paragraph', children });
    } else {
      // h1 in body copy would compete with the page's own title.
      const level = Math.min(Math.max(Number(tag[1]), 2), 6);
      blocks.push({ type: 'heading', level, children });
    }
  }

  if (blocks.length) return blocks;
  const plain = decode(cleaned.replace(/<[^>]+>/g, ''));
  return plain ? [{ type: 'paragraph', children: [{ type: 'text', text: plain }] }] : null;
}

// --- media -----------------------------------------------------------------

const MIME: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  // brochure accepts files as well as images, and the prospectus is a PDF.
  '.pdf': 'application/pdf',
};

/**
 * Pulls one file off the CDN into the media library and returns its id.
 *
 * Keyed by the CDN path, stored as the upload's caption: Strapi renames
 * colliding uploads rather than de-duplicating them, so without a key of our
 * own a re-run would add a second copy of every logo. Returns null rather than
 * throwing — one dead image should not abort an import of ninety.
 */
const mediaCache = new Map<string, number | null>();

async function uploadFromCdn(strapi: Strapi, cdnPath: string | null | undefined, alt: string) {
  if (!cdnPath || SKIP_MEDIA || DRY) return null;
  const key = String(cdnPath).replace(/^[/]+/, '');
  if (mediaCache.has(key)) return mediaCache.get(key) ?? null;

  const existing = (await strapi.documents('plugin::upload.file' as never).findMany({
    filters: { caption: { $eq: key } } as never,
    limit: 1,
  })) as { id: number }[];
  if (existing?.length) {
    mediaCache.set(key, existing[0].id);
    return existing[0].id;
  }

  const ext = path.extname(key).toLowerCase();
  const mime = MIME[ext];
  if (!mime) {
    strapi.log.warn(`import: skipped ${key} — unsupported type`);
    mediaCache.set(key, null);
    return null;
  }

  let tmp = '';
  try {
    const res = await fetch(CDN + key);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    tmp = path.join(os.tmpdir(), `cv-${Date.now()}-${path.basename(key)}`);
    fs.writeFileSync(tmp, bytes);

    const [file] = (await strapi.plugin('upload').service('upload').upload({
      data: { fileInfo: { name: path.basename(key), alternativeText: alt, caption: key } },
      files: { filepath: tmp, originalFilename: path.basename(key), mimetype: mime, size: bytes.length },
    })) as { id: number }[];

    mediaCache.set(key, file.id);
    return file.id;
  } catch (error) {
    strapi.log.warn(`import: media failed ${key} — ${(error as Error).message}`);
    mediaCache.set(key, null);
    return null;
  } finally {
    if (tmp && fs.existsSync(tmp)) fs.rmSync(tmp, { force: true });
  }
}

/** Only sets a media field when there is actually a file for it. */
const media = (field: string, id: number | null) => (id ? { [field]: id } : {});

// --- Strapi helpers --------------------------------------------------------

async function findBySlug(strapi: Strapi, uid: string, slug: string) {
  const [found] = await strapi.documents(uid as never).findMany({
    filters: { slug: { $eq: slug } } as never,
    limit: 1,
    status: 'published',
  });
  return found as { documentId: string } | undefined;
}

/** Creates on first run, updates in place afterwards. Never duplicates. */
async function upsert(strapi: Strapi, uid: string, slug: string, data: Record<string, unknown>) {
  const existing = await findBySlug(strapi, uid, slug);
  if (DRY) return { documentId: existing ? existing.documentId : 'dry-' + slug, created: !existing };

  if (existing) {
    await strapi.documents(uid as never).update({
      documentId: existing.documentId,
      data: data as never,
    });
    await strapi.documents(uid as never).publish({ documentId: existing.documentId });
    return { documentId: existing.documentId, created: false };
  }
  const made = (await strapi.documents(uid as never).create({
    data: { ...data, slug } as never,
    status: 'published',
  })) as { documentId: string };
  return { documentId: made.documentId, created: true };
}

async function taxonomyId(strapi: Strapi, model: string, name: string) {
  const slug = slugify(name);
  const { documentId } = await upsert(strapi, `api::${model}.${model}`, slug, { name });
  return documentId;
}

// --- import ----------------------------------------------------------------

async function run(strapi: Strapi) {
  const log = (m: string) => strapi.log.info(`import: ${m}`);
  const root = readProps(path.join(COURSE_DIR, 'index.json'));
  const core = root.secondPageCoreData as Record<string, never>;
  const seo = (root.keyBasedSeoData as Record<string, never>).meta_data as Record<string, never>;

  // 1. The course: "Online MBA" is the page, not a program.
  const streamId = await taxonomyId(strapi, 'stream', 'Management');
  const levelId = await taxonomyId(strapi, 'level', 'Postgraduate');

  const courseIcon = await uploadFromCdn(strapi, core.thumbnail as string, String(core.name));
  const course = await upsert(strapi, 'api::course.course', String(core.slug), {
    ...media('icon', courseIcon),
    name: String(core.name),
    full_name: String(core.display_name ?? core.name),
    stream: streamId,
    level: levelId,
    short_description: htmlToBlocks(core.short_description as string),
    ...(seo
      ? {
          seo: {
            metaTitle: String(seo.meta_title ?? core.name).slice(0, 200),
            metaDescription: String(seo.meta_description ?? '').slice(0, 500),
          },
        }
      : {}),
  });
  log(`course ${core.slug} (${course.created ? 'created' : 'updated'})`);

  // 2. Its programs: what CollegeVidya files under "specializations".
  const specs = (root.specializationData as Record<string, never>).specializations as {
    slug: string;
    name: string;
    icon: string | null;
    thumbnail: string | null;
  }[];
  const programIds = new Map<string, string>();
  let created = 0;

  for (const spec of specs) {
    const file = path.join(COURSE_DIR, 'specializations', `${spec.slug}.json`);
    let fee: number | null = null;
    let description: unknown[] | null = null;
    let metaTitle = '';
    let metaDescription = '';

    if (fs.existsSync(file)) {
      const pp = readProps(file);
      const c = pp.secondPageCoreData as Record<string, never>;
      // `program.fee` is the headline figure; what a student actually pays is
      // per university and lives in university.program_fees.
      //
      // The median of the real per-university fees, not the midpoint of
      // min_fee and max_fee. That midpoint is meaningless: Finance Management
      // spans 32,700 to 20,00,000, so its midpoint lands at 10,16,350 — a
      // number no university charges. The median of the twelve actual fees is
      // 1,75,000, and one foreign outlier cannot drag it.
      const fees = (((pp.universitiesData as Record<string, never>)?.data ?? []) as { fee: number }[])
        .map((r) => Number(r.fee))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b);
      if (fees.length) {
        const mid = Math.floor(fees.length / 2);
        fee = fees.length % 2 ? fees[mid] : Math.round((fees[mid - 1] + fees[mid]) / 2);
      } else {
        const min = Number(c.min_fee);
        fee = Number.isFinite(min) && min > 0 ? min : null;
      }
      description = htmlToBlocks(c.short_description as string);
      const m = (pp.keyBasedSeoData as Record<string, never>)?.meta_data as Record<string, never>;
      metaTitle = String(m?.meta_title ?? '');
      metaDescription = String(m?.meta_description ?? '');
    }

    // Two different images: the icon is the small mark on a rail, the
    // thumbnail is the card photo. The source ships both, so both are kept.
    const icon = await uploadFromCdn(strapi, spec.icon, spec.name);
    const thumb = await uploadFromCdn(strapi, spec.thumbnail, `Online MBA in ${spec.name}`);
    const entry = await upsert(strapi, 'api::program.program', spec.slug, {
      ...media('program_icon', icon),
      ...media('thumbnail', thumb),
      name: spec.name,
      full_name: `Online MBA in ${spec.name}`,
      course: course.documentId,
      stream: streamId,
      fee,
      short_description: description,
      ...(metaTitle
        ? {
            seo: {
              metaTitle: metaTitle.slice(0, 200),
              metaDescription: metaDescription.slice(0, 500),
            },
          }
        : {}),
    });
    programIds.set(spec.slug, entry.documentId);
    if (entry.created) created += 1;
  }
  log(`programs ${specs.length} (${created} new, ${specs.length - created} updated)`);

  // 3. The university.
  const uni = readProps(path.join(UNI_DIR, 'about.json'));
  const uCore = uni.universityPageCoreData as Record<string, never>;
  const uApi = uni.keyApiData as Record<string, never>;

  const approvalIds: string[] = [];
  for (const a of (uApi.approvals ?? []) as { approval_logo: { title: string; logo?: string } }[]) {
    const title = a?.approval_logo?.title;
    if (!title) continue;
    const logo = await uploadFromCdn(strapi, a.approval_logo.logo, title);
    const { documentId } = await upsert(strapi, 'api::approval.approval', slugify(title), {
      name: title,
      ...media('logo', logo),
    });
    approvalIds.push(documentId);
  }

  const rating = Number(uCore.cv_rating);
  const uniLogo = await uploadFromCdn(strapi, uCore.logo as string, String(uCore.name));

  // The hero and the facts strip are mostly these: without them the page
  // renders as a name on an empty maroon band.
  const banner = ((uCore.banners ?? []) as { banner?: string }[])[0]?.banner;
  const uniImage = await uploadFromCdn(strapi, banner, `${uCore.name} campus`);
  const prospectus = await uploadFromCdn(strapi, uCore.prospectus_link as string, `${uCore.name} prospectus`);
  const favIcon = await uploadFromCdn(strapi, uCore.fav_icon as string, `${uCore.name} mark`);

  const city = (uCore.city as { city?: string } | null)?.city ?? null;
  const state = (uCore.state as { state?: string } | null)?.state ?? null;
  // `establish` is a date column and the source states only a year.
  const year = Number(uCore.establishment_year);
  const established = Number.isFinite(year) && year > 1800 ? `${year}-01-01` : null;

  // about_boxes are already the shape home.highlights wants: a label and a
  // claim. The source has no icon for them, so that stays unset.
  const highlights = ((uApi.about_boxes ?? []) as { title?: string; content?: string }[])
    .filter((b) => b?.title && b?.content)
    .map((b) => ({ key: String(b.title), value: String(b.content) }));

  const university = await upsert(strapi, 'api::university.university', String(uCore.slug), {
    ...media('logo', uniLogo),
    ...media('image', uniImage),
    ...media('brochure', prospectus),
    ...media('fav_icon', favIcon),
    whatsapp_number: uCore.whatsapp_number ? String(uCore.whatsapp_number) : null,
    toll_free_number: uCore.toll_free_number ? String(uCore.toll_free_number) : null,
    name: String(uCore.name),
    city,
    state,
    country: 'India',
    establish: established,
    ...(highlights.length ? { highlights } : {}),
    full_name: String(uCore.name),
    // Kept at full precision: the column is decimal, so 4.7 stays 4.7 and the
    // spread between a 4.1 and a 4.7 survives the import.
    rating: Number.isFinite(rating) ? rating : null,
    address: uCore.university_address ? String(uCore.university_address) : null,
    approvals: approvalIds,
    streams: [streamId],
    courses: [course.documentId],
    ...(uCore.meta_title
      ? {
          seo: {
            metaTitle: String(uCore.meta_title).slice(0, 200),
            metaDescription: String(uCore.meta_description ?? '').slice(0, 500),
          },
        }
      : {}),
  });
  log(`university ${uCore.slug} (${university.created ? 'created' : 'updated'}), ${approvalIds.length} approvals`);

  // 4. What this university charges, per program.
  //
  // The source states one MBA fee for the institution, not one per
  // specialisation, so every specialisation it actually offers carries that
  // same figure. Written as one array: components are replaced wholesale, so a
  // re-run rewrites these rows instead of appending a second copy.
  const specDir = path.join(UNI_DIR, 'courses', 'mba', '_spec');
  const offered = fs.existsSync(specDir)
    ? fs.readdirSync(specDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
    : [];

  const mbaRow = ((root.universitiesData as Record<string, never>).data as {
    fee: number;
    university: { slug: string };
  }[]).find((r) => r.university.slug === uCore.slug);

  const rows: { program: string; fee: number | null }[] = [];
  let invented = 0;

  for (const offeredSlug of offered) {
    const slug = SLUG_ALIASES[offeredSlug] ?? offeredSlug;
    let programId = programIds.get(slug);

    if (!programId) {
      // A specialisation this university offers that the generic course page
      // never listed. It is still real, so it becomes a program rather than
      // being dropped or forced onto whichever generic slug looks closest.
      const about = path.join(specDir, offeredSlug, 'about.json');
      let name = offeredSlug;
      if (fs.existsSync(about)) {
        const p = readProps(about);
        const fromApi = (p.keyApiData as Record<string, never>)?.display_name ?? (p.keyApiData as Record<string, never>)?.name;
        const fromCore = (p.secondPageCoreData as Record<string, never>)?.name;
        name = String(fromApi ?? fromCore ?? offeredSlug);
      }
      const entry = await upsert(strapi, 'api::program.program', slug, {
        name,
        full_name: `Online MBA in ${name}`,
        course: course.documentId,
        stream: streamId,
      });
      programId = entry.documentId;
      programIds.set(slug, programId);
      invented += 1;
    }

    rows.push({ program: programId, fee: mbaRow?.fee ?? null });
  }
  if (invented) log(`created ${invented} program(s) offered by this university but absent from the course page`);

  if (rows.length && !DRY) {
    await strapi.documents('api::university.university').update({
      documentId: university.documentId,
      data: { program_fees: rows } as never,
    });
    await strapi.documents('api::university.university').publish({ documentId: university.documentId });
  }
  log(`program fees ${rows.length} rows at ${mbaRow?.fee ?? 'unknown'} each`);

  // 5. The university's own editorial, one content section per scraped tab.
  //    Without these the university page renders "Nothing published here yet":
  //    the record exists, but a page is made of its sections.
  let sectionCount = 0;
  for (const [index, section] of SECTIONS.entries()) {
    const file = path.join(UNI_DIR, `${section.file}.json`);
    if (!fs.existsSync(file)) continue;

    const api = (readProps(file).keyApiData ?? {}) as Record<string, never>;
    const blocks = section.fields
      .map((field) => htmlToBlocks(api[field] as string))
      .filter((b): b is unknown[] => Boolean(b))
      .flat();
    if (!blocks.length) continue;

    await upsert(
      strapi,
      'api::university-content.university-content',
      `${uCore.slug}-${slugify(section.name)}`,
      {
        name: section.name,
        display_name: section.name,
        secondary_slug: slugify(section.name),
        heading: `${uCore.name} ${section.heading}`,
        section_key: section.key,
        position: index + 1,
        university: university.documentId,
        content: [{ __component: 'common.rich-text', heading: section.heading, body: blocks }],
      }
    );
    sectionCount += 1;
  }
  log(`content sections ${sectionCount}`);

  if (!SKIP_MEDIA && !DRY) {
    const ok = [...mediaCache.values()].filter(Boolean).length;
    log(`media ${ok} file(s) in the library, ${mediaCache.size - ok} unavailable`);
  }


}

async function main() {
  const app = await createStrapi(await compileStrapi()).load();
  try {
    if (DRY) app.log.info('import: DRY RUN — nothing is written');
    await run(app as Strapi);
    app.log.info('import: done');
  } finally {
    await app.destroy().catch(() => {});
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
