import { factories } from '@strapi/strapi';

import { PRESETS, withPopulate } from '../../../utils/populate';

// Response shape is fixed server-side; see src/utils/populate.ts.
export default factories.createCoreRouter('api::university.university', {
  config: {
    find: { middlewares: [withPopulate(PRESETS['university'].card, PRESETS['university'].homepage)] },
    findOne: { middlewares: [withPopulate(PRESETS['university'].detail)] },
  },
});
