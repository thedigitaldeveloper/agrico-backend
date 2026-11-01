import { factories } from '@strapi/strapi';
import { publishedReadConfig } from '../../../utils/published-read';

export default factories.createCoreRouter('api::ownership-type.ownership-type', { config: publishedReadConfig });
