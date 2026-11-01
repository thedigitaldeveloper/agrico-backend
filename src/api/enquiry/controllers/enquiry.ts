import { factories } from '@strapi/strapi';
import type { Core } from '@strapi/strapi';
import type Koa from 'koa';

/**
 * Enquiries are the only thing the public can write, and they hold personal
 * data, so this controller is deliberately narrow:
 *
 * - `create` accepts a fixed field list. The core controller would take whatever
 *   the body contained, letting a caller set `status` or attach the lead to an
 *   arbitrary relation.
 * - Reads are never granted to the public role (see bootstrap/public-permissions),
 *   so the lead list cannot be enumerated.
 */

const MAX = {
  name: 120,
  email: 180,
  phone: 20,
  city: 80,
  state: 80,
  message: 2000,
} as const;

const SOURCES = ['application-form', 'counselling', 'brochure', 'contact', 'sidebar', 'homepage-callback'];

type Body = Record<string, unknown>;

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

/**
 * Accepts a relation only as a known slug, resolved against the database, so a
 * submission cannot attach itself to an arbitrary record id.
 */
async function resolveRelation(
  strapi: Core.Strapi,
  uid: 'api::university.university' | 'api::program.program',
  value: unknown
): Promise<string | undefined> {
  if (typeof value !== 'string' || !value) return undefined;
  const entry = await strapi.documents(uid).findFirst({
    filters: { slug: { $eq: value } } as never,
  });
  return entry?.documentId;
}

export default factories.createCoreController('api::enquiry.enquiry', ({ strapi }) => ({
  async create(context: Koa.Context) {
    const ctx = context as Koa.Context & {
      badRequest: (message: string) => unknown;
      request: { body?: { data?: Body } };
    };

    const input = ctx.request.body?.data ?? {};

    const name = text(input.name, MAX.name);
    const email = text(input.email, MAX.email);
    const phone = text(input.phone, MAX.phone);
    const source =
      typeof input.source === 'string' && SOURCES.includes(input.source)
        ? input.source
        : 'application-form';

    if (!name) return ctx.badRequest('Name is required');
    // Only the compact homepage callback can omit email. Existing forms and
    // account registration keep their required-email contract.
    const suppliedEmail = input.email !== undefined && input.email !== null && input.email !== '';
    if ((source !== 'homepage-callback' && !email) ||
        (suppliedEmail && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)))) {
      return ctx.badRequest('A valid email is required');
    }
    // Indian numbers, with or without country code, spaces or dashes.
    if (!phone || !/^[+]?\d[\d\s-]{7,18}$/.test(phone)) {
      return ctx.badRequest('A valid phone number is required');
    }
    if (input.consent !== true) {
      return ctx.badRequest('Consent is required to submit this form');
    }

    const [university, program] = await Promise.all([
      resolveRelation(strapi, 'api::university.university', input.university),
      resolveRelation(strapi, 'api::program.program', input.program),
    ]);

    const entry = await strapi.documents('api::enquiry.enquiry').create({
      data: {
        name,
        email,
        phone,
        city: text(input.city, MAX.city),
        state: text(input.state, MAX.state),
        message: text(input.message, MAX.message),
        source,
        consent: true,
        // Never read from the request: a new lead is always "new".
        status: 'new',
        university,
        program,
      } as never,
    });

    // Only an acknowledgement goes back. Returning the stored entry would hand
    // the submitter a readable copy of a record they cannot otherwise fetch.
    ctx.status = 201;
    return { data: { id: entry.documentId, submitted: true } };
  },
}));
