import { factories } from '@strapi/strapi';

import { PRESETS, withPopulate } from '../../../utils/populate';

// Reading is public; writing goes through the /me routes and is refused here.
export default factories.createCoreRouter('api::mentor-profile.mentor-profile', {
  config: {
    find: { middlewares: [withPopulate(PRESETS['mentor-profile'].card)] },
    findOne: { middlewares: [withPopulate(PRESETS['mentor-profile'].detail)] },
  },
});
