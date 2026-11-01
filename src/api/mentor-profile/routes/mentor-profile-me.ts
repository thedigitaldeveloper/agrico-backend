import { findBySlugRoute } from '../../../utils/find-by-slug';

/**
 * `/me` routes are declared before the generated `/:documentId` route so "me"
 * is never parsed as a document id.
 */
export default {
  routes: [
    {
      method: 'GET' as const,
      path: '/mentor-profiles/me',
      handler: 'mentor-profile.me',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'PUT' as const,
      path: '/mentor-profiles/me',
      handler: 'mentor-profile.updateMe',
      config: { policies: [], middlewares: [] },
    },
    findBySlugRoute('mentor-profiles', 'mentor-profile'),
  ],
};
