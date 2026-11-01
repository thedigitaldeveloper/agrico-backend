import { factories } from '@strapi/strapi';

import { boundedInt, currentUser, text, type AuthContext } from '../../../utils/auth';

/**
 * Student profiles hold personal data and are never browsable.
 *
 * Rather than overriding find/findOne to filter by owner, the whole content
 * type is addressed through `/student-profiles/me`. There is no id in the URL,
 * so there is no id to tamper with — the record is chosen by the token, not by
 * the request.
 */

const PROFILE_POPULATE = {
  interested_streams: { fields: ['name', 'slug'] },
  shortlisted_universities: { fields: ['name', 'slug'] },
} as const;

const EDUCATION_LEVELS = ['class-10', 'class-12', 'undergraduate', 'postgraduate', 'working'];

async function profileFor(userId: number) {
  const [profile] = await strapi.documents('api::student-profile.student-profile').findMany({
    filters: { user: { id: userId } } as never,
    populate: PROFILE_POPULATE as never,
    limit: 1,
  });
  return profile ?? null;
}

/** Resolves slugs to documentIds, silently dropping any that do not exist. */
async function resolveSlugs(
  uid: 'api::university.university' | 'api::stream.stream',
  value: unknown,
  max: number
): Promise<string[]> {
  if (!Array.isArray(value)) return [];
  const slugs = value.filter((slug): slug is string => typeof slug === 'string').slice(0, max);
  if (slugs.length === 0) return [];

  const found = await strapi.documents(uid).findMany({
    filters: { slug: { $in: slugs } } as never,
    fields: ['slug'],
    limit: max,
  });
  return found.map((entry) => entry.documentId);
}

export default factories.createCoreController(
  'api::student-profile.student-profile',
  ({ strapi }) => ({
    /** GET /student-profiles/me */
    async me(context) {
      const ctx = context as AuthContext;
      const user = currentUser(ctx);
      if (!user) return ctx.unauthorized('Sign in to view your profile');

      const profile = await profileFor(user.id);
      if (!profile) return { data: null };

      const sanitized = await strapi.contentAPI.sanitize.output(
        profile,
        strapi.contentType('api::student-profile.student-profile'),
        { auth: ctx.state.auth }
      );

      // `phone` is private, so the sanitiser strips it and the edit form has no
      // value to prefill. Without this flag the field looks empty whether or not
      // a number is stored, and the student cannot tell which.
      return {
        data: { ...(sanitized as Record<string, unknown>), has_phone: Boolean(profile.phone) },
      };
    },

    /** PUT /student-profiles/me — creates the profile on first save. */
    async updateMe(context) {
      const ctx = context as AuthContext;
      const user = currentUser(ctx);
      if (!user) return ctx.unauthorized('Sign in to update your profile');

      const input = ctx.request.body?.data ?? {};
      const level = text(input.education_level, 20);

      const data: Record<string, unknown> = {
        full_name: text(input.full_name, 120),
        phone: text(input.phone, 20),
        city: text(input.city, 80),
        state: text(input.state, 80),
        education_level: level && EDUCATION_LEVELS.includes(level) ? level : undefined,
        target_year: boundedInt(input.target_year, 2020, 2100),
        // The owner is always the caller. Taking it from the body would let one
        // user overwrite another's profile.
        user: user.id,
      };

      /**
       * Relations are only touched when the caller actually sent the key.
       *
       * Omitted scalars fall out as `undefined` and leave the stored value
       * alone; a relation always resolves to an array, so writing it
       * unconditionally would make any partial update silently clear the
       * student's shortlist. Absent means unchanged; present-but-empty clears.
       */
      if ('interested_streams' in input) {
        data.interested_streams = await resolveSlugs(
          'api::stream.stream',
          input.interested_streams,
          20
        );
      }
      if ('shortlisted_universities' in input) {
        data.shortlisted_universities = await resolveSlugs(
          'api::university.university',
          input.shortlisted_universities,
          50
        );
      }

      const existing = await profileFor(user.id);

      const saved = existing
        ? await strapi.documents('api::student-profile.student-profile').update({
            documentId: existing.documentId,
            data: data as never,
            populate: PROFILE_POPULATE as never,
          })
        : await strapi.documents('api::student-profile.student-profile').create({
            data: data as never,
            populate: PROFILE_POPULATE as never,
          });

      const sanitized = await strapi.contentAPI.sanitize.output(
        saved,
        strapi.contentType('api::student-profile.student-profile'),
        { auth: ctx.state.auth }
      );

      return { data: sanitized };
    },

    // The generated collection routes would expose every student's record, so
    // they are closed off. /student-profiles/me is the only way in.
    async find(context) {
      return (context as AuthContext).forbidden('Use /student-profiles/me');
    },
    async findOne(context) {
      return (context as AuthContext).forbidden('Use /student-profiles/me');
    },
    async create(context) {
      return (context as AuthContext).forbidden('Use PUT /student-profiles/me');
    },
    async update(context) {
      return (context as AuthContext).forbidden('Use PUT /student-profiles/me');
    },
    async delete(context) {
      return (context as AuthContext).forbidden('Profiles cannot be deleted through the API');
    },
  })
);
