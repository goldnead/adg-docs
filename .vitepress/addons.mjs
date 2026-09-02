/**
 * Single source of truth for the addon registry.
 *
 * Every addon gets the same page skeleton, so a reader who learned one addon's
 * documentation already knows where to look in the next one:
 *
 *   <Addon>   → Overview, Installation, Configuration
 *   Guides    → the addon's own subject matter
 *   Reference → Reference (commands, events, permissions, API), Troubleshooting, Changelog
 *
 * `pages` lists only the middle, addon-specific block. The two fixed blocks are
 * generated in `addonSidebar()`, which is what keeps the sections uniform.
 *
 * `statamic` and `php` are the chips `AddonHeader.vue` renders. They used to be
 * hardcoded in that component, which quietly made four claims that were not
 * true: Table of Contents also runs on Statamic 5, Identity Contracts needs no
 * Statamic at all, Suppression only inherits it through Brand Context, and
 * Notifications needs PHP 8.3 rather than 8.2. Both fields default to the
 * common case, so only the exceptions carry a value.
 */

/** Chip defaults, overridden per addon where the package disagrees. */
export const STATAMIC_DEFAULT = 'Statamic 6'
export const PHP_DEFAULT = 'PHP 8.2+'

export const LAYERS = {
  foundation: 'Foundation',
  integration: 'Integration & automation',
  crm: 'CRM & marketing',
  platform: 'Platform services',
  commerce: 'Commerce',
  content: 'Content tooling',
}

/**
 * How far along each addon is.
 *
 * The suite reads finished. It is not: twenty-four packages went public inside
 * five weeks, sixteen of them are declared commercial, and exactly one can be
 * bought. A reader deciding whether to put one of these on a client site has no
 * way to tell a package that has run several brands for months from one that
 * has never been installed anywhere. That difference is the single most useful
 * thing this site can tell them, so it is stated on every card and every page.
 *
 * Kept as one map rather than a field per entry on purpose: the whole picture
 * has to be readable on one screen, or it drifts the first time it is wrong.
 */
export const MATURITY = {
  proven: {
    label: 'Proven',
    short: 'Running on live sites for months.',
  },
  new: {
    label: 'New',
    short:
      'In production, but only weeks old. Expect rough edges and fast-moving releases.',
  },
  experimental: {
    label: 'Experimental',
    short: 'Not proven on a production site. Read the note before you depend on it.',
  },
}

/** Slug → level. */
export const MATURITY_BY_SLUG = {
  // Proven — months of production use across several brands.
  leadhub: 'proven',
  marketing: 'proven',
  automations: 'proven',
  'webhook-manager': 'proven',
  'brand-context': 'proven',
  activity: 'proven',
  notifications: 'proven',
  'preference-center': 'proven',
  'email-templates': 'proven',
  toc: 'proven',
  'lead-magnets': 'proven',

  // New — installed and working, but shipped in August 2026.
  payments: 'new',
  offers: 'new',
  invoices: 'new',
  funnels: 'new',
  products: 'new',
  entitlements: 'new',
  suppression: 'new',
  'identity-contracts': 'new',
  consent: 'new',
  insights: 'new',
  clientrooms: 'new',

  // Experimental — see the notes.
  assessments: 'experimental',
  booking: 'experimental',
  'flow-canvas': 'experimental',
  events: 'experimental',
}

/** The exceptions a one-word level would misrepresent. */
export const MATURITY_NOTES = {
  assessments:
    'Built on 2 September 2026 and exercised only in the playground. Nothing here has been answered by a real visitor yet.',
  booking:
    'Tagged and on Packagist, but installed on no site yet. Nothing here has been exercised by a real booking.',
  'flow-canvas':
    'Carries no test suite and no CI of its own, although Automations and Funnels both build on it and are covered. Treat a change here as unverified until those two have been run against it.',
  events:
    'Installed, but not yet driving a live event. The publishing side is exercised; attendance and reminders are not.',
}

export const maturityOf = (slug) => MATURITY_BY_SLUG[slug] ?? null

export const addons = [
  {
    slug: 'brand-context',
    name: 'Brand Context',
    package: 'goldnead/statamic-brand-context',
    layer: 'foundation',
    license: 'MIT',
    tagline:
      'Optional multi-brand foundation. Single-brand by default, hard isolation behind a flag.',
    icon: '◧',
    pages: [
      { text: 'Concepts', link: 'concepts' },
      { text: 'Scoping models', link: 'scoping' },
      { text: 'Brand members', link: 'members' },
      { text: 'Public routes', link: 'public-routes' },
      { text: 'Extension points', link: 'extending' },
    ],
  },
  {
    slug: 'identity-contracts',
    name: 'Identity Contracts',
    package: 'goldnead/statamic-identity-contracts',
    layer: 'foundation',
    license: 'MIT',
    tagline:
      'One stable answer to "who did this?", so addons never depend on your User model.',
    icon: '◍',
    statamic: 'Laravel only',
    troubleshooting: false,
    pages: [
      { text: 'The Identity object', link: 'identity-object' },
      { text: 'Resolving an actor', link: 'resolving' },
      { text: 'Extension points', link: 'extending' },
    ],
  },
  {
    slug: 'suppression',
    name: 'Suppression',
    package: 'goldnead/statamic-suppression',
    layer: 'foundation',
    license: 'MIT',
    tagline:
      'The authoritative answer to "may we send to this address at all?", shared by every addon that queues mail.',
    icon: '⊘',
    statamic: 'Statamic 6, via Brand Context',
    troubleshooting: false,
    pages: [
      { text: 'Asking the gate', link: 'gate' },
      { text: 'Recording and releasing', link: 'recording' },
      { text: 'Brands and scope', link: 'brands' },
      { text: 'Extension points', link: 'extending' },
    ],
  },
  {
    slug: 'webhook-manager',
    name: 'Webhook Manager',
    package: 'goldnead/statamic-webhook-manager',
    layer: 'integration',
    license: 'Commercial',
    tagline:
      'Outbound hooks, inbound endpoints, deliveries, retries, replays and rules in the Control Panel.',
    icon: '⇄',
    pages: [
      { text: 'Concepts', link: 'concepts' },
      { text: 'Outbound webhooks', link: 'outbound' },
      { text: 'Payload templates', link: 'templates' },
      { text: 'Authentication & signing', link: 'auth' },
      { text: 'Deliveries, retries & replay', link: 'deliveries' },
      { text: 'Inbound endpoints', link: 'inbound' },
      { text: 'Rules', link: 'rules' },
      { text: 'Storage drivers', link: 'storage' },
      { text: 'Extending', link: 'extending' },
    ],
  },
  {
    slug: 'automations',
    name: 'Automations',
    package: 'goldnead/statamic-automations',
    layer: 'integration',
    license: 'Commercial',
    tagline:
      'A visual workflow builder for Statamic forms, entries, leads and webhooks.',
    icon: '⌥',
    pages: [
      { text: 'Concepts', link: 'concepts' },
      { text: 'Building an automation', link: 'building' },
      { text: 'Node catalogue', link: 'nodes' },
      { text: 'Runs & debugging', link: 'runs' },
      { text: 'Templates', link: 'templates' },
      { text: 'Export, import & file sync', link: 'export-import' },
      { text: 'Integrations', link: 'integrations' },
      { text: 'Extending', link: 'extending' },
    ],
  },
  {
    slug: 'leadhub',
    name: 'LeadHub',
    package: 'goldnead/statamic-leadhub',
    layer: 'crm',
    license: 'Commercial',
    tagline:
      'Turn form submissions into contacts, timelines, pipelines and follow-ups inside the CP.',
    icon: '◎',
    pages: [
      { text: 'Concepts', link: 'concepts' },
      { text: 'Forms & contacts', link: 'contacts' },
      { text: 'Timelines & events', link: 'timelines' },
      { text: 'Assignment & notifications', link: 'assignment' },
      { text: 'Ingestion API', link: 'ingestion' },
      { text: 'Pipelines & tasks', link: 'pipelines' },
      { text: 'Segments', link: 'segments' },
      { text: 'Lead scoring', link: 'scoring' },
      { text: 'CRM connectors', link: 'crm-connectors' },
      { text: 'Storage drivers', link: 'storage' },
      { text: 'Extending', link: 'extending' },
    ],
  },
  {
    slug: 'marketing',
    name: 'Marketing',
    package: 'goldnead/statamic-marketing',
    layer: 'crm',
    license: 'Commercial',
    tagline:
      'Lists, double opt-in, campaigns, sending and tracking on top of LeadHub contacts.',
    icon: '✉',
    pages: [
      { text: 'Concepts', link: 'concepts' },
      { text: 'Lists & subscriptions', link: 'lists' },
      { text: 'Front-end forms', link: 'forms' },
      { text: 'Campaigns & broadcasts', link: 'campaigns' },
      { text: 'Sequences', link: 'sequences' },
      { text: 'Sending', link: 'sending' },
      { text: 'Tracking', link: 'tracking' },
      { text: 'Unsubscribes & suppression', link: 'suppression' },
      { text: 'Sending to a segment', link: 'segments' },
      { text: 'Extending', link: 'extending' },
    ],
  },
  {
    slug: 'preference-center',
    name: 'Preference Center',
    package: 'goldnead/statamic-preference-center',
    layer: 'crm',
    license: 'MIT',
    tagline:
      'One public page for lists, notification types, cadence and blocks. No account, no Control Panel.',
    icon: '☑',
    pages: [
      { text: 'The page', link: 'the-page' },
      { text: 'Magic links', link: 'magic-links' },
      { text: 'Sources', link: 'sources' },
      { text: 'Extending', link: 'extending' },
      { text: 'Migrating from Marketing', link: 'migrating-from-marketing' },
    ],
  },
  {
    slug: 'lead-magnets',
    name: 'Lead Magnets',
    package: 'goldnead/statamic-lead-magnets',
    layer: 'crm',
    license: 'Commercial',
    tagline:
      'Confirm-first resource delivery: ask for a file, confirm the address, download through a signed and audited link.',
    icon: '↧',
    pages: [
      { text: 'Concepts', link: 'concepts' },
      { text: 'The request flow', link: 'request-flow' },
      { text: 'Grant state', link: 'grant-state' },
      { text: 'Delivery & downloads', link: 'delivery' },
      { text: 'Bridges', link: 'bridges' },
      { text: 'Extending', link: 'extending' },
    ],
  },
  {
    slug: 'assessments',
    name: 'Assessments',
    package: 'goldnead/statamic-assessments',
    layer: 'crm',
    license: 'Commercial',
    tagline:
      'A questionnaire with points per answer and result levels by score. The result becomes a contact event and an automation trigger.',
    icon: '☑',
    pages: [
      { text: 'Questions and levels', link: 'scoring' },
      { text: 'The public pages and tags', link: 'templates' },
      { text: 'Contact event and trigger', link: 'integrations' },
    ],
  },
  {
    slug: 'email-templates',
    name: 'Email Templates',
    package: 'goldnead/statamic-email-templates',
    layer: 'crm',
    license: 'Commercial',
    tagline:
      'Bard-authored email templates in a shared collection, consumed by Marketing and Automations.',
    icon: '▤',
    troubleshooting: false,
    pages: [
      { text: 'Authoring a template', link: 'authoring' },
      { text: 'Merge variables', link: 'merge-variables' },
      { text: 'Live Preview', link: 'live-preview' },
      { text: 'Importing & consuming', link: 'importing' },
    ],
  },
  {
    slug: 'activity',
    name: 'Activity',
    package: 'goldnead/statamic-activity',
    layer: 'platform',
    license: 'MIT',
    tagline:
      'An immutable, brand-scoped ledger of what happened. Facts only, no dashboards.',
    icon: '≡',
    pages: [
      { text: 'Concepts', link: 'concepts' },
      { text: 'Recording facts', link: 'recording' },
      { text: 'Producers', link: 'producers' },
      { text: 'Querying', link: 'querying' },
      { text: 'Privacy & retention', link: 'privacy' },
    ],
  },
  {
    slug: 'notifications',
    name: 'Notifications',
    package: 'goldnead/statamic-notifications',
    layer: 'platform',
    license: 'MIT',
    tagline:
      'Persisted notifications with per-type preferences, in-app, mail and deduplicated digests.',
    icon: '◈',
    php: 'PHP 8.3+',
    pages: [
      { text: 'Concepts', link: 'concepts' },
      { text: 'Notifying', link: 'notifying' },
      { text: 'Types', link: 'types' },
      { text: 'Preferences', link: 'preferences' },
      { text: 'Channels & digests', link: 'digests' },
      { text: 'Realtime', link: 'realtime' },
      { text: 'Laravel interop', link: 'laravel-interop' },
    ],
  },
  {
    slug: 'entitlements',
    name: 'Entitlements',
    package: 'goldnead/statamic-entitlements',
    layer: 'platform',
    license: 'MIT',
    tagline:
      'Who may access what: one state machine, idempotency enforced by the database, and a revocation you can audit.',
    icon: '⊙',
    pages: [
      { text: 'Concepts', link: 'concepts' },
      { text: 'Granting & revoking', link: 'granting' },
      { text: 'The state machine', link: 'states' },
      { text: 'Extending', link: 'extending' },
    ],
  },
  {
    slug: 'events',
    name: 'Events',
    package: 'goldnead/statamic-events',
    layer: 'content',
    license: 'Commercial',
    tagline:
      'Events with any number of dates, per-event timezones, venues, ICS downloads and a subscribable feed.',
    icon: '◷',
    pages: [
      { text: 'Concepts', link: 'concepts' },
      { text: 'Visibility', link: 'visibility' },
      { text: 'Timezones', link: 'timezones' },
      { text: 'Calendar feeds & ICS', link: 'calendar-feeds' },
      { text: 'Antlers tags', link: 'tags' },
      { text: 'Extending', link: 'extending' },
    ],
  },
  {
    slug: 'toc',
    name: 'Table of Contents',
    package: 'goldnead/statamic-toc',
    layer: 'content',
    license: 'Commercial',
    tagline: 'Automatic table of contents for Bard, Markdown and any HTML content.',
    icon: '⌗',
    statamic: 'Statamic 5 or 6',
    troubleshooting: false,
    pages: [
      { text: 'The toc tag', link: 'tag' },
      { text: 'The toc modifier', link: 'modifier' },
      { text: 'Blueprint setup', link: 'blueprints' },
      { text: 'Recipes', link: 'recipes' },
    ],
  },
  {
    slug: 'payments',
    name: 'Payments',
    package: 'goldnead/statamic-payments',
    license: 'Commercial',
    layer: 'commerce',
    tagline:
      'Take payments with Mollie — and never believe the caller. Subscriptions, instalments and trials included.',
    icon: '⬢',
    pages: [
      { text: 'Products and the catalogue', link: 'catalogue' },
      { text: 'Starting a checkout', link: 'checkout' },
      { text: 'Reacting to a payment', link: 'events' },
      { text: 'Bumps and follow-up offers', link: 'bumps' },
      { text: 'Subscriptions, plans and trials', link: 'subscriptions' },
      { text: 'Refunds', link: 'refunds' },
      { text: 'Abandoned checkouts', link: 'abandoned' },
      { text: 'Payment methods', link: 'payment-methods' },
      { text: 'The detail page and the communication log', link: 'communications' },
      { text: 'Tax facts and retention', link: 'tax-and-retention' },
      { text: 'Consent, withdrawal and cancellation', link: 'recht' },
    ],
  },
  {
    slug: 'products',
    name: 'Products',
    package: 'goldnead/statamic-products',
    license: 'Commercial',
    layer: 'commerce',
    tagline:
      'The thing that is sold: a name, a list price, and the access a paid copy opens.',
    icon: '▣',
    pages: [
      { text: 'What a product is', link: 'concepts' },
      { text: 'The kind and the pointer', link: 'kinds' },
      { text: 'The handle is a promise', link: 'handles' },
      { text: 'In the payment catalogue', link: 'catalogue' },
    ],
  },
  {
    slug: 'insights',
    name: 'Insights',
    package: 'goldnead/statamic-insights',
    license: 'Commercial',
    layer: 'commerce',
    tagline:
      'The reporting layer for the suite. Fourteen addons contribute the figures; this one owns the period, the chart and the screens.',
    icon: '◫',
    pages: [
      { text: 'What the family reports', link: 'what-the-family-reports' },
      { text: 'Reading the numbers', link: 'reading-the-numbers' },
      { text: 'Contributing a metric', link: 'contributing-a-metric' },
      { text: 'On the contact screen', link: 'contact-panel' },
    ],
  },
  {
    slug: 'offers',
    name: 'Offers',
    package: 'goldnead/statamic-offers',
    license: 'Commercial',
    layer: 'commerce',
    tagline:
      'A product, a price of its own, the words that sell it, and where it appears.',
    icon: '◈',
    pages: [
      { text: 'An offer is not a product', link: 'concepts' },
      { text: 'The price rule', link: 'price-rule' },
      { text: 'Bumps', link: 'bumps' },
      { text: 'Coupons', link: 'coupons' },
      { text: 'In a template', link: 'templates' },
    ],
  },
  {
    slug: 'invoices',
    name: 'Invoices',
    package: 'goldnead/statamic-invoices',
    license: 'Commercial',
    layer: 'commerce',
    tagline:
      'An invoice from a payment: a gapless number, VAT by country, reverse charge.',
    icon: '▤',
    pages: [
      { text: 'The number', link: 'numbering' },
      { text: 'VAT, reverse charge, small business', link: 'vat' },
      { text: 'An invoice does not change', link: 'immutability' },
      { text: 'Credit notes and refunds', link: 'credit-notes' },
      { text: 'Delivery and storage', link: 'delivery' },
    ],
  },
  {
    slug: 'funnels',
    name: 'Funnels',
    package: 'goldnead/statamic-funnels',
    license: 'Commercial',
    layer: 'commerce',
    tagline:
      'A path a visitor walks: pages, forms, offers and payments in one flow, drawn on a canvas.',
    icon: '⤳',
    pages: [
      { text: 'A funnel is not an automation', link: 'concepts' },
      { text: 'The five kinds of step', link: 'steps' },
      { text: 'Landing pages from entries', link: 'landing-pages' },
      { text: 'Deadlines and split tests', link: 'deadlines-and-tests' },
      { text: 'Where people stop', link: 'analytics' },
    ],
  },
  {
    slug: 'booking',
    name: 'Booking',
    package: 'goldnead/statamic-booking',
    license: 'Commercial',
    layer: 'platform',
    tagline:
      'Records Cal.com bookings in Statamic — signed, idempotent, and out of your way.',
    icon: '◷',
    pages: [
      { text: 'Why it does not build a calendar', link: 'concepts' },
      { text: 'Endpoints and Cal.com setup', link: 'endpoints' },
      { text: 'Reacting to a booking', link: 'events' },
      { text: 'What it stores', link: 'storage' },
    ],
  },
  {
    slug: 'clientrooms',
    name: 'Client Rooms',
    package: 'goldnead/statamic-clientrooms',
    license: 'Commercial',
    layer: 'platform',
    tagline:
      'One lasting room per coaching client: tasks, shared documents, the timeline and notes, opened by the first purchase.',
    icon: '◫',
    // Configuration is on the installation page; there is not enough of it
    // for a page of its own. Nothing has gone wrong in the field yet, so
    // there is no troubleshooting page to write honestly.
    configuration: false,
    troubleshooting: false,
    pages: [{ text: 'What a room is', link: 'concepts' }],
  },
  {
    slug: 'consent',
    name: 'Consent',
    package: 'goldnead/statamic-consent',
    license: 'Commercial',
    layer: 'content',
    tagline:
      'Cookie banner and two-click embed gate, editable in the Control Panel. Antlers, no build step.',
    icon: '◱',
    pages: [
      { text: 'The banner', link: 'banner' },
      { text: 'The two-click embed gate', link: 'embeds' },
      { text: 'When there is nothing to ask', link: 'nothing-to-ask' },
      { text: 'Proof of consent', link: 'proof' },
    ],
  },
  {
    slug: 'flow-canvas',
    name: 'Flow Canvas',
    package: 'goldnead/statamic-flow-canvas',
    layer: 'platform',
    license: 'MIT',
    tagline:
      'The shared node-graph editor behind Automations and Funnels. One editor, consumed twice.',
    icon: '◇',
    pages: [
      { text: 'What is in here, and what is not', link: 'concepts' },
      { text: 'Kinds are data', link: 'kinds' },
      { text: 'Using it in your own addon', link: 'consuming' },
    ],
  },
]

/**
 * Repos documented here that are not Statamic addons.
 *
 * They share exactly two things with the suite: the art pipeline and the page
 * chrome. They deliberately do not share the addon page skeleton — a tool has
 * no Composer package, no Statamic version, and nothing to configure — so
 * `toolSidebar()` lists `pages` as given instead of wrapping them in
 * Installation/Configuration/Reference.
 *
 * `repo` is the field that keeps the sync scripts honest. Everything in
 * `addons` lives in a sibling directory called `statamic-<slug>`; a tool does
 * not, and `repoDir()` is the only place that difference is decided.
 */
export const tools = [
  {
    slug: 'block-editor',
    name: 'Block Editor',
    repo: 'block-editor',
    kind: 'tool',
    license: 'MIT',
    source: 'https://github.com/goldnead/block-editor',
    stack: 'React 19',
    /**
     * The tool ships a runnable demo. `scripts/sync-playground.mjs` copies its
     * build output to `public/playground/<slug>/`, next to the page that mounts
     * it, and `<Playground>` embeds that page in an iframe.
     */
    playground: true,
    tagline:
      'A Notion-style block editor that reads and writes plain Markdown, and embeds into any page as two files.',
    pages: [
      { text: 'Overview', link: '' },
      { text: 'Playground', link: 'playground' },
      { text: 'Embedding', link: 'embedding' },
      { text: 'Mount API', link: 'api' },
      { text: 'Blocks & Markdown', link: 'markdown' },
      { text: 'Changelog', link: 'changelog' },
    ],
  },
]

/** Everything with art and a changelog: addons and tools alike. */
export const documented = [...addons, ...tools]

/** The sibling directory a documented entry's repo is checked out into. */
export const repoDir = (entry) => entry.repo ?? `statamic-${entry.slug}`

export const entryBySlug = (slug) => documented.find((e) => e.slug === slug)

export const addonBySlug = (slug) => addons.find((a) => a.slug === slug)

export const addonsByLayer = () =>
  Object.entries(LAYERS).map(([key, text]) => ({
    key,
    text,
    addons: addons.filter((a) => a.layer === key),
  }))

/** Nav dropdown, grouped by layer in dependency order. */
export function addonNav() {
  return addonsByLayer().map(({ text, addons: items }) => ({
    text,
    items: items.map((a) => ({ text: a.name, link: `/${a.slug}/` })),
  }))
}

/** Uniform sidebar for one addon. */
export function addonSidebar(addon) {
  const base = `/${addon.slug}/`

  return [
    {
      text: addon.name,
      items: [
        { text: 'Overview', link: base },
        { text: 'Installation', link: `${base}installation` },
        addon.configuration !== false && {
          text: 'Configuration',
          link: `${base}configuration`,
        },
      ].filter(Boolean),
    },
    {
      text: 'Guides',
      items: addon.pages.map((p) => ({ text: p.text, link: `${base}${p.link}` })),
    },
    {
      text: 'Reference',
      items: [
        { text: 'Reference', link: `${base}reference` },
        addon.troubleshooting !== false && {
          text: 'Troubleshooting',
          link: `${base}troubleshooting`,
        },
        { text: 'Changelog', link: `${base}changelog` },
        { text: 'All addons', link: '/guide/suite' },
      ].filter(Boolean),
    },
  ]
}

/** Nav dropdown for the tools. Flat: there are too few to group. */
export function toolNav() {
  return tools.map((t) => ({ text: t.name, link: `/${t.slug}/` }))
}

/**
 * Sidebar for one tool. `pages` is the whole thing here, because a tool has no
 * skeleton to enforce — the point of the addon skeleton is that a reader who
 * learned one addon knows where to look in the next, and there is no next.
 */
export function toolSidebar(tool) {
  const base = `/${tool.slug}/`

  return [
    {
      text: tool.name,
      items: tool.pages.map((p) => ({ text: p.text, link: `${base}${p.link}` })),
    },
  ]
}
