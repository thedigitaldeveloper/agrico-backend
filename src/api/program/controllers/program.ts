import { factories } from '@strapi/strapi';

import { findBySlugAction } from '../../../utils/find-by-slug';
import { PRESETS } from '../../../utils/populate';

export default factories.createCoreController('api::program.program', () => ({
  findBySlug: findBySlugAction('api::program.program', PRESETS['program'].detail),
}));
