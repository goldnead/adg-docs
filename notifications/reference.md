# Reference

<AddonHeader />

## Console commands

| Command | Purpose |
| --- | --- |
| `notifications:send-digests [--frequency=] [--brand=] [--now=…] [--dry-run]` | Send digests for a window. **Not scheduled for you.** |
| `notifications:uniqueness-integrity [--database=] [--repair]` | Verify the unique indexes and the rows in them |

| Option | Meaning |
| --- | --- |
| `--frequency=` | `daily` or `weekly`. Default `weekly`. Anything else fails the command. |
| `--brand=` | Restrict to one brand handle or id. Default: every brand. A console run has no current brand, so the command walks them itself. |
| `--now=` | Treat this timestamp as "now". For tests and catch-up runs. |
| `--dry-run` | Report what would be sent without sending or marking anything digested. |
| `--database=` | The connection to inspect. Default: the configured one. |
| `--repair` | Rebuild the uniqueness indexes, only if nothing would have to be deleted for them. |

## Facade

```php
use Goldnead\Notifications\Facades\Notifications;
```

**Writing**

| Method | Returns | Notes |
| --- | --- | --- |
| `notify($recipient, $type, array $attributes = [])` | `?NotificationItem` | `null` for an unidentifiable recipient |
| `notifyMany($recipients, $type, array $attributes = [])` | `Collection` | `dedupe_key` is scoped **per recipient** |
| `markRead($item)` | `void` | Takes a `NotificationItem` or its integer id |
| `markAllRead($recipient)` | `int` | The number of rows marked |

**Reading**

| Method | Returns | Notes |
| --- | --- | --- |
| `forRecipient($recipient, ?int $limit = null)` | `Collection` | Falls back to `list_limit` (default 30) |
| `unreadCount($recipient)` | `int` | |
| `render($item)` | `array` | `['message' => …, 'link' => …, 'title' => …]` through the type's renderer |
| `enabled()` | `bool` | The `notifications.enabled` master switch |

These four are what you build a bell out of. There is no HTTP endpoint in the package for them —
routing is yours, which is what lets the endpoint enforce your own authorisation. See
[Realtime](/notifications/realtime).

**Registering**

| Method | Returns | Notes |
| --- | --- | --- |
| `registerType($handle, ?Closure $configure = null)` | `NotificationType` | **Register in a service provider** |
| `registerChannel(string $handle, $channel)` | `void` | Class name or closure. Must satisfy `Contracts\Channel`. |
| `registerSource(string $handle, $source)` | `void` | Class name or closure. Must satisfy `Contracts\DigestSource`. |

**Registries**

| Method | Returns |
| --- | --- |
| `types()` | `TypeRegistry` |
| `channels()` | `ChannelRegistry` |
| `sources()` | `SourceRegistry` |
| `preferences()` | `PreferenceResolver` |

## Contracts

```php
namespace Goldnead\Notifications\Contracts;
```

| Contract | Method | Purpose |
| --- | --- | --- |
| `Channel` | `send(NotificationItem $item, Identity $recipient): void` | A delivery route for an already-persisted notification |
| `DigestSource` | `collect(Identity $recipient, Carbon $windowStart, Carbon $windowEnd): array` | Contribute to a digest without owning notifications |
| `RecipientDirectory` | `digestRecipients(string $frequency): iterable` | Answer "who should the digest command walk?" |

::: warning Implement the interface, or the registration does nothing
Neither registry validates at registration time, and the two fail differently afterwards.

`SourceRegistry::collect()` resolves each source and `continue`s past anything that is not a
`DigestSource`. No exception, no log line: the source simply never contributes, and a digest that
is missing a section looks identical to a digest that had nothing to add.

`ChannelRegistry::resolve()` declares a `Channel` return type, so a class that does not implement
it raises a `TypeError` — which `NotificationManager` reports and swallows along with every other
channel failure, because one broken channel must not stop the others. The notification is still
persisted; that route just never delivers.

In both cases the visible symptom is "nothing happened". Check the `implements` clause before
looking anywhere else.
:::

`RecipientDirectory` is bound to `Digest\PendingItemRecipientDirectory`, which derives the
recipient list from the pending notifications themselves. That is always correct and never
complete: somebody with nothing pending is not walked, so a source that would have contributed
something for them never gets asked. Rebind the contract when your people live somewhere the
notifications do not know about — a users table, a CRM, a config list of operator addresses.

### `notify()` data

| Key | Notes |
| --- | --- |
| `actor` | Anything `IdentityContext` can resolve |
| `subject` | Any Eloquent model, stored polymorphically |
| `message` | Fallback text; the type's `renderUsing()` wins |
| `link` | Fallback URL |
| `dedupe_key` | The fact's fingerprint |

### Type builder

```php
Notifications::registerType('community.mention', function ($type) {
    $type->label('Erwähnung')
        ->defaultChannels(['in_app', 'mail'])
        ->required()                            // ignores preferences
        ->renderUsing(fn ($item) => ['message' => …, 'link' => …]);
});
```

## Preferences

```php
$preferences = app(PreferenceResolver::class);

$preferences->set($user, 'community.mention', 'mail', false);
$preferences->matrixFor($user);
```

Stored **only as deviations**. Absence means "use the type's default".

## Channels

| Channel | Class | Behaviour |
| --- | --- | --- |
| `in_app` | `InAppChannel` | the row itself, plus an optional realtime nudge |
| `mail` | `MailChannel` | one e-mail per notification, rendered through the type |
| `digest` | `DigestChannel` | no-op at notify time; waits for the digest run |

## Laravel channel

```php
public function via($notifiable): array { return ['notifications']; }

public function toNotifications($notifiable): array
{
    return ['type' => 'crm.lead_assigned', 'message' => '…', 'link' => '…'];
}
```

## Events

| Event | Fired when |
| --- | --- |
| `NotificationReceived` | An `in_app` delivery happens **and** realtime is on **and** the recipient has a `userId` |

Namespace `Goldnead\Notifications\Events`. It is dispatched from `Realtime\BroadcastAdapter`,
which is called only by `InAppChannel` — so all three conditions have to hold:

1. `notifications.realtime.enabled` is `true` (it is `false` by default),
2. the recipient's preferences allow the `in_app` channel for that type,
3. `$recipient->userId` is not `null`, which excludes contact-only recipients.

It is **not** an "a notification was persisted" hook. Rows are written for recipients who allow no
channel at all, and no event fires for them. There is no event that observes persistence.

## Realtime

| | |
| --- | --- |
| Channel | `{channel_prefix}.{user id}`, default `users.{id}` |
| Payload | **content-free** refresh signal |
| Client behaviour | re-fetch through the normal authorised endpoint |

A socket subscriber can never see more than the API would have given them.

## Permissions

| Permission | Grants |
| --- | --- |
| `view notifications` | the read-only inspector at **Tools → Notifications**, and the nav item |
| `manage notification digests` | **nothing today.** See below. |

`view notifications` is the only one with an effect. It gates the nav item and all three
controller actions.

::: warning `manage notification digests` is registered but never checked
It exists in the permission tree, as a child of `view notifications`, so it appears in a role
editor and can be granted. Nothing in the package reads it: the digest commands run from the
console and authorise nothing, and there is no Control Panel surface for digest operations to
gate.

Granting or withholding it changes no behaviour. Do not build a policy around it, and do not
tell an operator it restricts anything.
:::

## Database

| Table | Unique on |
| --- | --- |
| `notification_items` | — |
| `notification_preferences` | recipient, type, channel |
| `notification_digest_runs` | brand, recipient, frequency, window start |

Every collected digest item is stamped `digested_at`.

::: danger Installs created before 1.0.4
Could hold duplicate preference rows for **contact** recipients, because the unique of the day led with
`user_id` and no engine constrains a NULL.

Where those rows exist, `migrate` stops and names them rather than choosing between them. Delete the rows that
are not the ones to keep, then migrate again. `--repair` rebuilds the index alone once nothing is in the way.
:::

## Configuration

| Key | Default | Environment variable |
| --- | --- | --- |
| `enabled` | `true` | `NOTIFICATIONS_ENABLED` |
| `channels.in_app` / `mail` / `digest` | the bundled classes | — |
| `digest.default_frequency` | `weekly` | `NOTIFICATIONS_DIGEST_FREQUENCY` |
| `realtime.enabled` | `false` | `NOTIFICATIONS_REALTIME` |
| `realtime.channel_prefix` | `users` | — |
| `list_limit` | `30` | — |
| `cp.enabled` | `true` | `NOTIFICATIONS_CP_ENABLED` |
| `sources.leadhub` | `true` | `NOTIFICATIONS_SOURCE_LEADHUB` |
| `preferences_url` | unset | `NOTIFICATIONS_PREFERENCES_URL` |

## Environment variables

```dotenv
NOTIFICATIONS_ENABLED=true
NOTIFICATIONS_DIGEST_FREQUENCY=weekly
NOTIFICATIONS_REALTIME=false
NOTIFICATIONS_CP_ENABLED=true
NOTIFICATIONS_SOURCE_LEADHUB=true
NOTIFICATIONS_PREFERENCES_URL=
```

## Publish tags

```bash
php artisan vendor:publish --tag=notifications-config
php artisan vendor:publish --tag=notifications-migrations
php artisan vendor:publish --tag=notifications-views
```

## Requirements

<Requirements php="8.3+" statamic="6.0+" laravel="12.x / 13.x" queue="Only for realtime broadcasts. Mail is sent synchronously." />

Requires `goldnead/statamic-brand-context`, `goldnead/statamic-identity-contracts` and
`goldnead/statamic-suppression`, all three as hard requires. Brand Context behaves inertly in a
single-brand application. **PHP `^8.3`**, which is stricter than the rest of the suite. See
[Installation](/notifications/installation).

## Guarantees

| | |
| --- | --- |
| Recipient | must be identifiable; notifying an anonymous visitor returns `null` |
| Idempotency | with a `dedupe_key`, one fact from two producers yields one notification |
| `notifyMany()` | the dedupe key is scoped per recipient automatically |
| Failure | logged and swallowed; a mail error never rolls back the caller |
| The persisted row | **always written**, whatever the preferences say |
| Preferences | deviations only, so changing a default reaches everyone silent |
| Unregistered types | still deliver in-app; **silently skipped in the digest** |
| Digests | a real window, plus a unique run record so nothing repeats |
| Digest sources | a failing source is reported and skipped, never fatal |
| Realtime | content-free signal; the endpoint enforces authorisation |
| Brand scoping | yes; digest runs are unique per brand |
| Laravel's table | untouched; its database channel still works |

## Not in v1

Webhook and push channels · quiet hours · timezone-aware send windows · frequency caps · notification
templates · automatic retention of old notification rows.

All of the first five need a scheduler with timezone logic, and without real operational data their design
would be guessed rather than derived.
