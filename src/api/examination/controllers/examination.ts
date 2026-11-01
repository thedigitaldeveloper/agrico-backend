import { factories } from '@strapi/strapi';

import { findBySlugAction } from '../../../utils/find-by-slug';
import { PRESETS } from '../../../utils/populate';

export default factories.createCoreController('api::examination.examination', () => ({
  findBySlug: findBySlugAction('api::examination.examination', PRESETS['examination'].detail),
}));
