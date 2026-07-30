# Notifications

<AddonHeader />

Persisted, brand-scoped notifications: types, per-type preferences, in-app delivery, immediate mail, and
digests that do not repeat themselves.

```php
use Goldnead\Notifications\Facades\Notifications;

Notifications::notify($user, 'community.mention', [
    'actor' => $author,               // anything IdentityContext can resolve
    'subject' => $post,               // any Eloquent model
    'message' => 'Bea hat dich erwähnt.',
    'link' => '/account/community/posts/'.$post->id,
    'dedupe_key' => 'mention:'.$mention->id,
]);
```

## Why it exists

This pattern gets reinvented. In this family it happened **three times**: a runtime aggregation over
community tables, a CRM addon's own mail notifier with its own digest command, and Laravel's built-in system
used purely as a mail sender.

None of them could be reused by the next domain that needed notifying, which is what this package fixes.

## What you get

- **Registered types** — a name, default channels, and a rendering callback
- **Preferences** per type × channel, stored **only as deviations**
- **Channels** — `in_app`, `mail`, `digest`, and your own
- **Digests** with a real window and a record of the send
- **Idempotency** via a dedupe key
- **A read-only CP inspector** at **Tools → Notifications**
- **Optional realtime** — a content-free refresh signal

## Three guarantees

**A recipient must be identifiable.** Notifying an anonymous visitor returns `null` — there would be no way
to ever show it to them again.

**Notifying is idempotent** when you pass a `dedupe_key`: the same fact reaching two producers yields one
notification.

**Notifying never breaks the caller.** A mail transport error must not roll back the comment that caused it.

## The two things the system it replaces got wrong

**A digest needs a window.** Daily covers 24 hours, weekly covers 7 days. The old digest took "everything
currently unread", which is unbounded and unrelated to the period being reported.

**A digest needs a record of the send.** `notification_digest_runs` is unique on
(brand, recipient, frequency, window start), and every collected item is stamped `digested_at`. Without
that, an unread item went out **again every week** for as long as it stayed unread.

## Preferences are deviations, not settings

Absence means "use the type's default", so **changing a default actually reaches everyone who never
expressed an opinion**.

Note the asymmetry: **the persisted row is always written**, because it is the record that this happened.
Preferences govern how somebody is *reached* — turning off `in_app` silences the realtime nudge, it does not
erase history.

## Not Laravel's notifications table

Deliberately. That schema has no brand column — isolation would have to hide inside the JSON payload, which
is exactly what brand-context exists to prevent — no dedupe key, and it identifies people by
`notifiable_type/id` rather than by the identity the rest of the suite shares.

The table here is `notification_items`, so enabling Laravel's database channel alongside it still works.
Existing `$user->notify()` call sites can route in through a channel; see
[Laravel interop](/notifications/laravel-interop).

## Not in v1

Named plainly: webhook and push channels, quiet hours, timezone-aware send windows, frequency caps,
notification templates.

All of them need a scheduler with timezone logic, and without real operational data their design would be
guessed rather than derived.

## Next

- [Installation](/notifications/installation)
- [Configuration](/notifications/configuration)
- [Concepts](/notifications/concepts)
- [Notifying](/notifications/notifying)
- [Types](/notifications/types) — including where to register them
- [Preferences](/notifications/preferences)
- [Channels & digests](/notifications/digests)
- [Realtime](/notifications/realtime)
- [Laravel interop](/notifications/laravel-interop)
