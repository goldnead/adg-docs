# Reference

<AddonHeader />

## Commands

| Command | Does |
| --- | --- |
| `suppression:suppress --email= [--reason=] [--brand=] [--notes=] [--actor=]` | Block an address from every send path. `--reason` defaults to `manual` |
| `suppression:release --email= [--brand=] [--reason=] [--actor=] [--force]` | Release a suppression. `--force` and `--reason` are required for a complaint |

`--actor` defaults to the OS user in both. `--brand` is ignored for globally scoped reasons.

## The gate

```php
use Goldnead\Suppression\Contracts\Gate;

isSuppressed(string $email, ?int $brandId = null): bool
suppressedAmong(iterable $emails, ?int $brandId = null): array   // keyed by normalized address
```

Throws `SuppressionCheckFailed` rather than returning `false` when it cannot answer.

## The service

```php
use Goldnead\Suppression\Facades\Suppression;

suppress(string $email, string $reason, array $attributes = []): ?Suppression
release(string $email, array $context = [], ?int $brandId = null): Suppression
releaseComplaint(string $email, string $actor, string $reason, ?int $brandId = null, array $context = []): Suppression
recordSoftBounce(string $email, array $attributes = []): ?Suppression
recordDelivery(string $email, array $attributes = []): void
find(string $email, ?int $brandId = null): ?Suppression
historyFor(string $email, ?int $brandId = null)
brandIdFor(string $reason, ?int $brandId = null): int
softBounceThreshold(): int
softBounceWindowDays(): int
```

## Reasons

| Constant | Value | Default scope |
| --- | --- | --- |
| `Reasons::HARD_BOUNCE` | `hard_bounce` | global |
| `Reasons::INVALID_EMAIL` | `invalid_email` | global |
| `Reasons::SOFT_BOUNCE_THRESHOLD` | `soft_bounce_threshold` | global |
| `Reasons::PROVIDER_IMPORT` | `provider_import` | global |
| `Reasons::COMPLAINT` | `complaint` | brand |
| `Reasons::MANUAL` | `manual` | brand |

`Reasons::GLOBAL_BRAND_ID` is `0`. `Reasons::SCOPE_GLOBAL` and `Reasons::SCOPE_BRAND` are the
two values a scope may take.

## Exceptions

| Thrown | When |
| --- | --- |
| `SuppressionCheckFailed` | The gate cannot answer. **Do not catch and continue** |
| `ComplaintReleaseRefused` | `release()` was called on a complaint |
| `IncompleteAuditTrail` | A release could not be logged, so it did not happen |

## Configuration

| Key | Default |
| --- | --- |
| `scopes.hard_bounce` | `global` |
| `scopes.invalid_email` | `global` |
| `scopes.soft_bounce_threshold` | `global` |
| `scopes.provider_import` | `global` |
| `scopes.complaint` | `brand` |
| `scopes.manual` | `brand` |
| `soft_bounce.threshold` | `5` — `SUPPRESSION_SOFT_BOUNCE_THRESHOLD` |
| `soft_bounce.window_days` | `30` — `SUPPRESSION_SOFT_BOUNCE_WINDOW_DAYS` |
| `release.min_reason_length` | `20` — `SUPPRESSION_MIN_REASON_LENGTH` |

## Publish tags

```bash
php artisan vendor:publish --tag=suppression-config
php artisan vendor:publish --tag=suppression-migrations
```

## Tables

| Table | Shape |
| --- | --- |
| `suppressions` | Current state, one row per (brand, address). `brand_id` `NOT NULL DEFAULT 0` |
| `suppression_events` | Append-only. `dedupe_key` nullable and unique. Refuses updates and deletes |

## Requirements

<Requirements statamic="Not required (a plain Laravel provider)" database="MySQL, PostgreSQL or SQLite" />

Requires [Brand Context](/brand-context/).
