# Extending

<AddonHeader />

Two contracts, four events, one optional bridge. The extension surface is small because the package
answers one question.

## The four events

```php
use Goldnead\Entitlements\Events\EntitlementGranted;
use Goldnead\Entitlements\Events\EntitlementPending;
use Goldnead\Entitlements\Events\EntitlementRevoked;
use Goldnead\Entitlements\Events\EntitlementExpired;
```

This is the seam. **The package sends nothing**, so everything a grant should cause happens in a
listener you write.

```php
Event::listen(EntitlementGranted::class, function (EntitlementGranted $event) {
    $entitlement = $event->entitlement;

    if ($event->previousState === null) {
        // brand new, straight to active: the welcome mail
    }

    Mail::to($entitlement->subject)->send(new WelcomeToTheCourse($entitlement));
});
```

`previousState` is what distinguishes the four ways a grant becomes active:

| `previousState` | What happened |
| --- | --- |
| `null` | Written straight to active |
| `Pending` | A confirmation was claimed |
| `Revoked` | A revocation was restored |
| `Scheduled` | The window opened, reported by the announcement pass |

That distinction matters for mail. A welcome mail on a restore is usually wrong; a welcome mail on
a scheduled grant opening is usually right.

`EntitlementRevoked` carries the reason and the state read before the write.
`EntitlementExpired` carries `grantedAccessUntil`, which is `grace_until` when the grant was in a
grace period and `expires_at` otherwise, and it carries **no actor**, because the clock did it.

None is queued or broadcast. Queue your own work inside the listener.

### What never fires

Worth knowing before you build on these:

- Creating a `Scheduled` grant. The pass fires it when the window opens.
- `enterGracePeriod()`.
- A grant imported already expired. It gets the marker and no event, so a backfill of three years of
  history does not send three years of mail.
- A repeated `grant()` on an existing row.
- A revocation or restore that lost its conditional update.

::: warning `EntitlementGranted` and `EntitlementExpired` depend on a scheduled command
Two of the four ways a grant changes state are caused by the clock, and nothing writes to the
database when they happen. `entitlements:announce` is what turns them into events, and the package
**does not register it**.

```php
Schedule::command('entitlements:announce')->everyFifteenMinutes();
```

Without it, access still works correctly. The events simply never arrive.
:::

## `SubjectResolver`

```php
namespace Goldnead\Entitlements\Contracts;

interface SubjectResolver
{
    public function reference(mixed $subject): SubjectReference;

    public function label(SubjectReference $reference): ?string;
}
```

The default, `MorphSubjectResolver`, handles Eloquent models through `getMorphClass()` and
`SubjectReference` objects directly. Bind your own to accept something else, or to give the Control
Panel a readable label instead of `contact:4417`:

```php
class ContactResolver extends MorphSubjectResolver
{
    public function label(SubjectReference $reference): ?string
    {
        if ($reference->type !== 'contact') {
            return parent::label($reference);
        }

        return Contact::find($reference->id)?->email;
    }
}

$this->app->bind(SubjectResolver::class, ContactResolver::class);
```

`reference()` must throw `InvalidArgumentException` for anything it cannot place. Returning a
half-built reference would write a grant that belongs to nobody.

Bound with `bind()` rather than `singleton()`, because a resolver may hold request state.

## `PackageResolver`

```php
namespace Goldnead\Entitlements\Contracts;

interface PackageResolver
{
    /** @return list<string> product slugs that contain this one, excluding it */
    public function packagesContaining(string $productSlug): array;
}
```

This is how a bundle grants access to its parts. `decide()` and `allows()` check the requested slug
plus everything this resolver names.

```php
class BundleResolver implements PackageResolver
{
    public function packagesContaining(string $productSlug): array
    {
        return Entry::query()
            ->where('collection', 'packages')
            ->get()
            ->filter(fn ($p) => in_array($productSlug, $p->get('includes', []), true))
            ->map->slug()
            ->values()
            ->all();
    }
}

$this->app->bind(PackageResolver::class, BundleResolver::class);
```

The default returns `[]`, so **bundles do not exist until you bind one**. That is why products and
packages are not a data model in v1: modelling them here would have meant inventing a product model
for every consumer.

Cache the answer if the lookup is expensive. It runs on every access check.

## Source labels

```php
'sources' => [
    'thrivecart' => 'ThriveCart',
    'manual' => 'Manual grant',
    'lead-magnet' => 'Lead magnet',
],
```

Display names for the Control Panel, and **never a whitelist**. An unregistered source works
identically and shows its raw handle.

The README counts this as a third extension point. It is a config array read by `SourceRegistry`,
not a bindable contract: there are exactly two interfaces.

## The Activity bridge

Optional, attached with `class_exists()` on the concrete facade class, never a Composer
requirement.

```php
'bridges' => [
    'activity' => true,
],
```

With [Activity](/activity/) installed:

| Event | Type | Dedupe key |
| --- | --- | --- |
| `EntitlementGranted` | `entitlements.granted` | `entitlements.granted:{id}:{previous state or "new"}` |
| `EntitlementPending` | `entitlements.pending` | `entitlements.pending:{id}` |
| `EntitlementRevoked` | `entitlements.revoked` | `entitlements.revoked:{id}` |
| `EntitlementExpired` | `entitlements.expired` | `entitlements.expired:{id}` |

The granted key carries the previous state, so a grant confirmed out of pending and a grant written
outright are two distinct facts about the same row, while a retry of either is not.

`source_ref` is recorded only when there is one, so the empty string does not become a property.

The bridge swallows its own failures:

```php
try {
    Activity::record($type, [...]);
} catch (\Throwable $e) {
    report($e);
}
```

A failing ledger must never fail the grant that produced the fact.

::: tip Never `method_exists()` on a facade
Availability is checked with `class_exists()` on a concrete class. A facade forwards through
`__callStatic` and declares none of the methods it forwards, so `method_exists()` on a facade class
answers `false` forever. When the question really is about a method, go through
`Facade::getFacadeRoot()` and inspect the instance.
:::

`attach()` is idempotent and never caches a negative answer, so a bridge that was declined because
the sibling had not loaded yet can still attach later.

## Automations

There is **no Automations bridge**. The `composer.json` suggestion marks it planned.

Automations can already trigger on the four events through Laravel's dispatcher without anything
from this package. A bridge only becomes worth building once a second consumer needs something the
dispatcher does not give it.

## What is deliberately not extensible

- **No route model binding** for `{entitlement}`. An implicit binding claims the parameter name
  application-wide, and a test drives thirteen generic names through stand-in sibling routes to
  prove this package binds none of them.
- **No Antlers tags, no fieldtypes, no widgets, no public routes.** There is no template surface at
  all. Ask through the facade.
- **No `SUPER_USER` override.** Access is a property of grants. If your application wants an
  override, put it where it is visible.
- **No policy engine.** Designing one would be inventing rather than extracting.
- **No config publish tag.** The config is merged and never published.
- **No second state machine.** `StateResolver` is the only implementation, and its SQL projection is
  pinned to it by an exhaustive test. Do not write a second one.
