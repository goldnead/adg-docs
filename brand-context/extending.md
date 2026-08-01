# Extension points

<AddonHeader />

Two contracts, both bound to a working default, both replaceable by binding your own in a
service provider's `register()`.

## `BrandTokenResolver`

Turns the bearer token on an API request into a brand. This is what
[`brand.token`](/brand-context/reference#middleware) calls, and it is the only place the
package decides which brand an API caller is.

```php
namespace Goldnead\BrandContext\Contracts;

interface BrandTokenResolver
{
    public function resolve(string $token): ?Brand;
}
```

### The default

`DatabaseBrandTokenResolver` hashes the presented token with SHA-256 and compares it against
`api_token_hash` in each brand's `settings`. So a token is stored as a hash and never in the
clear, and issuing one means writing its hash into the brand:

```php
$brand->settings = array_merge($brand->settings ?? [], [
    'api_token_hash' => hash('sha256', $token),
]);
$brand->save();
```

It compares against **every** brand rather than stopping at the first match, which keeps the
comparison time independent of where in the table the matching brand happens to sit.

### Replacing it

The reason to write your own is that the tokens already live somewhere else: Sanctum, an
identity provider, a gateway that has already authenticated the caller.

```php
use Goldnead\BrandContext\Contracts\BrandTokenResolver;
use Goldnead\BrandContext\Models\Brand;

class SanctumBrandTokenResolver implements BrandTokenResolver
{
    public function resolve(string $token): ?Brand
    {
        $accessToken = PersonalAccessToken::findToken($token);

        return $accessToken
            ? Brand::find($accessToken->tokenable->brand_id)
            : null;
    }
}
```

```php
// AppServiceProvider::register()
$this->app->bind(BrandTokenResolver::class, SanctumBrandTokenResolver::class);
```

::: danger Two rules a replacement must keep
**Fail closed.** Return `null` on anything you cannot resolve. The middleware turns `null`
into a 401; anything else you might be tempted to return — the default brand, the first
brand — is a cross-brand data leak with a 200 on it.

**Compare in constant time.** Use `hash_equals()` rather than `===` for the secret part. A
resolver that short-circuits on the first differing character leaks the token one byte at a
time to a caller patient enough to measure.
:::

## `UserSource`

Where the list of Control Panel users comes from, for the
[membership](/brand-context/members) API and the **Brand Members** screen.

```php
namespace Goldnead\BrandContext\Contracts;

interface UserSource
{
    public function all(): Collection;
}
```

### The default

`StatamicUserSource` asks `Statamic\Facades\User`, which is what makes memberships work
under both users repositories: whether a user is a row in `users` or a file in
`users/<email>.yaml` is the repository's business, and nothing above this class learns which.
It returns an empty collection when Statamic is absent rather than fataling, so the package
also boots in a plain Laravel or console-only context.

### Replacing it

Bind your own when "the people who can be assigned to a brand" is not the same set as "every
Control Panel user" — a large install where only a staff subset should appear, or a host
application with its own notion of personnel.

```php
use Goldnead\BrandContext\Contracts\UserSource;
use Illuminate\Support\Collection;

class StaffUserSource implements UserSource
{
    public function all(): Collection
    {
        return Staff::query()->where('active', true)->get();
    }
}
```

```php
// AppServiceProvider::register()
$this->app->bind(UserSource::class, StaffUserSource::class);
```

Elements may be anything `BrandMembers::userId()` can read an id from: a Statamic user, an
`Authenticatable`, an Eloquent model, an `Identity` from
[Identity Contracts](/identity-contracts/), or an id you extracted yourself. It throws on
anything it cannot derive an id from, so a source returning value objects with no key fails
loudly rather than writing empty rows.

::: warning Narrowing the source narrows the screen, not the rule
The every-brand rule is computed from rows in `brand_user`, not from this list. A user your
source no longer returns keeps whatever membership rows they already have, and a user with no
rows is still a member of every brand. Removing someone from the source removes them from the
assignment screen, which is not the same as isolating them. See
[Brand members](/brand-context/members#the-rule-that-will-surprise-you).
:::

## Where to register

Both are container bindings, so both belong in `register()` rather than `boot()`:

```php
public function register(): void
{
    $this->app->bind(BrandTokenResolver::class, SanctumBrandTokenResolver::class);
    $this->app->bind(UserSource::class, StaffUserSource::class);
}
```

Both are resolved from the container at the moment they are needed rather than captured at
boot, so a binding in `register()` is always in place in time — including in a queue worker,
where a binding added from a controller would not be.

## What is not extensible

- **The scope.** `BrandScope` filters on `brand_id` and the current brand id, and the only
  supported ways to change its behaviour are `fail_mode`, `withoutBrandScope()` and not
  applying [`HasBrand`](/brand-context/scoping) in the first place.
- **The brand model.** `Brand` is an ordinary Eloquent model you can query and extend, but
  the package resolves it directly rather than through a contract.
- **Resolution order.** Which middleware sets the brand, and in what order, is fixed. Set it
  yourself with `setCurrent()` or `runFor()` where you need something else.
