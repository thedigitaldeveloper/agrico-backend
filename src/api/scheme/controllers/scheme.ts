import { factories } from '@strapi/strapi';

import { findBySlugAction } from '../../../utils/find-by-slug';
import { PRESETS } from '../../../utils/populate';

export default factories.createCoreController('api::scheme.scheme', () => ({
  findBySlug: findBySlugAction('api::scheme.scheme', PRESETS['scheme'].detail),
}));
