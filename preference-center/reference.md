# Reference

<AddonHeader />

## Commands, permissions, tags

None. This package registers no Artisan command, no scheduled task, no permission, no Antlers
tag, no modifier, no fieldtype and no Control Panel surface. Its provider is a plain
`Illuminate\Support\ServiceProvider`.

## Routes

Prefix from `preference-center.routes.prefix`, default `!/preference-center`. Middleware from
`preference-center.routes.middleware`, default `['web']`.

| Method | Path | Name | Extra middleware |
| --- | --- | --- | --- |
| `GET` | `/request` | `preference-center.request` | — |
| `POST` | `/request` | `preference-center.request.send` | — |
| `GET` | `/link/{pcLink}` | `preference-center.link` | `ValidateSignature::absolute(…)` |
| `GET` | `/` | `preference-center.show` | `SetBrandFromLinkSession` |
| `POST` | `/` | `preference-center.update` | `SetBrandFromLinkSession` |
| `GET` | `/t/{pcToken}` | `preference-center.token` | `SetBrandFromRouteValue` |
| `POST` | `/t/{pcToken}` | `preference-center.token.update` | `SetBrandFromRouteValue` |

The last two are registered **only** when the marketing source is available. All parameter
names are prefixed `pc` to survive an application-wide `Route::bind()` registered elsewhere.

## The discovery interface

`Goldnead\PreferenceCenter\PreferenceCenter`. Public and semver-bound from 1.3.0.

```php
const ROUTE_TOKEN   = 'preference-center.token';
const ROUTE_SHOW    = 'preference-center.show';
const ROUTE_REQUEST = 'preference-center.request';

urlForToken(string $token): ?string    // absolute; null when this package cannot serve it
requestUrl(): ?string                  // absolute; null when the routes are off
```

## The facade

```php
use Goldnead\PreferenceCenter\Facades\PreferenceCenter;   // alias: PreferenceCenter

view(Access $access): PreferenceView
marketingCenter(Access $access): ?object
urlForToken(string $token): ?string
requestUrl(): ?string
```

Container alias: `preference-center`.

::: warning `method_exists()` on the facade is always false
Facade methods are forwarded through `__callStatic`. Probe
`class_exists(\Goldnead\PreferenceCenter\PreferenceCenter::class)` instead, or
`PreferenceCenter::getFacadeRoot()`.
:::

## Data objects

### `Data\Access`

```php
readonly Identity $identity;
readonly string   $proof;            // one of Proof::all()
readonly ?string  $email;
readonly int      $brandId;
readonly ?string  $marketingToken;

canStoreNotificationPreferences(): bool
```

The constructor asserts the proof is known and throws `InvalidArgumentException` otherwise.

### `Data\PreferenceView`

```php
readonly Access           $access;
readonly ?array           $lists;       // list<ListRow>, or null when marketing is absent
readonly ?array           $types;       // list<TypeRow>, or null when notifications is absent
readonly array            $channels;    // list<string>
readonly ?string          $frequency;
readonly SuppressionState $suppression;

hasLists(): bool
hasTypes(): bool
hasFrequency(): bool
mailChannels(): array                   // the install's channels ∩ Frequency::MAIL_CHANNELS
```

### `Data\ListRow`

```php
readonly string  $handle;
readonly string  $name;
readonly ?string $description;
readonly bool    $active;
readonly bool    $blocked;
readonly bool    $current;

state(): string      // 'blocked' | 'active' | 'inactive'
```

### `Data\TypeRow`

```php
readonly string $type;
readonly string $label;
readonly bool   $required;
readonly array  $channels;   // channel => ['enabled' => bool, 'locked' => bool, 'reason' => ?string]

isLocked(string $channel): bool      // true for an unknown channel
isEnabled(string $channel): bool
reason(string $channel): ?string
```

### `Data\SuppressionState`

```php
readonly bool $installed;
readonly bool $blocked;
readonly bool $unavailable;

static notInstalled(): self
blocksMail(): bool      // $blocked || $unavailable
```

## `Proof`

```php
Proof::UNSUBSCRIBE_TOKEN   // 'unsubscribe_token'
Proof::MAGIC_LINK          // 'magic_link'
Proof::SESSION             // 'session'

Proof::all(): array
Proof::assertKnown(string $proof): string
```

## `Frequency`

```php
Frequency::IMMEDIATE   // 'immediate'
Frequency::DAILY       // 'daily'
Frequency::WEEKLY      // 'weekly'
Frequency::NEVER       // 'never'
Frequency::MIXED       // 'mixed' — read back only, never settable
Frequency::MAIL_CHANNELS   // ['mail', 'digest']

Frequency::all(): array
Frequency::isKnown(string $value): bool
Frequency::toChannelState(string $choice): array
Frequency::fromChannelState(bool $anyMail, bool $anyDigest, string $storedDigestFrequency): string
```

## Sources

All three extend `Sources\Source` and are container singletons.

```php
key(): string
available(): bool       // enabled() && installed()
enabled(): bool         // reads preference-center.sources.{key}
installed(): bool       // class_exists(marker) || interface_exists(marker)
```

| Class | Marker |
| --- | --- |
| `Sources\MarketingSource` | `Goldnead\Marketing\Services\SubscriptionPreferences` |
| `Sources\NotificationsSource` | `Goldnead\Notifications\Preferences\PreferenceResolver` |
| `Sources\SuppressionSource` | `Goldnead\Suppression\Contracts\Gate` |

`NotificationsSource` also publishes the three lock reasons: `LOCK_REQUIRED` (`required`),
`LOCK_BLOCKED` (`blocked`), `LOCK_UNIDENTIFIED` (`unidentified`).

## Writing

```php
use Goldnead\PreferenceCenter\Writing\PreferenceWriter;

save(Access $access, array $input): WriteResult
unsubscribeFromEverything(Access $access): WriteResult
```

`$input` accepts `lists` (`list<string>` of handles), `types`
(`array<type, array<channel, bool>>`) and `frequency` (`string`). An absent key means the
block was not posted; a present-but-empty one means everything off.

```php
use Goldnead\PreferenceCenter\Writing\WriteResult;

array $changes;    // list<array{block, target, channel, to}>
array $refusals;   // list<array{key, reason}> — deduplicated
count(): int
hasChanges(): bool
reasons(): array
```

Refusal reasons: `blocked`, `required`, `unidentified`, `unknown`, `source_absent`.

## Events

| Event | Fired |
| --- | --- |
| `Events\PreferencesChanged` | Once per submission that applied at least one change |

```php
readonly Access $access;
readonly array  $changes;
consentProof(): string
```

## Listeners

| Listener | Listens to | Does |
| --- | --- | --- |
| `Listeners\RecordPreferenceChange` | `PreferencesChanged` | Logs to `audit.log_channel` with the identity pseudonymised; ingests a `preference_center.changed` timeline entry when LeadHub is installed and `audit.leadhub` is on |
| `Listeners\EndTheNoteOnLogin` | `Illuminate\Auth\Events\Login` | Forgets the magic-link session note. No-op where no session store is bound |

## Session keys

```php
Goldnead\PreferenceCenter\Http\SessionAccess::EMAIL      // 'preference-center.email'
Goldnead\PreferenceCenter\Http\SessionAccess::BRAND      // 'preference-center.brand'
Goldnead\PreferenceCenter\Http\SessionAccess::EXPIRES    // 'preference-center.expires'
Goldnead\PreferenceCenter\Http\SessionAccess::KEYS
```

## `TrackingParameters`

```php
TrackingParameters::RESERVED     // ['signature', 'expires'] — never ignorable
TrackingParameters::ignored()    // list<string>, cleaned from config
```

Names are filtered to `[A-Za-z0-9_.-]` and the reserved two are stripped, whatever the config
says.

## Publish tags

| Tag | Publishes to |
| --- | --- |
| `preference-center-config` | `config/preference-center.php` |
| `preference-center-views` | `resources/views/vendor/preference-center` |
| `preference-center-translations` | `lang/vendor/preference-center` |

There is no migration tag. This package owns no table.

## Translation namespaces

| File | Contents |
| --- | --- |
| `preference-center::public` | Every string on the two pages |
| `preference-center::mail` | The magic-link mail |
| `preference-center::audit` | The timeline summary line |

Shipped in `en` and `de`.

## Requirements

```
php                                  ^8.2
goldnead/statamic-brand-context      ^1.4|^1.5
goldnead/statamic-identity-contracts ^1.0
laravel/framework                    ^12.40|^13.0
statamic/cms                         ^6.0
```

Suggested: `goldnead/statamic-marketing`, `goldnead/statamic-notifications`,
`goldnead/statamic-suppression`, `goldnead/statamic-leadhub`.

Licence: MIT.
