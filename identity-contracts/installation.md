# Installation

<AddonHeader />

<Requirements statamic="6.0+ (Laravel-only is fine)" database="Not required" />

```bash
composer require goldnead/statamic-identity-contracts
```

There is nothing to configure for the default behaviour, no migration to run and
nothing to publish unless you want to change something:

```bash
php artisan vendor:publish --tag=identity-contracts-config
```

Most people never type any of this: the package arrives as a dependency of Activity
and Notifications.

## What arriving looks like

Nothing. The package creates no tables, registers no routes, adds no Control Panel
screen and schedules no work. What it adds is a container binding you can resolve:

```php
IdentityContext::current();
```

which on a fresh install returns the authenticated user as an `Identity` in HTTP,
and `Identity::system('system')` in the console.

## Requirements note

This is the one package in the suite that does not actually require Statamic. Its
Composer requirements are PHP and `laravel/framework`, which means it works in a
plain Laravel application. That is intentional: the whole point is to be depended on
by things that must not depend on anything.

It does understand Statamic users when they are present, through the
`Authenticatable` branch of the resolver.

## Verifying it works

```php
php artisan tinker

>>> Goldnead\IdentityContracts\Facades\IdentityContext::current();
=> Goldnead\IdentityContracts\Identity {
     type: "system",
     id: "system",
     …
   }
```

In the console you get a `system` identity, which is correct: a scheduler run is not
a person.

## For a headless application

An API hub or an import pipeline that always passes the actor explicitly should stop
the guard fallback from guessing on its behalf:

```php
// config/identity-contracts.php
'resolve_from_auth' => false,
```

With that off, `current()` returns the `actingAs` identity if one is pinned and the
fallback otherwise, and never consults the auth guard. See
[Resolving](/identity-contracts/resolving).

## Binding a contact locator

If you run LeadHub, the join from an email address to a CRM contact UUID is worth
wiring up, because it is what lets a ledger row about an anonymous purchase later be
attributed to a known contact.

The default binding is a **no-op**, so any package may ask for a contact UUID without
requiring a CRM to exist. Bind an implementation in a service provider:

```php
use Goldnead\IdentityContracts\Contracts\ContactLocator;

$this->app->bind(ContactLocator::class, LeadHubContactLocator::class);
```

See [Extension points](/identity-contracts/extending#contactlocator).

## Licence

MIT. No key, no licence check, no phone-home.
