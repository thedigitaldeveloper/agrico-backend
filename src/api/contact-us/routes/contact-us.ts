import { factories } from '@strapi/strapi';

import { PRESETS, withPopulate } from '../../../utils/populate';

// A single type exposes only `find`; the dynamic zone still needs its preset.
export default factories.createCoreRouter('api::contact-us.contact-us', {
  config: {
    find: { middlewares: [withPopulate(PRESETS['contact-us'].detail)] },
  },
});
