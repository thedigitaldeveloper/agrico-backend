import { factories } from '@strapi/strapi';

import {
  boundedInt,
  currentUser,
  mentorProfileFor,
  text,
  type AuthContext,
} from '../../../utils/auth';
import { fitsAvailability, overlaps, withinBookingWindow } from '../../../utils/booking-slots';

/**
 * Session bookings.
 *
 * Every action here is scoped to the signed-in user. Strapi's role permissions
 * only decide *whether* an authenticated user may call `find`; without the
 * filtering below, any student could list every other student's sessions.
 */

const BOOKING_POPULATE = {
  mentor: {
    fields: ['display_name', 'slug', 'session_minutes'],
    populate: { photo: { fields: ['url', 'alternativeText'] } },
  },
  student: { fields: ['username'] },
} as const;

/**
 * A mentor needs to know who booked, but Strapi's output sanitiser strips the
 * users-permissions relation entirely — an authenticated caller has no read
 * permission on other users, and granting one would expose the whole user
 * table.
 *
 * So the student is re-attached deliberately, as a name and nothing else. No
 * email, no id: a mentor needs to recognise the person in the session, not to
 * be able to contact them outside the platform.
 */
function attachStudent(
  sanitized: unknown,
  sources: { documentId: string; student?: { username?: string } | null }[]
): unknown {
  const names = new Map(
    sources.map((booking) => [booking.documentId, booking.student?.username ?? null])
  );

  const withName = (entry: Record<string, unknown>) => ({
    ...entry,
    student: { name: names.get(entry.documentId as string) ?? 'A student' },
  });

  return Array.isArray(sanitized)
    ? sanitized.map((entry) => withName(entry as Record<string, unknown>))
    : withName(sanitized as Record<string, unknown>);
}

/** Status changes each side may make, keyed by the current status. */
const STUDENT_TRANSITIONS: Record<string, string[]> = {
  requested: ['cancelled'],
  confirmed: ['cancelled'],
};

const MENTOR_TRANSITIONS: Record<string, string[]> = {
  requested: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
};

export default factories.createCoreController(
  'api::session-booking.session-booking',
  ({ strapi }) => ({
    /** Bookings where the caller is either the student or the mentor. */
    async find(context) {
      const ctx = context as AuthContext;
      const user = currentUser(ctx);
      if (!user) return ctx.unauthorized('Sign in to view your sessions');

      const mentor = await mentorProfileFor(user.id);

      const bookings = await strapi.documents('api::session-booking.session-booking').findMany({
        filters: {
          $or: [
            { student: { id: user.id } },
            ...(mentor ? [{ mentor: { documentId: mentor.documentId } }] : []),
          ],
        } as never,
        populate: BOOKING_POPULATE as never,
        sort: 'scheduled_at:asc',
        limit: 200,
      });

      const sanitized = await strapi.contentAPI.sanitize.output(
        bookings,
        strapi.contentType('api::session-booking.session-booking'),
        { auth: ctx.state.auth }
      );

      return { data: attachStudent(sanitized, bookings as never) };
    },

    async findOne(context) {
      const ctx = context as AuthContext;
      const user = currentUser(ctx);
      if (!user) return ctx.unauthorized('Sign in to view this session');

      const booking = await strapi
        .documents('api::session-booking.session-booking')
        .findOne({ documentId: ctx.params.id, populate: BOOKING_POPULATE as never });

      if (!booking) return ctx.notFound('No such session');

      const mentor = await mentorProfileFor(user.id);
      const isStudent = (booking as { student?: { id?: number } }).student?.id === user.id;
      const isMentor =
        !!mentor &&
        (booking as { mentor?: { documentId?: string } }).mentor?.documentId === mentor.documentId;

      // A 404 rather than a 403: confirming the id exists would leak the fact
      // that some other student has a session booked.
      if (!isStudent && !isMentor) return ctx.notFound('No such session');

      const sanitized = await strapi.contentAPI.sanitize.output(
        booking,
        strapi.contentType('api::session-booking.session-booking'),
        { auth: ctx.state.auth }
      );

      return { data: attachStudent(sanitized, [booking] as never) };
    },

    async create(context) {
      const ctx = context as AuthContext;
      const user = currentUser(ctx);
      if (!user) return ctx.unauthorized('Sign in to book a session');

      const input = ctx.request.body?.data ?? {};

      const mentorSlug = text(input.mentor, 120);
      if (!mentorSlug) return ctx.badRequest('A mentor is required');

      const [mentor] = await strapi.documents('api::mentor-profile.mentor-profile').findMany({
        filters: { slug: { $eq: mentorSlug } } as never,
        populate: { availability: true } as never,
        status: 'published',
        limit: 1,
      });

      if (!mentor) return ctx.notFound('No such mentor');
      if (!mentor.is_accepting_bookings) {
        return ctx.badRequest('This mentor is not accepting bookings right now.');
      }

      const scheduledAt = new Date(String(input.scheduled_at ?? ''));
      if (Number.isNaN(scheduledAt.getTime())) {
        return ctx.badRequest('A valid session time is required');
      }

      const window = withinBookingWindow(scheduledAt);
      if (!window.ok) return ctx.badRequest(window.reason);

      // Duration comes from the mentor's profile, never from the request — a
      // caller could otherwise book a two-hour slot inside a 30-minute window.
      const duration = boundedInt(mentor.session_minutes, 15, 120) ?? 30;

      // Strapi's generated document type does not carry components resolved at
      // runtime by a dynamic populate, so the shape is asserted here.
      const slots =
        (mentor as { availability?: unknown[] }).availability ?? [];

      const availability = fitsAvailability(scheduledAt, duration, slots as never);
      if (!availability.ok) return ctx.badRequest(availability.reason);

      // Double-booking check. Cancelled sessions free their slot again.
      const existing = await strapi.documents('api::session-booking.session-booking').findMany({
        filters: {
          mentor: { documentId: mentor.documentId },
          status: { $in: ['requested', 'confirmed'] },
        } as never,
        fields: ['scheduled_at', 'duration_minutes'],
        limit: 500,
      });

      const clash = existing.some((booking) =>
        overlaps(
          scheduledAt,
          duration,
          new Date(booking.scheduled_at as string),
          (booking.duration_minutes as number) ?? duration
        )
      );
      if (clash) return ctx.badRequest('That slot has just been taken. Please pick another.');

      const created = await strapi.documents('api::session-booking.session-booking').create({
        data: {
          student: user.id,
          mentor: mentor.documentId,
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: duration,
          topic: text(input.topic, 160),
          notes: text(input.notes, 2000),
          // Never read from the request: a new booking always starts as a
          // request awaiting the mentor's confirmation.
          status: 'requested',
        } as never,
      });

      ctx.status = 201;
      return { data: { documentId: created.documentId, status: 'requested' } };
    },

    /**
     * The only mutable field is `status`, and which transitions are legal
     * depends on whether the caller is the student or the mentor.
     */
    async update(context) {
      const ctx = context as AuthContext;
      const user = currentUser(ctx);
      if (!user) return ctx.unauthorized('Sign in to manage your sessions');

      const booking = await strapi.documents('api::session-booking.session-booking').findOne({
        documentId: ctx.params.id,
        populate: { mentor: true, student: true } as never,
      });

      if (!booking) return ctx.notFound('No such session');

      const mentor = await mentorProfileFor(user.id);
      const isStudent = (booking as { student?: { id?: number } }).student?.id === user.id;
      const isMentor =
        !!mentor &&
        (booking as { mentor?: { documentId?: string } }).mentor?.documentId === mentor.documentId;

      if (!isStudent && !isMentor) return ctx.notFound('No such session');

      const next = text(ctx.request.body?.data?.status, 20);
      if (!next) return ctx.badRequest('A status is required');

      const allowed = (isMentor ? MENTOR_TRANSITIONS : STUDENT_TRANSITIONS)[
        booking.status as string
      ];

      if (!allowed?.includes(next)) {
        return ctx.badRequest(
          'A ' + booking.status + ' session cannot be changed to ' + next + ' by you.'
        );
      }

      await strapi.documents('api::session-booking.session-booking').update({
        documentId: ctx.params.id,
        data: {
          status: next,
          cancellation_reason:
            next === 'cancelled' ? text(ctx.request.body?.data?.cancellation_reason, 300) : null,
        } as never,
      });

      return { data: { documentId: ctx.params.id, status: next } };
    },

    /**
     * Bookings are never deleted through the API — a cancelled session is part
     * of both parties' history. The admin panel can remove one if it must.
     */
    async delete(context) {
      const ctx = context as AuthContext;
      return ctx.forbidden('Sessions can be cancelled but not deleted.');
    },
  })
);

