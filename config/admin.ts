import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Admin => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET')!,
  },
  apiToken: {
    salt: env('API_TOKEN_SALT')!,
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT')!,
    },
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY')!,
  },
  flags: {
    nps: false,
    promoteEE: false,
    docLinks: false,
  },
  // Explicitly disabled returns 204, hiding the preview setup promotion.
  preview: { enabled: false, config: { handler: () => null } },

  /**
   * Standalone scripts are run by tsx and never bundled into the server.
   * Without this the dev watcher restarts the whole CMS whenever one is edited
   * — and for a script that talks to the running server, that means restarting
   * the thing it is talking to.
   */
  watchIgnoreFiles: ['**/scripts/**', '**/logs/**'],
});

export default config;
