# Deferred delivery

<AddonHeader />

`Notifications::notify()` sends in the request. When the send should happen **later**, or must
survive a failing mail server, use the deferred queue (added in 1.11.0): the notification is
written now, and a command you run sends it with retries.

```php
use Goldnead\Notifications\Facades\Notifications;

Notifications::notifyDeferred($user, 'community.mention', [
    'subject' => $post,
    'message' => 'Bea hat dich erwähnt.',
    'link' => '/account/community/posts/'.$post->id,
    'dedupe_key' => 'mention:'.$mention->id,
]);
```

`notifyDeferred()` takes the same arguments as `notify()` and returns the `NotificationItem`
(`null` when the addon is disabled or the recipient cannot be identified).

## What it does

In **one transaction** it writes the notification and one `notification_deliveries` row per
channel that owes a send. The channels are `notifications.deferred.channels` (default `in_app`
and `mail`), minus any channel the recipient's [preferences](/notifications/preferences) turn
off, minus any channel that cannot take part (see below).

A repeated fact with the same `dedupe_key` returns the existing item and writes **no new rows**:
a delivery that is owed stays owed, and one that ended is not resurrected.

## Sending: the command

```bash
php artisan notifications:dispatch-pending --limit=100
```

Each run takes at most `--limit` due rows (default 100), oldest first, and sends them. It prints
how many were accepted, scheduled for retry, skipped, cancelled and failed.

**The addon schedules nothing.** Like the digest command, the cadence is yours:

```php
Schedule::command('notifications:dispatch-pending')->everyMinute();
```

Keep runs bounded. The row's lock is held while the channel sends, so a slow mail transport
under a huge `--limit` holds locks for as long as it is slow.

## What a row can become

| Status | |
| --- | --- |
| `pending` | Written, not sent yet. |
| `retry` | A send failed; it is due again after the backoff. |
| `accepted` | The channel took it. Terminal. For mail this is acceptance by the transport, **not** inbox delivery. |
| `skipped` | Deliberately not sent, and retrying would not change that. Terminal. |
| `cancelled` | The recipient could no longer be resolved. Terminal. |
| `failed` | Out of attempts. Terminal. |

Terminal rows are never reset, neither by a retry nor by the same fact arriving again.

`outcome_code` records why, in a fixed vocabulary and never in free text or with an address:
`accepted_by_transport`, `in_app_durable`, `no_address`, `suppressed`,
`suppression_unavailable`, `transport_error`, `sender_refused`, `recipient_unresolvable`,
`preference_disabled`, `channel_unknown`, `channel_not_deferred`.

## Retry and backoff

Each failed attempt raises `attempts` by one. The delay after the nth failed attempt is
`backoff_seconds × 2^(n-1)`; once `attempts` reaches `max_attempts` the row is `failed`.

```php
// config/notifications.php
'deferred' => [
    'channels' => ['in_app', 'mail'],
    'max_attempts' => env('NOTIFICATIONS_DEFERRED_MAX_ATTEMPTS', 5),
    'backoff_seconds' => env('NOTIFICATIONS_DEFERRED_BACKOFF', 60),
],
```

## Who it is sent to: resolved at send time

The item stores who the recipient *was*. For a send that happens later that is not good enough:
an address read from it can be stale. So the dispatcher asks a
`Goldnead\Notifications\Contracts\DeferredRecipientResolver` for the **current** identity. The
default resolves Statamic users. A site whose recipients live elsewhere (a CRM, a members table)
rebinds that interface.

If the resolver returns `null`, the row is `cancelled` with `recipient_unresolvable`. The
dispatcher never falls back to the address stored on the item.

Preferences are checked **again** at send time: if the person switched the channel off in the
meantime, the row ends `skipped` with `preference_disabled`, and does not come back if they
switch it on again.

## Which channels can carry a row

Only channels that implement `Goldnead\Notifications\Contracts\DeferredChannel`: in-app and mail.
The plain `Channel::send(): void` cannot say whether a mail left, was withheld or failed, so a
channel with only that gets no deferred rows, and is never counted as accepted. A closure
registration cannot be inspected for the interface and gets none either.

To take part, a custom channel adds:

```php
public function sendDeferred(NotificationItem $item, Identity $recipient): DeferredChannelOutcome;
```

and returns `DeferredChannelOutcome::accepted($code)`, `::skipped($code)` or `::retry($code)`.
Throw only for the genuinely unexpected: an exception is treated as a transport error, reported
and retried.

## What it promises, and what it does not

- **At least once.** A crash after the transport accepted a mail but before the row was committed
  leaves the row due, and the next run sends again. A duplicate mail is possible in that window;
  a lost notification is not.
- **Brand-safe.** Each row is sent in the brand of its item, not the worker's ambient one.
- **Off means off.** A run while the addon is disabled sends nothing and leaves the rows as
  they are.

Run `php artisan migrate` after updating to 1.11.0: it adds `notification_deliveries`.
