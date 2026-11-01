import { factories } from '@strapi/strapi';
import type Koa from 'koa';

/**
 * Public answers, moderated the same way questions are: created as drafts, and
 * only visible once an editor publishes them. `is_expert` and `is_accepted` are
 * editorial flags and are never taken from the request.
 */

const MAX = { body: 8000, author: 80, email: 180 } as const;

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

export default factories.createCoreController('api::answer.answer', ({ strapi }) => ({
  async create(context: Koa.Context) {
    const ctx = context as Koa.Context & {
      badRequest: (message: string) => unknown;
      notFound: (message: string) => unknown;
      request: { body?: { data?: Record<string, unknown> } };
    };

    const input = ctx.request.body?.data ?? {};

    const body = text(input.body, MAX.body);
    if (!body || body.length < 20) {
      return ctx.badRequest('An answer of at least 20 characters is required');
    }

    const questionSlug = text(input.question, 120);
    if (!questionSlug) return ctx.badRequest('A question is required');

    // The answer must attach to a question that is actually live, so a caller
    // cannot seed replies onto drafts that have not been moderated yet.
    const question = await strapi.documents('api::question.question').findFirst({
      filters: { slug: { $eq: questionSlug } } as never,
      status: 'published',
    });
    if (!question) return ctx.notFound('No published question with that slug');

    const email = text(input.author_email, MAX.email);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return ctx.badRequest('That email address is not valid');
    }

    await strapi.documents('api::answer.answer').create({
      data: {
        body,
        author_name: text(input.author_name, MAX.author) ?? 'Anonymous',
        author_email: email,
        is_expert: false,
        is_accepted: false,
        question: question.documentId,
      } as never,
    });

    ctx.status = 201;
    return {
      data: {
        submitted: true,
        message: 'Thanks — your answer will appear once it has been reviewed.',
      },
    };
  },
}));
