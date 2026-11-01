import { factories } from '@strapi/strapi';
import { publishedReadConfig } from '../../../utils/published-read';

export default factories.createCoreRouter('api::institute-tier.institute-tier', { config: publishedReadConfig });
