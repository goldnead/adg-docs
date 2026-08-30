# Privacy & retention

Five packages hold the personal data this page is about: LeadHub (contacts),
Marketing (subscriptions and message events), Activity (facts about people),
Notifications (what somebody was told) and Suppression (addresses that must not
be mailed). A sixth, Preference Center, stores nothing of its own but is the
page a data subject actually uses. This page collects the guarantees and the
levers for those, because a GDPR question is never about one addon.

The commerce packages hold buyer data of their own: [Payments](/payments/)
records the name, email address and country a checkout collected, and
[Invoices](/invoices/) freezes the buyer's details into a document that by law
must not change afterwards. Those two answer to tax retention rather than to the
levers below, and their rules are on
[Tax facts and retention](/payments/tax-and-retention).

## What is deliberately not collected

Activity sets the strictest line in the suite, and the other addons follow it
where the same data would otherwise appear:

- **No raw user agent, ever.** Only a coarse category: `mobile`, `desktop`,
  `tablet`, `bot`.
- **No IP addresses.** If you need a country, derive it upstream and pass it
  explicitly.
- **No cookie of its own** for the anonymous visitor id. It reuses the session
  that already exists, so it creates no additional consent surface.

If a bug report needs an IP, it does not come from these tables.

## Redaction on write

Both LeadHub and Activity sanitise before persisting, not after.

**LeadHub** copies a redacted form of the originating form submission onto the
timeline, governed by:

```php
'store_full_submission_payload' => true,
'timeline_payload_redaction' => [ /* sensitive keys */ ],
```

The original Statamic submission is never modified; LeadHub stores a reference
and a redacted copy.

**Activity** runs a sanitizer on every write. Secret-shaped keys (`token`,
`password`, `api_key`, `iban`, …) are redacted **at any depth**, and oversized
payloads are replaced with a visible marker rather than silently truncated, so a
reader can tell the difference between "nothing was there" and "too much was
there".

Whole event types can be blocked outright:

```php
// config/activity.php
'sanitizer' => [
    'blocked_event_types' => ['hr.salary_changed'],
],
```

That is the enforcement point for "this domain never mirrors into a central
store". Bind your own `ActivitySanitizer` for anything more specific; returning
`null` from it drops the activity entirely.

**Webhook Manager** masks payload bodies in the Control Panel according to its
masking rules, and reading them unmasked is a separate permission
(`view sensitive payloads`). Automations redacts run logs by pattern
(`security.redact_keys`) and can encrypt them at rest via an `EncryptedJson`
cast.

## Consent

Consent lives in exactly one place per concern, and the suite is strict about it:

- **A marketing subscription is the consent record.** One address on one list is
  one subscription, enforced by a unique index. Double opt-in is per list.
- **A segment narrows, it never grants.** A campaign's audience is
  `subscribed list members ∩ segment members`. Consent always comes from the
  list; the segment can only make the audience smaller.
- **`do_not_contact` on a LeadHub contact is honoured by every CRM connector**, and
  an opted-out contact is never pushed anywhere. `LeadHub::optOut()` goes further
  and actively removes the contact from supported destinations, for example a
  Brevo list.
- **Consent is per brand.** The same email can hold independent consent state in
  two brands, and uniqueness is enforced as `(brand_id, …)`.

Marketing can also propagate an unsubscribe into a global opt-out:

```php
'unsubscribe' => ['global_opt_out' => false],
```

Turn it on if unsubscribing from one newsletter should mean "do not contact me at
all". Leave it off if your lists are genuinely separate consents.

### Where the data subject exercises the choice

Two paths, and they are deliberately not the same thing:

- **Unsubscribing** is Marketing's, unconditionally: a tokenised link in the
  footer and an RFC 8058 one-click endpoint that mail providers POST to
  unattended. It works with no other package installed, because ending a
  subscription is a legal obligation and may not depend on an optional addon.
- **Changing preferences** — lists, notification types, cadence, block state —
  belongs to [Preference Center](/preference-center/), when it is installed.
  Marketing resolves its footer links to that page automatically.

From Marketing 1.9.0, Marketing no longer serves a preference page of its own.
If you are upgrading, read
[Migrating from Marketing](/preference-center/migrating-from-marketing): links
already sitting in sent mail point at a route that no longer exists.

### Verifying the consent guarantee

```bash
php artisan marketing:consent-integrity            # reports, changes nothing
php artisan marketing:consent-integrity --repair
```

It reads the indexes on `marketing_subscriptions` as they are right now and the
rows in them, names any list/address pair holding more than one subscription with
each row's id, status and confirmation date, and exits non-zero if the guarantee
is not in force. It **never deletes a subscription**: which of two sign-ups is
*the* consent record is a decision about people, and `--repair` refuses to build
the index while anything would have to go for it.

## Deletion and anonymisation

A deletion request usually wants the personal data gone and the counts intact.
Activity supports both, and defaults to the useful one:

```bash
php artisan activity:prune --days=365 [--dry-run]
php artisan activity:anonymize --contact=<uuid> [--user=] [--anonymous-id=] [--days=]
```

`prune` deletes rows. `anonymize` keeps the row and the countable fact, which is
usually the right answer: the purchase still happened, the person is no longer
identifiable in the ledger. It is idempotent, so a second run over the same rows
is a no-op.

Both run across **all brands**. They are operator actions on the whole store, not
brand-scoped queries.

::: warning `anonymize` also drops the join keys
It is worth being precise about what survives, because the name suggests less
than the command does. `activity:anonymize` nulls `contact_uuid`, `user_id`,
`anonymous_id`, `session_id`, `actor_id`, `properties` and `context`. What
remains is the event type, the timestamp and the brand.

That means a query by `contact_uuid` finds nothing after the run. If you need
per-person counts to survive anonymisation, take them before you run it. This
is not `Identity::pseudonymised()`, which keeps the join keys; the command does
not use it. See [Activity → Privacy & retention](/activity/privacy).
:::

## Immutability

`activities` is append-only. Updating or deleting a row throws
`ImmutableActivity`, and the retention commands above are the only paths that lift
the guard.

Correct a wrong fact by recording a correcting one. This is not a limitation to
work around: a ledger you can quietly edit is not a ledger.

## Retention levers, by addon

| Addon | Command | Default |
| --- | --- | --- |
| Activity | `activity:prune --days=` | `retention` config, no automatic schedule |
| Activity | `activity:anonymize` | manual, per subject |
| Webhook Manager | `webhook-manager:prune` | **not scheduled**; you register it |
| Automations | `automations:prune` | `runs.prune_after_days`, default 30, `null` disables — **not scheduled**; you register it |
| LeadHub | archive or delete a contact | manual |
| Notifications | — | no automatic pruning |

::: warning Nothing here prunes itself
Deliveries and run logs are the two tables that grow fastest, and neither
`webhook-manager:prune` nor `automations:prune` is on any scheduler. Both were
described as scheduled daily on this page and elsewhere, and neither ever was.
Register them yourself, or the tables grow without limit. See
[Queues & scheduling](/guide/queues#what-is-scheduled).

Activity is deliberate rather than accidental: a ledger's retention period is a
policy decision, so you have to state it.
:::

## What is not built yet

Named plainly rather than implied:

- LeadHub has **no GDPR anonymisation command** of its own and no manual contact
  merge UI. Archiving and deleting a contact are what exist today.
- Notifications has no retention command in v1.
- There is no cross-addon "erase this person everywhere" operation. A deletion
  request today means: delete or archive the LeadHub contact, unsubscribe and
  suppress in Marketing, and run `activity:anonymize --contact=<uuid>`.
