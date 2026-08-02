# Concepts

<AddonHeader />

Three tables, three models, and no foreign key anywhere.

```
lead_magnet_resources        what is on offer
  ├── lead_magnet_grants     who asked for it, and where they got to
        └── lead_magnet_downloads   one row per redemption
```

## Resources

A resource is a file or a link, with a handle, a title, a description and a set of per-resource
overrides.

```php
Resource::TYPE_FILE   // 'file'
Resource::TYPE_LINK   // 'link'
```

A **file** resource is streamed from a configured disk. The path on disk never appears in a URL
and never leaves the server. A **link** resource is a redirect to somewhere else, counted and
audited before the visitor is forwarded, because a redirect that is not audited is a delivery
nobody can prove happened.

`published` gates the public request endpoint. An unpublished resource answers 404 there.

::: warning The facade does not check `published`
`LeadMagnets::resource($handle)` returns an unpublished resource. The request controller filters
it; a host application calling the facade directly does not get that filter for free.
:::

### Handles are globally unique

Not unique per brand. The reason is the public request endpoint: it is opened with no session, so
no brand is current, and the handle is the only thing the visitor's form carries. The brand is
derived from it.

That derivation is safe exactly as long as a handle addresses one resource across all brands.
Make it unique per brand instead and the same form field points at two resources, which Brand
Context answers by throwing rather than guessing.

Two brands therefore cannot both own a resource called `warmup-routine`. The database enforces it,
and a second brand trying to claim the handle gets a query exception rather than a silent
collision.

## Grants

One row per `(brand_id, resource_id, email)`. It holds the state, the hashed confirmation token,
five timestamps, the download counter, an opportunistic contact id and a `meta` JSON column.

```php
$grant->isActive();
$grant->isPending();
$grant->hasLapsed();            // expires_at is in the past
$grant->downloadsExhausted();   // download_count >= the resource's cap
$grant->isRedeemable();         // active, not lapsed, not exhausted
```

`isRedeemable()` is the single question every delivery path asks. The four states and the two
meanings of `expires_at` are on [Grant state](/lead-magnets/grant-state).

The address is normalised before it is stored and before it is looked up: trimmed, and both sides
of the **last** `@` lowercased. Dots and `+tags` are deliberately preserved, because they are the
same mailbox at one provider and different mailboxes at another.

`contact_id` is a nullable, unconstrained `string(64)`. It is written by the LeadHub bridge when
that addon is installed and left null otherwise. There is no foreign key on it: a foreign key to a
table that may not exist is not a constraint, it is an install failure.

## Downloads

One row per redemption, written inside the same transaction that increments the counter.

| Column | Content |
| --- | --- |
| `downloaded_at` | When |
| `ip_hash` | SHA-256 of the client address |
| `user_agent` | Truncated to 255 characters |

**The address itself is never stored.** The hash is enough to recognise "the same client again"
without holding personal data the audit has no use for.

The audit is what makes link sharing visible after the fact. It is not what prevents it: nothing
binds a download link to a person or a device. See [Delivery](/lead-magnets/delivery#what-stops-somebody-sharing-a-link).

## The counter and the row are one transaction

```php
DB::transaction(function () use ($grant, $context) {
    $grant->increment('download_count');
    // …
    $grant->downloads()->create([...]);
});
```

The increment happens in the database rather than in PHP, so two simultaneous downloads count as
two. A cap of one really is one, even under a browser that opens a link twice.

Both happen **before** the file is streamed or the redirect issued. A download that fails halfway
through the transfer is still counted, which is the conservative direction for a cap.

## Meta

`grants.meta` is a JSON column carrying two kinds of thing:

| Key | Written by |
| --- | --- |
| `source`, `referer` | The request, from whatever the caller passed |
| `last_hold`, `last_hold_at` | The delivery service, when a send was held |

There are exactly two hold reasons: `confirmation_suppressed` and `delivery_suppressed`. Both mean
the suppression gate refused the address, and both are recorded rather than thrown, because a
held send is a fact about the address and not a failure of the request.

## No foreign keys, and what enforces the relationships instead

The package declares none. Deleting a resource takes its grants and their download rows with it,
in application code, and a test locks that in.

The download controller loads the resource **by key rather than through the relation**, so a grant
whose resource was deleted out from under it answers 404 instead of dereferencing null.

## No Antlers tags

There is no tag class in the package. The request form is hand-written HTML posting to a
documented endpoint, and the confirmation page is a Blade view this package serves itself.

That is a smaller surface than the rest of the suite offers, and it is deliberate: the form is
three fields and a route, and a tag would mostly be a second way to spell them. See
[The request flow](/lead-magnets/request-flow).
