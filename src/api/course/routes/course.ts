import { factories } from '@strapi/strapi';

import { PRESETS, withPopulate } from '../../../utils/populate';

// Response shape is fixed server-side; see src/utils/populate.ts.
export default factories.createCoreRouter('api::course.course', {
  config: {
    find: { middlewares: [withPopulate(PRESETS['course'].card)] },
    findOne: { middlewares: [withPopulate(PRESETS['course'].detail)] },
  },
});
