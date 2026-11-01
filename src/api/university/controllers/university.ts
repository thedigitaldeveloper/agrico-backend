import { factories } from '@strapi/strapi';

import { findBySlugAction } from '../../../utils/find-by-slug';
import { PRESETS } from '../../../utils/populate';

export default factories.createCoreController('api::university.university', () => ({
  findBySlug: findBySlugAction('api::university.university', PRESETS['university'].detail),
}));
