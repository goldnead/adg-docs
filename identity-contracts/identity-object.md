# The `Identity` object

<AddonHeader />

A readonly bag of scalars, safe to persist and to put on a queue.

```php
use Goldnead\IdentityContracts\Identity;
```

## Fields

| Field | Meaning |
| --- | --- |
| `type` | `user`, `contact`, `system`, `anonymous`, or an app-defined type |
| `id` | Stringified identifier within that type |
| `userId` | Join key into the host application's user table |
| `contactUuid` | Join key into the CRM contact record |
| `email`, `name` | Convenience copies. **Personal data.** |
| `anonymousId` | Pseudonymous visitor id, for pre-identification activity |
| `meta` | Free-form, application-defined |

Three of these are join keys and two are copies, which is the distinction that
matters for retention: `pseudonymised()` drops the copies and keeps the keys.

## Constructors

```php
Identity::user(42, 'a@example.com', 'Adrian');
Identity::contact('c-uuid', 'a@example.com');
Identity::system('importer');
Identity::anonymous('anon-1');
```

`user()` also takes a contact UUID as a fourth argument, which is how a logged-in
user who is also a CRM contact carries both join keys at once:

```php
Identity::user($this->id, $this->email, $this->name, $this->contact_uuid);
```

## Copies, not mutation

The object is readonly. The `with…` methods return a new instance:

```php
$identity = Identity::anonymous('anon-1')
    ->withEmail('a@example.com')
    ->withContactUuid('c-uuid')
    ->withMeta(['campaign' => 'spring']);
```

| Method | Returns a copy with |
| --- | --- |
| `withContactUuid($uuid)` | the CRM join key set |
| `withEmail($email)` | the email copy set |
| `withAnonymousId($id)` | the pseudonymous visitor id set |
| `withMeta($array)` | the meta bag set |

The typical use is enrichment: a visitor identified mid-session starts as an
anonymous identity, and the same behavioural record can be linked to a contact
afterwards without rewriting history.

## Asking what an identity is

Five predicates, all returning `bool`:

| Method | True when |
| --- | --- |
| `isUser()` | `type` is `user` |
| `isContact()` | `type` is `contact` |
| `isSystem()` | `type` is `system` |
| `isAnonymous()` | `type` is `anonymous` |
| `isIdentified()` | `userId` or `contactUuid` is set |

The first four are type checks. `isIdentified()` is the useful one: it asks whether
the identity points at a durable record rather than at a pseudonym or an address,
which is the distinction that decides whether you may use it as a join key.

## Comparing two identities

```php
$a->equals($b);
```

Equality is **fail-closed**: it is asserted only from evidence, never from the
absence of contradiction.

1. Different `type`, or `$other` is `null` → `false`.
2. Both sides have an `id` → the answer is whether the two ids match. Nothing else
   is consulted.
3. Otherwise the identifying fields decide — `userId`, `contactUuid`, `anonymousId`,
   `email`. At least one must be set on **both** sides and equal, and no other field
   set on both sides may disagree.
4. If nothing is set on both sides, the answer is `false`.

::: warning This changed in 1.1.0. Check any code that deduplicates on `equals()`
Before 1.1.0 the method compared `type` and `id` only. Because `id` is `null` for
every identity without a durable record, two *different* people compared as equal on
a stock install: `IdentityContext::resolve('alice@example.com')` and
`resolve('bob@example.com')` both produced a contact-shaped identity with
`id => null`, and `equals()` said `true`.

The visible consequence of the fix:

```php
Identity::anonymous()->equals(Identity::anonymous());   // false since 1.1.0
```

Two anonymous visitors without an `anonymousId` are not the same person, and the
method no longer claims they are. **If you deduplicate, group or authorise on
`equals()`, review that code before upgrading.** Anywhere you relied on the old
"everything unidentified is one actor" behaviour, you now get separate actors.
:::

The asymmetry is the reason for the direction. The consumers of this package are an
activity ledger, a notification system and a preference centre. A wrong "same
person" merges real people's data, delivers a notification to the wrong recipient
and shows someone else's preferences. A wrong "different person" only misses a
deduplication.

## `pseudonymised()`

Drops `email`, `name` and `meta`; keeps the join keys.

```php
$identity->pseudonymised();
```

This is what a consumer calls to honour a retention rule **without losing the
ability to count what happened**. The purchase still happened, the actor is still
joinable to a row you may later delete, and no personal data remains in the record.

It is the mechanism behind `activity:anonymize`, and it is why anonymisation is
usually the right answer to a deletion request rather than deletion:

```bash
php artisan activity:anonymize --contact=<uuid>
```

## `toArray()` / `fromArray()`

Round-trip losslessly. The array keys are **snake_case** and match the column names
a persisting consumer will want:

```php
$identity->toArray();
// [
//   'type' => 'user',
//   'id' => '42',
//   'user_id' => '42',
//   'contact_uuid' => null,
//   'email' => 'a@example.com',
//   'name' => 'Adrian',
//   'anonymous_id' => null,
//   'meta' => [],
// ]

Identity::fromArray($array);
```

That is deliberate rather than incidental: a consumer can spread the array straight
into an insert, and a queued job can carry the identity as plain data.

## Types

`type` is a string, not an enum, so an application may define its own:

```php
Identity::system('api:acme');       // type "system"
new Identity(type: 'device', id: $device->serial);
```

The four built-in types have documented meanings:

| Type | Means |
| --- | --- |
| `user` | An authenticated principal of the host application |
| `contact` | A known person in the CRM who may never have logged in |
| `system` | No person. A scheduler, a webhook, a worker, an import. |
| `anonymous` | An unidentified visitor, with a pseudonymous session id |

Consumers filter on these, so an app-defined type is fine but should not collide
with one of the four.

## An email address is never an identifier

A contact resolved from an email address alone keeps `id` as **`null`**, and carries
the address in `email` only.

That is a privacy decision with a practical consequence: `id` being null tells a
consumer "I know who this is by address, not by record", which is exactly when it
should not be used as a join key. If you need an identifier, resolve the contact
first and set `contactUuid`.

## Putting one on a queue

Safe, because it is scalars:

```php
dispatch(new RecordPurchase($identity->toArray()));
```

Prefer this to passing a model. Capture the identity **at dispatch time** — by the
time the worker runs there is no request, no session and no authenticated user to
derive one from, and `current()` there would legitimately return
`Identity::system()`.
