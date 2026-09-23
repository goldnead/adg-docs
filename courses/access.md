# Access and entitlements

<AddonHeader />

Two questions, kept apart on purpose. **May this learner be in the course at all?** is asked
of `CourseAccess`. **Which lesson may they open next?** is this package's own, and is on
[Drip and locks](/courses/locks).

## The seam

```php
namespace Goldnead\Courses\Contracts;

interface CourseAccess
{
    /** @param array{id: string, slug: string, product: string} $course */
    public function allows(mixed $user, array $course): bool;
}
```

Which implementation is bound:

| Installed | Bound | Answer |
| --- | --- | --- |
| [Entitlements](/entitlements/) 1.3 or later | `EntitlementsCourseAccess` | `Entitlements::allows()` for the course's product |
| nothing | `ClosedCourseAccess` | always no |
| your own binding | yours | yours |

**Failing closed is the point.** A site that forgot to install Entitlements finds its courses
shut, not handed out for free. Entitlements below 1.3 is declared a conflict, so Composer
refuses the combination rather than letting it half-work.

## Which product opens a course

The course entry's `product` field: the Entitlements product that opens it. Empty, it is the
course slug, so a site that names its products after its courses has nothing to fill in.

Every product listed under `bundles` opens it as well, so one bundle product can open several
courses. A `PackageResolver` in Entitlements works too and is resolved there, before this
package asks. See [Bundles and teams](/courses/teams).

## Who gets in

`canAccess()` says yes when:

1. the bound `CourseAccess` allows the course's product or one of its bundles, or
2. a buyer who holds the course put the learner's email address on their
   [team](/courses/teams).

It says no, whatever those say, while a [hold](/courses/payment-failure) closes the course for
the learner. A payment hold takes away only what the failed subscription paid for; a hold set
by hand closes the course against every grant and every team seat.

## How a learner becomes a subject

Entitlements addresses a subject as a type and an id, and the type has to match whatever
wrote the grants. The learner you pass is turned into that pair like this:

1. **An Eloquent model**, or an Entitlements `SubjectReference`, passes straight through.
2. **A Statamic eloquent user**, which is what `User::current()` returns when Statamic's users
   live in Eloquent, is unwrapped to its model. The model's morph class is used, as a checkout
   that granted to the model did.
3. **Anything else**, a flat-file user or a bare id, becomes a reference of the type in
   [`entitlements.subject_type`](/courses/configuration#entitlements-subject-type). Unset, that
   is the auth model's morph class on an eloquent install and `user` on a flat-file one.

**The email address is asked as well**, under subject type `email`. That is where
[Payments](/payments/) grants when the site has no `SubjectResolver` that knows the buyer's
address, so a buyer on such a site gets in with the account that has the same address. A site
with a resolver loses nothing by it.

If every course stays closed for a learner who holds the grant, the type is the first thing
to check. See [Troubleshooting](/courses/troubleshooting#a-learner-with-a-grant-sees-nothing).

## Binding your own

A site with its own access rules binds its own implementation. The package binds its default
with `bindIf`, so a binding of yours wins:

```php
use Goldnead\Courses\Contracts\CourseAccess;

$this->app->bind(CourseAccess::class, MyCourseAccess::class);
```

## What asks, and what does not

- **The tags ask.** `{{ courses }}` reports `has_access` per course; `courses:progress`,
  `courses:lessons`, `courses:continue`, `courses:blocks` and `courses:quiz` render nothing
  without access.
- **The POST route asks**, and answers `no_access` with a 403.
- **A private download asks**: Private Media checks the link against `canAccess()`. See
  [Lesson content](/courses/lesson-content#private-downloads).
- **The facade does not.** `outline()`, `summary()`, `lessons()` and `lesson()` read whatever
  you ask for, and the write methods check locks and lesson types, not access. Code of your
  own asks `Courses::canAccess()` first.
