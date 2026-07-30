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

::: warning No released addon consumes this package yet
Suppression 1.0.0 ships as a standalone foundation. [Marketing](/marketing/suppression)
currently enforces suppression through its own ESP event processing, and its integration with
this package is in progress rather than released. [Notifications](/notifications/) does not ask
at all yet, which is exactly the gap the package exists to close.

Until those land, this is a package you call from your own code.
:::

Wherever you call it, the rule is the same: immediately before constructing any queued mail,
once per batch rather than once per recipient.
