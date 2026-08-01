# Concepts

<AddonHeader />

| Term | Means |
| --- | --- |
| **Activity** | One immutable row: a fact that happened |
| **Event type** | What kind of fact, e.g. `commerce.purchase_completed` |
| **Actor** | Who did it, as an [Identity](/identity-contracts/) |
| **Subject** | What it was about, as a polymorphic model reference |
| **Properties** | The fact's own data |
| **Context** | Request context captured automatically |
| **Producer** | A mapper turning one of your domain events into a row |
| **`event_id`** | Guards against the same *physical* event arriving twice |
| **`dedupe_key`** | Guards against the same *fact* being recorded twice |

## Facts, not metrics

The ledger stores what happened and **computes nothing**. No counts, no charts, no aggregates, and the
Control Panel screen is a read-only inspector by design.

That is a boundary, not a missing feature. Metrics, funnels and cohorts belong in a layer that reads from
here. Mixing the two is how a ledger quietly becomes a reporting tool with no schema discipline — and then
every consumer has to know which columns are trustworthy this month.

## Event type names are a catalogue

```
commerce.purchase_completed
crm.contact_created
marketing.email_opened
```

Names follow a **platform catalogue** rather than PHP class names, which is what lets consumers survive a
class rename. `crm.status_changed` keeps meaning the same thing after
`LeadHubStatusChanged` is refactored.

Use a namespace prefix. It is what makes filtering by domain possible, and it is the difference between a
ledger you can query and a bag of strings.

## Recording never breaks the caller

A ledger failure is **reported and swallowed**.

A broken `activities` table must never roll back the purchase that produced the event. That is the single
most important behavioural guarantee here, and it has a corollary: **a failed write is visible only in the
log.** If facts are missing, `laravel.log` is where the reason is.

## Two idempotency keys

| Key | Guards against | Scope |
| --- | --- | --- |
| `event_id` | the same *physical* event arriving twice — a webhook retry, a job retry | global |
| `dedupe_key` | the same *fact* being recorded twice — two producers, one truth | per brand |

Recording an existing fact returns the original row and writes nothing. **A producer may be as noisy as it
likes.**

Use a dedupe key for **state transitions**: a purchase, a confirmation, a bounce. Leave it off for
**repeatable facts**: an email open, a page view. The second open is a second fact, and `event_id` alone
keeps retries safe.

See [Recording](/activity/recording#two-idempotency-keys) for how to choose one.

## Immutability

`activities` is append-only. Updating or deleting a row throws `ImmutableActivity`.

The retention and anonymisation commands are the **only** paths that lift the guard. Correct a wrong fact
by recording a correcting one.

This is not a limitation to work around: a ledger you can quietly edit is not a ledger.

## Actor and subject

**Actor** is who did it, resolved through
[`IdentityContext`](/identity-contracts/resolving) — so you may pass an `Identity`, a
`ProvidesIdentity`, any `Authenticatable`, or an email string, and the row stores scalars rather than a
model reference.

**Subject** is what the fact was about, as a polymorphic reference: `subject_type` and `subject_id`.

The distinction matters for querying. "Everything Adrian did" is an actor query; "everything that happened
to order 4711" is a subject query.

## Brands

Every row carries `brand_id` from the **first** migration — there is no single-brand phase to migrate out
of later. In single-brand mode the default brand is stamped and nothing else changes.

With `brand-context.multi_brand` on, the global scope applies and fails closed: no current brand means no
rows, never all rows.

Dedupe keys are per brand, so two brands may legitimately record the same fact independently.

`activity:prune` and `activity:anonymize` run across **all** brands. They are operator actions on the whole
store, not brand-scoped queries.

## Not a replacement for a domain log

The suite runs both, deliberately:

| | LeadHub timeline | Activity |
| --- | --- | --- |
| Answers | "what is going on with this person" | "what happened across the site" |
| Shape | the CRM's own, salesperson-ordered | one shape every consumer reads |
| Scope | one contact | everything |
| Shown | on the contact page | in a read-only inspector |

Installing Activity migrates nothing and replaces nothing. The bundled producers record the same facts for
a different purpose, and the overlap is intended. See
[Boundaries](/guide/boundaries#crm-timeline-vs-activity-ledger).

## Privacy is structural

- **No raw user agent, ever.** Only `mobile`, `desktop`, `tablet`, `bot` or `unknown`.
- **No IP addresses**, at any setting.
- **A sanitizer on every write**, redacting secret-shaped keys at any depth and marking oversized payloads
  visibly rather than truncating silently.
- **Blockable event types**, as the enforcement point for "this domain never mirrors centrally".

See [Privacy & retention](/activity/privacy).
