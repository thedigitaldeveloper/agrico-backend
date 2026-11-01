/**
 * Repair imported draft university approvals/affiliations that point directly
 * at published row IDs. Strapi's editor filters these out, although the public
 * API still shows them. Uses document IDs and the Document Service to restore
 * the draft links, without publishing or discarding any university draft.
 *
 * Audit: node scripts/repair-university-draft-relations.mjs --slug amity-university-online
 * Apply: add --apply. Use --all instead of --slug for a catalogue-wide audit.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { createStrapi, compileStrapi } = require('@strapi/strapi');
const args = process.argv.slice(2);
const slugIndex = args.indexOf('--slug');
const slug = slugIndex >= 0 ? args[slugIndex + 1] : undefined;
assert.ok(args.includes('--all') || (slug && !slug.startsWith('--')), 'Specify --slug <university-slug> or --all');
const apply = args.includes('--apply');
const uid = 'api::university.university';
const targets = { approvals: 'api::approval.approval', affiliations: 'api::affiliation.affiliation' };
const populate = Object.fromEntries(Object.keys(targets).map(field => [field, true]));
const app = await createStrapi(await compileStrapi()).load();
const events = new Map();
const pendingEvents = [];
const unsubscribe = app.eventHub.subscribe((event, payload) => {
  if (!payload?.uid || !payload.entry) return;
  const key = `${event}:${payload.uid}:${payload.entry?.documentId}`;
  events.get(key)?.();
  events.delete(key);
});
function expectEvent(event, model, documentId) {
  pendingEvents.push(new Promise(resolve => events.set(`${event}:${model}:${documentId}`, resolve)));
}

try {
  const drafts = await app.db.query(uid).findMany({
    where: { publishedAt: null, ...(slug ? { slug } : {}) }, populate,
  });
  const plans = drafts.flatMap(draft => {
    const fields = Object.keys(targets).filter(field => draft[field].some(item => item.publishedAt !== null));
    return fields.length ? [{ draft, fields }] : [];
  });
  for (const { draft, fields } of plans) {
    console.log(`${draft.slug}: ${fields.map(field => `${field} (${draft[field].length} links)`).join(', ')}`);
  }
  console.log(`${apply ? 'Repair' : 'Audit'}: ${plans.length} university draft(s) need repair.`);
  if (apply && plans.length) {
    // Save the original rows and links before the first write, outside Git.
    const directory = resolve('logs');
    mkdirSync(directory, { recursive: true });
    const backup = resolve(directory, `university-draft-relations-${Date.now()}.json`);
    writeFileSync(backup, JSON.stringify(plans, null, 2), { flag: 'wx' });
    console.log(`Original draft/link snapshot: ${backup}`);

    await app.db.transaction(async () => {
      for (const { draft, fields } of plans) {
        const publishedBefore = await app.documents(uid).findOne({ documentId: draft.documentId, status: 'published', populate });
        const data = {};
        for (const field of fields) {
          const target = targets[field];
          const documentIds = [...new Set(draft[field].map(item => item.documentId))];
          for (const documentId of documentIds) {
            const existingDraft = await app.db.query(target).findOne({ where: { documentId, publishedAt: null } });
            if (!existingDraft) {
              // Some imported lookup records only have a published version.
              // Never discard an existing editorial draft.
              expectEvent('entry.draft-discard', target, documentId);
              await app.documents(target).discardDraft({ documentId });
              console.log(`Restored missing ${field} draft: ${documentId}`);
            }
          }
          // Imported IDs can start with a digit; Strapi interprets bare
          // strings such as "3ce..." as numeric row IDs. Use longhand.
          data[field] = { set: documentIds.map(documentId => ({ documentId })) };
        }
        expectEvent('entry.update', uid, draft.documentId);
        await app.documents(uid).update({ documentId: draft.documentId, status: 'draft', data });
        const repaired = await app.documents(uid).findOne({ documentId: draft.documentId, status: 'draft', populate });
        for (const field of fields) {
          const expected = [...new Set(draft[field].map(item => item.documentId))].sort();
          assert.deepEqual(repaired[field].map(item => item.documentId).sort(), expected, `${draft.slug}.${field} is visible to the CMS`);
        }
        const publishedAfter = await app.documents(uid).findOne({ documentId: draft.documentId, status: 'published', populate });
        assert.deepEqual(publishedAfter, publishedBefore, `${draft.slug}: published data must stay unchanged`);
        console.log(`Repaired ${draft.slug}; published content unchanged.`);
      }
    });
    // Document Service events populate their payloads asynchronously after
    // commit. Let those database reads finish before shutting down the pool.
    let timer;
    try {
      await Promise.race([
        Promise.all(pendingEvents),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Repair committed, but CMS events did not finish within 30 seconds')), 30000);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
} finally {
  unsubscribe();
  await app.destroy();
}
