import { factories } from '@strapi/strapi';
import type Koa from 'koa';

import { findBySlugAction } from '../../../utils/find-by-slug';
import { PRESETS } from '../../../utils/populate';

/**
 * Public Q&A submissions.
 *
 * A visitor's question is created as a *draft*, which is how moderation works
 * here: `find` only ever returns published entries, so nothing reaches the site
 * until an editor publishes it. The core controller would let the request body
 * decide that, along with the view count and every relation.
 */

const MAX = { title: 200, body: 4000, author: 80, email: 180 } as const;

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

export default factories.createCoreController('api::question.question', ({ strapi }) => ({
  findBySlug: findBySlugAction('api::question.question', PRESETS['question'].detail),

  async create(context: Koa.Context) {
    const ctx = context as Koa.Context & {
      badRequest: (message: string) => unknown;
      request: { body?: { data?: Record<string, unknown> } };
    };

    const input = ctx.request.body?.data ?? {};

    const title = text(input.title, MAX.title);
    if (!title || title.length < 10) {
      return ctx.badRequest('A question of at least 10 characters is required');
    }

    const email = text(input.author_email, MAX.email);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return ctx.badRequest('That email address is not valid');
    }

    // Slugs must stay unique, and a timestamp suffix is cheaper than a round
    // trip to check for collisions.
    const slug = slugify(title) + '-' + Date.now().toString(36);

    await strapi.documents('api::question.question').create({
      data: {
        title,
        slug,
        body: text(input.body, MAX.body),
        author_name: text(input.author_name, MAX.author) ?? 'Anonymous',
        author_email: email,
        views: 0,
      } as never,
      // Omitting status leaves the entry a draft — pending moderation.
    });

    ctx.status = 201;
    return {
      data: {
        submitted: true,
        message: 'Thanks — your question will appear once it has been reviewed.',
      },
    };
  },
}));
