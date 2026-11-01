import type { Core } from '@strapi/strapi';

const allowedMediaTypes = [
  'image/*',
  'video/*',
  'audio/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.*',
  'text/plain',
  'text/csv',
];

const deniedTypes = [
  'image/svg+xml',
  'application/vnd.microsoft.portable-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-sh',
  'text/x-shellscript',
  'application/x-mach-binary',
];

/**
 * Search is registered here rather than reimplemented in the frontend. The
 * previous build proxied a hand-rolled search route through Next.js, which paid
 * an extra network hop per query and could not rank results across types.
 */
const SEARCH_KEYS = {
  university: [
    { name: 'name', weight: 1 },
    { name: 'full_name', weight: 0.6 },
    { name: 'city', weight: 0.3 },
    { name: 'state', weight: 0.2 },
  ],
  program: [
    { name: 'name', weight: 1 },
    { name: 'full_name', weight: 0.6 },
  ],
  examination: [
    { name: 'name', weight: 1 },
    { name: 'full_name', weight: 0.6 },
  ],
  scheme: [
    { name: 'name', weight: 1 },
    { name: 'full_name', weight: 0.6 },
  ],
  course: [
    { name: 'name', weight: 1 },
    { name: 'full_name', weight: 0.6 },
  ],
  blog: [
    { name: 'name', weight: 1 },
    { name: 'description', weight: 0.2 },
  ],
};

const searchableContentTypes = Object.entries(SEARCH_KEYS).map(([model, keys]) => ({
  uid: `api::${model}.${model}`,
  modelName: model,
  transliterate: true,
  fuzzysortOptions: { characterLimit: 300, threshold: 0.5, limit: 10, keys },
}));

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  ...(env('SMTP_HOST') ? {
    email: {
      config: {
        provider: 'nodemailer',
        providerOptions: {
          host: env('SMTP_HOST'),
          port: env.int('SMTP_PORT', 587),
          secure: env.bool('SMTP_SECURE', false),
          requireTLS: env.bool('SMTP_REQUIRE_TLS', true),
          ...(env('SMTP_USERNAME') ? { auth: { user: env('SMTP_USERNAME'), pass: env('SMTP_PASSWORD') } } : {}),
        },
        settings: {
          defaultFrom: env('EMAIL_FROM'),
          defaultReplyTo: env('EMAIL_REPLY_TO', env('EMAIL_FROM')),
        },
      },
    },
  } : {}),
  'strapi-cloud': { enabled: false },
  seo: { enabled: true },
  'fuzzy-search': {
    enabled: true,
    config: { contentTypes: searchableContentTypes },
  },
  'users-permissions': {
    config: {
      jwtManagement: 'refresh',
      sessions: {
        httpOnly: true,
      },
    },
  },
  upload: {
    config: {
      security: {
        allowedTypes: allowedMediaTypes,
        deniedTypes,
      },
    },
  },
});

export default config;
