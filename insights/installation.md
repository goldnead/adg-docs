# Installation

<AddonHeader />

<Requirements laravel="12.40+ or 13.x" />

```bash
composer require goldnead/statamic-insights
```

That is the whole of it. **No migrations and no tables** — the addon owns no data and asks
other packages for every number it shows.

Two screens appear under **Tools → Insights**, both behind a `view insights` permission
that is registered with the addon. Grant it to a role before anyone but a super user can
see them.

## What it needs

Nothing, in the Composer sense. Every sibling is a `suggest`, detected at runtime with a
class name and a method probe.

| Package | | |
| --- | --- | --- |
| [`goldnead/statamic-payments`](/payments/) | Suggested | The seven figures the **Revenue** screen is built from. Without it that screen says so and shows nothing — it does not error. |
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
