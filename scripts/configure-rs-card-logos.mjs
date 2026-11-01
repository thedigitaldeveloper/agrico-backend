/**
 * Configure only optional university.card_logo in the running local RS CMS.
 * Preview by default; --apply uploads the verified originals and publishes only
 * card_logo. Existing logos, favicons, relations, Home and other fields remain.
 * Requires the additive schema to have been built and loaded by the CMS first.
 */
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'dotenv';
import sharp from 'sharp';

const base = 'http://127.0.0.1:1340';
const universityRoute = '/content-manager/collection-types/api::university.university';
const homeRoute = '/content-manager/single-types/api::home.home';
const metadata = new Set(['id', 'createdAt', 'updatedAt', 'publishedAt', 'createdBy', 'updatedBy']);
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
function assert(condition, message) { if (!condition) throw new Error(message); }
function normalize(value, omitCardLogo = false) {
  if (Array.isArray(value)) return value.map(item => normalize(item, omitCardLogo));
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value)
    .filter(key => !metadata.has(key) && !(omitCardLogo && key === 'card_logo'))
    .sort().map(key => [key, normalize(value[key], omitCardLogo)]));
  return value;
}
const same = (a, b) => JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const jsonOptions = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
let token;
async function api(path, options = {}, authenticated = true) {
  const response = await fetch(base + path, {
    ...options,
    headers: { ...(authenticated && token ? { Authorization: 'Bearer ' + token } : {}), ...options.headers },
    signal: AbortSignal.timeout(60000),
  });
  assert(response.ok, `${options.method || 'GET'} ${path.split('?')[0]} returned HTTP ${response.status}.`);
  return response.json();
}
async function download(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30000) });
  assert(response.ok, 'Official asset request failed: ' + new URL(url).hostname);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert(bytes.length <= 2 * 1024 * 1024, 'Official mark exceeds the 2 MiB limit.');
  return bytes;
}
function nativePngFrame(ico, width, height) {
  assert(ico.length >= 6 && ico.readUInt16LE(0) === 0 && ico.readUInt16LE(2) === 1, 'Expected the original official ICO container.');
  const count = ico.readUInt16LE(4);
  assert(count > 0 && 6 + count * 16 <= ico.length, 'Invalid ICO directory.');
  for (let index = 0; index < count; index += 1) {
    const offset = 6 + index * 16;
    if ((ico[offset] || 256) !== width || (ico[offset + 1] || 256) !== height) continue;
    const size = ico.readUInt32LE(offset + 8), start = ico.readUInt32LE(offset + 12);
    assert(start >= 6 + count * 16 && start + size <= ico.length, 'Invalid ICO frame bounds.');
    const png = ico.subarray(start, start + size);
    assert(png.subarray(0, 8).toString('hex') === '89504e470d0a1a0a', 'Selected frame is not an original PNG; no format conversion is permitted.');
    return png;
  }
  throw new Error('The required native PNG frame is absent.');
}
async function verifiedAsset(asset) {
  const original = await download(asset.url);
  const bytes = asset.extractNativePngFrame ? nativePngFrame(original, asset.width, asset.height) : original;
  assert(hash(bytes) === asset.sha256, 'Official asset changed; inspect and approve its provenance before importing: ' + asset.university);
  const dimensions = await sharp(bytes).metadata();
  assert(dimensions.format === 'png' && dimensions.width === asset.width && dimensions.height === asset.height, 'Official mark dimensions or format changed.');
  return bytes;
}
async function existingRelations(documentId, field, status, expectedCount) {
  if (expectedCount === 0) return [];
  const ids = [];
  for (let page = 1; ; page += 1) {
    const result = await api(`/content-manager/relations/api::university.university/${documentId}/${field}?status=${status}&page=${page}&pageSize=100`);
    assert(Array.isArray(result.results), 'Relation response is invalid: ' + field);
    ids.push(...result.results.map(item => { assert(item.documentId, 'Relation lacks a stable documentId.'); return item.documentId; }));
    if (page >= (result.pagination?.pageCount ?? 1)) break;
  }
  assert(ids.length === expectedCount, 'Relation count changed while reading: ' + field);
  return ids;
}
async function universitySnapshot(documentId, status, schema) {
  const entry = (await api(`${universityRoute}/${documentId}?status=${status}`)).data;
  assert(entry?.documentId === documentId, 'Unexpected University editor response.');
  assert(Object.hasOwn(entry, 'card_logo'), 'Running CMS has not loaded card_logo. Build/restart the RS CMS before this script; no data changed.');
  const content = Object.fromEntries(Object.keys(schema.attributes).map(key => [key, entry[key]]));
  const relations = {};
  for (const [key, attribute] of Object.entries(schema.attributes)) {
    if (attribute.type === 'relation' && typeof entry[key]?.count === 'number') {
      relations[key] = await existingRelations(documentId, key, status, entry[key].count);
    }
  }
  return { entry, content, relations };
}
const equalSnapshot = (a, b) => same(a.content, b.content) && same(a.relations, b.relations);
function withoutCardLogo(snapshot) {
  const { card_logo: _cardLogo, ...content } = snapshot.content;
  return { content, relations: snapshot.relations };
}
async function homeSnapshot(schema) {
  const result = {};
  for (const status of ['draft', 'published']) {
    const entry = (await api(homeRoute + '?status=' + status)).data;
    result[status] = {
      documentId: entry.documentId, updatedAt: entry.updatedAt,
      // Related university card_logo values may now populate through Home;
      // the Home record and all of its authored fields must remain identical.
      content: normalize(Object.fromEntries(Object.keys(schema.attributes).map(key => [key, entry[key]])), true),
    };
  }
  return result;
}
async function findOrUpload(asset, bytes) {
  const response = await api('/upload/files?filters[name][$eq]=' + encodeURIComponent(asset.filename) + '&pageSize=100');
  const files = Array.isArray(response) ? response : response.results || response.data || [];
  let media = files.find(item => item.name === asset.filename);
  if (!media) {
    const form = new FormData();
    form.append('files', new Blob([bytes], { type: asset.mime }), asset.filename);
    form.append('fileInfo', JSON.stringify({ name: asset.filename, alternativeText: asset.alternativeText, caption: 'Official source: ' + asset.sourcePage + '. Original standalone university mark for Agrico card_logo; no affiliation implied. ' + (asset.extractNativePngFrame ? 'Unchanged native PNG frame from the official ICO.' : 'Original PNG artwork, unmodified.') }));
    const uploaded = await api('/upload', { method: 'POST', body: form });
    media = (Array.isArray(uploaded) ? uploaded : uploaded.data)?.[0];
  }
  assert(media?.id && media.name === asset.filename && media.width === asset.width && media.height === asset.height && media.mime === asset.mime, 'Uploaded card mark identity or dimensions are invalid.');
  const stored = await download(new URL(media.url, base).href);
  assert(hash(stored) === asset.sha256 && stored.equals(bytes), 'Stored card mark differs from the verified original bytes.');
  return media;
}

async function uploadSettings() {
  const data = (await api('/upload/settings')).data;
  const keys = ['sizeOptimization', 'responsiveDimensions', 'autoOrientation', 'aiMetadata'];
  assert(keys.every(key => typeof data?.[key] === 'boolean'), 'Unexpected upload settings; refusing to change them.');
  return Object.fromEntries(keys.map(key => [key, data[key]]));
}

async function prepareOriginalMedia(plans) {
  const original = await uploadSettings();
  const temporary = { ...original, sizeOptimization: false, autoOrientation: false };
  const changeSettings = plans.some(plan => !plan.alreadyConfigured) && !same(original, temporary);
  if (changeSettings) {
    // Settings are server-wide: pause other local uploads during this guarded
    // import. Keep a recovery copy before changing anything in case the process
    // is externally terminated before its finally handler can run.
    await mkdir('.tmp/rs-card-logos', { recursive: true });
    await writeFile('.tmp/rs-card-logos/upload-settings-before-import.json', JSON.stringify(original, null, 2) + '\n');
  }
  try {
    if (changeSettings) {
      await api('/upload/settings', jsonOptions('PUT', temporary));
      assert(same(await uploadSettings(), temporary), 'Could not disable artwork-changing upload optimisation.');
    }
    const media = [];
    for (const plan of plans) media.push(await findOrUpload(plan.asset, plan.bytes));
    return media;
  } finally {
    if (changeSettings) await api('/upload/settings', jsonOptions('PUT', original));
    assert(same(await uploadSettings(), original), 'Upload settings were not restored; restore the saved local recovery copy before other uploads.');
  }
}

async function main() {
  const cwd = await realpath(process.cwd()), env = parse(await readFile('.env'));
  const pkg = await readJson('package.json');
  assert(cwd.toLowerCase() === resolve('D:/rs-education-backend').toLowerCase() && pkg.name === 'rs-education-backend', 'Run only in the isolated RS backend directory.');
  assert(env.DATABASE_NAME === 'agrico' && ['127.0.0.1', 'localhost'].includes(env.DATABASE_HOST), 'Requires the local agrico database.');
  assert(env.PORT === '1338' && env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'production', 'Requires non-production RS port 1338.');
  const universitySchema = await readJson('src/api/university/content-types/university/schema.json');
  const homeSchema = await readJson('src/api/home/content-types/home/schema.json');
  assert(universitySchema.attributes.card_logo?.type === 'media' && universitySchema.attributes.card_logo.multiple === false, 'Optional card_logo schema is missing.');
  const manifest = await readJson('docs/card-logo-sources.json');
  assert(manifest.assets.length === 4 && manifest.assets.every(asset => asset.field === 'card_logo'), 'Unexpected card-logo import manifest.');
  const credentials = parse(await readFile('.env.local-accounts'));
  assert(credentials.ADMIN_EMAIL && credentials.ADMIN_PASSWORD, 'Missing ignored local admin credentials.');
  token = (await api('/admin/login', jsonOptions('POST', { email: credentials.ADMIN_EMAIL, password: credentials.ADMIN_PASSWORD }))).data?.token;
  assert(token, 'Local admin login did not return a token.');
  const originalHome = await homeSnapshot(homeSchema);
  const plans = [];
  for (const asset of manifest.assets) {
    const list = await api('/api/universities?view=homepage&filters[slug][$eq]=' + encodeURIComponent(asset.university), {}, false);
    assert(list.data?.length === 1, 'Expected exactly one published university: ' + asset.university);
    const documentId = list.data[0].documentId;
    const [draft, published] = await Promise.all([universitySnapshot(documentId, 'draft', universitySchema), universitySnapshot(documentId, 'published', universitySchema)]);
    assert(equalSnapshot(draft, published), 'Refusing to publish existing draft differences: ' + asset.university);
    const current = draft.entry.card_logo;
    assert(!current || (current.name === asset.filename && current.width === asset.width && current.height === asset.height), 'Refusing to replace an independently edited card_logo: ' + asset.university);
    const bytes = await verifiedAsset(asset);
    plans.push({ asset, documentId, draft, published, bytes, alreadyConfigured: Boolean(current) });
  }
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ ready: true, editorialDraftDifferences: 0, universities: plans.map(plan => ({ university: plan.asset.university, width: plan.asset.width, height: plan.asset.height, alreadyConfigured: plan.alreadyConfigured })), applyCommand: 'node scripts/configure-rs-card-logos.mjs --apply' }));
    return;
  }
  // Restore the upload settings before publishing any university relation.
  const originals = await prepareOriginalMedia(plans);
  const results = [];
  for (const [index, plan] of plans.entries()) {
    const media = originals[index];
    const [latestDraft, latestPublished] = await Promise.all([universitySnapshot(plan.documentId, 'draft', universitySchema), universitySnapshot(plan.documentId, 'published', universitySchema)]);
    assert(equalSnapshot(latestDraft, plan.draft) && equalSnapshot(latestPublished, plan.published), 'University changed during verification; refusing to overwrite: ' + plan.asset.university);
    if (!plan.alreadyConfigured) await api(`${universityRoute}/${plan.documentId}/actions/publish`, jsonOptions('POST', { card_logo: media.id }));
    const [finalDraft, finalPublished] = await Promise.all([universitySnapshot(plan.documentId, 'draft', universitySchema), universitySnapshot(plan.documentId, 'published', universitySchema)]);
    assert(same(withoutCardLogo(finalPublished), withoutCardLogo(plan.published)), 'Unexpected non-card-logo field/relation change: ' + plan.asset.university);
    assert(equalSnapshot(finalDraft, finalPublished), 'Draft and published University differ after update: ' + plan.asset.university);
    assert(finalPublished.entry.card_logo?.id === media.id, 'Published card_logo is not the verified original mark.');
    const publicEntry = (await api('/api/universities?view=homepage&filters[slug][$eq]=' + encodeURIComponent(plan.asset.university), {}, false)).data?.[0];
    assert(publicEntry?.card_logo?.url === media.url && publicEntry.logo?.id === plan.published.entry.logo?.id && (publicEntry.fav_icon?.id ?? null) === (plan.published.entry.fav_icon?.id ?? null), 'Public card logo verification or old-logo preservation failed.');
    results.push({ university: plan.asset.university, cardLogo: media.url, width: media.width, height: media.height, alreadyConfigured: plan.alreadyConfigured });
  }
  assert(JSON.stringify(await homeSnapshot(homeSchema)) === JSON.stringify(originalHome), 'Home changed during the card-logo update.');
  console.log(JSON.stringify({ updated: results.some(item => !item.alreadyConfigured), verifiedPublic: true, storedOriginalBytesVerified: true, uploadSettingsRestored: true, preservedFullLogosAndFavicons: true, unchangedOtherUniversityFieldsAndRelations: true, unchangedHome: true, results }));
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Scoped card-logo update failed.'); process.exitCode = 1; });
