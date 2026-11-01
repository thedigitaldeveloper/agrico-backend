import { factories } from '@strapi/strapi';
import type Koa from 'koa';

/**
 * Content sections.
 *
 * `find`/`findOne` return a section with its full body, which is right for a
 * page render but far too heavy for a sitemap that only needs URLs. Rather than
 * loosening the populate preset — the thing that stops a caller asking for the
 * whole graph — this adds a purpose-built index action.
 */

const OWNERS = ['university', 'program', 'examination', 'scheme'] as const;
type Owner = (typeof OWNERS)[number];

const isOwner = (value: unknown): value is Owner =>
  typeof value === 'string' && (OWNERS as readonly string[]).includes(value);

export default factories.createCoreController(
  'api::university-content.university-content',
  ({ strapi }) => ({
    /**
     * GET /university-contents/index?owner=university
     *
     * Returns just the fields needed to build a URL: the section slug and its
     * parent's slug. No dynamic zone, no SEO component.
     */
    async index(context: Koa.Context) {
      const ctx = context as Koa.Context & {
        badRequest: (message: string) => unknown;
        query: Record<string, unknown>;
      };

      const owner = ctx.query.owner;
      if (!isOwner(owner)) {
        return ctx.badRequest('owner must be one of: ' + OWNERS.join(', '));
      }

      const entries = await strapi
        .documents('api::university-content.university-content')
        .findMany({
          fields: ['slug', 'secondary_slug', 'updatedAt'],
          filters: { [owner]: { slug: { $notNull: true } } } as never,
          populate: { [owner]: { fields: ['slug'] } } as never,
          sort: 'updatedAt:desc',
          // Well above any realistic section count, but bounded so this cannot
          // become a way to dump the whole table in one request.
          limit: 5000,
        });

      const data = entries
        .map((entry) => {
          const parent = (entry as Record<string, unknown>)[owner] as
            | { slug?: string }
            | null
            | undefined;
          const sectionSlug = entry.secondary_slug || entry.slug;
          if (!parent?.slug || !sectionSlug) return null;
          return { ownerSlug: parent.slug, sectionSlug, updatedAt: entry.updatedAt };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      return { data };
    },
  })
);
