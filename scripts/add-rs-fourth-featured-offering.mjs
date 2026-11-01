/**
 * Append the existing published LPU Online MBA to the local RS homepage.
 * Preview: node scripts/add-rs-fourth-featured-offering.mjs
 * Apply:   node scripts/add-rs-fourth-featured-offering.mjs --apply
 * Uses the running CMS admin API; no bootstrap, SQL, media edits or restart.
 */
import { readFile, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'dotenv';

const base = 'http://127.0.0.1:1340';
const homeRoute = '/content-manager/single-types/api::home.home';
const universitySlug = 'lovely-professional-university';
const programSlug = 'lovely-professional-university-online-mba';
const metadata = new Set(['id', 'createdAt', 'updatedAt', 'publishedAt', 'createdBy', 'updatedBy']);
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
function assert(condition, message) { if (!condition) throw new Error(message); }
function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value)
    .filter(key => !metadata.has(key)).sort().map(key => [key, normalize(value[key])]));
  return value;
}
const same = (left, right) => JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
const pair = item => ({ university: item.university?.slug, program: item.program?.slug });
const isTarget = item => item.university?.slug === universitySlug && item.program?.slug === programSlug;
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
const jsonOptions = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const getHome = async status => (await api(homeRoute + '?status=' + status)).data;
const getPublicHome = async () => (await api('/api/home?populate[featured_offerings][populate][program]=true&populate[featured_offerings][populate][university]=true', {}, false)).data;

function relation(value) {
  assert(value?.id && value.documentId && value.slug, 'A selected relation is missing its stable identity.');
  return { connect: [{ id: value.id, documentId: value.documentId }], disconnect: [] };
}

async function main() {
  const cwd = await realpath(process.cwd());
  const env = parse(await readFile('.env'));
  const pkg = await readJson('package.json');
  assert(cwd.toLowerCase() === resolve('D:/rs-education-backend').toLowerCase() && pkg.name === 'rs-education-backend', 'Run only in the isolated RS backend directory.');
  assert(env.DATABASE_NAME === 'agrico' && ['127.0.0.1', 'localhost'].includes(env.DATABASE_HOST), 'Requires the local agrico database.');
  assert(env.PORT === '1338' && env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'production', 'Requires non-production RS port 1338.');
  const credentials = parse(await readFile('.env.local-accounts'));
  assert(credentials.ADMIN_EMAIL && credentials.ADMIN_PASSWORD, 'Missing ignored local admin credentials.');
  token = (await api('/admin/login', jsonOptions('POST', { email: credentials.ADMIN_EMAIL, password: credentials.ADMIN_PASSWORD }))).data?.token;
  assert(token, 'Local admin login did not return a token.');

  const homeSchema = await readJson('src/api/home/content-types/home/schema.json');
  const selectionSchema = await readJson('src/components/home/offering-selection.json');
  assert(Object.keys(selectionSchema.attributes).sort().join(',') === 'program,university', 'Selection schema changed; review all fields before updating.');
  const contentKeys = Object.keys(homeSchema.attributes);
  const content = home => Object.fromEntries(contentKeys.map(key => [key, home[key]]));
  const [draft, published, programResponse, universityResponse] = await Promise.all([
    getHome('draft'), getHome('published'),
    api('/api/programs?view=homepage&filters[slug][$eq]=' + encodeURIComponent(programSlug), {}, false),
    api('/api/universities?view=homepage&filters[slug][$eq]=' + encodeURIComponent(universitySlug), {}, false),
  ]);
  assert(draft?.name === 'Agrico' && draft.documentId === published?.documentId, 'Unexpected Home singleton.');
  const differences = contentKeys.filter(key => !same(draft[key], published[key]));
  assert(!differences.length, 'Refusing to publish editorial draft differences: ' + differences.join(', '));
  assert(programResponse.data?.length === 1 && universityResponse.data?.length === 1, 'Expected one published LPU programme and university.');
  const program = programResponse.data[0];
  const university = universityResponse.data[0];
  assert(program.slug === programSlug && program.course_mode?.slug === 'online' && program.course?.name === 'MBA', 'Published target is not the expected LPU Online MBA.');
  assert(university.slug === universitySlug && program.universities?.some(item => item.documentId === university.documentId && item.slug === universitySlug), 'Published programme does not belong to the selected LPU university.');
  relation(program); relation(university);

  const current = draft.featured_offerings || [];
  assert(current.every(item => item.id && item.program?.slug && item.university?.slug), 'Existing offering selections are incomplete.');
  assert(new Set(current.map(item => JSON.stringify(pair(item)))).size === current.length, 'Existing selections contain duplicate pairs.');
  const targetIndex = current.findIndex(isTarget);
  if (targetIndex !== -1) {
    assert(current.length === 4 && targetIndex === 3, 'LPU is already selected in a different position; refusing to reorder editorial choices.');
    const publicHome = await getPublicHome();
    assert(same(publicHome.featured_offerings?.map(pair), current.map(pair)), 'Public Home does not match the four published selections.');
    console.log(JSON.stringify({ alreadyConfigured: true, verifiedPublic: true, count: current.length, selections: current.map(pair) }));
    return;
  }
  assert(current.length === 3, 'Expected exactly three existing selections before appending the fourth.');
  const nextPairs = [...current.map(pair), { university: universitySlug, program: programSlug }];
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ ready: true, editorialDraftDifferences: 0, previousSelections: current.map(pair), nextSelections: nextPairs, applyCommand: 'node scripts/add-rs-fourth-featured-offering.mjs --apply' }));
    return;
  }

  // Refuse to overwrite an edit made after the preview data was read.
  const [latestDraft, latestPublished] = await Promise.all([getHome('draft'), getHome('published')]);
  assert(same(content(latestDraft), content(draft)) && same(content(latestPublished), content(published)), 'Home changed during verification; nothing was published.');
  const featured = latestDraft.featured_offerings.map(item => ({ id: item.id, program: relation(item.program), university: relation(item.university) }));
  featured.push({ program: relation(program), university: relation(university) });
  await api(homeRoute + '/actions/publish', jsonOptions('POST', { featured_offerings: featured }));

  const [finalDraft, finalPublished, publicHome] = await Promise.all([getHome('draft'), getHome('published'), getPublicHome()]);
  assert(contentKeys.filter(key => key !== 'featured_offerings').every(key => same(finalPublished[key], published[key])), 'Unexpected content difference outside featured offerings.');
  assert(finalPublished.featured_offerings?.length === 4 && isTarget(finalPublished.featured_offerings[3]), 'The fourth published selection is not LPU Online MBA.');
  assert(current.every((item, index) => same(item, finalPublished.featured_offerings[index])), 'An existing offering or its order changed unexpectedly.');
  assert(same(content(finalDraft), content(finalPublished)), 'Draft and published Home differ after the update.');
  assert(same(publicHome.featured_offerings?.map(pair), nextPairs), 'Public Home selection order verification failed.');
  console.log(JSON.stringify({ updated: true, verifiedPublic: true, count: 4, editorialDraftDifferences: 0, preservedFirstThree: true, unchangedOtherHomeFields: true, selections: nextPairs }));
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Scoped featured offering update failed.'); process.exitCode = 1; });
