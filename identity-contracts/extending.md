# Extension points

<AddonHeader />

Four contracts. The first two teach the resolver about your subjects; the last two
supply data it cannot know on its own.

## `ProvidesIdentity`

Implement it on your User model to control its representation completely. This is
the highest-leverage change in the package: one method, and every consumer in the
suite records exactly what you decided.

```php
use Goldnead\IdentityContracts\Contracts\ProvidesIdentity;
use Goldnead\IdentityContracts\Identity;

class User extends Authenticatable implements ProvidesIdentity
{
    public function toIdentity(): Identity
    {
        return Identity::user($this->id, $this->email, $this->name, $this->contact_uuid);
    }
}
```

It takes precedence over the `Authenticatable` branch, so once implemented the
generic path is never used for your model. That matters if your users have a display
name that is not `name`, or a tenant-scoped id that is not the primary key.

Worth implementing on more than users. Anything that acts in your system can declare
what it is:

```php
class ApiClient extends Model implements ProvidesIdentity
{
    public function toIdentity(): Identity
    {
        return Identity::system('api:'.$this->handle);
    }
}
```

## `IdentityResolver`

Teach the manager about a subject type it has never seen, without touching that
subject's class. Use this when the class is not yours.

```php
IdentityContext::resolveUsing(fn ($subject) => $subject instanceof ApiClient
    ? Identity::system('api:'.$subject->handle)
    : null);
```

Return `null` to decline, and the next resolver — then the built-in order — gets a
turn. **Last registered wins**, so a resolver added late in boot overrides an earlier
one for the same subject.

Register from a service provider's `boot()`. Registering per-request, in a
controller, means the resolver does not exist in the queue worker that later
processes the same subject, and the resolution silently differs between the two.

## `ContactLocator`

Bridges an email address to a CRM contact UUID.

The default binding is a **no-op**, so any package may ask for a contact UUID
without requiring a CRM to exist. Applications running LeadHub bind an
implementation reading `leadhub_contacts`; **that is the only place the join by email
lives** in the whole suite.

```php
use Goldnead\IdentityContracts\Contracts\ContactLocator;

class LeadHubContactLocator implements ContactLocator
{
    public function uuidForEmail(string $email): ?string
    {
        return LeadHub::contactByEmail($email)?->uuid;
    }
}
```

```php
// AppServiceProvider::register()
$this->app->bind(ContactLocator::class, LeadHubContactLocator::class);
```

Two things this unlocks once bound:

- An authenticated user arrives with **both** `userId` and `contactUuid` set, so a
  consumer can join either way.
- `IdentityContext::resolve('a@example.com')` returns a contact identity with a real
  `id` rather than one with `id => null`.

::: tip Keep it cheap
This is called on the resolution path, which runs on every `record()` and every
`notify()`. Cache within the request if your lookup is not already a single indexed
query, and never make it an HTTP call.
:::

## `AnonymousIdResolver`

Supplies the pseudonymous visitor id.

The bundled `SessionAnonymousIdResolver` stores a UUID in the session your
application already has and deliberately **sets no cookie of its own**, so it creates
no additional consent surface. Its behaviour is governed by config rather than by
code:

| Config | Behaviour |
| --- | --- |
| defaults | a UUID stored under `anonymous.session_key` |
| `persist => false` | a one-way hash of the session id; **writes nothing** |
| `enabled => false` | `null`, forever |

Bind your own when you already have a visitor identifier and want the suite to use
it rather than mint a second one:

```php
use Goldnead\IdentityContracts\Contracts\AnonymousIdResolver;

class RybbitVisitorId implements AnonymousIdResolver
{
    public function resolve(): ?string
    {
        return request()->cookie('visitor_id');
    }
}
```

::: warning Do not introduce a new cookie here
The bundled resolver's no-cookie design is a privacy commitment the docs make on the
suite's behalf. A custom resolver that sets one moves your site into a different
consent category, and nothing in the package will warn you.
:::

## Where to register

All four go in a service provider. Bindings in `register()`, resolvers in `boot()`:

```php
public function register(): void
{
    $this->app->bind(ContactLocator::class, LeadHubContactLocator::class);
    $this->app->bind(AnonymousIdResolver::class, RybbitVisitorId::class);
}

public function boot(): void
{
    IdentityContext::resolveUsing(fn ($s) => /* … */);
}
```

Unlike the rest of the suite, this package has no boot-order constraint: it owns no
registry that Statamic seeds, so there is nothing that has to exist first.

## Testing an extension

Two assertions cover most mistakes:

```php
it('represents a user the way we decided', function () {
    $identity = IdentityContext::resolve(User::factory()->create(['email' => 'a@b.de']));

    expect($identity->type)->toBe('user')
        ->and($identity->email)->toBe('a@b.de')
        ->and($identity->contactUuid)->not->toBeNull();   // locator bound?
});

it('does not throw on something it has never seen', function () {
    expect(IdentityContext::resolve(new \stdClass)->type)->toBe('system');
});
```

The second one guards the guarantee that matters most: resolution never throws, so a
new subject type appearing in production degrades to a fallback rather than taking
down the write that carried it.
