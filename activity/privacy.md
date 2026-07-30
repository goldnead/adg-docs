# Privacy & retention

<AddonHeader />

The ledger holds facts about people, so the privacy behaviour is part of the design rather than a setting
you configure afterwards.

## What is never collected

- **No raw user agent, ever.** Only a coarse category: `mobile`, `desktop`, `tablet`, `bot`. There is no
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
    'commerce.purchase_completed' => null,   // keep
],
```

`marketing.email_opened` will dominate the table long before anything else does, and it is also the least
trustworthy row you hold — see [Marketing → Tracking](/marketing/tracking#opens).

## Anonymisation is usually the right answer

```bash
php artisan activity:anonymize --contact=<uuid>
php artisan activity:anonymize --user=<id>
php artisan activity:anonymize --anonymous-id=<id>
php artisan activity:anonymize --days=730
```

`prune` **deletes**. `anonymize` **strips the personal fields and keeps the countable fact**, which is
usually the right answer to a deletion request: the purchase still happened, and the person is no longer
identifiable in the ledger.

The mechanism underneath is
[`Identity::pseudonymised()`](/identity-contracts/identity-object#pseudonymised), which drops `email`,
`name` and `meta` while keeping the join keys.

Anonymisation is **idempotent**: a second run over the same rows is a no-op.

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
