/**
 * Slug lookups.
 *
 * Strapi's generated routes address entries by documentId, so the old site
 * looked things up with `?filters[slug][$eq]=x` and read `data[0]`. That works,
 * but it goes through the *collection* route — which means it gets the listing's
 * populate preset, not the detail one, and every caller has to unwrap an array
 * that will always hold one item.
 *
 * These give each entity a real `/{plural}/slug/{slug}` route that returns one
 * entry with the detail preset, or a 404.
 */
import type { UID } from '@strapi/strapi';
import type Koa from 'koa';

type Populate = Record<string, unknown>;

/**
 * Strapi layers router params and Boom-style response helpers onto Koa's
 * context but does not export a type for the result, so it is spelled out here.
 */
type StrapiContext = Koa.Context & {
  params: Record<string, string>;
  state: { auth?: unknown };
  badRequest: (message?: string) => unknown;
  notFound: (message?: string) => unknown;
};

/**
 * Builds the `findBySlug` controller action for a content type. Sanitisation
 * runs against the caller's own permissions, so a public token never sees a
 * field it was not granted.
 */
export function findBySlugAction(uid: UID.ContentType, populate: Populate) {
  // Typed as Koa's plain Context because that is what createCoreController's
  // handler signature requires; the Strapi additions are narrowed here instead.
  return async function findBySlug(context: Koa.Context) {
    const ctx = context as StrapiContext;
    const slug = ctx.params.slug;

    if (!slug || slug.length > 200) {
      return ctx.badRequest('A slug is required');
    }

    const [entry] = await strapi.documents(uid).findMany({
      // $eqi so a stray capital in an inbound link still resolves.
      filters: { slug: { $eqi: slug } } as never,
      populate: populate as never,
      status: 'published',
      limit: 1,
    });

    if (!entry) {
      return ctx.notFound(`No entry found for slug "${slug}"`);
    }

    const sanitized = await strapi.contentAPI.sanitize.output(
      entry,
      strapi.contentType(uid),
      { auth: ctx.state.auth }
    );

    return { data: sanitized };
  };
}

/** The matching route definition. */
export function findBySlugRoute(pluralName: string, controllerName: string) {
  return {
    method: 'GET' as const,
    path: `/${pluralName}/slug/:slug`,
    handler: `${controllerName}.findBySlug`,
    config: { policies: [], middlewares: [] },
  };
}
