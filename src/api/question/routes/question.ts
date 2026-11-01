import { factories } from '@strapi/strapi';

import { PRESETS, withPopulate } from '../../../utils/populate';

export default factories.createCoreRouter('api::question.question', {
  config: {
    find: { middlewares: [withPopulate(PRESETS['question'].card)] },
    findOne: { middlewares: [withPopulate(PRESETS['question'].detail)] },
    create: {
      middlewares: [
        { name: 'global::rate-limit', config: { max: 3, windowMs: 300_000 } },
      ],
    },
  },
});
