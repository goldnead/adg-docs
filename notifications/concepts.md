# Concepts

<AddonHeader />

| Term | Means |
| --- | --- |
| **Notification item** | One persisted row: somebody was told something |
| **Type** | A registered definition: name, default channels, how it renders |
| **Channel** | How it is delivered: `in_app`, `mail`, `digest`, or your own |
| **Preference** | A per-recipient **deviation** from a type's default, per channel |
| **Digest** | A periodic summary covering a real window |
| **Digest source** | Another addon contributing things nobody was notified about |
| **Required type** | A type that ignores preferences. Security and legal only. |

## The three guarantees

**A recipient must be identifiable.** Notifying an anonymous visitor returns `null` — there would be no way
to ever show it to them again. (Activity has no such restriction: a pre-identification page view is a real
fact.)

**Notifying is idempotent** when you pass a `dedupe_key`. The same fact reaching two producers yields one
notification.

**Notifying never breaks the caller.** A mail transport error must not roll back the comment that caused it.
The corollary: a failed send is visible in `laravel.log` and nowhere else.

## The persisted row is always written

```
notify() → row written → channels consulted per preferences
```

Preferences govern **how somebody is reached**, not whether the thing happened. Turning off `in_app`
silences the realtime nudge; it does not erase history.

That asymmetry is deliberate and it is what makes the inspector able to answer "did this person get it" — the
question support actually asks — rather than "was this person willing to be told".

## Preferences are deviations

Stored **only** as deviations from the type's default. Absence means "use the default".

Which means **changing a default actually reaches everyone who never expressed an opinion**. A settings-row
design, where every user gets a row at first login, quietly freezes your defaults forever.

## Rendering is a callback, not a template

```php
$type->renderUsing(fn ($item) => [
    'message' => $item->actor_name.' hat dich erwähnt.',
    'link' => '/account/community/posts/'.$item->subject_id,
]);
```

The **host owns the wording and the URL structure**. The addon never hardcodes a sentence or a route.

That is precisely what made the system this replaces impossible to extract: its notification text and its
routes were baked into the package.

## Unregistered types still deliver

In-app, using whatever the producer passed. So a missing registration never silently swallows somebody's
notification.

::: danger But it is silently skipped in the digest
The type registry lives **per process**. A type registered ad hoc — inside a controller, a console one-off —
is unknown to the scheduled digest process, falls back to the `in_app` default, and is silently skipped
there. The notification exists and is never summarised.

That skipping is deliberate: it is what stops an immediate email being repeated days later. Which is exactly
why the registration has to be **global**, in a service provider.
:::

## Digests have a window and a record

Two things the system this replaces did not have.

**A window.** Daily covers 24 hours; weekly covers 7 days. The old digest took "everything currently unread",
which is unbounded and unrelated to the period being reported.

**A record of the send.** `notification_digest_runs` is unique on
(brand, recipient, frequency, window start), and every collected item is stamped `digested_at`. Without it,
an unread item went out **again every week** for as long as it stayed unread.

## Required types

```php
$type->required();
```

Ignores preferences. **For account security and legal notices only.**

Every type somebody marks required is a type somebody cannot turn off, and a package that lets you mark the
newsletter required has given you a way to lose your audience's trust.

## Not Laravel's notifications table

Deliberately. That schema has:

- **no brand column** — isolation would have to hide inside the JSON payload, which is exactly what
  brand-context exists to prevent
- **no dedupe key**
- **identification by `notifiable_type/id`** rather than by the identity the rest of the suite shares

The table here is `notification_items`, so enabling Laravel's database channel alongside it still works, and
existing `$user->notify()` call sites can route in through a channel. See
[Laravel interop](/notifications/laravel-interop).

## Brands

Brand-scoped, from the first migration. Dedupe keys are per brand and per recipient, so
`notifyMany()` with one key yields one notification each rather than one in total.

Uniqueness in this addon:

| Table | Unique on |
| --- | --- |
| `notification_preferences` | recipient, type, channel |
| `notification_digest_runs` | brand, recipient, frequency, window start |

```bash
php artisan notifications:uniqueness-integrity [--repair]
```

`migrate` reporting success is a different question from whether those indexes are in force. See
[Installation](/notifications/installation#verify-the-constraints-not-just-the-migration).
