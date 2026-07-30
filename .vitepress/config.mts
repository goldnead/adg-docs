import { defineConfig } from 'vitepress'
import { addons, addonNav, addonSidebar } from './addons.mjs'

const BASE_URL = 'https://docs.adriangoldner.dev'

export default defineConfig({
  title: 'Statamic Addons',
  titleTemplate: ':title | goldnead Statamic Addons',
  description:
    'Documentation for the goldnead Statamic addon suite: CRM, marketing, automations, webhooks, activity, notifications and content tooling for Statamic 6.',
  lang: 'en-GB',
  cleanUrls: true,
  lastUpdated: true,

  // Repo docs, not site pages.
  srcExclude: ['README.md', 'deploy/**', 'scripts/**'],
  // Strict by default: a broken internal link fails the build. Set
  // DOCS_ALLOW_DEAD_LINKS=1 while drafting a section whose targets do not exist yet.
  ignoreDeadLinks: process.env.DOCS_ALLOW_DEAD_LINKS === '1',

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'theme-color', content: '#e8b931' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'goldnead Statamic Addons' }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
  ],

  sitemap: { hostname: BASE_URL },

  markdown: {
    lineNumbers: false,
    theme: { light: 'github-light', dark: 'github-dark' },
    // Antlers is not a Shiki grammar. Handlebars is the closest fit: it
    // highlights `{{ … }}` inside HTML, which is what Antlers looks like.
    languageAlias: {
      antlers: 'handlebars',
      blade: 'php',
    },
    config(md) {
      // Antlers and Blade both use `{{ … }}`, which the Vue compiler would treat
      // as an interpolation. VitePress applies `v-pre` to fenced code blocks but
      // not to inline code, so `` `{{ entry:title }}` `` breaks the build. Mark
      // every inline code span `v-pre` and the problem disappears everywhere at
      // once, instead of being escaped by hand on every page.
      const inline = md.renderer.rules.code_inline
      md.renderer.rules.code_inline = (tokens, idx, options, env, self) => {
        const rendered = inline
          ? inline(tokens, idx, options, env, self)
          : `<code>${md.utils.escapeHtml(tokens[idx].content)}</code>`
        return rendered.replace(/^<code(\s|>)/, '<code v-pre$1')
      }
    },
  },

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'Statamic Addons',

    nav: [
      { text: 'Guide', link: '/guide/', activeMatch: '/guide/' },
      { text: 'Addons', items: addonNav() },
      {
        text: 'Reference',
        items: [
          { text: 'Suite overview', link: '/guide/suite' },
          { text: 'Compatibility matrix', link: '/guide/compatibility' },
          { text: 'Choosing an addon', link: '/guide/choosing' },
          { text: 'Glossary', link: '/guide/glossary' },
        ],
      },
      { text: 'Support', link: '/guide/support' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting started',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'The suite', link: '/guide/suite' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Choosing an addon', link: '/guide/choosing' },
            { text: 'Compatibility', link: '/guide/compatibility' },
          ],
        },
        {
          text: 'Cross-cutting concepts',
          items: [
            { text: 'Brands & multi-tenancy', link: '/guide/brands' },
            { text: 'Identity', link: '/guide/identity' },
            { text: 'Storage drivers', link: '/guide/storage' },
            { text: 'Queues & scheduling', link: '/guide/queues' },
            { text: 'Permissions', link: '/guide/permissions' },
            { text: 'Extending the suite', link: '/guide/extending' },
            { text: 'Privacy & retention', link: '/guide/privacy' },
          ],
        },
        {
          text: 'Operating',
          items: [
            { text: 'Boundaries: who owns what', link: '/guide/boundaries' },
            { text: 'Upgrading', link: '/guide/upgrading' },
            { text: 'Troubleshooting', link: '/guide/troubleshooting' },
            { text: 'Licensing', link: '/guide/licensing' },
            { text: 'Support', link: '/guide/support' },
            { text: 'Glossary', link: '/guide/glossary' },
          ],
        },
      ],
      ...Object.fromEntries(addons.map((a) => [`/${a.slug}/`, addonSidebar(a)])),
    },

    outline: { level: [2, 3], label: 'On this page' },

    socialLinks: [{ icon: 'github', link: 'https://github.com/goldnead' }],

    editLink: {
      pattern: 'https://github.com/goldnead/adg-docs/edit/main/:path',
      text: 'Suggest a change to this page',
    },

    search: {
      provider: 'local',
      options: {
        detailedView: true,
      },
    },

    footer: {
      message:
        'Built by <a href="https://gldnr.studio">gldnr.studio</a>. Statamic is a trademark of Wilderborn.',
      copyright: `© ${new Date().getFullYear()} Adrian Goldner`,
    },

    docFooter: { prev: 'Previous', next: 'Next' },
    darkModeSwitchLabel: 'Appearance',
    returnToTopLabel: 'Back to top',
    externalLinkIcon: true,
  },
})
