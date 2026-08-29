# Installation

<AddonHeader />

<Requirements laravel="12.40+ or 13.x" />

```bash
composer require goldnead/statamic-insights
```

That is the whole of it. **No migrations and no tables** — the addon reads what other
packages already wrote.

The screen appears under **Tools → Insights**, behind a `view insights` permission that is
registered with the addon. Grant it to a role before anyone but a super user can see it.

## What it needs

| Package | | |
| --- | --- | --- |
| [`goldnead/statamic-payments`](/payments/) | Suggested, checked at runtime | The source of every number. Without it the screen says so and shows nothing — it does not error. |

Suggested, not required:

| Package | | |
| --- | --- | --- |
| [`goldnead/statamic-leadhub`](/leadhub/) | `2.8+` | Lifetime revenue per contact on the CRM's contact screen. Detected at runtime; an older LeadHub simply gets no panel. |

The coupling in both directions is a class name and a method probe, never a Composer
requirement. An installation with neither sibling boots and behaves; it just has nothing
to report.

## Before the first useful screen

The campaign only exists on payments that were **taken after** Payments started freezing
it. Anything older reports under *no campaign*, which is the honest answer rather than a
guess — see [Where the campaign comes from](/insights/reading-the-numbers#where-the-campaign-comes-from).

If purchases were taken before the CRM bridge was switched on, run Payments'
`payments:leadhub-backfill` first: the contact totals this addon displays are only as
complete as that ledger.
