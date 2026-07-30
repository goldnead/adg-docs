# Lead scoring

<AddonHeader />

```php
'features' => ['scoring' => true],
```

Every scored activity adds points to the contact's `engagement_score`, which appears on the
contact detail page and as a **sortable, range-filterable** column in the contact list.

Each change writes a `score_changed` entry to the timeline and fires
`LeadHubContactScoreChanged`, available as the `leadhub.score.changed` webhook trigger.

## Rules live in the database, per brand

The point table is edited in the Control Panel under **LeadHub → Scoring**, behind the
`manage leadhub scoring` permission, and it is scoped **per brand**: the same activity can be
worth 50 points in one brand and 3 in another.

A rule is an activity type plus its points. The special type `*` is the catch-all for
everything without a rule of its own, and a **deactivated rule behaves exactly as an absent
one** and falls through to the catch-all.

## The config fallback

```php
'scoring' => [
    'default' => 1,
    'timeline' => true,
    'events' => [
        'submission_received' => 2,
        'LeadHubSubmissionAttached' => 2,
        'purchase.completed' => 10,
        'booking.confirmed' => 5,
        'email_link_clicked' => 3,
    ],
],
```

`leadhub.scoring` in `config/leadhub.php` is still read as the fallback. **While a brand has
no rules, the config file decides, exactly as before** — so updating the addon changes nobody's
score.

Copy the config values into the table when you are ready:

```bash
php artisan leadhub:scoring:import --dry-run   # shows what it would write
php artisan leadhub:scoring:import             # writes it, once per brand
```

The command is **idempotent**, and it never overwrites a rule whose points differ from the
config file — a rule that differs is one somebody edited in the CP, and silently reverting that
would be worse than doing nothing.

| Flag | Effect |
| --- | --- |
| `--dry-run` | Show, do not write |
| `--force` | Overwrite deliberately, including edited rules |
| `--brand=<handle>` | Restrict to one brand |

## Changing a rule

::: warning Changing a rule affects future activity only
Scores already awarded are a **running total** on the contact and are **not recalculated**.

So after you double the points for a purchase, a contact who bought last week still carries the
old value, and a threshold like `engagement_score > 50` is comparing contacts scored under
different rules.

There is no recalculation command. Plan the table before you rely on thresholds, and treat a
change to it as a change to the meaning of every existing score.
:::

## Timeline entries

```php
'scoring' => ['timeline' => true],
```

On by default: without it a contact's score has a value and no history, and nobody can answer
"why is this 43".

Set it to `false` if the entries crowd out the rest of the timeline on a high-activity contact.
`LeadHubContactScoreChanged` fires either way, so you keep the event even without the entry.

## Email link clicks

```php
'click_tracking' => [
    'dedupe_window' => 60,   // minutes
],
```

Opt-in and **consent-first**: even when `features.scoring` is on, a click is only ever scored
when the contact has marketing consent.

Repeated clicks of the same link by the same contact inside the window are recorded once and
scored once, so a mail client's prefetch or a person re-reading an email does not inflate the
score.

`LeadHubEmailLinkClicked` fires on a scored click.

## Using scores

**Filter and sort the contact list** by score range. This is the everyday use, and the one the
feature was built for: "show me the qualified leads above 20".

**In a segment**, as a `field` condition with `gt`, `gte`, `lt`, `lte`. See the caveat above
about comparing scores awarded under different rules.

**As a webhook trigger.** `leadhub.score.changed` carries the contact, so "when somebody
crosses a threshold, tell the CRM" is a webhook plus a condition rather than code.

## Designing a point table

**Weight by intent, not by effort.** A purchase is worth more than a newsletter click not
because it took longer but because it means more.

**Keep the range narrow.** With `purchase.completed` at 10 and everything else at 1 to 3, a
score reads as "roughly how engaged". With one activity at 500, the score reads as "did they do
that one thing", and a boolean would have been clearer.

**Use the catch-all deliberately.** `*` at `1` means every new activity type you ever add
starts counting immediately, which is usually what you want. `*` at `0` means new types are
invisible until you add a rule, which is what you want if the table is tuned.

**Do not encode recency.** A running total never decays. If recency matters, express it in a
segment with `within_days` rather than trying to make the score do it.

## Requirements

Eloquent driver, like the other CRM-core modules. The per-brand rule table is relational.
