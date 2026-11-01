/**
 * Development helper: puts a real image pair on the first hero slide.
 *
 * The main seed uploads no media, so the homepage carousel can only be checked
 * on its gradient fallback. This generates a landscape desktop crop and a
 * portrait mobile crop, uploads both, and attaches them to slide one — enough
 * to verify that a phone downloads the portrait file and a desktop the
 * landscape one, which is the whole point of the art-directed <picture>.
 *
 *   node scripts/seed-hero-media.mjs
 *
 * Safe to delete the two uploads afterwards; nothing else references them.
 */
import { createRequire } from 'node:module';
import { deflateSync } from 'node:zlib';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// --- a minimal PNG encoder, so the script needs no image dependency ---------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** 8-bit truecolour PNG from a (x, y) -> [r, g, b] function. */
function png(width, height, pixel) {
  const raw = Buffer.alloc(height * (width * 3 + 1));
  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    raw[offset] = 0; // filter: none
    offset += 1;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = pixel(x, y);
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      offset += 3;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const mix = (from, to, t) => from.map((channel, i) => Math.round(channel + (to[i] - channel) * t));

/** Landscape: maroon to gold, left to right. Wide diagonal banding. */
const desktop = png(1920, 900, (x, y) => {
  const base = mix([74, 23, 34], [212, 144, 31], x / 1920);
  const band = Math.sin((x + y) / 90) * 12;
  return base.map((channel) => Math.max(0, Math.min(255, Math.round(channel + band))));
});

/** Portrait: teal to indigo, top to bottom — deliberately nothing like the
    desktop crop, so which one loaded is obvious at a glance. */
const mobile = png(828, 1104, (x, y) => {
  const base = mix([13, 90, 96], [40, 30, 110], y / 1104);
  const band = Math.sin((y - x) / 70) * 14;
  return base.map((channel) => Math.max(0, Math.min(255, Math.round(channel + band))));
});

const files = [
  { path: join(tmpdir(), 'hero-desktop.png'), buffer: desktop, name: 'hero-desktop.png' },
  { path: join(tmpdir(), 'hero-mobile.png'), buffer: mobile, name: 'hero-mobile.png' },
];
for (const file of files) writeFileSync(file.path, file.buffer);

// --- upload and attach -----------------------------------------------------

// Loaded through require, not import: Strapi's ESM build re-exports a bare
// directory ("lodash/fp") that Node's ESM resolver refuses, while its CommonJS
// build resolves fine.
const { createStrapi, compileStrapi } = createRequire(import.meta.url)('@strapi/strapi');

const app = await createStrapi(await compileStrapi()).load();

try {
  const uploadService = app.plugin('upload').service('upload');

  const uploaded = [];
  for (const file of files) {
    const [existing] = await app.documents('plugin::upload.file').findMany({
      filters: { name: { $eq: file.name } },
      limit: 1,
    });

    if (existing) {
      uploaded.push(existing);
      app.log.info(`hero media: reusing ${file.name}`);
      continue;
    }

    const [created] = await uploadService.upload({
      data: {},
      files: {
        filepath: file.path,
        originalFileName: file.name,
        // Strapi 5 reads either spelling depending on the entry point.
        originalFilename: file.name,
        mimetype: 'image/png',
        size: file.buffer.length,
      },
    });
    uploaded.push(created);
    app.log.info(`hero media: uploaded ${file.name} (${created.width}x${created.height})`);
  }

  const [desktopFile, mobileFile] = uploaded;

  const home = await app.documents('api::home.home').findFirst({
    status: 'published',
    populate: ['hero_slides'],
  });

  if (!home?.hero_slides?.length) {
    app.log.warn('hero media: no hero slides to attach to — run `npm run seed:dev` first');
  } else {
    // Repeatable components are replaced wholesale, so every slide is written
    // back. Component ids are deliberately dropped: the ids on the published
    // entry do not belong to the draft this update targets, and Strapi rejects
    // them as unrelated.
    const slides = home.hero_slides.map((slide, index) =>
      index === 0
        ? {
            eyebrow: slide.eyebrow,
            heading: slide.heading,
            description: slide.description,
            media_type: 'image',
            desktop_image: desktopFile.id,
            mobile_image: mobileFile.id,
            link: slide.link,
            link_target: slide.link_target,
            cta_label: slide.cta_label,
          }
        : {
            eyebrow: slide.eyebrow,
            heading: slide.heading,
            description: slide.description,
            media_type: slide.media_type,
            embedded_video_link: slide.embedded_video_link,
            link: slide.link,
            link_target: slide.link_target,
            cta_label: slide.cta_label,
          }
    );

    await app.documents('api::home.home').update({
      documentId: home.documentId,
      data: { hero_slides: slides },
      status: 'published',
    });
    app.log.info('hero media: attached desktop + mobile crops to slide 1');
  }
} finally {
  for (const file of files) {
    try {
      unlinkSync(file.path);
    } catch {
      // The temp copy is disposable; Strapi already has its own.
    }
  }
  await app.destroy().catch(() => {});
}

process.exit(0);
