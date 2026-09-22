# Access and entitlements

<AddonHeader />

The signature and the viewer token prove that a link was made for this user. Whether this user
may open this file of this resource at all is a separate question, asked of `MediaAccess` on
every request.

## The seam

```php
namespace Goldnead\PrivateMedia\Contracts;

interface MediaAccess
{
    public function allows(mixed $user, string $resource, string $path): bool;
}
```

`$user` is the signed-in user, `$resource` the slug from the link, `$path` the file's path
inside the container, already checked to have the shape of one.

Which implementation is bound:

| Installed | Bound | Answer |
| --- | --- | --- |
| [Entitlements](/entitlements/) 1.3 or later | `EntitlementsMediaAccess` | `Entitlements::allows()` for the product named by `resource` |
| nothing | `ClosedMediaAccess` | always no |
| your own binding | yours | yours |

**Failing closed is the point.** A site that forgot to install Entitlements finds its media
shut, not handed to everyone with an account. Entitlements below 1.3 is declared a conflict,
so Composer refuses the combination.

## The default does not look at the path

`EntitlementsMediaAccess` asks whether the user holds the product named by `resource`, and
nothing else. A link is signed, so a user cannot swap the path in it, but a template can sign
any path under any resource it likes. If resources share a container and must not see each
other's files, bind your own:

```php
use Goldnead\PrivateMedia\Contracts\MediaAccess;

$this->app->bind(MediaAccess::class, fn () => new class implements MediaAccess {
    public function allows(mixed $user, string $resource, string $path): bool
    {
        return $user !== null && str_starts_with($path, $resource.'/');
    }
});
```

The package binds its default with `bindIf`, so a binding of yours wins.

## How a user becomes a subject

Entitlements addresses a subject as a type and an id, and the type has to match whatever
wrote the grants. The user is turned into that pair the same way
[Courses](/courses/access#how-a-learner-becomes-a-subject) does it:

1. **An Eloquent model**, or an Entitlements `SubjectReference`, passes straight through.
2. **A Statamic eloquent user** is unwrapped to its model, and the model's morph class is used,
   as a checkout that granted to the model did.
3. **Anything else**, a flat-file user or a bare id, becomes a reference of the type in
   [`entitlements.subject_type`](/private-media/configuration#entitlements-subject-type). Unset,
   that is the auth model's morph class on an eloquent install and `user` on a flat-file one.

## Access comes before the file

The route asks `MediaAccess` before it looks the file up. A user without access gets
`no_access` whether the file exists or not, so nobody can probe which files are there. An
unknown resource is `no_access` too, since Entitlements holds no grant for it.
