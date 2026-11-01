import { factories } from '@strapi/strapi';

import { PRESETS, withPopulate } from '../../../utils/populate';

// Response shape is fixed server-side; see src/utils/populate.ts.
export default factories.createCoreRouter('api::university-content.university-content', {
  config: {
    find: { middlewares: [withPopulate(PRESETS['university-content'].detail)] },
    findOne: { middlewares: [withPopulate(PRESETS['university-content'].detail)] },
  },
});
