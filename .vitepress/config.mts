import { defineConfig } from 'vitepress'
import {
  addonNav,
  addonSidebar,
  addons,
  documented,
  toolNav,
  toolSidebar,
  tools,
} from './addons.mjs'
import { ART } from './art.generated.mjs'

const BASE_URL = 'https://docs.adriangoldner.dev'

/**
 * The documented entry a source path belongs to, or undefined for the guide and
 * the hub. Tools are in here too: they get the same share image, the same
 * accent colour and the same first-paint treatment as an addon, because none of
 * that machinery cares what kind of package it is looking at.
 */
const addonForPath = (relativePath: string) =>
  documented.find((a) => a.slug === relativePath.split('/')[0])

/** Source path to public URL, matching `cleanUrls: true`. */
const canonicalPath = (relativePath: string) =>
  '/' + relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')

export default defineConfig({
  title: 'Statamic Addons',
  titleTemplate: ':title | goldnead Statamic Addons',
  description:
    'Documentation for the goldnead Statamic addon suite: CRM, marketing, automations, webhooks, activity, notifications and content tooling for Statamic 6.',
  lang: 'en-GB',
  cleanUrls: true,
  lastUpdated: true,

  // Repo docs, not site pages.
  // `EULA.md` is the authoritative licence text and ships with the suite
  // installation rather than as a page of its own. `/guide/suite-eula`
  // includes it, so it appears on the site exactly once.
  // `guide/suite-eula.md` ist ab 05.09.2026 vorerst mit ausgenommen: der Lizenztext ist
  // ein Entwurf, und `STATE/approvals/approval-suite-eula-freigeben.md` in GoldnerOS sagt
  // ausdruecklich, dass er bis zur Freigabe nicht veroeffentlicht wird. Blockierend ist nur
  // noch die fehlende USt-IdNr. Wenn sie da ist: diese Zeile und den Sidebar-Eintrag
  // "Suite EULA (Entwurf)" wieder hereinnehmen, dann ist die Seite live.
  srcExclude: ['README.md', 'EULA.md', 'deploy/**', 'scripts/**', 'guide/suite-eula.md'],
  // Strict by default: a broken internal link fails the build. Set
  // DOCS_ALLOW_DEAD_LINKS=1 while drafting a section whose targets do not exist yet.
  ignoreDeadLinks: process.env.DOCS_ALLOW_DEAD_LINKS === '1',

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'theme-color', content: '#e8b931' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'goldnead Statamic Addons' }],
    // Every page now has a 1200x630 share image, so the small card is a waste.
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ],

  sitemap: { hostname: BASE_URL },

  /**
   * The share image is the addon's own cover, straight out of its repo. Pages
   * that belong to no single addon get the suite cover.
   */
  transformHead({ pageData, title, description }) {
    const addon = addonForPath(pageData.relativePath)
    // An addon documented before its cover exists falls back to the suite
    // image. Naming a file that 404s would be worse than being generic: a
    // shared link would render with no image at all.
    const image =
      addon && ART[addon.slug]
        ? `${BASE_URL}/art/${addon.slug}/cover.png`
        : `${BASE_URL}/art/suite-cover.png`

    // `description` has already fallen back to the site description by the time
    // it gets here, which on an addon page is the least useful of the three
    // things available. The addon's own tagline is what a shared link should say.
    const summary = pageData.description || addon?.tagline || description

    return [
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: summary }],
      ['meta', { property: 'og:url', content: BASE_URL + canonicalPath(pageData.relativePath) }],
      ['meta', { property: 'og:image', content: image }],
      ['meta', { property: 'og:image:width', content: '1200' }],
      ['meta', { property: 'og:image:height', content: '630' }],
      ['meta', { name: 'twitter:image', content: image }],
      ['meta', { name: 'twitter:image:alt', content: addon && ART[addon.slug] ? `${addon.name}: ${addon.tagline}` : 'goldnead Statamic addons' }],
    ]
  },

  /**
   * Stamp the addon onto <html> at build time.
   *
   * `theme/Layout.vue` keeps this in step during client-side navigation, but it
   * cannot help the first paint: by the time Vue hydrates, the page has already
   * been drawn once. Doing it here means a reader never sees a page flip from
   * gold to the addon's colour, and a reader with JavaScript off still gets it.
   */
  transformHtml(code, _id, { page }) {
    const addon = addonForPath(page)
    if (!addon) return

    return code.replace(/<html(\s[^>]*)?>/, `<html$1 data-addon="${addon.slug}">`)
  },

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
      { text: 'Tools', items: toolNav() },
      {
        text: 'Reference',
        items: [
          { text: 'Suite overview', link: '/guide/suite' },
          { text: 'How far along each addon is', link: '/guide/maturity' },
          { text: 'The commerce suite', link: '/guide/commerce' },
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
            { text: 'Maturity: what is proven', link: '/guide/maturity' },
            { text: 'How this is built', link: '/guide/how-this-is-built' },
            { text: 'The commerce suite', link: '/guide/commerce' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'The demo playground', link: '/guide/demo' },
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
        {
          text: 'Verkauf in Deutschland',
          items: [
            // Suite EULA (Entwurf) — bis zur Freigabe ausgeblendet, siehe srcExclude oben.
            { text: 'AVV-Baustein (Entwurf)', link: '/guide/avv-baustein' },
            { text: 'Pflichtangaben (Entwurf)', link: '/guide/pflichtangaben' },
          ],
        },
      ],
      ...Object.fromEntries(addons.map((a) => [`/${a.slug}/`, addonSidebar(a)])),
      ...Object.fromEntries(tools.map((t) => [`/${t.slug}/`, toolSidebar(t)])),
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
