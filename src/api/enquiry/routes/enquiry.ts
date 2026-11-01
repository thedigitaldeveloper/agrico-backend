import { factories } from '@strapi/strapi';

// Public writes are rate limited per IP. Reads are not exposed to the public
// role at all — see src/bootstrap/public-permissions.ts.
export default factories.createCoreRouter('api::enquiry.enquiry', {
  config: {
    create: {
      middlewares: [
        { name: 'global::rate-limit', config: { max: 5, windowMs: 60_000 } },
      ],
    },
  },
});
