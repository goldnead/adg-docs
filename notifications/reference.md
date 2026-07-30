# Reference

<AddonHeader />

## Console commands

| Command | Purpose |
| --- | --- |
| `notifications:send-digests --frequency= [--dry-run] [--now=…]` | Send digests for a window. **Not scheduled for you.** |
| `notifications:uniqueness-integrity [--repair]` | Verify the unique indexes and the rows in them |

`--frequency` is `daily` or `weekly`.

## Facade

```php
use Goldnead\Notifications\Facades\Notifications;
```

| Method | Notes |
| --- | --- |
| `notify($recipient, $type, array $data = [])` | Returns `null` for an unidentifiable recipient |
| `notifyMany($recipients, $type, array $data = [])` | `dedupe_key` is scoped **per recipient** |
| `registerType($handle, $callback)` | **Register in a service provider** |
| `registerChannel($name, $class)` | |
| `registerSource($name, $class)` | A digest source |

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
| `NotificationReceived` | A notification is persisted |

Namespace `Goldnead\Notifications\Events`.

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
| `view notifications` | the read-only inspector at **Tools → Notifications** |
| `manage notification digests` | digest operations |

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

| Key | Default |
| --- | --- |
| `enabled` | `true` |
| `channels.in_app` / `mail` / `digest` | the bundled classes |
| `digest.default_frequency` | `weekly` |
| `realtime.enabled` | `false` |
| `realtime.channel_prefix` | `users` |
| `list_limit` | `30` |
| `preferences_url` | unset |

## Environment variables

```dotenv
NOTIFICATIONS_ENABLED=true
NOTIFICATIONS_DIGEST_FREQUENCY=weekly
NOTIFICATIONS_REALTIME=false
NOTIFICATIONS_PREFERENCES_URL=
```

## Requirements

<Requirements queue="Recommended. The mail channel queues delivery." />

Requires `goldnead/statamic-brand-context` and `goldnead/statamic-identity-contracts`; both behave inertly in a
single-brand application.

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
