import { factories } from '@strapi/strapi';

import { PRESETS, withPopulate } from '../../../utils/populate';

// Response shape is fixed server-side; see src/utils/populate.ts.
export default factories.createCoreRouter('api::blog.blog', {
  config: {
    find: { middlewares: [withPopulate(PRESETS['blog'].card)] },
    findOne: { middlewares: [withPopulate(PRESETS['blog'].detail)] },
  },
});
