# Privacy & retention

<AddonHeader />

The ledger holds facts about people, so the privacy behaviour is part of the design rather than a setting
you configure afterwards.

## What is never collected

- **No raw user agent, ever.** Only a coarse category: `mobile`, `desktop`, `tablet`, `bot` or `unknown`. There is no
  setting to store the raw string.
- **No IP addresses**, at any setting. If you need a country, derive it upstream and pass it explicitly in
  `properties`.
- **No cookie of its own.** The anonymous visitor id reuses the session that already exists, so it creates
  no additional consent surface. See
  [Identity Contracts](/identity-contracts/configuration#anonymous).

## The sanitizer runs on every write

```php
'sanitizer' => [
    'strip_keys' => [
        'password', 'token', 'secret', 'authorization', 'api_key', 'apikey',
        'credit_card', 'card_number', 'cvv', 'iban', 'bic',
    ],
    'blocked_event_types' => [],
    'max_payload_bytes' => 60000,
],
```

**Secret-shaped keys are redacted at any depth**, so a secret nested three levels into a properties array is
still caught.

**Oversized payloads are replaced with a visible marker** rather than silently truncated, so a reader can
tell "too much was there" from "nothing was there".

Add your own field names. This is the most complete default list in the suite and it still knows nothing
about `kundennummer` or `geburtsdatum`.

::: warning The redaction list is a safety net, not a design
Do not put a payment token in `properties` and rely on the key name being caught. Decide what a fact needs
to contain, and record that.
:::

## Blocking whole event types

```php
'sanitizer' => [
    'blocked_event_types' => ['hr.salary_changed'],
],
```

The enforcement point for **"this domain never mirrors into a central store"**. A blocked type is dropped
before it is written, whatever produced it.

For anything more specific, bind your own sanitizer — returning `null` **drops the activity entirely**:

```php
use Goldnead\Activity\Contracts\ActivitySanitizer;

$this->app->bind(ActivitySanitizer::class, MySanitizer::class);
```

That is how you express a rule config cannot: "never record anything about a contact in this jurisdiction".

## Retention

```php
'retention' => [
    'days' => env('ACTIVITY_RETENTION_DAYS'),
    'anonymize_after_days' => env('ACTIVITY_ANONYMIZE_AFTER_DAYS'),
    'per_event_type' => [
        // 'marketing.email_opened' => 90,
    ],
],
```

Both top-level values default to **unset**, and there is **no scheduled prune**. A ledger's retention period
is a policy decision, so you have to state it — and then schedule it:

```php
Schedule::command('activity:prune --days=365')->weekly();
```

```bash
php artisan activity:prune --days=365 --dry-run
php artisan activity:prune --days=365
```

`per_event_type` is the important lever on a busy site:

```php
'per_event_type' => [
    'marketing.email_opened' => 90,      // high volume, low value
    'marketing.email_clicked' => 365,
],
```

`marketing.email_opened` will dominate the table long before anything else does, and it is also the least
trustworthy row you hold — see [Marketing → Tracking](/marketing/tracking#opens).

::: danger Never write `null` as a retention window
`null` is not "keep forever". The command casts the value with `(int)`, and `(int) null` is `0`, which puts
the cut-off at **now** — so `'commerce.purchase_completed' => null` deletes every row of that type on the
next run, and every row that arrives before the run after that.

The same applies to `0`, `''` and `false`.
:::

### Exempting a type from the prune

Two ways, and the second one is the one to use.

**Leave it out of `per_event_type` and set no global `days`.** With `retention.days` unset, only the types
listed in `per_event_type` are pruned at all. This is the default state and needs no configuration.

**If you do set a global window**, a type listed in `per_event_type` is excluded from the global sweep —
the command adds `whereNotIn('event_type', array_keys($perType))` before applying `days`. So give the type
a window long enough to outlive the install rather than trying to express "never":

```php
'retention' => [
    'days' => 365,
    'per_event_type' => [
        'marketing.email_opened' => 90,
        'commerce.purchase_completed' => 36500,   // ~100 years; effectively kept
    ],
],
```

There is no value that means "never prune this type" while a global window is set. `36500` is the honest
way to write it, and it is visible in a diff as a deliberate choice rather than a typo.

## Anonymisation is usually the right answer

```bash
php artisan activity:anonymize --contact=<uuid> --dry-run
php artisan activity:anonymize --contact=<uuid>
php artisan activity:anonymize --user=<id>
php artisan activity:anonymize --anonymous-id=<id>
php artisan activity:anonymize --days=730
```

At least one of `--contact`, `--user`, `--anonymous-id` or `--days` is required; without one the command
refuses rather than sweeping the table. `--days` falls back to `retention.anonymize_after_days` when the
option is omitted but the config value is set. `--dry-run` reports the count and writes nothing.

`prune` **deletes the row**. `anonymize` **keeps the row and empties the identifying columns**, which is
usually the right answer to a deletion request: the purchase still happened, and the person behind it is
gone.

### What the run actually clears

The command sets seven columns to `null` and flips `anonymized` to `true`:

| Cleared | |
| --- | --- |
| `contact_uuid` | the LeadHub join key |
| `user_id` | the CP / application user |
| `anonymous_id` | the pseudonymous visitor id |
| `session_id` | |
| `actor_id` | the identifier inside the actor |
| `properties` | the whole event payload |
| `context` | referrer, device category, everything captured |

What survives is the countable fact and nothing else: `brand_id`, `event_id`, `event_type`, `actor_type`,
`source`, `subject_type`, `subject_id`, `dedupe_key`, `occurred_at`, `received_at`.

::: warning The join keys are removed, not preserved
This is the part people get wrong. After an anonymisation run, `Activity::query()->where('contact_uuid', $uuid)`
finds **nothing** — not the anonymised rows, not a placeholder, nothing. The rows are still in the table and
still countable by `event_type` and `occurred_at`, but they can no longer be traced to a person, which is
the entire point.

Query for what remains — a monthly count of `commerce.purchase_completed`, say — and do not build a report
that joins anonymised history back to a contact. There is nothing left to join on.
:::

The `activities` table has no `email`, `name` or `meta` columns, so there is nothing of that shape to strip.
Personal detail that reaches the ledger arrives inside `properties` or `context`, and both are cleared
wholesale.

Anonymisation is **idempotent**: the query excludes rows where `anonymized` is already `true`, so a second
run over the same rows reports nothing to do.

::: tip Both commands run across all brands
They are operator actions on the whole store, not brand-scoped queries. That is deliberate — a deletion
request does not stop at a tenant boundary.
:::

## Immutability, and the two exceptions

`activities` is append-only. Updating or deleting a row throws `ImmutableActivity`.

The retention and anonymisation commands are the **only** paths that lift the guard. Everything else,
including your own code, cannot modify a row.

Correct a wrong fact by recording a correcting one.

## A deletion request, end to end

There is no cross-addon "erase this person everywhere" operation. Today it is three steps:

1. **Marketing** — unsubscribe and suppress. See
   [Suppression](/marketing/suppression).
2. **LeadHub** — delete or archive the contact. Note that LeadHub has **no anonymisation command** of its
   own; archive and delete are what exist.
3. **Activity** — `php artisan activity:anonymize --contact=<uuid>`.

Doing 3 without 2 leaves the CRM record. Doing 2 without 3 leaves the ledger rows, though they are then
orphaned rather than personal if you anonymise. Do both.

See [Privacy & retention](/guide/privacy) for the suite-wide picture.

## What to tell your privacy policy

Concretely, and it is short:

- Behavioural facts are recorded with a coarse device category, no IP address and no user-agent string.
- A pseudonymous session identifier may be used before somebody identifies themselves; it sets no cookie of
  its own.
- Retention is whatever you set. Say the number.
- On request, personal fields are stripped while anonymous counts are retained.

That last point is the one worth stating plainly, because it is what `anonymize` actually does and it is
more accurate than claiming deletion.
