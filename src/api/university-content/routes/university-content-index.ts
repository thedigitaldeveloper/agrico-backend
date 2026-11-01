export default {
  routes: [
    {
      method: 'GET' as const,
      // Sits above the generated /:documentId route, so "index" is never
      // mistaken for a document id.
      path: '/university-contents/index',
      handler: 'university-content.index',
      config: { policies: [], middlewares: [] },
    },
  ],
};
