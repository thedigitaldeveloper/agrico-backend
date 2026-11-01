# RS Education catalogue import and CMS controls

Completed locally on 12 October 2026 (Asia/Kolkata). The source was the existing `geduconnect` database and original uploaded media in the sibling backend. Source database connections used read-only transactions. All writes were confined to the local `rs_education` database and this repository's uploads. No production service or original project was modified.

## Published result

| Content | Published | Retained but not published |
| --- | ---: | --- |
| Universities | 17 | Existing four RS identities reused; thirteen added |
| Programmes | 141 | Four previous RS sample programmes retained as drafts |
| University/programme content sections | 1,093 | Eight previous RS sample sections retained as drafts |
| Blogs | 8 | Five rewritten source blogs plus three useful RS blogs |
| News | 3 | Three unverified source news/press records held as drafts |
| Mentor profiles | 0 | Four source profiles awaiting verification for RS |
| Testimonials | 0 | Three explicit source samples retained as drafts, with original quotes unchanged |

The published catalogue contains 2,094 source-authored university/programme pairs. The import preserves those pairings rather than inferring availability from programme names. It copies 250 media-library records and 555 physical files unchanged; every copied file's SHA-256 was checked against its source. Existing RS assets, including the official Manipal hero photograph and square card logos, remain available.

Source programme names, full names, base fees, durations, duration text and average-package fields were compared across all 282 draft/published source rows. University names, locations, establishment fields and ratings were compared across all 34 source rows. All matched. This is source-integrity verification, not independent confirmation that the original academic or pricing information is current. The source has no attached university-specific `program_fees` components; no institution-specific fee rows were invented.

## Protected RS records and catalogue identity

The original Home design, site settings, legal/contact/about identity, admin accounts, student accounts, enquiries and bookings were preserved. Source question/answer submissions were excluded because they include personal author information. Source admin/user accounts were not copied. Import-time hashes verified that protected tables and Home root rows did not change. Final comparison against the hash-verified pre-import SQL backup also confirmed all admin/student/enquiry/booking identity records and permissions remain exact. The authorized unpublish of four legacy sample programmes removed two redundant enquiry links to their former published rows; each enquiry retains its original programme document through its existing draft-version link. This expected version cleanup is verified separately, rather than reported as an unchanged physical row. Runtime login sessions are excluded from identity comparisons.

The four existing RS university document IDs and slugs were retained through the alias policy in `catalogue-import-policy.json`. Home's programme selections were remapped only to canonical records for the same institution and degree:

- Manipal University Jaipur: Online MBA General Management, used by hero, spotlight and the first featured card.
- Chandigarh University: Online BBA General Management.
- Amity University: Online MCA General.
- Lovely Professional University: Online MBA General Management.

The featured order and four selected universities remain intact. Comparison still selects Manipal and LPU MBA offerings. `catalogue-programme-redirects.json` records the four old programme slug mappings for frontend compatibility. Internal source URLs were localized and university aliases applied; imported uploads do not depend on the original CMS server.

## Editorial work

`catalogue-editorial-rewrites.json` stores 248 reviewed long-fragment rewrites as reproducible original/replacement pairs. The generator also rewrites programme summaries, short promotional headings, FAQs and source development placeholders. Numeric removals in reviewed marketing promises are distinguished from structured factual fees, dates and durations, which remain exact. Source sample testimonials are never rewritten into invented student endorsements.

Six existing RS sample Blog/News entries now contain useful programme-comparison and admission-guidance prose, retaining their IDs, media and type. Source news claims and unverified personnel records remain unpublished.

A final repair preserves whitespace at rich-text run boundaries and rewrites complete paragraphs where a partial recognition disclaimer would otherwise leave a blanket-equivalence claim attached. It changed 413 imported rich-text/FAQ fields only after confirming they still matched the last imported values. Public verification scanned all 1,093 content documents and 3,198 paragraphs: zero detected joined-run, blanket-equivalence, old-brand or development-placeholder issues.


A final university-highlight pass covers the `home.highlights.key` and `value` fields explicitly. Its reviewed 68-pair manifest is `catalogue-university-highlight-rewrites.json`. It replaces source superlatives, placement guarantees, blanket recognition statements and interest-free financing promises with concise career-resource, programme-recognition and payment-term guidance. The scoped repair changed 144 text fields across 72 imported component rows (including draft-only copies); all 68 published highlights across 17 universities match the reviewed copy. Structured fees, ratings, establishment values, approval relations, icons and media were untouched. Prior text values were backed up under the ignored export directory, exact last-import values were checked before updates, and the second dry run reported zero changes and zero conflicts.

## Published relation versions

The source linked some published records to draft versions of otherwise published taxonomy documents. The importer now normalizes only to the published row in the same table with the same `document_id`; it never invents a relation or substitutes another name.

The local repair repointed 141 programme `course_mode` links, 141 `duration_type` links and 60 university `streams` links. It also removed 987 redundant content-to-programme draft-version links that already had a published link to the identical document. Ordering and existing published links were preserved. The second audit found zero remaining corrections. Link rows are not tracked by the import ledger, so duplicate-link removal creates no dangling ledger reference.

Public verification now returns Online mode and Years duration type for all 141 programmes. An exact relation filter for Online returns 141 records. The advertising-and-branding sample programme exposes its seven authored section indexes.

## CMS homepage controls

Existing Home fields remain supported, including hero slides, exact programme/university offering selections, spotlight, comparison, headers, service links, steps, FAQs and callback banner. Repeatable component order is display order.

New optional controls are additive:

| Home field | Ordered item shape |
| --- | --- |
| `featured_news` | `{ post }`, relation to Blog collection |
| `featured_blogs` | `{ post }`, relation to Blog collection |
| `featured_mentors` | `{ mentor }`, relation to Mentor Profile |
| `featured_testimonials` | `{ testimonial }`, relation to Testimonial |

Each relation is many-to-one so the same content may be selected in multiple components. To curate a feed, select published items in the desired order and set its `section_display` key to `curated`:

```json
{"news":"curated","blogs":"curated","mentors":"latest","testimonials":"latest"}
```

An empty curated list intentionally shows no entries. `latest`, or an unset key, retains the latest-published fallback. Existing `section_visibility` switches still take precedence; setting a section key to `false` hides that section. Save and publish Home after making changes. New selection arrays were initially empty and `section_display` unset, preserving the previous fallback behavior.

Anonymous content reads now force `status=published`, even if the caller requests `status=draft`. Authenticated preview and admin Content Manager remain available. Verification confirmed anonymous post counts remain 11 and mentor/testimonial counts remain zero; authenticated CMS still exposes 14 post documents, four mentor drafts and three testimonial drafts.

## Reproducible local workflow

Run from the RS backend with the existing local-only `.env`. Private source snapshots, SQL backups, uploads and verification results live under ignored `exports/rs-catalogue-import/`; never commit them or account files. The backup includes the RS database and a hash-verified copy of its pre-import uploads. A verified SQL backup is required by the importer before execution.

For a newly prepared local import, run the steps in order after the additive schema has been built and applied to the RS database:

```text
node scripts/prepare-rs-catalogue-import.mjs --backup
node scripts/snapshot-rs-source-content.mjs
node scripts/prepare-rs-content-graph.mjs
node scripts/plan-rs-catalogue-import.mjs
node scripts/rewrite-rs-catalogue-editorial.mjs
node scripts/import-rs-catalogue.mjs
```

The last command is validation-only by default. Resolve any reported conflict before the explicit execution command:

```text
node scripts/import-rs-catalogue.mjs --execute --acknowledge-local-rs
node scripts/finalize-rs-catalogue-import.mjs --apply
node scripts/verify-rs-catalogue-import.mjs
node scripts/verify-rs-editorial-public.mjs
node scripts/verify-rs-university-highlights.mjs
node scripts/repair-rs-published-relations.mjs
node scripts/verify-rs-published-relations.mjs
node scripts/verify-rs-publication-guard.mjs
```

The reviewed rewrite manifest is used when the private agent batch files are absent. The finalizer uses local admin credentials from the ignored account file in memory, never in command output. Frontend cached data must be invalidated or rebuilt after import/content repairs.

Existing installations can preview the narrowly scoped repair scripts without mutations; adding `--apply` performs their guarded transaction:

```text
node scripts/repair-rs-import-editorial.mjs
node scripts/repair-rs-import-editorial.mjs --university-highlights-only
node scripts/repair-rs-published-relations.mjs
```

The import ledger and deterministic identities prevent duplicate catalogue documents. Read-only integrity verification checked all 5,664 ledger references with zero missing rows. A second complete import was not executed solely as a test; the relation repair was reapplied as a read-only audit and returned zero pending work. Future re-imports intentionally refresh source-owned catalogue fields, so take a new RS backup and review the validation output before executing against edited content.

## Validation recorded

- Strapi production build and TypeScript compilation passed for the additive controls and publication guard.
- Public health returned 204; catalogue/content endpoints returned 200 with counts 17 / 141 / 1,093 / 11.
- Structured source fields and all 555 copied media files passed integrity checks after the final repair.
- Home retained its RS name, authentic hero image, four ordered featured offerings/universities, spotlight and comparison pairs.
- Public editorial scan passed across every imported content document.
- Anonymous draft suppression and authenticated CMS draft availability both passed.
- Public mode filtering and programme section indexes passed after same-document version normalization.
- Environment files, local accounts, exported snapshots/backups and uploads remain Git-ignored.

Detailed machine-readable reports are local and ignored; this document records sanitized results only. Frontend rendering/build evidence is maintained in the frontend repository.