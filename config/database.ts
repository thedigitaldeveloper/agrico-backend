import type { Core } from '@strapi/strapi';

/**
 * SQLite is deliberately not an option here.
 *
 * Strapi ships it as the default, and that default is a trap for a deployed
 * site: it stores the whole database in a file inside the app directory, so a
 * host that rebuilds the app on deploy silently starts from an empty database
 * every release. Every lead captured since the last deploy is gone, and nothing
 * errors — the CMS comes up perfectly happy and simply has no content, which
 * reads as "the import failed" rather than "the database was replaced".
 *
 * Worse, it used to be the fallback: one unset DATABASE_CLIENT in production and
 * the site quietly served an empty catalogue off .tmp/data.db while the real
 * MySQL database sat untouched. Removing it entirely is the only version of this
 * guard that cannot be skipped by forgetting a variable.
 */
const SUPPORTED_CLIENTS = ['mysql', 'postgres'] as const;

type SupportedClient = (typeof SUPPORTED_CLIENTS)[number];

function isSupported(value: string): value is SupportedClient {
  return SUPPORTED_CLIENTS.includes(value as SupportedClient);
}

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Database => {
  // Defaults to mysql rather than throwing: it is what every environment of
  // this project actually runs, so an unset variable lands on the right database
  // instead of on a surprise.
  const client = env('DATABASE_CLIENT', 'mysql');

  if (!isSupported(client)) {
    throw new Error(
      client === 'sqlite'
        ? 'DATABASE_CLIENT=sqlite is not supported. SQLite keeps the database in ' +
          'a file inside the app directory, which a redeploy replaces — every ' +
          'lead and content edit would be lost with no error to show for it. ' +
          'Use "mysql" (or "postgres").'
        : `Unsupported DATABASE_CLIENT: ${client}. Use "mysql" or "postgres".`
    );
  }

  const connections: Record<SupportedClient, Core.Config.Database['connection']> = {
    mysql: {
      client: 'mysql',
      connection: {
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 3306),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false) && {
          key: env('DATABASE_SSL_KEY', undefined),
          cert: env('DATABASE_SSL_CERT', undefined),
          ca: env('DATABASE_SSL_CA', undefined),
          capath: env('DATABASE_SSL_CAPATH', undefined),
          cipher: env('DATABASE_SSL_CIPHER', undefined),
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
      },
      pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
    },
    postgres: {
      client: 'postgres',
      connection: {
        connectionString: env('DATABASE_URL'),
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false) && {
          key: env('DATABASE_SSL_KEY', undefined),
          cert: env('DATABASE_SSL_CERT', undefined),
          ca: env('DATABASE_SSL_CA', undefined),
          capath: env('DATABASE_SSL_CAPATH', undefined),
          cipher: env('DATABASE_SSL_CIPHER', undefined),
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
        schema: env('DATABASE_SCHEMA', 'public'),
      },
      pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
    },
  };

  return {
    connection: {
      ...connections[client],
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
    },
  };
};

export default config;
