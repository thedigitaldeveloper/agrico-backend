import { factories } from '@strapi/strapi';
import { publishedReadConfig } from '../../../utils/published-read';

export default factories.createCoreRouter('api::course-type.course-type', { config: publishedReadConfig });
