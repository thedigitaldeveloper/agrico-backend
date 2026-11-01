import { factories } from '@strapi/strapi';

import { PRESETS, withPopulate } from '../../../utils/populate';

// A single type exposes only `find`; the dynamic zone still needs its preset.
export default factories.createCoreRouter('api::about-us.about-us', {
  config: {
    find: { middlewares: [withPopulate(PRESETS['about-us'].detail)] },
  },
});
