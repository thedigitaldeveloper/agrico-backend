export default {
  routes: [
    {
      method: 'GET' as const,
      path: '/student-profiles/me',
      handler: 'student-profile.me',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'PUT' as const,
      path: '/student-profiles/me',
      handler: 'student-profile.updateMe',
      config: { policies: [], middlewares: [] },
    },
  ],
};
