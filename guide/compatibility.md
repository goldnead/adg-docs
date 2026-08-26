# Compatibility

## Platform

| | Supported |
| --- | --- |
| PHP | 8.2, 8.3, 8.4 — except Notifications, which requires 8.3 |
| Statamic | 6.0+ |
| Laravel | 12.x, 13.x |
| Node | 18+, and only if you rebuild an addon's CP bundle from source |
| Database | MySQL 8+, SQLite |

**Laravel 11 is not supported by any package in the suite.** Every one of them
requires `^12.0|^13.0` or narrower, and Brand Context — a dependency of eleven
of the twenty-two — requires `^12.40|^13.0`, which sets the real floor for most
installs. Table of Contents is the exception that declares no Laravel
constraint at all and takes whatever its Statamic version takes.

Statamic 5 is not supported by the suite. LeadHub's v0.3 Control Panel rewrite moved
to Inertia + Vue 3, which is Statamic 6 only; pin to `^0.2.x` if you are stuck on
Statamic 5, and expect no further releases on that line.

[Table of Contents](/toc/) is the partial exception, because it has no Control Panel
screen to be tied to a Statamic version: 2.x runs on Statamic 5 as well as 6. Its v1
line went back to Statamic 3 on PHP 7.4 and is no longer maintained; `v1.10` stays
installable for anyone already pinned to it.

## Databases

The addons are developed against SQLite and released against MySQL, and the
difference matters more than it sounds:

- SQLite has no InnoDB key-length limit, no fixed column widths and no
  per-character byte cost. A schema MySQL refuses outright can pass a fully
  green SQLite test run. That is not a hypothetical: it is how one release
  reached production with a schema MySQL could not build.
- Eight addons therefore ship a `phpunit.mysql.xml` and a unit test
  (`IndexKeyLengthTest`) that compiles the migrations through Laravel's MySQL
  grammar and measures every index against InnoDB's 3072-byte limit: Activity,
  Automations, Brand Context, LeadHub, Marketing, Notifications, Suppression
  and Webhook Manager. Those are exactly the eight that own tables.

**PostgreSQL is untested.** Nothing in the suite is knowingly MySQL-only beyond
the index-length work above, and the migrations use Laravel's schema builder
throughout, so it may well work. But there is no PostgreSQL test run and no
install we know of, so we do not list it as supported. If you try it, tell us
what happened.

## Inter-addon constraints

More than one hard dependency exists between the domain addons. These are
Composer requirements, not optional integrations, and Composer installs them
for you:

| Package | Requires | Why |
| --- | --- | --- |
| `statamic-marketing` | `statamic-leadhub` | A subscriber is a LeadHub contact. There is no separate subscriber table. |
| `statamic-marketing` | `statamic-suppression` | Every send asks the gate first. |
| `statamic-notifications` | `statamic-suppression` | The mail channel asks the same gate. |
| `statamic-notifications` | `statamic-identity-contracts` | A recipient is an Identity. |
| `statamic-activity` | `statamic-identity-contracts` | An actor is an Identity. |
| `statamic-preference-center` | `statamic-identity-contracts` | The page resolves a person from a token. |
| `statamic-entitlements` | `statamic-identity-contracts` | The actor on a grant or a revocation is an Identity. |
| `statamic-offers` | `statamic-payments` | An offer is a price for a product the till already sells. |
| `statamic-invoices` | `statamic-payments` | An invoice is written from a payment, never beside one. |
| `statamic-funnels` | `statamic-payments`, `statamic-offers` | A paid step is an offer, and an offer is charged by the till. |
| `statamic-funnels` | `statamic-flow-canvas` | The editor is one package, consumed by Funnels and Automations alike. |
| eleven of the twenty-two | `statamic-brand-context` | See [Multi-brand](#multi-brand) below. |

Everything beyond that is a `suggest` plus a runtime `class_exists` check. The
version constraints that matter when both are installed:

| If you use | You need at least | Otherwise |
| --- | --- | --- |
| Marketing's segment targeting | LeadHub `^1.4` | The campaign sends to the whole list; no error |
| Automations' LeadHub nodes | LeadHub `^1.0` | The nodes do not appear in the library |
| Marketing's ESP inbound action | Webhook Manager `^1.0` | Bounces are not processed automatically |
| Notifications' LeadHub digest source | LeadHub `^1.0` | The digest omits overdue follow-ups |
| Activity's producers for LeadHub and Marketing | LeadHub / Marketing installed | The producers do not attach |
| Marketing's footer preference link | Preference Center installed | The link goes to Marketing's own unsubscribe page instead |

Optional integrations degrade rather than fail. The pattern throughout the suite
is a capability check on the facade root, not a version comparison:

```php
if (method_exists(LeadHub::getFacadeRoot(), 'segmentMemberIds')) {
    // segments are available
}
```

::: tip Why `getFacadeRoot()`
`method_exists()` on a facade class returns `false` for anything the facade
forwards through `__callStatic`. Checking the facade class instead of its root is
a real bug that shipped once: every LeadHub action node silently failed on every
install that had LeadHub. Always resolve the root first.
:::

## Front-end assets

| Addon | Ships compiled CP assets | Needs a build from a clone |
| --- | --- | --- |
| Webhook Manager | yes, `resources/dist/build/` | yes, `npm install && npm run build` |
| Automations | yes, `resources/dist/build/` | yes |
| LeadHub | yes, `resources/dist/build/` | yes |
| Marketing | yes, `resources/dist/build/` | yes |
| Brand Context | yes, `resources/dist/build/` | yes |
| others | no CP JavaScript of their own | no |

Brand Context is easy to overlook in that list: it is mostly an invisible
foundation package, but it does ship an Inertia CP page for brand membership
and therefore a compiled bundle of its own.

Two Statamic 6 specifics worth knowing if you fork one of these:

- Statamic 6 reads an addon's Vite config **only** from the service provider's
  `$vite` property. `extra.statamic.vite` in `composer.json` is ignored.
- `@statamic/cms`'s Vite plugin needs `@vitejs/plugin-vue` in the project that
  resolves it, not in the addon.

## Multi-brand

Brand Context is a dependency of eight packages: Webhook Manager, Automations,
LeadHub, Marketing, Activity, Notifications, Suppression and Preference Center.
All eight are brand-aware, and all eight behave identically on a single-brand
install. There is no partial support to check for: if an addon depends on
`brand-context`, its records carry `brand_id` from their first migration.

Table of Contents, Identity Contracts and Email Templates are not brand-scoped,
because none of them persists anything that could belong to a brand.

This is also why Laravel 11 is out for most of the suite. Brand Context
requires `laravel/framework ^12.40|^13.0`, and Composer resolves that
constraint for everything that depends on it.

**Suppression is the deliberate exception.** It persists brand-owned rows and still does not use
`HasBrand`: the scope would hide the global rows from the one query that must never fail open.
See [Suppression → Brands and scope](/suppression/brands).
