# Suppression

<AddonHeader />

The authoritative answer to **may we send to this address at all?** — asked before a send is
constructed, shared by every addon in this family that puts mail in a queue.

It is not a deliverability dashboard and not an ESP abstraction. It owns two tables, one
service and one gate, and it deliberately knows nothing about who sends or how.

```php
use Goldnead\Suppression\Contracts\Gate;
use Goldnead\Suppression\Facades\Suppression;
use Goldnead\Suppression\Reasons;

app(Gate::class)->isSuppressed($email);          // ask before constructing a send
app(Gate::class)->suppressedAmong($addresses);   // ask once for a whole batch

Suppression::suppress($email, Reasons::HARD_BOUNCE, ['provider' => 'resend']);
Suppression::recordSoftBounce($email);            // counts; suppresses only at the threshold
Suppression::recordDelivery($email);              // resets that window
```

## Why it is its own package

A hard bounce is a property of the **mailbox**, not of the relationship that produced the send.
That sentence is the entire argument for this package existing separately.

If the suppression list lived inside [Marketing](/marketing/), whether an address was blocked
would depend on which addon happened to be sending: marketing mail gated, notification mail and
weekly digests not. The same dead mailbox would be written to anyway, from the same application,
damaging the same sending reputation.

So the layer sits underneath both, next to [Brand Context](/brand-context/) and
[Identity Contracts](/identity-contracts/), for the same reason those two do: several addons
need the same promise, and a promise only one of them keeps is not one.

## The rule that will surprise you

> **The gate falls closed, not open.** If it cannot answer it throws `SuppressionCheckFailed`.
> It does not return `false`.

A caller that catches that and sends anyway has converted a fail-closed gate into a fail-open
one, which is the single defect this package exists to prevent.

This is deliberately the opposite of how a **segment** resolver behaves. A segment that cannot
be resolved falls open and the campaign goes to the whole list, and that is correct: a segment
narrows an audience, it never grants consent. Suppression is the other kind of check entirely.
The two rules look inconsistent side by side and they are not.

## What it owns

| Table | Holds |
| --- | --- |
| `suppressions` | Current state, one row per (brand, address) |
| `suppression_events` | Append-only history. The model refuses updates and deletes |

Suppressions are **released, never deleted**, so "blocked → released by X on D because R →
blocked again" stays readable in full.

## Where this addon stops

| Concern | Owner |
| --- | --- |
| Receiving the ESP's bounce webhook | [Webhook Manager](/webhook-manager/inbound) |
| Turning an unsubscribe into consent state | [Marketing](/marketing/lists) |
| Who performed a release | [Identity Contracts](/identity-contracts/) |
| Which brand a row belongs to | [Brand Context](/brand-context/) |
| SPF, DKIM, reputation | your mail provider |
