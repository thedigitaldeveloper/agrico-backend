import type { Core } from '@strapi/strapi';

/** Only explicit operator configuration changes the CMS's recovery email settings. */
export async function configurePasswordRecovery(strapi: Core.Strapi) {
  const configuredUrl = process.env.PASSWORD_RESET_URL?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const replyTo = process.env.EMAIL_REPLY_TO?.trim();
  if (!configuredUrl && !from) return;

  if (from && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(from)) throw new Error('EMAIL_FROM must be a valid sender email address.');
  if (replyTo && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(replyTo)) throw new Error('EMAIL_REPLY_TO must be a valid email address.');

  const store = strapi.store({ type: 'plugin', name: 'users-permissions' });
  if (configuredUrl) {
    const url = new URL(configuredUrl);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash) {
      throw new Error('PASSWORD_RESET_URL must be an HTTPS page URL without credentials, query or fragment (HTTP is allowed on localhost).');
    }
    const advanced = await store.get({ key: 'advanced' }) as Record<string, unknown> | null;
    if (advanced?.email_reset_password !== url.href) {
      await store.set({ key: 'advanced', value: { ...advanced, email_reset_password: url.href } });
    }
  }

  if (from) {
    type EmailTemplate = { options?: Record<string, unknown> & { from?: { email?: string; name?: string } } };
    const settings = await store.get({ key: 'email' }) as Record<string, EmailTemplate> | null;
    const reset = settings?.reset_password;
    if (reset?.options) {
      const options = {
        ...reset.options,
        from: { email: from, name: process.env.EMAIL_FROM_NAME?.trim() || 'Agrico' },
        response_email: replyTo || from,
      };
      if (JSON.stringify(reset.options) !== JSON.stringify(options)) {
        await store.set({ key: 'email', value: { ...settings, reset_password: { ...reset, options } } });
      }
    }
  }
}
