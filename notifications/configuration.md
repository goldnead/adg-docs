# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=notifications-config
```

```php
use Goldnead\Notifications\Channels\DigestChannel;
use Goldnead\Notifications\Channels\InAppChannel;
use Goldnead\Notifications\Channels\MailChannel;

return [
    'enabled' => env('NOTIFICATIONS_ENABLED', true),

    'channels' => [
        'in_app' => InAppChannel::class,
        'mail' => MailChannel::class,
        'digest' => DigestChannel::class,
    ],

    'digest' => [
        'default_frequency' => env('NOTIFICATIONS_DIGEST_FREQUENCY', 'weekly'),
    ],

    'realtime' => [
        'enabled' => env('NOTIFICATIONS_REALTIME', false),
        'channel_prefix' => 'users',
    ],

    'list_limit' => 30,

    'preferences_url' => env('NOTIFICATIONS_PREFERENCES_URL'),
];
```

Six keys. Most of the addon's behaviour lives in **type registrations**, which are code rather than config —
see [Types](/notifications/types).

## `enabled`

```php
'enabled' => env('NOTIFICATIONS_ENABLED', true),
```

`false` makes `notify()` a no-op. Useful in a test suite, and useful as a kill switch when a producer has gone
haywire.

## `channels`

```php
'channels' => [
    'in_app' => InAppChannel::class,
    'mail' => MailChannel::class,
    'digest' => DigestChannel::class,
],
```

The channel registry. Add your own class here, or register it at runtime with
`Notifications::registerChannel()`.

The key is the name a type's `defaultChannels()` and a user's preferences refer to. Removing a key while
preferences still name it is worth avoiding — those rows become deviations against a channel that no longer
exists.

## `digest.default_frequency`

```php
'digest' => [
    'default_frequency' => env('NOTIFICATIONS_DIGEST_FREQUENCY', 'weekly'),
],
```

`daily` or `weekly`. The frequency used for a recipient who has not chosen one.

Daily covers a 24-hour window; weekly covers 7 days. Both are **real windows**, which is the point — see
[Channels & digests](/notifications/digests).

::: warning There is no scheduled send
Scheduling is deliberately left to the host, because a send window is an audience decision. Register the
command yourself:

```php
Schedule::command('notifications:send-digests --frequency=daily')->dailyAt('07:00');
Schedule::command('notifications:send-digests --frequency=weekly')->mondays()->at('08:00');
```

Without it, `digest`-channel notifications are collected and never sent. Nothing errors.
:::

## `realtime`

```php
'realtime' => [
    'enabled' => env('NOTIFICATIONS_REALTIME', false),
    'channel_prefix' => 'users',
],
```

Off by default. When enabled, a **content-free** refresh signal broadcasts on `users.{id}`; the client
re-fetches through the normal authorised endpoint.

That design is the security property: a socket subscriber can never see more than the API would have given
them. See [Realtime](/notifications/realtime).

## `list_limit`

```php
'list_limit' => 30,
```

How many notifications the list endpoint returns. The in-app bell is a recent view, not an archive — the
inspector is where you go for history.

## `preferences_url`

```php
'preferences_url' => env('NOTIFICATIONS_PREFERENCES_URL'),
```

Where your own preference centre lives, so notification mails can link to it.

Set it. A mail with no way to change how often you get one is a mail people mark as spam, and this addon has
no front-end preference screen of its own — `PreferenceResolver::matrixFor($user)` is what you build one
from. See [Preferences](/notifications/preferences).

## What is not configurable

- **The table name.** `notification_items`, deliberately not Laravel's `notifications`.
- **The uniqueness constraints.** One preference row per recipient/type/channel, one digest run per
  recipient/frequency/window start.
- **Whether the persisted row is written.** It always is. Preferences govern how somebody is *reached*, not
  whether it happened.
- **Whether unregistered types deliver.** They do, in-app, using whatever the producer passed — so a missing
  registration never silently swallows somebody's notification.

## Environment summary

```dotenv
NOTIFICATIONS_ENABLED=true
NOTIFICATIONS_DIGEST_FREQUENCY=weekly
NOTIFICATIONS_REALTIME=false
NOTIFICATIONS_PREFERENCES_URL=https://example.com/account/notifications
```
