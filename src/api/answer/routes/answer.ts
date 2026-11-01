import { factories } from '@strapi/strapi';
import { publishedReadConfig } from '../../../utils/published-read';

export default factories.createCoreRouter('api::answer.answer', {
  config: {
    ...publishedReadConfig,
    create: {
      middlewares: [
        { name: 'global::rate-limit', config: { max: 5, windowMs: 300_000 } },
      ],
    },
  },
});
