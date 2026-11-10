import type { Core } from '@strapi/strapi';

/**
 * Role permissions, as code.
 *
 * Strapi stores these in the database, so they are normally clicked in through
 * the admin panel and then have to be re-clicked on every fresh environment,
 * with no record in the repo of what was granted. Doing it here makes the
 * surface explicit, reviewable in a diff, and identical on every machine.
 *
 * Note that Strapi's `authenticated` role does NOT inherit `public`. Signing in
 * must not take capabilities away, so the authenticated role is granted the
 * public read set plus its own actions.
 */

/** Collection types the site renders. Every one is public content. */
const PUBLIC_COLLECTIONS = [
  'university',
  'university-content',
  'program',
  'faculty',
  'recruiter',
  'course',
  'stream',
  'exam',
  'examination',
  'scheme',
  'blog',
  'master',
  'legal',
  'social',
  'tag',
  'ranking',
  'approval',
  'affiliation',
  'eligibility',
  'course-mode',
  'course-type',
  // Undergraduate/postgraduate. A different axis from `course-type`, which
  // records Degree/Diploma/Certificate — a B.Tech is both.
  'level',
  'duration-type',
  'ownership-type',
  'institute-tier',
  // Q&A is readable by anyone; only *published* entries are ever returned, so
  // unmoderated submissions stay invisible.
  'question',
  'answer',
  // Mentor profiles are the browsable directory of advisors.
  'mentor-profile',
  // Student quotes on the homepage. Read-only from the public side — these are
  // written by staff from what a student actually said, never submitted here.
  'testimonial',
] as const;

/** Single types — one entry each, so they expose `find` only. */
const PUBLIC_SINGLE_TYPES = [
  'home',
  'about-us',
  'contact-us',
  // Contact details for the WhatsApp CTAs, enquiry modals and footer. Read on
  // every render through lib/cms/repositories/settings.ts, so without this the
  // site falls back to its built-in defaults and shows a number nobody answers.
  'site-setting',
] as const;

/** Content types that also expose the custom /{plural}/slug/:slug route. */
const SLUG_ROUTE_TYPES = [
  'university',
  'program',
  // src/api/course/routes/course-by-slug.ts exposes this and the site calls it
  // from repositories/course.ts. It was missing here, so the route worked only
  // where someone had ticked it in the admin panel — anonymously but not when
  // signed in, and not at all on a fresh database.
  'course',
  'examination',
  'scheme',
  'blog',
  'question',
  'mentor-profile',
] as const;

/**
 * Content types the public may create but must never read.
 *
 * Enquiries are leads: name, email and phone. Granting `find` here would let
 * anyone page through the client's entire contact list, so only `create` is
 * ever added.
 */
const PUBLIC_WRITE_ONLY = ['enquiry'] as const;

/** Content types the public may create in addition to reading. */
const PUBLIC_CREATE = ['question', 'answer'] as const;

/** Plugin routes the site calls anonymously. */
const PUBLIC_PLUGIN_ACTIONS = [
  'plugin::fuzzy-search.searchController.search',
  // A refresh token is its credential; renewal must work after access JWT expiry.
  'plugin::users-permissions.auth.refresh',
] as const;

/** Custom read actions beyond the generated find/findOne/findBySlug set. */
const EXTRA_READ_ACTIONS = [
  // Lightweight section index, used to build the sitemap.
  'api::university-content.university-content.index',
  // Free/busy times for a mentor, so the booking form can hide taken slots.
  'api::mentor-profile.mentor-profile.busy',
] as const;

/**
 * Actions only a signed-in user may call.
 *
 * Each is scoped to the caller inside its controller — these grants say *who
 * may call the endpoint*, not *which rows they may touch*. Row ownership is
 * enforced in src/api/{session-booking,student-profile,mentor-profile}.
 */
const AUTHENTICATED_ONLY_ACTIONS = [
  // Sessions: listed, read, booked and status-changed, all scoped to the caller.
  'api::session-booking.session-booking.find',
  'api::session-booking.session-booking.findOne',
  'api::session-booking.session-booking.create',
  'api::session-booking.session-booking.update',

  // Own profile, addressed as /me so there is no id to tamper with.
  'api::student-profile.student-profile.me',
  'api::student-profile.student-profile.updateMe',
  'api::mentor-profile.mentor-profile.me',
  'api::mentor-profile.mentor-profile.updateMe',

  // Account.
  'plugin::users-permissions.user.me',
  'plugin::users-permissions.auth.changePassword',
  'plugin::users-permissions.auth.logout',
] as const;

function publicReadActions(): string[] {
  const actions = new Set<string>([...PUBLIC_PLUGIN_ACTIONS, ...EXTRA_READ_ACTIONS]);

  for (const name of PUBLIC_COLLECTIONS) {
    actions.add(`api::${name}.${name}.find`);
    actions.add(`api::${name}.${name}.findOne`);
  }
  for (const name of PUBLIC_SINGLE_TYPES) {
    actions.add(`api::${name}.${name}.find`);
  }
  for (const name of SLUG_ROUTE_TYPES) {
    actions.add(`api::${name}.${name}.findBySlug`);
  }

  return [...actions];
}

function actionsForRole(role: 'public' | 'authenticated'): string[] {
  const actions = new Set<string>(publicReadActions());

  for (const name of [...PUBLIC_WRITE_ONLY, ...PUBLIC_CREATE]) {
    actions.add(`api::${name}.${name}.create`);
  }

  if (role === 'authenticated') {
    for (const action of AUTHENTICATED_ONLY_ACTIONS) actions.add(action);
  }

  return [...actions];
}

/**
 * This file is the single source of truth for `api::` permissions, which means
 * it has to take them away as well as hand them out.
 *
 * Adding-only was not enough. Anything ticked in the admin panel stayed ticked
 * for good, and the database drifted away from the list above with nothing to
 * pull it back: `api::enquiry.enquiry.find` had been granted to both roles,
 * which is exactly the lead-list enumeration PUBLIC_WRITE_ONLY exists to
 * prevent. A restart could not clear it, and no diff showed it.
 *
 * Only `api::` actions are reconciled. The `plugin::` namespace holds Strapi's
 * own defaults — register, callback, forgotPassword, resetPassword and the rest
 * of the auth surface — which this file deliberately does not enumerate, so
 * revoking what it cannot see would break sign-in and registration outright.
 */
const OWNED_NAMESPACE = 'api::';

async function grant(
  strapi: Core.Strapi,
  roleType: 'public' | 'authenticated'
): Promise<{ added: number; revoked: number }> {
  const role = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: roleType } });

  if (!role) {
    strapi.log.warn(`[permissions] no ${roleType} role found; skipping`);
    return { added: 0, revoked: 0 };
  }

  const wanted = actionsForRole(roleType);
  const wantedActions = new Set(wanted);

  // Every permission on the role, not just the ones being asked for — a stale
  // grant is invisible to a query scoped to the wanted list.
  const current = await strapi.db.query('plugin::users-permissions.permission').findMany({
    where: { role: role.id },
    select: ['id', 'action'],
  });
  const held = new Set(current.map((permission) => permission.action));

  const missing = wanted.filter((action) => !held.has(action));
  for (const action of missing) {
    await strapi.db.query('plugin::users-permissions.permission').create({
      data: { action, role: role.id },
    });
  }

  const stale = current.filter(
    (permission) =>
      permission.action.startsWith(OWNED_NAMESPACE) && !wantedActions.has(permission.action)
  );
  for (const permission of stale) {
    await strapi.db
      .query('plugin::users-permissions.permission')
      .delete({ where: { id: permission.id } });
    // Loud on purpose: a revoke is how a hand-edited grant disappears, and the
    // person who ticked it needs to see why the admin panel keeps changing.
    strapi.log.warn(`[permissions] revoked ${roleType}: ${permission.action}`);
  }

  return { added: missing.length, revoked: stale.length };
}

export async function grantPublicReadAccess(strapi: Core.Strapi): Promise<void> {
  const results = [await grant(strapi, 'public'), await grant(strapi, 'authenticated')];

  const added = results.reduce((total, result) => total + result.added, 0);
  const revoked = results.reduce((total, result) => total + result.revoked, 0);

  if (added > 0 || revoked > 0) {
    strapi.log.info(
      `[permissions] granted ${added}, revoked ${revoked} action(s) across roles`
    );
  }
}
