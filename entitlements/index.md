# Entitlements

<AddonHeader />

One table of grants, one state machine, and a straight answer to "may this subject use this
product?".

It decides access. **It sends nothing**: no mail, no notifications, no magic links, no account
creation. Those are three other domains, and the system this package was extracted from had all
three tangled into one class.

::: warning Not released yet
Nothing here is tagged and the package is not on Packagist. Everything below describes the current
`main`, and [Installation](/entitlements/installation) is a path or VCS repository.
:::

## A grant

```php
use Goldnead\Entitlements\Facades\Entitlements;

Entitlements::grant(
    subject: $user,
    productSlug: 'stimmbeherrschung',
    source: 'thrivecart',
    sourceRef: 'ORDER-8812',
    expiresAt: now()->addYear(),
);

Entitlements::allows($user, 'stimmbeherrschung');   // true
```

A grant records that a **subject** may use a **product**, from a **source**, for a **window**. The
subject is polymorphic, so a CRM contact is as valid a subject as a user, with no coupling to
either. The product is a free string, not a foreign key: products live wherever your site keeps
them.

## Six states, resolved in one place

```
Pending      parked, waiting for a confirmation. Grants nothing
Scheduled    the window has not opened yet. Grants nothing
Active       grants access
GracePeriod  grants access, past the expiry, until the grace ends
Expired      the window closed. Grants nothing
Revoked      withdrawn, with a reason. Grants nothing
```

Only four of those are ever stored. `Scheduled` and `Expired` are **derived from the clock**, which
is why a not-yet-started grant reads as scheduled rather than as expired. The system this was
extracted from reported exactly that, on a customer's own account screen.

Every read goes through one resolver, and the SQL projection of it is pinned to the PHP version by
a test that walks all 270 combinations of status, start, expiry, grace and revocation and asserts
both select the same rows.

See [The state machine](/entitlements/states).

## Idempotency is a database constraint

```
unique (subject_type, subject_id, product_slug, source, source_ref, brand_id)
```

Present in the table's **first** migration, not added later once duplicates had accumulated.

`source_ref` is `NOT NULL DEFAULT ''`, and that is deliberate rather than an oversight. NULLs never
collide in a unique index, so a nullable column would switch the constraint off for exactly the
grants that have no external reference: manual grants from the Control Panel, opt-ins, everything a
human creates by hand and then double-submits.

The full reasoning, including where it departs from the extraction spec, is on
[Reference](/entitlements/reference#source-ref-is-not-null-and-that-is-the-point).

## Revocation is real

```php
Entitlements::revoke($entitlement, reason: 'Refunded, ticket #4417');
```

The reason is mandatory. A revocation without one throws, because a revocation nobody can explain
later is not auditable.

Revocation wins absolutely: it is the first branch of the resolver, before every time check, and it
answers on **either** signal, so a half-written revocation still reads as revoked. It fails closed.

Restoring is a separate decision with a separate permission, not an undo.

## Where this addon stops

| Concern | Owner |
| --- | --- |
| Sending the welcome mail after a grant | Your application, on `EntitlementGranted` |
| Creating an account for a new customer | Your application |
| Recording grants as facts | [Activity](/activity/), through the optional bridge |
| Who the actor was | [Identity Contracts](/identity-contracts/) |
| Which brand a grant belongs to | [Brand Context](/brand-context/) |
| What a product is | Your site. The grant holds a slug |
| Counting grants on a screen | [Insights](/insights/what-the-family-reports#entitlements), through four figures this package contributes |

The four domain events are the seam. A consumer listens and does whatever its own domain requires.

## Not in v1

Products and packages as their own data models. A policy engine. User and group synchronisation.
Automation triggers as a hard coupling. Seats, organisations, rosters, grant transfer, usage
counters, and trials as a state of their own.

Also absent by design: bulk import, statistics, a dashboard widget, and any Antlers tag. There is
**no template surface at all**.
