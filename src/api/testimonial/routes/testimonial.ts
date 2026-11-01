import { factories } from '@strapi/strapi';

import { PRESETS, withPopulate } from '../../../utils/populate';

// Response shape is fixed server-side; see src/utils/populate.ts.
export default factories.createCoreRouter('api::testimonial.testimonial', {
  config: {
    find: { middlewares: [withPopulate(PRESETS['testimonial'].card)] },
    findOne: { middlewares: [withPopulate(PRESETS['testimonial'].detail)] },
  },
});
