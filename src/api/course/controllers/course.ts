import { factories } from '@strapi/strapi';

import { findBySlugAction } from '../../../utils/find-by-slug';
import { PRESETS } from '../../../utils/populate';

export default factories.createCoreController('api::course.course', () => ({
  findBySlug: findBySlugAction('api::course.course', PRESETS['course'].detail),
}));
