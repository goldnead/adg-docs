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
 * five weeks and nine more came later, twenty-four of the thirty-three are
 * declared commercial, and exactly one can be bought. A reader
 * deciding whether to put one of these on a client site has no
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
  'inline-edit': 'new',

  // Experimental — see the notes.
  assessments: 'experimental',
  clientrooms: 'experimental',
  booking: 'experimental',
  'flow-canvas': 'experimental',
  events: 'experimental',
  courses: 'experimental',
  'private-media': 'experimental',
  certificates: 'experimental',
  smartlinks: 'experimental',
  affiliates: 'experimental',
  accounts: 'experimental',
}

/** The exceptions a one-word level would misrepresent. */
export const MATURITY_NOTES = {
  assessments:
    'Built on 2 September 2026 and exercised only in the playground. Nothing here has been answered by a real visitor yet.',
  booking:
    'Tagged and on Packagist, but installed on no site yet. Nothing here has been exercised by a real booking.',
  clientrooms:
    'Built on 2 September 2026 and installed on no site yet.',
  'flow-canvas':
    'Has its own CI and 52 tests (43 Vitest, 9 PHPUnit), but they cover composables and PHP only: the Vitest setup runs in a node environment with no Vue mount layer, so not one of the shared components is exercised. That gap is not theoretical. On 22 September 2026 a fix to the node library shipped with its styling written as Tailwind utilities that neither host compiles — the hosts scan only their own resources/js, and this package sits in vendor. Every test stayed green. Treat a change to a component here as unverified until both hosts have been rebuilt and the built CSS itself has been grepped for the rules.',
  events:
    'Installed, but not yet driving a live event. The publishing side is exercised; attendance and reminders are not.',
  courses:
    'Extracted from adriangoldner.com on 22 September 2026. Exercised in the playground. On that site\'s staging it now serves the member courses in place of the site\'s own copy (addon mode), and a comparison against the old code found no differences, identical pages included. No production site uses it yet. On Packagist at 0.3.0; the lesson blocks, drip variants, quizzes, payment holds and teams of that release are exercised in the playground only.',
  'private-media':
    'Extracted from adriangoldner.com on 22 September 2026. On that site\'s staging branch it is wired in behind a switch whose default is still the site\'s own delivery code. No production site uses it yet. On Packagist at 0.1.1.',
  certificates:
    'Built on 22 September 2026 on top of Courses and exercised in the playground: issuing, the PDF, the verification page and the Control Panel screen. No production site uses it yet. On Packagist at 0.1.1.',
  smartlinks:
    'Built on 23 September 2026 for a band site and exercised in the playground: the landing page, the counting redirect, the platform badge in the entry form, the link cleanup, the dead-link badges and filter, and accepting and rejecting suggestions on the Control Panel screen. Installed on that band site, anders-band.de, in a local copy only; not live there or on any other site yet. On 23 September 2026 auto-fill ran read-only against the live Deezer and Apple Music APIs on that band\'s catalogue: all 39 songs with a Deezer link identified, no link found that was wrong. Spotify and Tidal have not run against their APIs, for want of credentials, and are covered by tests with faked responses only; YouTube was not part of that run. On Packagist at 0.2.1.',
  affiliates:
    'Built on 23 September 2026 and exercised in the playground against Payments and Offers: attribution by link and by coupon, commissions, refunds before and after a payout, joint ventures, payout lists and the partner area. No real sale has been attributed, and no production site uses it yet. On Packagist at 0.2.0.',
  accounts:
    'Built on 25 September 2026 and exercised in the playground: verification, the address change, deletion with its blockers, the export and the customer overview. ChoirLive is being moved onto it; no production site uses it yet. On Packagist at 0.1.0.',
  'inline-edit':
    'Built on 19 September 2026 and running on the public demo, but on no client site yet. On Packagist since the same day, so the install below resolves.',
}

export const maturityOf = (slug) => MATURITY_BY_SLUG[slug] ?? null

/**
 * How each addon can be bought.
 *
 * A separate question from the licence, and mixing the two is what made this
 * page wrong for a fortnight. "Commercial" says a licence is required.
 * "Suite only" says where that licence comes from, and for nine of the
 * packages the answer is that it never comes from a Marketplace listing,
 * because none is planned. Until this field existed the site told the reader
 * that a listing was merely missing, and a reader who believed it was waiting
 * for something that is not coming.
 *
 * The source is Schedule A of the Suite EULA (`EULA.md`), which names the four
 * groups. This map mirrors it and must not drift from it: the EULA is the
 * contract, this is the page about the contract.
 */
export const SALES = {
  marketplace: {
    label: 'Marketplace',
    short: 'Intended for individual sale on the Statamic Marketplace.',
  },
  'suite-only': {
    label: 'Suite only',
    short: 'Licensed only as part of the Suite. No individual price, and no listing planned.',
  },
  free: {
    // Not "MIT". The licence column one cell to the left already says MIT, and
    // the same word twice in a row reads as a rendering fault rather than as an
    // answer. This column is asked "how do I buy it", and for these nine the
    // answer is that there is nothing to buy.
    label: 'Nothing to buy',
    short: 'MIT. No licence to buy.',
  },
  'not-sold': {
    label: 'Not sold',
    short: 'Commercial and on Packagist, but not part of the Suite as sold today.',
  },
}

/** Slug → how it is sold. Mirrors Schedule A of the Suite EULA. */
export const SALES_BY_SLUG = {
  // Intended for the Statamic Marketplace. Only Table of Contents is listed
  // there today; for these nine the listing really is just missing.
  toc: 'marketplace',
  automations: 'marketplace',
  leadhub: 'marketplace',
  'webhook-manager': 'marketplace',
  marketing: 'marketplace',
  'lead-magnets': 'marketplace',
  events: 'marketplace',
  'email-templates': 'marketplace',
  'inline-edit': 'marketplace',

  // Only in the Suite. Nothing is missing here, and nothing is coming.
  payments: 'suite-only',
  offers: 'suite-only',
  invoices: 'suite-only',
  funnels: 'suite-only',
  products: 'suite-only',
  booking: 'suite-only',
  consent: 'suite-only',
  insights: 'suite-only',
  courses: 'suite-only',

  // MIT. Nothing to buy.
  'brand-context': 'free',
  'identity-contracts': 'free',
  suppression: 'free',
  entitlements: 'free',
  'flow-canvas': 'free',
  activity: 'free',
  notifications: 'free',
  'preference-center': 'free',
  'private-media': 'free',

  // Commercial, on Packagist, and outside the Suite as sold today.
  clientrooms: 'not-sold',
  assessments: 'not-sold',
  certificates: 'not-sold',
  smartlinks: 'not-sold',
  // OFFEN (23.09.2026): Affiliates steht noch nicht in Schedule A der EULA.
  // Ob "not-sold" oder "suite-only" entscheidet Adrian; die EULA bewegt sich
  // zuerst, dann dieser Eintrag. Bis dahin meldet sync-licenses genau diese Zeile.
  affiliates: 'not-sold',
  // OFFEN (25.09.2026): Adrian hat entschieden, dass Accounts, Teams und App API
  // Teil der Suite-Lizenz werden. Schedule A der EULA bewegt sich erst, wenn alle
  // drei getaggt sind (Branch eula-accounts-teams-app-api). Bis dahin steht
  // Accounts hier als nicht verkauft, und sync-licenses meldet genau diese Zeile,
  // weil Schedule A das Paket noch nicht nennt.
  accounts: 'not-sold',
}

export const salesOf = (slug) => SALES_BY_SLUG[slug] ?? null

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
      { text: 'Addon settings', link: 'settings' },
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
      { text: 'Triggers from the suite', link: 'suite-triggers' },
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
      { text: 'Connections', link: 'connections' },
      { text: 'Triggers from the suite', link: 'suite-triggers' },
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
    slug: 'inline-edit',
    name: 'Inline Edit',
    package: 'goldnead/statamic-inline-edit',
    layer: 'content',
    license: 'Commercial',
    tagline:
      'Edit content on the live page. Double-click the text a visitor sees, change it, save. Not a page builder.',
    icon: '⌶',
    pages: [
      { text: 'Marking a field', link: 'marking' },
      { text: 'What can be edited', link: 'field-types' },
      { text: 'The rich editor', link: 'rich-editor' },
      { text: 'Permissions and safety', link: 'permissions' },
      { text: 'A front end that is not Antlers', link: 'headless' },
      { text: 'Static caching', link: 'static-caching' },
    ],
  },
  {
    slug: 'smartlinks',
    name: 'Smart Links',
    package: 'goldnead/statamic-smartlinks',
    layer: 'content',
    license: 'Commercial',
    tagline:
      'A page per song with one button per streaming platform, the platform read from the URL, clicks counted per day without personal data.',
    icon: '↗',
    pages: [
      { text: 'The landing page', link: 'landing' },
      { text: 'Platform detection', link: 'platforms' },
      { text: 'Antlers tags', link: 'tags' },
      { text: 'Auto-fill', link: 'auto-fill' },
      { text: 'Cleanup and dead links', link: 'link-health' },
      { text: 'The Smart Links screen', link: 'control-panel' },
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
      { text: 'Pausing, switching and replacing', link: 'subscription-changes' },
      { text: 'Reminders and card expiry', link: 'reminders' },
      { text: 'Checkout protection and the thank-you link', link: 'checkout-protection' },
      { text: 'The customer portal', link: 'portal' },
      { text: 'Refunds', link: 'refunds' },
      { text: 'Abandoned checkouts', link: 'abandoned' },
      { text: 'Payment methods', link: 'payment-methods' },
      { text: 'The detail page and the communication log', link: 'communications' },
      { text: 'Tax facts and retention', link: 'tax-and-retention' },
      { text: 'Consent, withdrawal and cancellation', link: 'recht' },
      { text: 'Webhooks', link: 'webhooks' },
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
      { text: 'Subscription figures', link: 'subscriptions' },
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
      { text: 'Pay what you want', link: 'pay-what-you-want' },
      { text: 'Setup fee and countries', link: 'setup-fee' },
      { text: 'Links and QR codes', link: 'links' },
      { text: 'Seats for groups', link: 'seats' },
      { text: 'Webhooks', link: 'webhooks' },
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
      { text: 'Exports for tax and bookkeeping', link: 'exports' },
      { text: 'Webhooks', link: 'webhooks' },
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
      { text: 'The checkout step', link: 'checkout' },
      { text: 'Embedding and in-app browsers', link: 'embedding' },
      { text: 'Tracking code and the Meta pixel', link: 'tracking' },
      { text: 'Webhooks', link: 'webhooks' },
      { text: 'Landing pages from entries', link: 'landing-pages' },
      { text: 'Deadlines and split tests', link: 'deadlines-and-tests' },
      { text: 'Where people stop', link: 'analytics' },
    ],
  },
  {
    slug: 'affiliates',
    name: 'Affiliates',
    package: 'goldnead/statamic-affiliates',
    license: 'Commercial',
    layer: 'commerce',
    tagline:
      'A partner programme: tracking links with a consent-aware cookie, commissions per product, refunds that reverse them, payout lists and joint ventures.',
    icon: '⇄',
    pages: [
      { text: 'Attribution', link: 'attribution' },
      { text: 'Commissions', link: 'commissions' },
      { text: 'Joint ventures', link: 'joint-ventures' },
      { text: 'Payouts', link: 'payouts' },
      { text: 'The partner area', link: 'partner-area' },
      { text: 'The Control Panel', link: 'control-panel' },
      { text: 'Webhooks', link: 'webhooks' },
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
    slug: 'courses',
    name: 'Courses',
    package: 'goldnead/statamic-courses',
    license: 'Commercial',
    layer: 'platform',
    tagline:
      'Modules and lessons as entries, a state per learner and lesson, drip by schedule or by progress. Who may open a course is asked of Entitlements.',
    icon: '▦',
    pages: [
      { text: 'Tags and the form routes', link: 'tags' },
      { text: 'The Course Progress screen', link: 'control-panel' },
      { text: 'Access and entitlements', link: 'access' },
      { text: 'Lesson content', link: 'lesson-content' },
      { text: 'Lesson types and proof', link: 'lesson-types' },
      { text: 'Quizzes', link: 'quizzes' },
      { text: 'Drip and locks', link: 'locks' },
      { text: 'Who sees a lesson', link: 'visibility' },
      { text: 'When a payment fails', link: 'payment-failure' },
      { text: 'Bundles and teams', link: 'teams' },
      { text: 'Webhooks', link: 'webhooks' },
    ],
  },
  {
    slug: 'certificates',
    name: 'Certificates',
    package: 'goldnead/statamic-certificates',
    license: 'Commercial',
    layer: 'platform',
    tagline:
      'A PDF certificate when a learner completes a course in Courses, a per-brand template, and a public page where anyone holding the code can check it.',
    icon: '✓',
    pages: [
      { text: 'Issuing and the snapshot', link: 'issuing' },
      { text: 'The PDF and its view', link: 'pdf' },
      { text: 'The verification page', link: 'verify' },
      { text: 'Antlers tags', link: 'tags' },
      { text: 'The Certificates screen', link: 'control-panel' },
      { text: 'Console and backfill', link: 'console' },
      { text: 'Limits', link: 'limits' },
    ],
  },
  {
    slug: 'private-media',
    name: 'Private Media',
    package: 'goldnead/statamic-private-media',
    license: 'MIT',
    layer: 'platform',
    tagline:
      'Signed links to private assets, bound to the viewer, streamed with byte ranges or handed to a temporary URL, with an audit trail. Who may open what is asked of Entitlements.',
    icon: '⊡',
    pages: [
      { text: 'Signed links and the tag', link: 'links' },
      { text: 'Access and entitlements', link: 'access' },
      { text: 'Audit trail and pruning', link: 'audit' },
      { text: 'Security notes', link: 'security' },
      { text: 'Limits and open questions', link: 'limits' },
    ],
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
  {
    slug: 'accounts',
    name: 'Accounts',
    package: 'goldnead/statamic-accounts',
    license: 'Commercial',
    layer: 'platform',
    tagline:
      'What Statamic leaves to you around an account: email verification, changing the address, deletion with a grace period, a data export, and a customer overview in the Control Panel.',
    icon: '◉',
    // Nothing has gone wrong in the field yet, so there is no troubleshooting
    // page to write honestly. The known gaps are on the overview page.
    troubleshooting: false,
    pages: [
      { text: 'Tags and forms', link: 'frontend' },
      { text: 'Deleting an account', link: 'deletion' },
      { text: 'The data export', link: 'export' },
      { text: 'Events', link: 'events' },
      { text: 'Mails', link: 'mails' },
      { text: 'The Control Panel', link: 'control-panel' },
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
