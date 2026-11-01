import type { Core } from '@strapi/strapi';

/** Public REST reads must not turn editorial drafts into anonymous content. */
export const anonymousPublished: Core.MiddlewareHandler = async (ctx, next) => {
  const credentials = (ctx.state.auth as { credentials?: unknown } | undefined)?.credentials;
  if (!ctx.state.user && !credentials) {
    ctx.query = { ...ctx.query, status: 'published' };
  }
  await next();
};

export const publishedReadConfig = {
  find: { middlewares: [anonymousPublished] },
  findOne: { middlewares: [anonymousPublished] },
};