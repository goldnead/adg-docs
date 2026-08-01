# Extension points

<AddonHeader />

One, and it is the important one: **you can replace the thing that answers the question.**

## Swapping the gate

The service provider binds the contract, not the class:

```php
$this->app->singleton(Gate::class, DatabaseGate::class);
$this->app->alias(Gate::class, 'suppression.gate');
```

Because every send path in the family depends on `Goldnead\Suppression\Contracts\Gate` rather
than on `DatabaseGate`, rebinding the contract redirects all of them at once. Nothing in a
consumer changes and nothing has to be told.

```php
// AppServiceProvider::register()

use Goldnead\Suppression\Contracts\Gate;

$this->app->singleton(Gate::class, SharedBlocklistGate::class);
```

Register in `register()`, not `boot()`. A binding made in `boot()` loses a race against anything
that resolves the gate earlier in the boot sequence, and the failure mode is that some send paths
use your gate and some do not.

The alias means `app('suppression.gate')` and the `SuppressionGate` facade follow the same
binding, so there is no second place to change.

### Two reasons to do it

**A shared blocklist.** Several applications, one list. The table in this package becomes one
source among others, or stops being consulted at all.

**A cache in front of the table.** `suppressedAmong()` already collapses a batch into one query,
so the case for this is narrower than it looks. It is worth it when the same addresses are asked
about repeatedly inside one process.

## The contract you are taking on

```php
interface Gate
{
    public function isSuppressed(string $email, ?int $brandId = null): bool;

    /** @return array<string, true> keyed by normalized email */
    public function suppressedAmong(iterable $emails, ?int $brandId = null): array;
}
```

Four obligations, and the first is not negotiable.

**Fall closed.** An implementation may answer `true`, may answer `false`, or may throw
`SuppressionCheckFailed`. What it may never do is answer `false` because something went wrong.
"The query failed" and "nobody is suppressed" are not the same statement, and a replacement that
conflates them turns a backend hiccup into a send to every complainant on the list. If your
source is an HTTP service, a timeout is a `SuppressionCheckFailed`, never a `false`.

**Normalize the same way.** Trim and lowercase, nothing else. `suppressedAmong()` must return its
array **keyed by the normalized address**, because that is what callers compare against. A
replacement that keys by the raw input silently stops matching.

**Honour the brand argument.** `null` means the current brand. Global facts must bite in every
brand; brand-scoped ones must not leak across. See [Brands and scope](/suppression/brands).

**Stay cheap in the batch form.** `suppressedAmong()` exists because `isSuppressed()` in a loop
is one round trip per recipient. An implementation that loops internally gives that back without
the caller noticing.

```php
use Goldnead\Suppression\Contracts\Gate;
use Goldnead\Suppression\Exceptions\SuppressionCheckFailed;
use Goldnead\Suppression\Support\EmailNormalizer;

class SharedBlocklistGate implements Gate
{
    public function isSuppressed(string $email, ?int $brandId = null): bool
    {
        $normalized = EmailNormalizer::normalize($email);

        if ($normalized === null) {
            return true;   // unmailable, so the closed answer
        }

        try {
            return $this->client->blocked($normalized, $brandId);
        } catch (Throwable $e) {
            throw SuppressionCheckFailed::from($e);   // never `return false`
        }
    }

    public function suppressedAmong(iterable $emails, ?int $brandId = null): array
    {
        // …one round trip, array_fill_keys($hits, true)
    }
}
```

`EmailNormalizer` is public and worth reusing: it is the single place the normalization rule
lives, and borrowing it is how your gate and the writes stay on the same key.

::: danger Do not decorate the gate to add a catch
The recurring temptation is a wrapper that catches `SuppressionCheckFailed` and falls back to the
database gate, or to `false`. The first is defensible and the second is the exact defect this
package exists to prevent. If you write the fallback, make sure the fallback path can also throw.
:::

## What is deliberately not extensible

- **The write side.** `SuppressionService` is bound as a concrete class under `suppression`, not
  behind a contract. Reading and writing are split on purpose: a send path should be able to
  depend on the question without being handed the ability to answer it differently.
- **The reasons.** `Reasons::assertKnown()` rejects anything outside the six, so an unknown
  reason is a failed write rather than a row nobody can interpret later. Scope is configurable;
  the set is not.
- **Normalization.** Fixed, and identical to LeadHub's, so a suppression written from a bounce and
  a subscription written from a sign-up form land on the same string.

## Testing a replacement

The two assertions that matter are the ones about failure, not about success:

```php
it('throws rather than answering false when the backend is unreachable', function () {
    $this->backend->shouldFail();

    expect(fn () => app(Gate::class)->isSuppressed('a@example.com'))
        ->toThrow(SuppressionCheckFailed::class);
});

it('keys the batch answer by the normalized address', function () {
    expect(app(Gate::class)->suppressedAmong(['A.User@Example.COM']))
        ->toHaveKey('a.user@example.com');
});
```

`tests/Feature/GateTest.php` and `tests/Feature/CrossBrandTest.php` in the package are the
reference for the rest.
