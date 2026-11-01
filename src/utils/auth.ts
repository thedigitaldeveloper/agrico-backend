import type Koa from 'koa';

/**
 * Row-level authorization helpers.
 *
 * Strapi's role permissions are per-*action* — "an authenticated user may call
 * find on session-booking" — not per-row. On their own they would let any
 * signed-in student list every other student's bookings. Ownership is therefore
 * enforced in the controllers, using these.
 */

export interface AuthUser {
  id: number;
  documentId: string;
  username: string;
  email: string;
}

export type AuthContext = Koa.Context & {
  params: Record<string, string>;
  query: Record<string, unknown>;
  state: { user?: AuthUser | null; auth?: unknown };
  request: { body?: { data?: Record<string, unknown> } };
  badRequest: (message?: string) => unknown;
  unauthorized: (message?: string) => unknown;
  forbidden: (message?: string) => unknown;
  notFound: (message?: string) => unknown;
};

/** The signed-in user, or null for an anonymous request. */
export function currentUser(ctx: AuthContext): AuthUser | null {
  return ctx.state.user ?? null;
}

/**
 * The mentor profile belonging to the signed-in user, if they have one.
 *
 * Being a mentor is expressed by owning a mentor-profile rather than by a role
 * flag, so there is one source of truth and no way for the two to disagree.
 */
export async function mentorProfileFor(
  userId: number
): Promise<{ documentId: string } | null> {
  const [profile] = await strapi
    .documents('api::mentor-profile.mentor-profile')
    .findMany({
      filters: { user: { id: userId } } as never,
      // A mentor must be able to manage bookings before their public profile is
      // published, so drafts count here.
      status: 'draft',
      limit: 1,
    });

  // Only documentId is returned: Strapi's numeric `id` differs between the
  // draft and published rows of the same document, so it is the wrong handle
  // to compare relations by.
  return profile ? { documentId: profile.documentId } : null;
}

/** Trims a string field to a maximum length, or returns undefined if blank. */
export function text(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

/** Reads a positive integer within bounds, or undefined. */
export function boundedInt(value: unknown, min: number, max: number): number | undefined {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return undefined;
  if (parsed < min || parsed > max) return undefined;
  return Math.trunc(parsed);
}
