import { factories } from '@strapi/strapi';
import { publishedReadConfig } from '../../../utils/published-read';

export default factories.createCoreRouter('api::stream.stream', { config: publishedReadConfig });
