# Bundles and teams

<AddonHeader />

## Bundles

A course opens for its own `product` and for every product listed under `bundles` on the
course entry. To sell three courses as one, create one bundle product and list it on each of
the three. A learner who holds the bundle holds all three; one who holds a single course's
product holds that one.

```yaml
# course entry
product: stimme-grundlagen
bundles:
  - chorleitung-komplett
```

A `PackageResolver` in [Entitlements](/entitlements/) works as well, and there the package is
resolved before this package asks. The `bundles` field is for a site that would rather say it
on the course.

With [Payments](/payments/) installed, the bundles count for the payment rules too: a
subscription to the bundle product enrolls its buyer in every course that lists it, and a
failed payment for it applies each course's
[`on_payment_failure`](/courses/payment-failure).

## Team seats

`team_seats` on the course entry (**Seats per purchase**, section Team) lets a buyer put that
many other people into the course by email address. `0`, the default, is no team.

**Seats belong to the purchase, not to the course.** A team is the buyer plus the product that
opened the course for them. Bought through a bundle, one team with the same members covers
every course of the bundle, and the seat count is the highest `team_seats` among those
courses. A bundle of three courses with five seats is five people in all three courses, not
fifteen seats.

A member gets in with that email address for exactly as long as the buyer holds the purchase:
a refund, an expiry or a [payment hold](/courses/payment-failure) of the buyer closes the
course for the whole team. A member needs no account when they are added. They get in once
they sign in with that address.

Only the buyer manages the team. Somebody who holds the course through a team, or not at all,
has no team to manage. The buyer cannot add their own address.

Entitlements has no seats of its own yet, so the team lives in this package's table,
`courses_team_members`, one row per seat.

### In a template

```antlers
{{ courses:team course="cvt-101" }}
    {{ left }} of {{ seats }} seats free
    <ul>{{ members }}<li>{{ email }}</li>{{ /members }}</ul>
{{ /courses:team }}

{{ courses:team_form course="cvt-101" }}
    <input type="email" name="email" required> <button>Add</button>
{{ /courses:team_form }}

{{ courses:team_form course="cvt-101" do="remove" email="colleague@example.com" }}
    <button>Remove</button>
{{ /courses:team_form }}
```

`courses:team` renders nothing for a guest, a course without seats, or somebody who holds the
course only through somebody else's team. Its variables: `product`, `seats`, `used`, `left`,
`members` (each with `email` and `added_at`) and `course`.

`courses:team_form` posts to [`POST /!/courses/team`](/courses/tags#post-courses-team) and
renders nothing when [`routes.enabled`](/courses/configuration#routes-enabled) is off.

### In PHP

```php
Courses::addTeamMember($buyer, 'cvt-101', 'colleague@example.com'); // TeamMember, or null
Courses::removeTeamMember($buyer, 'cvt-101', 'colleague@example.com');
Courses::team($buyer, 'cvt-101'); // product, seats, used, left, members
```

`addTeamMember()` returns `null` when the buyer holds no purchase with seats, every seat is
taken, or the address is not valid. Adding an address that is already on the team returns
its row and takes no second seat. Two requests racing for the last seat cannot both get it:
a unique index on the seat number lets one through.

`TeamMemberAdded` and `TeamMemberRemoved` carry the buyer's id, the course, the address and
the product. The member may have no account yet, so the added event is the place to send an
invitation.
