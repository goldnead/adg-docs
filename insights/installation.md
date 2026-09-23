# Installation

<AddonHeader />

<Requirements laravel="12.40+ or 13.x" />

```bash
composer require goldnead/statamic-insights
```

That is the whole of it. **No migrations and no tables** — the addon owns no data and asks
other packages for every number it shows.

Four screens appear under **Tools → Insights** (Revenue, Subscriptions, Metrics, Reports),
all behind a `view insights` permission that is registered with the addon. Grant it to a role before anyone but a super user can
see them.

## What it needs

Nothing, in the Composer sense. Every sibling is a `suggest`, detected at runtime with a
class name and a method probe.

| Package | | |
| --- | --- | --- |
| [`goldnead/statamic-payments`](/payments/) | Suggested | The seven figures the **Revenue** screen is built from, and the `subscriptions` table the **Subscriptions** screen reads. Without it both screens say so and show nothing — they do not error. |
| [`goldnead/statamic-leadhub`](/leadhub/) | Suggested | Six CRM figures, plus lifetime revenue per contact on the contact screen. The panel is gated on the method existing, not on a version, so an older LeadHub simply gets no panel. `2.8.0` is the release that added it. |
| Twelve more | Suggested | Automations, Booking, Consent, Entitlements, Events, Funnels, Invoices, Lead Magnets, Marketing, Notifications, Suppression, Webhook Manager. Each contributes its own group to the **Metrics** screen. See [What the family reports](/insights/what-the-family-reports). |

An installation with none of them boots and behaves; it just has nothing to report. Install
one later and its group appears with no configuration and no migration.

The coupling is optional in the other direction too: those addons never require this one,
and their metric classes are never loaded when it is absent.

## Before the first useful screen

The campaign only exists on payments that were **taken after** Payments started freezing
it. Anything older reports under *no campaign*, which is the honest answer rather than a
guess — see [Where the campaign comes from](/insights/reading-the-numbers#where-the-campaign-comes-from).

If purchases were taken before the CRM bridge was switched on, run Payments'
`payments:leadhub-backfill` first: the contact totals this addon displays are only as
complete as that ledger.

## Updating

Still no migration and no new config key. **Clear the cache after every update that adds or
moves a screen**, which 1.5, the subscription release, does twice: it adds Subscriptions and moves
Revenue from `/cp/insights` to `/cp/insights/revenue`.

```bash
composer update goldnead/statamic-insights
php artisan cache:clear
```

Statamic caches the addresses its navigation knows about. Until the cache is rebuilt the
breadcrumb and the active nav item point at the wrong page. Links and bookmarks to
`/cp/insights` keep working: that address redirects to the revenue screen, query string
included.

The subscription figures read what Payments writes on a subscription. They know its pause
(`status = paused`, `paused_at`, `meta.pauses`) and skip charges marked `meta.proration`; an
older Payments without pauses simply has none to show.
