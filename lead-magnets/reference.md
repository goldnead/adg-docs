# Reference

<AddonHeader />

## Routes

### Public

Prefix from `lead-magnets.routes.prefix`, default `!/lead-magnets`. All three are in the `web`
group.

| Method | Path | Name | Middleware |
| --- | --- | --- | --- |
| `POST` | `/request` | `lead-magnets.request` | `SetBrandFromRouteValue:…Resource,handle,resource`, `throttle:10,1` |
| `GET` | `/confirm/{token}` | `lead-magnets.confirm` | `SetBrandFromConfirmationToken:token` |
| `GET` | `/download/{grant}` | `lead-magnets.download` | `signed`, `SetBrandFromRouteValue:…Grant,id,grant` |

`{grant}` is constrained to digits. The throttle string is baked in at route registration and does
not follow a runtime config change.

### Control Panel

Prefix `lead-magnets`, names carry Statamic's `statamic.cp.` prefix. Every write route has both a
`can:` middleware and an in-controller authorisation check.

| Method | Path | Name | Permission |
| --- | --- | --- | --- |
| `GET` | `resources` | `lead-magnets.resources.index` | `view lead magnets` |
| `GET` | `resources/create` | `lead-magnets.resources.create` | `manage lead magnets` |
| `POST` | `resources` | `lead-magnets.resources.store` | `manage lead magnets` |
| `GET` | `resources/{resource}` | `lead-magnets.resources.show` | `view lead magnets` |
| `GET` | `resources/{resource}/edit` | `lead-magnets.resources.edit` | `manage lead magnets` |
| `PATCH` | `resources/{resource}` | `lead-magnets.resources.update` | `manage lead magnets` |
| `DELETE` | `resources/{resource}` | `lead-magnets.resources.destroy` | `manage lead magnets` |
| `POST` | `grants/{grant}/revoke` | `lead-magnets.grants.revoke` | `manage lead magnet grants` |
| `POST` | `grants/{grant}/reinstate` | `lead-magnets.grants.reinstate` | `manage lead magnet grants` |
| `POST` | `grants/{grant}/resend` | `lead-magnets.grants.resend` | `manage lead magnet grants` |

The middleware is what a reader of the route file can verify; the controller check is what
survives a route being re-registered elsewhere or an action being called from a console command.

## Permissions

Group `lead_magnets`.

| Permission | Covers |
| --- | --- |
| `view lead magnets` | The listing and the detail screen |
| `manage lead magnets` | Create, edit and delete resources |
| `manage lead magnet grants` | Revoke, reinstate and re-send access |

The two `manage` permissions are genuinely separate: one lets an editor change what is on offer,
the other lets them change somebody's access.

## The facade

```php
use Goldnead\LeadMagnets\Facades\LeadMagnets;   // alias: LeadMagnets

resource(string $handle): ?Resource             // does not filter `published`
request(Resource $resource, string $email, array $meta = []): Grant
confirm(string $token): ?Grant
findGrant(Resource $resource, string $email): ?Grant
downloadUrl(Grant $grant): string
revoke(Grant $grant, string $reason): Grant
reinstate(Grant $grant): Grant
entitlementFor(Grant $grant): ?Entitlement
```

Resolves `Goldnead\LeadMagnets\LeadMagnetsManager`, which is autowired rather than bound. Nothing
on it throws.

## State

`GrantState` was removed in 3.0. The states come from
`Goldnead\Entitlements\Enums\EntitlementState`.

```php
$grant->state(): EntitlementState      // Pending, Active, Revoked, Expired, and the two it never writes
$grant->stateValue(): string           // the same, as the string that goes into a payload
$grant->isActive(): bool
$grant->isPending(): bool
$grant->hasLapsed(): bool              // state() === Expired
$grant->isRedeemable(): bool           // state()->grantsAccess() and downloads left
$grant->confirmationLapsed(): bool     // the token's own window, not the access
Grant::query()->inState(EntitlementState $state)
```

`isRedeemable()` gates delivery. See [Grant state](/lead-magnets/grant-state).

## Services

```php
Services\GrantService
    request(Resource $resource, string $email, array $meta = []): Grant
    findByToken(string $token): ?Grant            // any state, or null
    activate(Grant $grant): bool                  // true only for the call that won
    revoke(Grant $grant, string $reason): bool    // no event of this package's own
    reinstate(Grant $grant): Grant                // no event, no re-confirmation
    sweepExpiredTokens(): int                     // confirmation tokens only
    recordDownload(Grant $grant, array $context = []): Download

Services\DeliveryService
    sendConfirmation(Grant $grant): bool
    deliver(Grant $grant): bool

Services\DownloadLink
    for(Grant $grant, ?Carbon $expiresAt = null): string
```

Both delivery methods return `false` rather than throwing: `sendConfirmation()` when there is no
plaintext token or the address is suppressed, `deliver()` when the grant is not redeemable or the
address is suppressed.

## Support

```php
Support\ConfirmationToken
    static mint(): string                                  // bin2hex(random_bytes(32))
    static hash(string $token): string                     // sha256
    static matches(string $token, ?string $hash): bool      // hash_equals

Support\EmailNormalizer
    static normalize(?string $email): string
```

`normalize()` trims and lowercases both sides of the **last** `@`. Dots and `+tags` are preserved.
Input with no `@` is lowercased and returned.

## Models

### `Models\Resource`

```php
const TYPE_FILE = 'file';
const TYPE_LINK = 'link';

$casts = [
    'requires_confirmation' => 'boolean', 'published' => 'boolean',
    'link_ttl' => 'integer', 'max_downloads' => 'integer',
    'grant_ttl_days' => 'integer', 'tags' => 'array',
];

grants(): HasMany

linkTtlMinutes(): int        // resource, then config, floor 1
maxDownloads(): ?int         // resource, then config, null stays null
grantTtlDays(): ?int         // the same shape
tagList(): array
isLink(): bool
disk(): string               // file_disk, then delivery.disk, then filesystems.default
```

### `Models\Grant`

```php
$hidden = ['token_hash'];
public ?string $plainToken = null;   // in-memory only, never persisted or serialised

resource(): BelongsTo
downloads(): HasMany

isActive(): bool
isPending(): bool
hasLapsed(): bool             // state() === Expired
downloadsExhausted(): bool
isRedeemable(): bool          // state()->grantsAccess() && ! downloadsExhausted()
confirmedAt(): ?CarbonImmutable
revokedAt(): ?CarbonImmutable
accessEndsAt(): ?CarbonImmutable
```

Scopes `active()` and `pending()` exist and are called by nothing in the package.

### `Models\Download`

```php
$casts = ['downloaded_at' => 'datetime'];

grant(): BelongsTo
```

## Events

Base class `Events\GrantEvent`, `readonly Grant $grant`, with `payload(): array`.

| Event | Extra |
| --- | --- |
| `Events\ResourceRequested` | |
| `Events\ResourceConfirmed` | |
| `Events\ResourceDelivered` | |
| `Events\ResourceDownloaded` | `readonly Download $download`; payload adds `download_id`, `downloaded_at` |

Payload keys: `grant_id`, `email`, `contact_id`, `state`, `download_count`, `brand_id`, and
`resource` as `id`, `handle`, `title`, `delivery_type`.

No payload carries `token_hash`, the plaintext token or a signed URL.

## Bridges

All extend `Integrations\Bridge`.

| Class | Marker probed | Methods probed on the facade root |
| --- | --- | --- |
| `Integrations\LeadhubBridge` | `Goldnead\Leadhub\Facades\LeadHub` | `findByEmail`, `create`, `addTag` |
| `Integrations\MarketingBridge` | `Goldnead\Marketing\Services\SubscriptionService` and `…\Contracts\Repositories\MailingListRepository` | `subscribe` |
| `Integrations\EmailTemplatesBridge` | `Goldnead\EmailTemplates\Facades\EmailTemplates` | `resolve` |
| `Integrations\SuppressionBridge` | `Goldnead\Suppression\Facades\SuppressionGate` | `isSuppressed` |
| `Integrations\ActivityBridge` | `Goldnead\Activity\Facades\Activity` | `record` |

Activity types: `lead-magnets.resource.requested`, `.confirmed`, `.delivered`, `.downloaded`.

`Integrations\SiblingBridges` is the only explicit container binding in the package, registered as
a singleton.

## Schema

### `lead_magnet_resources`

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | `bigIncrements` | no | |
| `brand_id` | `unsignedBigInteger`, indexed | no | |
| `handle` | `string(191)`, **globally unique** | no | |
| `title` | `string(255)` | no | |
| `description` | `text` | yes | |
| `delivery_type` | `string(16)` | no | `'file'` |
| `file_path` | `string(255)` | yes | |
| `file_disk` | `string(64)` | yes | |
| `link_url` | `text` | yes | |
| `requires_confirmation` | `boolean` | no | `true` |
| `published` | `boolean` | no | `true` |
| `link_ttl` | `unsignedInteger` | yes | |
| `max_downloads` | `unsignedInteger` | yes | |
| `grant_ttl_days` | `unsignedInteger` | yes | |
| `tags` | `json` | yes | |
| `marketing_list` | `string(191)` | yes | |
| `created_at`, `updated_at` | `timestamps` | yes | |

Composite index `(brand_id, published)`.

### `lead_magnet_grants`

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | `bigIncrements` | no | |
| `brand_id` | `unsignedBigInteger`, indexed | no | |
| `resource_id` | `unsignedBigInteger`, indexed | no | |
| `email` | `string(191)` | no | |
| `contact_id` | `string(64)`, indexed | yes | |
| `entitlement_id` | `unsignedBigInteger`, unique | yes | |
| `attempt` | `unsignedInteger` | no | `1` |
| `token_hash` | `string(64)`, unique | yes | |
| `requested_at`, `confirm_expires_at`, `delivered_at` | `timestamp` | yes | |
| `download_count` | `unsignedInteger` | no | `0` |
| `meta` | `json` | yes | |
| `created_at`, `updated_at` | `timestamps` | yes | |

Unique `(brand_id, resource_id, email)`. `token_hash` is unique across all brands, which is what
lets the confirm route derive a brand from it. `entitlement_id` is unique too: one grant, one
entitlement.

`state`, `confirmed_at`, `revoked_at` and `expires_at` were dropped in 3.0. The first three are
answered by the entitlement now (`state()`, `confirmedAt()`, `revokedAt()`), and `expires_at`
split in two: the token's deadline stayed here as `confirm_expires_at`, and the access lifetime
belongs to the entitlement. The migration that drops them refuses to run while any grant is
still unlinked.

### `lead_magnet_downloads`

| Column | Type | Null |
| --- | --- | --- |
| `id` | `bigIncrements` | no |
| `brand_id` | `unsignedBigInteger`, indexed | no |
| `grant_id` | `unsignedBigInteger`, indexed | no |
| `downloaded_at` | `timestamp` | yes |
| `ip_hash` | `string(64)` | yes |
| `user_agent` | `string(255)` | yes |
| `created_at`, `updated_at` | `timestamps` | yes |

**There are no foreign keys in any of the three tables.**

## Commands and scheduling

```
php artisan lead-magnets:sweep
```

Marks grants whose lifetime has passed as expired and clears their tokens. Returns the count.

Scheduled hourly with `onOneServer()` and the name `lead-magnets-sweep`, registered for you. The
duplicate guard checks that name, because a provider that boots twice would otherwise register the
command twice.

No access decision depends on the sweep having run.

## Publish tags

| Tag | Publishes |
| --- | --- |
| `lead-magnets-config` | `config/lead-magnets.php` |
| `lead-magnets-views` | `resources/views/vendor/lead-magnets` |
| `lead-magnets-translations` | `lang/vendor/lead-magnets` |

The third is not documented in the README.

There is no migrations tag, and the Control Panel bundle is not a publish tag either: it is
fetched from the GitHub release by `pixelfear/composer-dist-plugin`.

## Views

| View | What it is |
| --- | --- |
| `lead-magnets::layout` | Plain, `noindex, nofollow`, CSS inlined, does not extend the site layout |
| `lead-magnets::confirmed` | The confirmation page. Branches on `data-state` |
| `lead-magnets::mail.confirmation` and `.confirmation-text` | The confirmation mail, both parts |
| `lead-magnets::mail.delivery` and `.delivery-text` | The delivery mail, both parts |

## Translations

Namespace `lead-magnets`, shipped in `en` and `de`. Seven PHP files per language plus a flat JSON
file for the Control Panel's Vue layer.

Key parity between the two languages is asserted in both directions, for the JSON and for every
PHP file.

## Requirements

```
php                             ^8.2
goldnead/statamic-brand-context ^1.5|^1.6|^1.7
pixelfear/composer-dist-plugin  ^0.1
laravel/framework               ^12.40|^13.0
statamic/cms                    ^6.0
```

Suggested: `goldnead/statamic-leadhub`, `goldnead/statamic-marketing`,
`goldnead/statamic-email-templates`, `goldnead/statamic-suppression`,
`goldnead/statamic-activity`.

Licence: Commercial: `composer.json` says `proprietary`. See [Licensing](/guide/licensing) for how
the commercial addons in the suite resolve their licence.

Tested against SQLite and MySQL 8. There are no Antlers tags, no fieldtypes and no widgets.
