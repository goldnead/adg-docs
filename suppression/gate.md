# Asking the gate

<AddonHeader />

The gate is the read side. Two methods, both of which take an optional brand id and otherwise
use the current one:

```php
use Goldnead\Suppression\Contracts\Gate;

public function isSuppressed(string $email, ?int $brandId = null): bool;
public function suppressedAmong(iterable $emails, ?int $brandId = null): array;
```

## Ask before you construct the send

```php
if (app(Gate::class)->isSuppressed($email)) {
    return;
}
```

Before, not after. A send that is built and then discarded has already rendered a template,
resolved a recipient and in some flows written a message row.

## For an audience, ask once

`isSuppressed()` in a loop is one query per recipient. Ask once per batch instead:

```php
$blocked = app(Gate::class)->suppressedAmong($subscriptions->pluck('email'));

foreach ($subscriptions as $subscription) {
    if (isset($blocked[$subscription->email_normalized])) {
        continue;
    }

    // …send
}
```

The returned array is keyed by the **normalized** address, which is why the loop above compares
against `email_normalized` rather than the raw one.

## It throws rather than answering wrong

::: danger Never catch `SuppressionCheckFailed` and send anyway
If the gate cannot answer — the table is unreachable, the brand cannot be resolved — it throws
`SuppressionCheckFailed`. It does not return `false`.

```php
try {
    if (app(Gate::class)->isSuppressed($email)) return;
} catch (SuppressionCheckFailed) {
    // WRONG. This is now a fail-open gate.
}
```

A caller that swallows it has converted the one fail-closed check in the system into a
fail-open one. Let it bubble: a send that does not happen is recoverable, a send to a
complainant is not.
:::

Let the job fail and retry. That is what a queue is for, and a bounced batch is cheaper than a
mailing to addresses a provider already told you to stop using.

## Normalization

Addresses are compared normalized, and normalization is **trim and lowercase, nothing else**.
So `A.User@Example.COM` and `a.user@example.com` are one address, while
`a.user+news@example.com` is a different one.

That restraint is deliberate. Gmail's dot-stripping and plus-address folding are correct for
exactly one provider and wrong for business mailboxes, and a suppression layer that over-matches
blocks people who never bounced.

The rule is identical to [LeadHub](/leadhub/)'s normalizer of the same name, because the two
keys have to agree: a suppression written from a bounce and a subscription written from a
sign-up form must land on the same string or the gate misses. It is duplicated rather than
imported so this package installs without LeadHub — a host that sends notifications and no
marketing mail still needs the gate.

Store and pass whatever the user typed. The gate handles the rest.

## Who asks it today

| Addon | Since | Where it asks |
| --- | --- | --- |
| [Marketing](/marketing/suppression) | **1.8.0** | Every path that puts a mail on the wire: `StartCampaignJob` (once per batch), `SendMessageJob`, `CampaignSender` and the double opt-in mail in `SubscriptionService` |
| [Marketing](/marketing/suppression) | **1.8.1** | The preference page, which is the one surface that writes consent **back** |
| [Notifications](/notifications/) | **1.1.0** | The immediate mail channel and the weekly digest |

Before those releases the same dead mailbox was written to from three or four places that never
asked, and the one place that did asked a narrower question — LeadHub's `do_not_contact` and the
subscription's own status, neither of which is the table the gate reads.

::: tip This is the whole argument for the separate package
A hard bounce is a property of the mailbox, not of the relationship that produced the send, so it
says nothing about which addon happens to be sending. An address Marketing had given up on kept
receiving assignment notifications and a weekly digest from the same application, damaging the
same sending reputation. Had the list lived inside Marketing, that separation would have bought
nothing.
:::

In your own code the rule is the same: ask immediately before constructing any queued mail, once
per batch rather than once per recipient.
