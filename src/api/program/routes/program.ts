import { factories } from '@strapi/strapi';

import { PRESETS, withPopulate } from '../../../utils/populate';

// Response shape is fixed server-side; see src/utils/populate.ts.
export default factories.createCoreRouter('api::program.program', {
  config: {
    find: { middlewares: [withPopulate(PRESETS['program'].card, PRESETS['program'].homepage)] },
    findOne: { middlewares: [withPopulate(PRESETS['program'].detail)] },
  },
});
