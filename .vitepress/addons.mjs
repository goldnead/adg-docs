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
  content: 'Content tooling',
}

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
    license: 'MIT',
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
    license: 'MIT',
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
    license: 'MIT',
    tagline:
      'Lists, double opt-in, campaigns, sending and tracking on top of LeadHub contacts.',
    icon: '✉',
    pages: [
      { text: 'Concepts', link: 'concepts' },
      { text: 'Lists & subscriptions', link: 'lists' },
      { text: 'Front-end forms', link: 'forms' },
      { text: 'Campaigns', link: 'campaigns' },
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
    license: 'MIT',
    unreleased: true,
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
    slug: 'email-templates',
    name: 'Email Templates',
    package: 'goldnead/statamic-email-templates',
    layer: 'crm',
    license: 'MIT',
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
    unreleased: true,
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
    license: 'MIT',
    unreleased: true,
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
]

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
