import { factories } from '@strapi/strapi';
import { publishedReadConfig } from '../../../utils/published-read';

// Flat fields only — no components or relations, so no populate preset.
export default factories.createCoreRouter('api::site-setting.site-setting', { config: { find: publishedReadConfig.find } });
