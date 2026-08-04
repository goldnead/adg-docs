# Concepts

<AddonHeader />

One table, one model, one state resolver. The package is small on purpose: it answers one question
and refuses to answer any other.

## The shape of a grant

```
subject_type + subject_id    who
product_slug                 what
source + source_ref          where it came from
starts_at / expires_at       the window
grace_until                  the extension past the window
revoked_at / revoked_reason  the withdrawal
status                       what was last written
announced_state              what was last announced
brand_id                     which tenant
meta                         whatever the consumer needs
```

Six of those columns form the unique index, which is what makes writing a grant twice safe. See
[Reference](/entitlements/reference#the-unique-index).

## The subject is polymorphic, and that is the whole LeadHub story

`subject_type` and `subject_id` are plain strings with no foreign key and no constraint. A user is
a subject; a CRM contact is a subject; anything with a stable identity is a subject.

That is why there is **no LeadHub bridge in this package and none is needed**. The `composer.json`
suggestion and the README both list LeadHub under optional siblings, and there is no
`class_exists()` check and no code. What actually enables a contact as a subject is the pair of
string columns.

Models go through `getMorphClass()`:

```php
Relation::morphMap([
    'user' => \App\Models\User::class,
    'contact' => \Goldnead\Leadhub\Models\Contact::class,
]);
```

Register a morph map early. It is what stops a class rename from orphaning every grant you hold.

`subjectKey()` returns `type:id` without ever resolving the related model, which is what the Control
Panel listing shows. Nothing in this package loads the subject unless you ask it to.

## The product is a slug, not a model

`product_slug` is a free string with no foreign key. Products live wherever your site keeps them:
Statamic entries, a config array, a payment provider's catalogue.

That is a v1 decision with a reason. Modelling products here would mean inventing a product model
for every consumer, and the extracted system had none: it had slugs. A `PackageResolver` contract
covers the one case where a slug is not enough, and it is optional.

## The source is a free string too

`source` says where a grant came from: `thrivecart`, `manual`, `lead-magnet`, `import`.

```php
'sources' => [
    'manual' => 'Manual grant',
],
```

That config is **display names only and never a whitelist**. An unregistered source writes,
resolves and grants access exactly like a registered one; it just shows its raw handle in the
Control Panel.

An enum was considered and rejected. Sources differ per project, and a package that refused an
unknown one would refuse the integration a consumer wrote last week.

`manual` is the source the Control Panel writes, always, whatever the form contains. Keep it in the
config so it has a label.

## Two references, and only one is required

`source_ref` is the external reference: an order id, a webhook event id, a request id. It is what
makes a second purchase of the same product a second grant rather than a duplicate.

It is `NOT NULL` with an empty-string default, and the empty string means "no external reference".
That is the single most consequential decision in the schema and it has its own section on
[Reference](/entitlements/reference#source-ref-is-not-null-and-that-is-the-point).

```php
$entitlement->hasSourceRef();   // asks what null used to answer
```

## Status is what was written. State is what is true.

```php
$entitlement->status;   // 'pending' | 'active' | 'grace_period' | 'revoked'
$entitlement->state();  // one of six, including two the column never holds
```

The column holds four values. The resolver returns six, because `Scheduled` and `Expired` are
read off the clock.

Never branch on `status`. It is what the last write said, and the two derived states are precisely
the ones that change without a write. Everything in this package that decides anything calls
`state()`, and the Control Panel listing shows the resolved state rather than the stored column for
the same reason.

See [The state machine](/entitlements/states).

## A grant row is a current state, not a log

There is no history table and no audit table. The row says what is true now.

The history lives in the four domain events, and in [Activity](/activity/) when the optional bridge
is installed. If you need a durable trail of who granted what and when, that is what the ledger is
for.

The Control Panel's detail screen shows a **timeline of the five stored timestamps**, which looks
like a history and is not one: it is created, starts, expires, grace until, revoked. A grant that
was revoked and restored shows no trace of the revocation.

## No foreign keys, anywhere

Not on `brand_id`, not on the subject pair. Deliberate: the subject may live in a table this
installation does not have, and a foreign key to a table that may not exist is not a constraint, it
is an install failure.

Nothing cascades. Deleting a user leaves their grants behind, and cleaning them up is your
application's decision, because "the user is gone" and "the entitlement is void" are not the same
statement in every business.

## Brands

Every grant carries a `brand_id`, supplied by [Brand Context](/brand-context/) on write and used to
scope every read.

`brand_id` is the sixth column of the unique index. The extraction spec left that undecided; the
implementation decided yes, because leaving it out means a grant written in one brand blocks the
same grant in another, which is a cross-tenant failure. The accepted cost is that the same purchase
can produce a row in two brands, which is a reporting question and cheaper than a leak.

The announcement pass runs for every brand in turn, which is why two of the indexes deliberately
omit `brand_id`.

## The package sends nothing

No mail, no notifications, no magic links, no account creation. A test asserts it with `Mail::fake()`
and `Notification::fake()` across every write path.

The system this was extracted from had one class that created accounts, wrote grants and sent mail.
Three domains in one place is what made it impossible to change any of them.

Here the seam is the four events. Your application listens and does what its own domain requires.
