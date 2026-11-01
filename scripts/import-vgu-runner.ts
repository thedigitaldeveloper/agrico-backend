import { createStrapi, compileStrapi } from '@strapi/strapi';
import { importVGUData } from '../src/bootstrap/import-vgu-data';

async function main() {
  console.log('Compiling Strapi for standalone import...');
  const app = await createStrapi(await compileStrapi()).load();
  try {
    console.log('Strapi loaded, executing importVGUData...');
    await importVGUData(app);
    console.log('=== VGU IMPORT FINISHED SUCCESSFULLY ===');
  } finally {
    await app.destroy().catch(() => {});
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Import error:', error);
    process.exit(1);
  });
