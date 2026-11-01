/**
 * Upgrade only the known local MUJ hero photograph through the running CMS.
 * Preview: node scripts/update-rs-hero-campus.mjs
 * Apply:   node scripts/update-rs-hero-campus.mjs --apply
 * No Strapi bootstrap, database writes outside REST, or service restart.
 */
import { readFile, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'dotenv';
import sharp from 'sharp';

const base = 'http://127.0.0.1:1340';
const homeRoute = '/content-manager/single-types/api::home.home';
const omittedMetadata = new Set(['id', 'createdAt', 'updatedAt', 'publishedAt', 'createdBy', 'updatedBy']);
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
function assert(condition, message) { if (!condition) throw new Error(message); }
function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value)
    .filter(key => !omittedMetadata.has(key)).sort().map(key => [key, normalize(value[key])]));
  return value;
}
const same = (a, b) => JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
let token;
async function api(path, options = {}) {
  const headers = { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...options.headers };
  const response = await fetch(base + path, { ...options, headers, signal: AbortSignal.timeout(90000) });
  assert(response.ok, `${options.method || 'GET'} ${path.split('?')[0]} returned HTTP ${response.status}.`);
  return response.json();
}
const jsonOptions = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const getHome = async status => (await api(homeRoute + '?status=' + status)).data;

async function main() {
  const cwd = await realpath(process.cwd());
  const env = parse(await readFile('.env'));
  const pkg = await readJson('package.json');
  assert(cwd.toLowerCase() === resolve('D:/rs-education-backend').toLowerCase() && pkg.name === 'rs-education-backend', 'Run only in the isolated RS backend directory.');
  assert(env.DATABASE_NAME === 'agrico' && ['127.0.0.1', 'localhost'].includes(env.DATABASE_HOST), 'Requires the local agrico database.');
  assert(env.PORT === '1338' && env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'production', 'Requires non-production RS port 1338.');
  const asset = (await readJson('docs/official-media-sources.json')).heroAsset;
  assert(asset?.url === 'https://www.jaipur.manipal.edu/img/gallery/IMG_9947.JPG' && asset.width === 5184 && asset.height === 3456, 'Unrecognized hero source.');
  const credentials = parse(await readFile('.env.local-accounts'));
  assert(credentials.ADMIN_EMAIL && credentials.ADMIN_PASSWORD, 'Missing ignored local admin credentials.');
  token = (await api('/admin/login', jsonOptions('POST', { email: credentials.ADMIN_EMAIL, password: credentials.ADMIN_PASSWORD }))).data?.token;
  assert(token, 'Local admin login did not return a token.');
  const homeSchema = await readJson('src/api/home/content-types/home/schema.json');
  const slideSchema = await readJson('src/components/home/hero-slide.json');
  const contentKeys = Object.keys(homeSchema.attributes);
  const content = home => Object.fromEntries(contentKeys.map(key => [key, home[key]]));
  const pairMatches = slide => slide.offering_university?.slug === asset.university && slide.offering_program?.slug === asset.program;
  const [draft, published] = await Promise.all([getHome('draft'), getHome('published')]);
  assert(draft?.name === 'Agrico' && draft.documentId === published?.documentId, 'Unexpected Home singleton.');
  const differentKeys = contentKeys.filter(key => !same(draft[key], published[key]));
  assert(!differentKeys.length, 'Refusing to publish editorial draft differences: ' + differentKeys.join(', '));
  const indices = (draft.hero_slides || []).flatMap((slide, index) => pairMatches(slide) ? [index] : []);
  assert(indices.length === 1, 'Expected exactly one MUJ Online MBA hero slide.');
  const index = indices[0];
  const slide = draft.hero_slides[index];
  assert(slide.media_type === 'image', 'Selected hero is not an image slide.');
  const matchesName = name => slide.desktop_image?.name === name && slide.mobile_image?.name === name;
  if (matchesName(asset.filename)) {
    assert(slide.desktop_image.width === asset.width && slide.desktop_image.height === asset.height && slide.mobile_image.id === slide.desktop_image.id, 'Existing hero asset has unexpected dimensions.');
    console.log(JSON.stringify({ alreadyConfigured: true, mediaId: slide.desktop_image.id, url: slide.desktop_image.url, width: asset.width, height: asset.height }));
    return;
  }
  assert(matchesName(asset.replacesFilename), 'Refusing to replace an independently edited hero image.');
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ ready: true, editorialDraftDifferences: 0, heroIndex: index, source: asset.url, width: asset.width, height: asset.height, applyCommand: 'node scripts/update-rs-hero-campus.mjs --apply' }));
    return;
  }

  const listing = await api('/upload/files?filters[name][$eq]=' + encodeURIComponent(asset.filename) + '&pageSize=100');
  const files = Array.isArray(listing) ? listing : listing.results || listing.data || [];
  let media = files.find(file => file.name === asset.filename);
  if (!media) {
    const response = await fetch(asset.url, { headers: { Referer: asset.sourcePage }, signal: AbortSignal.timeout(45000) });
    assert(response.ok && response.headers.get('content-type')?.startsWith('image/'), 'Official source did not return an image.');
    const bytes = Buffer.from(await response.arrayBuffer());
    assert(bytes.length <= 10 * 1024 * 1024, 'Official source exceeds the 10 MiB limit.');
    const metadata = await sharp(bytes).metadata();
    assert(metadata.format === 'jpeg' && metadata.width === asset.width && metadata.height === asset.height, 'Official source image dimensions changed.');
    const form = new FormData();
    form.append('files', new Blob([bytes], { type: 'image/jpeg' }), asset.filename);
    form.append('fileInfo', JSON.stringify({ name: asset.filename, alternativeText: asset.alternativeText, caption: 'Official source: ' + asset.sourcePage + '. Campus photograph for the Agrico local hero; no affiliation or campus-attendance claim implied.' }));
    const uploaded = await api('/upload', { method: 'POST', body: form });
    media = (Array.isArray(uploaded) ? uploaded : uploaded.data)?.[0];
  }
  assert(media?.id && media.name === asset.filename && media.width === asset.width && media.height === asset.height, 'Uploaded asset identity or dimensions are unexpected.');

  // Recheck after the network/upload work so a concurrent editor is not overwritten.
  const [latestDraft, latestPublished] = await Promise.all([getHome('draft'), getHome('published')]);
  assert(same(content(latestDraft), content(draft)) && same(content(latestPublished), content(published)), 'Home changed during the upload; nothing has been published.');
  const slides = latestDraft.hero_slides.map((entry, entryIndex) => {
    const output = { id: entry.id };
    for (const [key, attribute] of Object.entries(slideSchema.attributes)) {
      const value = entry[key];
      if (attribute.type === 'media') output[key] = value?.id || null;
      else if (attribute.type === 'relation') {
        // Preserve the existing relation; reconnecting it does not select another programme.
        if (value) output[key] = { connect: [{ id: value.id, documentId: value.documentId }], disconnect: [] };
      } else if (value !== undefined) output[key] = value;
    }
    if (entryIndex === index) { output.desktop_image = media.id; output.mobile_image = media.id; }
    return output;
  });
  await api(homeRoute + '/actions/publish', jsonOptions('POST', { hero_slides: slides }));
  const finalHome = await getHome('published');
  assert(contentKeys.filter(key => key !== 'hero_slides').every(key => same(finalHome[key], published[key])), 'Unexpected non-hero content difference after publishing.');
  assert(finalHome.hero_slides.length === published.hero_slides.length, 'Hero slide count changed unexpectedly.');
  const withoutImages = entry => Object.fromEntries(Object.entries(entry).filter(([key]) => !['desktop_image', 'mobile_image'].includes(key)));
  assert(finalHome.hero_slides.every((entry, entryIndex) => entryIndex === index ? same(withoutImages(entry), withoutImages(published.hero_slides[entryIndex])) : same(entry, published.hero_slides[entryIndex])), 'Unexpected hero content difference after publishing.');
  const publicHome = (await api('/api/home?populate[hero_slides][populate][desktop_image]=true&populate[hero_slides][populate][mobile_image]=true&populate[hero_slides][populate][offering_program]=true&populate[hero_slides][populate][offering_university]=true', { headers: { Authorization: '' } })).data;
  const finalSlide = publicHome.hero_slides[index];
  assert(pairMatches(finalSlide) && finalSlide.desktop_image?.id === media.id && finalSlide.mobile_image?.id === media.id, 'Public hero image or offering verification failed.');
  console.log(JSON.stringify({ updated: true, verifiedPublic: true, editorialDraftDifferences: 0, unchangedOtherSections: true, unchangedOtherHeroFields: true, mediaId: media.id, url: media.url, width: media.width, height: media.height, program: asset.program, university: asset.university }));
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Scoped hero update failed.'); process.exitCode = 1; });
