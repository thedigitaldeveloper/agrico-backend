import { factories } from '@strapi/strapi';

import { boundedInt, currentUser, mentorProfileFor, text, type AuthContext } from '../../../utils/auth';
import { findBySlugAction } from '../../../utils/find-by-slug';
import { PRESETS } from '../../../utils/populate';

/**
 * Mentor profiles are public to read — that is what makes mentors browsable —
 * but writable only by the mentor themselves, through `/mentor-profiles/me`.
 *
 * A mentor cannot create their own profile: an editor does that in the admin
 * panel, which is what stops anyone who registers from listing themselves as an
 * advisor on the site.
 */

const OWN_POPULATE = {
  availability: true,
  photo: { fields: ['url', 'alternativeText', 'width', 'height'] },
  streams: { fields: ['name', 'slug'] },
  courses: { fields: ['name', 'slug'] },
} as const;

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/** "HH:mm" or "HH:mm:ss" only; anything else is dropped. */
function timeOfDay(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return undefined;
  return `${String(hours).padStart(2, '0')}:${match[2]}:00.000`;
}

/** Validates submitted availability, discarding malformed or inverted windows. */
function cleanAvailability(value: unknown) {
  if (!Array.isArray(value)) return undefined;

  return value
    .slice(0, 40)
    .map((slot) => {
      if (!slot || typeof slot !== 'object') return null;
      const raw = slot as Record<string, unknown>;
      const day = text(raw.day_of_week, 12)?.toLowerCase();
      const start = timeOfDay(raw.start_time);
      const end = timeOfDay(raw.end_time);
      if (!day || !DAYS.includes(day) || !start || !end) return null;
      // An end at or before the start would make a window nothing can fit in.
      if (end <= start) return null;
      return { day_of_week: day, start_time: start, end_time: end };
    })
    .filter((slot): slot is NonNullable<typeof slot> => slot !== null);
}

export default factories.createCoreController(
  'api::mentor-profile.mentor-profile',
  ({ strapi }) => ({
    findBySlug: findBySlugAction(
      'api::mentor-profile.mentor-profile',
      PRESETS['mentor-profile'].detail
    ),

    /**
     * GET /mentor-profiles/slug/:slug/busy
     *
     * Free/busy only: the start and length of each live session, and nothing
     * else. No student, no topic, no id. That is enough for the booking form to
     * grey out taken slots without making one mentor's calendar a window onto
     * who is talking to them.
     */
    async busy(context) {
      const ctx = context as AuthContext;
      const slug = ctx.params.slug;
      if (!slug) return ctx.badRequest('A mentor slug is required');

      const [mentor] = await strapi.documents('api::mentor-profile.mentor-profile').findMany({
        filters: { slug: { $eq: slug } } as never,
        fields: ['slug'],
        status: 'published',
        limit: 1,
      });
      if (!mentor) return ctx.notFound('No such mentor');

      const bookings = await strapi.documents('api::session-booking.session-booking').findMany({
        filters: {
          mentor: { documentId: mentor.documentId },
          status: { $in: ['requested', 'confirmed'] },
        } as never,
        fields: ['scheduled_at', 'duration_minutes'],
        limit: 500,
      });

      return {
        data: bookings.map((booking) => ({
          start: booking.scheduled_at,
          minutes: booking.duration_minutes,
        })),
      };
    },

    /** GET /mentor-profiles/me */
    async me(context) {
      const ctx = context as AuthContext;
      const user = currentUser(ctx);
      if (!user) return ctx.unauthorized('Sign in to view your mentor profile');

      const owned = await mentorProfileFor(user.id);
      if (!owned) return { data: null };

      const profile = await strapi.documents('api::mentor-profile.mentor-profile').findOne({
        documentId: owned.documentId,
        populate: OWN_POPULATE as never,
        status: 'draft',
      });

      const sanitized = await strapi.contentAPI.sanitize.output(
        profile,
        strapi.contentType('api::mentor-profile.mentor-profile'),
        { auth: ctx.state.auth }
      );

      return { data: sanitized };
    },

    /** PUT /mentor-profiles/me — edits the caller's own profile only. */
    async updateMe(context) {
      const ctx = context as AuthContext;
      const user = currentUser(ctx);
      if (!user) return ctx.unauthorized('Sign in to update your mentor profile');

      const owned = await mentorProfileFor(user.id);
      if (!owned) {
        return ctx.forbidden('You do not have a mentor profile. Ask an editor to create one.');
      }

      const input = ctx.request.body?.data ?? {};

      const data: Record<string, unknown> = {
        headline: text(input.headline, 160),
        bio: text(input.bio, 4000),
        languages: text(input.languages, 160),
        experience_years: boundedInt(input.experience_years, 0, 60),
        session_minutes: boundedInt(input.session_minutes, 15, 120),
        // `user`, `slug` and `display_name` are deliberately absent: a mentor
        // must not be able to reassign their profile to another account or
        // change the URL their published page lives at.
      };

      if (typeof input.is_accepting_bookings === 'boolean') {
        data.is_accepting_bookings = input.is_accepting_bookings;
      }

      const availability = cleanAvailability(input.availability);
      if (availability) data.availability = availability;

      const saved = await strapi.documents('api::mentor-profile.mentor-profile').update({
        documentId: owned.documentId,
        data: data as never,
        populate: OWN_POPULATE as never,
        status: 'published',
      });

      const sanitized = await strapi.contentAPI.sanitize.output(
        saved,
        strapi.contentType('api::mentor-profile.mentor-profile'),
        { auth: ctx.state.auth }
      );

      return { data: sanitized };
    },

    // Creating, editing by id, and deleting are admin-panel operations.
    async create(context) {
      return (context as AuthContext).forbidden('Mentor profiles are created by an editor');
    },
    async update(context) {
      return (context as AuthContext).forbidden('Use PUT /mentor-profiles/me');
    },
    async delete(context) {
      return (context as AuthContext).forbidden('Mentor profiles are removed by an editor');
    },
  })
);
