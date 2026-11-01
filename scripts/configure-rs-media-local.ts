/** Import only documented official media into empty local catalogue image fields. */
import { createStrapi } from '@strapi/strapi';
import type { Core } from '@strapi/strapi';
import { config } from 'dotenv';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
config();
if (process.env.NODE_ENV === 'production' || process.env.DATABASE_NAME !== 'agrico' || !['127.0.0.1', 'localhost'].includes(process.env.DATABASE_HOST || '')) throw new Error('Official media import is restricted to the local agrico database.');
type Asset = { university: string; field: 'logo' | 'image'; url: string; sourcePage: string; filename: string; mime: string; bytes: number; alternativeText?: string };
type Entry = Record<string, any>;
export async function configureRsMedia(app: Core.Strapi) {
  const manifest = JSON.parse(await readFile(resolve('docs/official-media-sources.json'), 'utf8')) as { assets: Asset[] };
    const uploaded = new Map<string, number>();
    const updated: string[] = [];
    for (const asset of manifest.assets) {
      const university = await app.documents('api::university.university').findFirst({ status: 'published', filters: { slug: asset.university }, populate: ['image', 'logo'] });
      if (!university) continue;
      const name = 'rs-official-' + asset.filename;
      let file = await app.db.query('plugin::upload.file').findOne({ where: { name } });
      if (!file) {
        const filepath = resolve('.tmp/rs-official-media', asset.filename);
        try { await stat(filepath); } catch {
          const response = await fetch(asset.url, { headers: { Referer: asset.sourcePage }, signal: AbortSignal.timeout(25000) });
          if (!response.ok) throw new Error(`${asset.university} ${asset.field}: HTTP ${response.status}`);
          const type = response.headers.get('content-type') || '';
          if (!type.startsWith('image/')) throw new Error('Official URL did not return an image.');
          const bytes = Buffer.from(await response.arrayBuffer());
          if (bytes.length > 10 * 1024 * 1024) throw new Error('Official image exceeded the local import size limit.');
          await mkdir(resolve('.tmp/rs-official-media'), { recursive: true });
          await writeFile(filepath, bytes);
        }
        const result = await app.plugin('upload').service('upload').upload({
          data: { fileInfo: { name, alternativeText: asset.alternativeText || `${university.name} ${asset.field === 'logo' ? 'logo' : 'campus'}`, caption: `Official source: ${asset.sourcePage}. Imported for the local Agrico catalogue preview; no affiliation implied.` } },
          files: [{ filepath, originalFilename: asset.filename, mimetype: asset.mime, size: (await stat(filepath)).size }],
        });
        file = result[0];
      }
      if (asset.field === 'image') uploaded.set(university.documentId, file.id);
      if (!university[asset.field]) {
        await app.documents('api::university.university').update({ documentId: university.documentId, data: { [asset.field]: file.id }, status: 'published' } as never);
        updated.push(`${asset.university}.${asset.field}`);
      }
    }
    const docs = app.documents('api::home.home');
    const home = await docs.findFirst({ status: 'published', populate: {
      hero_slides: { populate: ['desktop_image', 'mobile_image', 'video_file', 'mobile_video_file', 'offering_program', 'offering_university'] },
      spotlight_offering: { populate: ['image', 'program', 'university'] },
    } } as never) as Entry | null;
    const data: Entry = {};
    if (home) {
      let changed = false;
      const slides = (home.hero_slides || []).map((slide: Entry) => {
        const image = uploaded.get(slide.offering_university?.documentId);
        const placeholder = !slide.desktop_image || slide.desktop_image.name === 'rs-student-life-preview.png';
        const output: Entry = {};
        for (const key of ['eyebrow', 'heading', 'description', 'media_type', 'embedded_video_link', 'link', 'link_target', 'cta_label']) if (slide[key] !== undefined) output[key] = slide[key];
        for (const key of ['desktop_image', 'mobile_image', 'video_file', 'mobile_video_file']) if (slide[key]) output[key] = slide[key].id;
        for (const key of ['offering_program', 'offering_university']) if (slide[key]) output[key] = slide[key].documentId;
        if (image && placeholder && slide.media_type === 'image') { output.desktop_image = image; output.mobile_image = image; changed = true; }
        return output;
      });
      if (changed) data.hero_slides = slides;
      const spotlight = home.spotlight_offering;
      const image = spotlight && uploaded.get(spotlight.university?.documentId);
      if (image && (!spotlight.image || spotlight.image.name === 'rs-student-life-preview.png')) {
        data.spotlight_offering = { program: spotlight.program?.documentId, university: spotlight.university?.documentId, eyebrow: spotlight.eyebrow, heading: spotlight.heading, description: spotlight.description, image };
      }
      if (Object.keys(data).length) await docs.update({ documentId: home.documentId, data, status: 'published' } as never);
    }
    console.log(JSON.stringify({ importedAssets: manifest.assets.length, updatedUniversityFields: updated, updatedHomeFields: Object.keys(data) }));
}
async function main() {
  await stat(resolve('dist/src/index.js'));
  const app = await createStrapi({ appDir: process.cwd(), distDir: resolve('dist') }).load();
  try { await configureRsMedia(app); } finally { await app.destroy(); }
}
if (require.main === module) main().then(() => process.exit(0)).catch(error => { console.error(error instanceof Error ? error.message : 'Official media import failed'); process.exit(1); });
