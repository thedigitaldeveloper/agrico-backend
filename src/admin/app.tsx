import type { StrapiApp } from '@strapi/strapi/admin';
import type { ComponentType } from 'react';
import { lightTheme } from '@strapi/design-system';
import type { ContentManagerPlugin } from '@strapi/content-manager/strapi-admin';

import logo from './extensions/logo.png';
import brandMark from './extensions/brand-mark.png';
import { EntryInformation } from './components/EntryInformation';
import { SingleEditor, PUBLICATION_TABS_LABEL } from './components/SingleEditor';

/**
 * Admin panel branding.
 *
 * The people signing in here are the client's admissions staff, not developers.
 * A panel that says "Welcome to Strapi" reads as someone else's software and
 * invites the question of whether they are in the right place at all, so the
 * two logos, the tab title and the handful of Strapi-branded strings are
 * replaced with Agrico's.
 *
 * Only the branding is overridden. Every other string still falls through to
 * Strapi's own translations, so nothing breaks when the CMS is upgraded and new
 * copy appears.
 *
 * Note this file is excluded from the server's TypeScript build (see the
 * `src/admin/` entry in tsconfig.json) — it is compiled by the admin bundler
 * during `strapi build`, which is why the PNG import resolves here and would not
 * in server code.
 */
const rsTheme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    primary100: '#FCFAF5', primary200: '#E6DED5', primary500: '#B34250',
    primary600: '#A22334', primary700: '#882638',
    buttonPrimary500: '#A22334', buttonPrimary600: '#882638',
    neutral0: '#FFFFFF', neutral100: '#FCFAF5', neutral150: '#F2EEE8',
    neutral200: '#E6DED5', neutral700: '#6B6260', neutral800: '#615552',
    neutral900: '#615552', neutral1000: '#615552',
  },
};

export default {
  config: {
    auth: { logo },
    // The approved ivory canvas is retained even for a dark OS preference.
    theme: { light: rsTheme, dark: rsTheme },

    // Sidebar, shown next to the project name on every page.
    menu: { logo: brandMark },

    locales: [],
    tutorials: false,
    notifications: { releases: false },

    translations: {
      en: {
        'content-manager.containers.edit.tabs.label': PUBLICATION_TABS_LABEL,
        'Auth.form.welcome.title': 'Welcome to Agrico',
        'Auth.form.welcome.subtitle': 'Log in to your Agrico account',
        'app.components.LeftMenu.navbrand.title': 'Agrico',
        'app.components.LeftMenu.navbrand.workplace': 'Content Manager',
        'Auth.form.register.subtitle': 'Create your Agrico CMS account.',
        'Auth.form.button.login.strapi': 'Log in to Agrico',
        'Settings.application.strapi-version': 'CMS version',
        'Settings.application.strapiVersion': 'CMS version',
        'Settings.permissions.users.listview.header.subtitle': 'Users with access to the Agrico CMS',
        'tours.overview.subtitle': 'Manage your Agrico content.',
        'components.AutoReloadBlocker.description': 'Start the Agrico CMS with one of the following commands:',
        'app.components.BlockLink.blog.content': 'Read CMS news and updates.',
        'app.components.BlockLink.tutorial.content': 'Learn how to manage your content.',
        'HomePage.widget.deploy-now.description': 'CMS deployment',
      },
    },
  },

  register(app: StrapiApp) {
    app.customFields.register({
      name: 'html-css-preview',
      type: 'json',
      intlLabel: { id: 'rs.html-css-preview.label', defaultMessage: 'HTML & CSS with live preview' },
      intlDescription: { id: 'rs.html-css-preview.description', defaultMessage: 'Write HTML and CSS, then preview desktop and mobile layouts.' },
      components: {
        Input: async () => import('./components/HtmlCssPreviewInput').then((module) => ({ default: module.HtmlCssPreviewInput as unknown as ComponentType })),
      },
    });
  },
  bootstrap(app: StrapiApp) {
    const contentManager = app.getPlugin('content-manager');
    const apis = contentManager.apis as ContentManagerPlugin['config']['apis'];
    apis.addEditViewSidePanel([EntryInformation]);
    // The actions zone is mounted on desktop and in the mobile action header.
    contentManager.injectComponent('editView', 'right-links', {
      name: 'rs-education-single-editor',
      Component: SingleEditor,
    });
    /**
     * The browser tab is the one piece of branding the config above cannot
     * reach. Strapi sets `document.title = \`${title} | Strapi\`` directly on
     * every route change, with no config option or translation key behind it,
     * so it has to be rewritten as it is written.
     *
     * Update branded titles on navigation without changing entry names or
     * triggering a mutation loop once the title already has our brand.
     */
    if (typeof document === 'undefined') return;

    const STRAPI_NAME = /\bStrapi\b/g;

    const rebrandTitle = () => {
      const title = document.title.replace(STRAPI_NAME, 'Agrico');
      if (title !== document.title) document.title = title;
    };

    rebrandTitle();

    // `config.head` is not supported by Strapi 5. Set the actual link element
    // and retain the branded asset when the admin router updates the head.
    const rebrandIcon = () => {
      let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!icon) {
        icon = document.createElement('link');
        icon.rel = 'icon';
        document.head.appendChild(icon);
      }
      if (icon.getAttribute('href') !== brandMark) icon.setAttribute('href', brandMark);
      if (icon.type !== 'image/png') icon.type = 'image/png';
    };
    rebrandIcon();
    // React can replace the title node entirely, so observe the head itself.
    new MutationObserver(() => { rebrandTitle(); rebrandIcon(); }).observe(document.head, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['href', 'rel', 'type'] });
  },
};
