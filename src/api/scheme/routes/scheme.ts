import { factories } from '@strapi/strapi';

import { PRESETS, withPopulate } from '../../../utils/populate';

// Response shape is fixed server-side; see src/utils/populate.ts.
export default factories.createCoreRouter('api::scheme.scheme', {
  config: {
    find: { middlewares: [withPopulate(PRESETS['scheme'].card)] },
    findOne: { middlewares: [withPopulate(PRESETS['scheme'].detail)] },
  },
});
