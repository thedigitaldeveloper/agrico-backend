import { factories } from '@strapi/strapi';

/**
 * All five actions stay generated so Strapi registers their permissions, but
 * every one is overridden in the controller to scope to the signed-in user.
 */
export default factories.createCoreRouter('api::session-booking.session-booking');
