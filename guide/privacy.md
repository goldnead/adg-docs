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

[Private Media](/private-media/) is the exception, and on purpose: its audit
table exists to show who opened or was refused a private file, and it stores the
IP address and the user agent (cut at 512 characters) with each row. Rows older
than 90 days go with `private-media:prune`, once you schedule it. See
[Audit trail and pruning](/private-media/audit).

[Certificates](/certificates/) publishes a name by design: its verification page
shows the learner's name, the course and the issue date to anyone holding the
certificate's code. The name is copied onto the certificate when it is issued and
does not change when the user is renamed. A user without a name is refused a
certificate rather than certified under their email address. The page is sent
with `noindex, nofollow`, and a revoked certificate still shows its name there.
See [The verification page](/certificates/verify).

[Smart Links](/smartlinks/) counts clicks on public pages without holding
personal data: its table has one counter per song, platform and day, and no IP,
cookie, user agent or referrer. The IP is used for one thing, a cap on counted
clicks per minute, and only as part of a SHA-256 hash that serves as a cache key
for that minute. See [Configuration → Clicks](/smartlinks/configuration#clicks).

[Affiliates](/affiliates/) writes its referral cookie only with the visitor's
consent, and without it keeps the referral in the session the visitor already
has. A click row holds the partner and the landing path, no IP and no user
agent. Partners' payout details (IBAN, PayPal address) are stored encrypted and
shown in the Control Panel only with `manage affiliate payouts`; the payout CSV
carries them in plain text, because it is the file you pay from. The commission
mail never names the buyer. See [Attribution → Consent](/affiliates/attribution#consent).

[Payments](/payments/) 1.25 counts checkout attempts per IP address and per email
address in the cache only, for its checkout brake. A refused checkout's event
carries the IP; its log line keeps the email's domain only. Whether a buyer agreed
to reminders about an abandoned checkout is recorded on the payment
(`meta.reminder_consent`), and without that consent no reminder goes out when
`abandoned.capture` asks for it. See
[Checkout protection](/payments/checkout-protection).

[Funnels](/funnels/) runs a tracking code slot or the Meta pixel only with the
consent that slot names. The Conversions API sends the buyer's email hashed, and
the IP address, user agent and the `_fbp`/`_fbc` cookies only with consent. See
[Tracking code and the Meta pixel](/funnels/tracking).

**Webhooks from the suite.** Payments, Invoices, Offers, Affiliates, Courses and
Funnels offer their moments as triggers in [Webhook Manager](/webhook-manager/).
Offering a trigger sends nothing; data leaves only through a webhook somebody
creates, and then it goes to that receiver. The bodies carry what the moment is
about: a buyer's email, name and country on a payment, the name, email, country
and VAT ID on an invoice (never the postal address), seat holders' emails and
names on a seat, never a token, payout details or card data. Funnels'
`form_submitted` hands over the visitor's form values as typed, which makes the
receiving service a processor that needs a data processing agreement (Art. 28
GDPR). Each addon's Webhooks page lists what goes along and what never does; see
[Triggers from the suite](/webhook-manager/suite-triggers).

[Automations](/automations/) stores a run's context, shows it in the run log and
can forward it through a webhook node. For a blocked checkout that context keeps
only the network of the IP address (`/24` or `/48`), never the full address. See
[Triggers from the suite](/automations/suite-triggers).

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
| Certificates | — | none; a certificate is kept, revoked or not |
| Private Media | `private-media:prune --days=` | `audit.retention_days`, default 90, **not scheduled**; you register it |
| Smart Links | `smartlinks:prune --days=` | `clicks.prune_days`, default 400, **not scheduled**; you register it. The counters hold no personal data. |
| Affiliates | — | none; partners, clicks, referrals, commissions and payouts are the books of the programme and are kept |
| Offers | — | none; seat pools keep the names and addresses of the invited people |
| Invoices | — | none; export archives stay on `export.disk` until you delete them |
| Inbox | — | none; fetched mail, replies and attachments on the private disk are kept, and 0.1.0 has no command to prune them |
| Accounts | `accounts:purge` | deletes accounts whose grace period is over, **scheduled** daily at 03:40; a deletion request keeps the user id, without address or name, as the record |

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
- "Erase this person everywhere" exists only for a person **with an account**, through
  [Accounts](/accounts/deletion): its deletion runs the erasers of Entitlements, LeadHub,
  Notifications, Teams and Activity in one transaction, keeps Payments and Invoices, and
  records which was which. Marketing and Suppression have no eraser there. For a
  subscriber without an account, a deletion request still means: delete or archive the
  LeadHub contact, unsubscribe and suppress in Marketing, and run
  `activity:anonymize --contact=<uuid>`.
