import type { Core } from '@strapi/strapi';

import { grantPublicReadAccess } from './bootstrap/public-permissions';
import { configurePasswordRecovery } from './bootstrap/password-recovery';

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    strapi.customFields.register({
      name: 'html-css-preview',
      type: 'json',
      inputSize: { default: 12, isResizable: false },
    });
  },

  /**
   * Runs on every boot. Permission granting is idempotent — it only adds actions
   * that are missing — so restarts are safe and a fresh database comes up
   * correctly configured without anyone clicking through the admin panel.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await grantPublicReadAccess(strapi);
    await configurePasswordRecovery(strapi);
  },
};

