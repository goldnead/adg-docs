# Reference

<AddonHeader />

## `source_ref` is NOT NULL, and that is the point

The single most consequential line in the schema, and a deliberate departure from the specification
this package was extracted against.

```php
// NOT NULL. See the class docblock — a nullable column here disables
// the unique index for the write paths that need it most.
$table->string('source_ref', 191)->default('');
```

The extraction spec listed the column as **nullable**. The implementation refused, and the reason
is in the migration's own docblock:

> NULLs do not collide in a unique index, on MySQL, SQLite and Postgres alike. A nullable
> `source_ref` therefore leaves the constraint switched off for every grant that has no external
> reference: manual grants from the Control Panel, opt-ins, anything an admin creates. Those are
> precisely the rows a human double-submits.

A constraint that does not hold for the most hand-driven write path is not idempotency, it is the
appearance of it. An order from a payment provider always carries a reference and would have been
protected; the grant an administrator types in twice because the first click seemed not to work
would not have been.

So absence is stored as the empty string, and the manager normalises on the way in:

```php
// Absence of an external reference is the empty string, never NULL:
// NULLs do not collide in a unique index, so a nullable column here would
// switch the idempotency guarantee off for every manual grant.
$sourceRef = (string) ($sourceRef ?? '');
```

`Entitlement::hasSourceRef()` asks the question the column can no longer answer by being null:

```php
public function hasSourceRef(): bool
{
    return $this->source_ref !== '' && $this->source_ref !== null;
}
```

The factory pins it too, with its own note: a factory producing NULLs would build test data the
unique index cannot see, and the idempotency tests would pass against a constraint that was never
engaged.

### What the constraint therefore guarantees

| Situation | Result |
| --- | --- |
| Repeated `grant()` with the same non-empty `source_ref` | One row. Returned unchanged, no event |
| Repeated `grant()` with **no** `source_ref` | One row. The second insert is refused **by the engine** |
| Two writers racing | The loser catches the violation, re-reads the winner's row and returns it |
| A repeat purchase with a new `source_ref` | A second row, deliberately |
| The same product from a different `source` | A second row, deliberately |
| The same grant in a second brand | A second row, deliberately |

The tuple is not narrower on purpose. A second purchase of the same course is a second grant, and
the provider's new event id is what says so.

`tests/Feature/IdempotencyTest.php` proves the second row by bypassing the model entirely with a
raw `DB::table('entitlements')->insert(...)` and expecting `UniqueConstraintViolationException`.
`tests/Unit/IndexKeyLengthTest.php` adds a structural guard: **no unique index in this package may
cover a nullable column**, with the failure message spelling out why.

## The unique index

```
ent_subject_product_source_ref_unique
    (subject_type, subject_id, product_slug, source, source_ref, brand_id)
```

Present in the table's first migration rather than added later once duplicates had accumulated.

`brand_id` is the sixth column. The spec left that undecided; the implementation decided yes,
arguing that leaving it out is a cross-tenant failure and the cost, the same purchase producing a
row in two brands, is a reporting question rather than a leak.

On MySQL and MariaDB the index is created with a raw statement, because Laravel's schema builder
cannot express prefix lengths:

```php
public const KEY_PREFIXES = [
    'subject_type' => 100,
    'subject_id'   => 64,
    'product_slug' => 191,
    'source'       => 64,
    'source_ref'   => 191,
];
```

That is 2448 of InnoDB's 3072 bytes. Without the prefixes it would be 2688, which fits but leaves
no headroom. Other engines take the portable path.

## Schema

Table `entitlements`. One migration. **No foreign keys anywhere**, so no cascade behaviour exists.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | `bigIncrements` | no | |
| `brand_id` | `unsignedBigInteger`, indexed | no | |
| `subject_type` | `string(160)` | no | |
| `subject_id` | `string(64)` | no | |
| `product_slug` | `string(191)` | no | |
| `source` | `string(64)` | no | |
| `source_ref` | `string(191)` | **no** | **`''`** |
| `status` | `string(16)` | no | |
| `starts_at` | `timestamp`, UTC | yes | |
| `expires_at` | `timestamp`, UTC | yes | |
| `grace_until` | `timestamp`, UTC | yes | |
| `revoked_at` | `timestamp`, UTC | yes | |
| `revoked_reason` | `string(255)` | yes | |
| `announced_state` | `string(16)` | yes | |
| `meta` | `json` | yes | |
| `created_at`, `updated_at` | `timestamps` | yes | |

Indexes:

| Name | Columns |
| --- | --- |
| `ent_subject_product_source_ref_unique` | The six above, unique |
| `ent_brand_subject_idx` | `(brand_id, subject_type, subject_id)` |
| `ent_brand_product_idx` | `(brand_id, product_slug)` |
| `ent_status_expires_idx` | `(status, expires_at)` |
| `ent_status_announced_idx` | `(status, announced_state)` |

The last two deliberately omit `brand_id`: they serve the announcement pass, which walks every
brand in turn.

`announced_state` holds the **last announced state**, so one column serves both the activation and
the expiry transition. The spec left the mechanism open and considered flipping `status` instead;
that was rejected because it would make `status` a second source of truth alongside the resolver.

## The facade

```php
use Goldnead\Entitlements\Facades\Entitlements;   // alias: Entitlements
```

### Writing

```php
grant(
    mixed $subject,
    string $productSlug,
    string $source,
    ?string $sourceRef = null,
    ?DateTimeInterface $startsAt = null,
    ?DateTimeInterface $expiresAt = null,
    ?DateTimeInterface $graceUntil = null,
    array $meta = [],
    ?Identity $actor = null,
): Entitlement

grantPending(
    mixed $subject, string $productSlug, string $source,
    ?string $sourceRef = null, ?DateTimeInterface $expiresAt = null,
    array $meta = [], ?Identity $actor = null,
): Entitlement

claimPending(Entitlement $entitlement, ?Identity $actor = null): bool
revoke(Entitlement $entitlement, string $reason, ?Identity $actor = null): bool
restore(Entitlement $entitlement, ?Identity $actor = null): bool
enterGracePeriod(Entitlement $entitlement, DateTimeInterface $until): bool
```

### Reading

```php
decide(mixed $subject, string $productSlug): AccessDecision
allows(mixed $subject, string $productSlug): bool
activeProductSlugsFor(mixed $subject): array
stateOf(Entitlement $entitlement): EntitlementState
forSubject(mixed $subject): Builder
query(): Builder
reference(mixed $subject): SubjectReference
subjectLabel(SubjectReference $reference): string
```

Resolves `Goldnead\Entitlements\EntitlementManager`, bound as a **singleton**. Container alias:
`statamic-entitlements`. Never a bare `entitlements` key, because that is close enough to Laravel's
own `events` mistake to be worth avoiding.

`InvalidArgumentException` is thrown for a blank product slug, a blank source, a blank revocation
reason, an unsaved model as subject, and a subject the resolver cannot turn into a reference.

## `EntitlementState`

```php
Goldnead\Entitlements\Enums\EntitlementState: string

Pending      = 'pending'        stored
Scheduled    = 'scheduled'      derived, never stored
Active       = 'active'         stored
GracePeriod  = 'grace_period'   stored
Expired      = 'expired'        derived, never stored
Revoked      = 'revoked'        stored

grantsAccess(): bool        // Active or GracePeriod
isProvisional(): bool       // Scheduled only. Pending is false
static storable(): array    // the four stored values
static options(): array     // handle => translated label, all six
label(): string
```

`isProvisional()` is "can still become Active with nobody doing anything". A scheduled grant
becomes active by the clock; a pending one needs a confirmation, so it is not provisional.

## `AccessDecision`

```php
final readonly class AccessDecision implements JsonSerializable

const ENTITLED = 'ENTITLED';
const NOT_ENTITLED = 'NOT_ENTITLED';

public bool $allowed;
public string $reason;
public ?EntitlementState $state;
public ?Entitlement $entitlement;

static entitled(Entitlement $entitlement): self
static refused(?Entitlement $closest = null): self
toArray(): array
```

A refusal carries the **closest** grant when there is one, so a caller can say "your access ran out
in March" rather than "no".

`SUPER_USER` is deliberately absent. The extracted system had it; a superuser gets no special
treatment here, and a test asserts it. Access is a property of grants, not of the person asking.

## `SubjectReference`

```php
final readonly class SubjectReference

__construct(public string $type, public string $id)
static for(Model $model): self
key(): string      // "type:id"
equals(self $other): bool
```

`for()` uses `getMorphClass()`, so a registered morph alias wins over the class name. An unsaved
model throws.

## Model

```php
Goldnead\Entitlements\Models\Entitlement

$fillable = [
    'subject_type', 'subject_id', 'product_slug', 'source', 'source_ref',
    'starts_at', 'expires_at', 'grace_until', 'meta',
];

subject(): MorphTo

state(): EntitlementState
grantsAccess(): bool
isRevoked(): bool
hasSourceRef(): bool
subjectKey(): string        // "type:id", never resolves the related model
```

**Mass assignment is closed, not open.** `status`, `brand_id`, `revoked_at`, `revoked_reason` and
`announced_state` are not fillable, because a model whose columns decide access must not let any
array that reaches `fill()` set them. The manager writes them through `forceFill()` and the query
builder.

There are **no Eloquent scopes**. Query shaping lives in `StateResolver`, which takes a builder.

The four timestamps are UTC attributes rather than Laravel's `datetime` cast.

## `StateResolver`

```php
Goldnead\Entitlements\Support\StateResolver

static resolve(Entitlement $entitlement, ?DateTimeInterface $now = null): EntitlementState
static constrain(Builder $query, EntitlementState $state, ?DateTimeInterface $now = null): Builder
static constrainToAccess(Builder $query, ?DateTimeInterface $now = null): Builder
```

One implementation of the state machine, and one SQL projection of it. The two are pinned to each
other by a test over the full cartesian product of five statuses, three starts, three expiries,
three grace values and two revocation signals: 270 rows, and both must select the same ids for all
six states.

See [The state machine](/entitlements/states) for the branch order.

## Events

| Event | Payload |
| --- | --- |
| `Events\EntitlementGranted` | `Entitlement $entitlement`, `?EntitlementState $previousState`, `?Identity $actor` |
| `Events\EntitlementPending` | `Entitlement $entitlement`, `?EntitlementState $previousState`, `?Identity $actor` |
| `Events\EntitlementRevoked` | `Entitlement $entitlement`, `string $reason`, `?EntitlementState $previousState`, `?Identity $actor` |
| `Events\EntitlementExpired` | `Entitlement $entitlement`, `?CarbonImmutable $grantedAccessUntil` |

`EntitlementExpired` carries neither a previous state nor an actor. There is no actor: the clock
did it.

None is queued and none is broadcast. The package sends nothing, and a test asserts that with
`Mail::fake()` and `Notification::fake()` across every write path.

## Contracts

| Interface | Methods | Default |
| --- | --- | --- |
| `Contracts\SubjectResolver` | `reference(mixed $subject): SubjectReference`, `label(SubjectReference $reference): ?string` | `Support\MorphSubjectResolver` |
| `Contracts\PackageResolver` | `packagesContaining(string $productSlug): array` | `Support\NullPackageResolver`, returns `[]` |

Both are bound with `bind()` rather than `singleton()`, because a consumer's resolver may hold
request state.

There are exactly **two** interfaces. The README counts `config('entitlements.sources')` as a third
extension point; that is a config array read by `SourceRegistry`, not a bindable contract.

## Routes

Control Panel only. There are no public routes and no front-end surface of any kind.

Registered only when `entitlements.cp.enabled` is true; with it false the route file returns before
registering anything.

| Method | Path | Name | Permission |
| --- | --- | --- | --- |
| `GET` | `entitlements` | `entitlements.index` | `view entitlements` |
| `GET` | `entitlements/create` | `entitlements.create` | `grant entitlements` |
| `POST` | `entitlements` | `entitlements.store` | `grant entitlements` |
| `GET` | `entitlements/{entitlement}` | `entitlements.show` | `view entitlements` |
| `GET` | `entitlements/{entitlement}/revoke` | `entitlements.revoke.form` | `revoke entitlements` |
| `POST` | `entitlements/{entitlement}/revoke` | `entitlements.revoke` | `revoke entitlements` |
| `POST` | `entitlements/{entitlement}/restore` | `entitlements.restore` | **`grant entitlements`** |

Names carry Statamic's `statamic.cp.` prefix. `{entitlement}` is constrained to digits, and **no
route model binding is registered for it**: an implicit binding claims the parameter name
application-wide, and a test drives thirteen generic names through stand-in sibling routes to prove
this package binds none of them.

Restoring needs `grant entitlements`, not `revoke entitlements`. Restoring is granting.

## Permissions

```php
Permission::register('view entitlements')->children([
    Permission::make('grant entitlements'),
    Permission::make('revoke entitlements'),
]);
```

Three, and the two children are genuinely separate: a granter may grant and restore but not revoke,
and a revoker may revoke but not grant. Both are tested.

## Commands

```
php artisan entitlements:announce
    --limit=1000   Maximum transitions to announce per brand
    --brand=       Restrict to one brand
```

Fires `EntitlementGranted` and `EntitlementExpired` for grants whose state changed with the clock.
Runs for every brand unless `--brand` narrows it.

**The package registers no scheduled task.** Register it yourself:

```php
Schedule::command('entitlements:announce')->everyFifteenMinutes();
```

The command is registered only when running in console.

## Publish tags

| Tag | Publishes |
| --- | --- |
| `entitlements-migrations` | `database/migrations` |
| `entitlements-translations` | `lang/vendor/entitlements` |

**There is no config publish tag.** The config is merged and never published, so the defaults are
the file in the package. Override individual keys in your own `config/entitlements.php` if you need
to, or set them from a service provider.

## Translations

Namespace `entitlements`, one `cp` file per language, shipped in `en` and `de` with identical key
sets. Every string is a Control Panel string.

## Requirements

```
php                                  ^8.2
goldnead/statamic-brand-context      ^1.0
goldnead/statamic-identity-contracts ^1.0
laravel/framework                    ^12.40|^13.0
statamic/cms                         ^6.0
```

Suggested: `goldnead/statamic-activity`, `goldnead/statamic-leadhub`,
`goldnead/statamic-automations`.

**Only the Activity suggestion has code.** LeadHub needs no bridge: the subject is polymorphic, so a
CRM contact is a valid subject with no coupling at all. Automations is marked planned and is not
built.

Licence: MIT. Tested against SQLite and MySQL 8.
