# Sending to a segment

<AddonHeader />

Optionally narrow a campaign's audience to a [LeadHub segment](/leadhub/segments), with a live member
count in the Control Panel.

## The rule

```
audience = subscribed list members  ∩  segment members
```

- Resolved at **send time**, not when you set it.
- **No segment = the whole list.**
- **The segment only narrows.** It can never add a recipient who is not already a subscribed member of
  the list.
- **Consent always comes from the list.** A segment is targeting; a list is permission.

If you find yourself wanting the segment to *be* the audience, you want a list.

## Requirements

| | |
| --- | --- |
| LeadHub | **`^1.1`** or later |
| Storage | either driver; segments work on both |
| Scheduler | required for time-based segment rules to stay fresh |

::: warning On older LeadHub it degrades to a whole-list send
Silently, with no error. So "the segment is being ignored" and "LeadHub is too old" look identical
from the CP.

The capability check is on the facade **root**, which is what makes graceful degradation possible:

```php
method_exists(LeadHub::getFacadeRoot(), 'segmentMemberIds');
```

`method_exists()` on a facade class returns `false` for everything forwarded through `__callStatic` —
the mistake that once made every LeadHub action node in Automations fail on every real install.
:::

## Checking the count before you send

The CP shows a live member count for the chosen segment. Look at it, and reason about it:

| Count | Probably means |
| --- | --- |
| 0 | The rules match nobody. An **empty rule set matches nobody**, by design. |
| the whole list | The segment is being ignored — check your LeadHub version |
| something plausible | good |

That second row is the one worth being paranoid about, because "segment ignored" and "segment matches
everyone" produce the same number and very different intentions.

## What the intersection actually excludes

Four groups get no mail even if the segment matches them:

- **`pending` subscriptions.** Somebody who started a double opt-in and never confirmed. A record that
  they began, not permission.
- **`unsubscribed` members.**
- **Suppressed addresses** — hard bounces and complaints — enforced at send time even while the
  subscription row still says `subscribed`.
- **Contacts with `do_not_contact`.**

So the number of messages sent can be lower than the segment count, and that is the system working.

## Segments that work well for targeting

**Facts age better than states.** `tag has vip` and `event has purchase within_days 30` still mean the
same thing next quarter. `status eq proposal` describes where somebody sits in a pipeline you will
rename.

**Be careful with `engagement_score`.** Scores are a running total and are **never recalculated** when
the point table changes, so a threshold compares contacts scored under different rules. See
[Lead scoring](/leadhub/scoring#changing-a-rule).

**Name the intent, not the rule.** `spring-campaign-referrals` survives a rule edit;
`utm-campaign-contains-spring` does not.

## Freshness

Segment membership is materialised and kept up to date reactively when a contact changes, plus a daily
sweep for time-based rules.

::: danger Without the scheduler, a segment goes half-stale
Mutation-driven rules stay perfectly fresh. Time-based ones (`within_days`, `older_than_days`) do not.
The result is a segment that is partly correct, with nothing reporting a problem and numbers that look
plausible.

```bash
php artisan schedule:work
php artisan leadhub:segments:sweep
```

Before a send that depends on a time-based rule, run the sweep by hand.
:::

Note that `segmentMemberIds()` resolves **live from the rules** rather than from the materialised
pivot, so the send itself sees the current set. The staleness risk is in the member **count** you look
at and in anything reading the pivot.

## A worked example

Send the spring launch to newsletter subscribers who are qualified leads and bought in the last 90
days:

**Segment** `spring-launch-warm`:

```json
{
  "match": "all",
  "conditions": [
    { "type": "field", "field": "status", "operator": "eq", "value": "qualified" },
    { "type": "event", "operator": "has", "event": "purchase", "within_days": 90 }
  ]
}
```

**Campaign**: list `newsletter`, segment `spring-launch-warm`.

The audience is the intersection. Somebody qualified who bought last month but never subscribed to the
newsletter gets nothing — correctly, because they never consented to the newsletter.

## Not a second list

The temptation, when a campaign should go to a subset, is to create a list for it. Do not: every
recipient would have to consent again, and you would be maintaining two consent records for one
relationship.

One list per relationship, segments for targeting. See
[Lists → Designing lists](/marketing/lists#designing-lists).

## Segment enter and leave as triggers

LeadHub fires `LeadHubContactEnteredSegment` and `LeadHubContactLeftSegment`, both exposed as Webhook
Manager triggers (`leadhub.segment.entered` / `leadhub.segment.left`).

So "when somebody becomes a warm lead, start the sequence" is a webhook or an
[Automations](/automations/) flow, rather than a campaign you remember to send.

A per-contact depth guard (`MAX_DEPTH = 1`) prevents infinite cascades when a consumer reacts to one of
those events by mutating the same contact — so a chain of segment reactions is one level deep by
design.
