import { factories } from '@strapi/strapi';

import { findBySlugAction } from '../../../utils/find-by-slug';
import { PRESETS } from '../../../utils/populate';

export default factories.createCoreController('api::blog.blog', () => ({
  findBySlug: findBySlugAction('api::blog.blog', PRESETS['blog'].detail),
}));
