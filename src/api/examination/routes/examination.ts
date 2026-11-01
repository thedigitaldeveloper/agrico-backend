import { factories } from '@strapi/strapi';

import { PRESETS, withPopulate } from '../../../utils/populate';

// Response shape is fixed server-side; see src/utils/populate.ts.
export default factories.createCoreRouter('api::examination.examination', {
  config: {
    find: { middlewares: [withPopulate(PRESETS['examination'].card)] },
    findOne: { middlewares: [withPopulate(PRESETS['examination'].detail)] },
  },
});
