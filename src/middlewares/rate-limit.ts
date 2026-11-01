import type { Core } from '@strapi/strapi';
import type Koa from 'koa';

/**
 * Per-IP rate limiting for the handful of routes the public can write to.
 *
 * State is in-process, which is enough for a single Node instance — the
 * deployment target. If this is ever run as a cluster, each worker would keep
 * its own counter and the effective limit would multiply by the worker count;
 * that is the point to move the window into Redis.
 */

interface Window {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  /** Requests allowed per window. */
  max?: number;
  /** Window length in milliseconds. */
  windowMs?: number;
}

const buckets = new Map<string, Window>();

/**
 * Drops expired entries so the map cannot grow without bound under a spray of
 * one-off addresses. Cheap because it only runs when the map gets large.
 */
function evictExpired(now: number) {
  if (buckets.size < 5_000) return;
  for (const [key, window] of buckets) {
    if (window.resetAt <= now) buckets.delete(key);
  }
}

const rateLimit: Core.MiddlewareFactory<RateLimitConfig> = (config) => {
  const max = config?.max ?? 10;
  const windowMs = config?.windowMs ?? 60_000;

  return async (ctx: Koa.Context, next: Koa.Next) => {
    const now = Date.now();
    evictExpired(now);

    // ctx.ip honours the proxy config in config/server.ts, so this is the real
    // client address behind a reverse proxy rather than the proxy's own.
    const key = `${ctx.ip}:${ctx.path}`;
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    existing.count += 1;

    if (existing.count > max) {
      const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
      ctx.set('Retry-After', String(retryAfter));
      return ctx.tooManyRequests('Too many requests. Please try again shortly.');
    }

    return next();
  };
};

export default rateLimit;
