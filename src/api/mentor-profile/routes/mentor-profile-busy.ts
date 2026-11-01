export default {
  routes: [
    {
      method: 'GET' as const,
      // Declared before the generated /:documentId route so "slug" and "me"
      // are never parsed as document ids.
      path: '/mentor-profiles/slug/:slug/busy',
      handler: 'mentor-profile.busy',
      config: { policies: [], middlewares: [] },
    },
  ],
};
