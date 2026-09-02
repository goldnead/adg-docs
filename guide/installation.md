# Installation

Every addon installs the same way: require it, migrate if it owns tables,
optionally publish its config. None of them needs a front-end build step on an
install, because the compiled Control Panel assets ship with the package and
Statamic publishes them on `composer install`.

<Requirements queue="Anything other than sync, for the addons that queue work" />

## Requiring a package

```bash
composer require goldnead/statamic-leadhub
php artisan migrate
```

Repeat for whichever addons you want. Order does not matter: the cross-addon
integrations are resolved at boot, not at install time, so installing Webhook
Manager after LeadHub wires the LeadHub triggers just as installing it before
would.

| Addon | Owns database tables | Ships a CP screen |
| --- | --- | --- |
| [Brand Context](/brand-context/installation) | yes (`brands`, `brand_user`) | multi-brand mode only |
| [Identity Contracts](/identity-contracts/installation) | no | no |
| [Suppression](/suppression/installation) | yes (`suppressions`, `suppression_events`) | no |
| [Webhook Manager](/webhook-manager/installation) | yes | yes |
| [Automations](/automations/installation) | yes | yes |
| [LeadHub](/leadhub/installation) | yes (eloquent driver) | yes |
| [Marketing](/marketing/installation) | yes (runtime data always) | yes |
| [Preference Center](/preference-center/installation) | no | no, four public pages instead |
| [Email Templates](/email-templates/installation) | no (a Statamic collection) | yes |
| [Activity](/activity/installation) | yes | yes, read-only |
| [Notifications](/notifications/installation) | yes | yes, read-only |
| [Table of Contents](/toc/installation) | no | no |

## The foundation packages

`brand-context` and `identity-contracts` are ordinary Composer dependencies of
several addons, so they arrive on their own. Both are designed to be invisible
until you go looking for them:

- **Brand Context** creates a default brand and stamps every branded record with
  it. The global scope is a no-op, and no switcher appears. Nothing about a
  single-brand install changes. See [Brands](/guide/brands).
- **Identity Contracts** resolves the authenticated user in HTTP and a `system`
  identity in the console. It persists nothing at all. See
  [Identity](/guide/identity).

You only ever configure them when you actually want multi-brand isolation, or
when your application has an unusual notion of who an actor is.

## Publishing configuration

Each addon publishes under its own tag. Publishing is optional; the packaged
defaults are the documented ones.

```bash
php artisan vendor:publish --tag=brand-context-config
php artisan vendor:publish --tag=identity-contracts-config
php artisan vendor:publish --tag=suppression-config
php artisan vendor:publish --tag=webhook-manager-config
php artisan vendor:publish --tag=statamic-automations-config
php artisan vendor:publish --tag=leadhub-config
php artisan vendor:publish --tag=marketing-config
php artisan vendor:publish --tag=email-templates-config
php artisan vendor:publish --tag=preference-center-config
php artisan vendor:publish --tag=activity-config
php artisan vendor:publish --tag=notifications-config
php artisan vendor:publish --tag=statamic-toc-config
```

One correction to an older version of this page: **Table of Contents does have
a config file**, published under `statamic-toc-config`, alongside
`statamic-toc-views` for its templates. It was previously listed here as having
none.

::: tip Where the config tag comes from
Most of these tags are not registered by the addon at all. Statamic's
`AddonServiceProvider` publishes `{slug}-config` automatically whenever
`config/{slug}.php` exists in the package, which is why the tag name always
tracks the addon slug rather than the package name. Addons whose slug and
config filename differ — Automations and Email Templates — register theirs
explicitly instead.
:::

Beyond configuration, several addons publish migrations, views or translations
under their own tags. Those are listed on each addon's installation page.

## Queue and scheduler

Several addons dispatch work off the request thread, and four of them register
scheduled commands. Neither is optional in production:

```bash
php artisan queue:work
php artisan schedule:work    # or a cron entry calling schedule:run
```

What breaks without them, addon by addon, is listed in
[Queues & scheduling](/guide/queues).

## Verifying an install

Two things worth doing once, on any install with a MySQL or PostgreSQL database:

```bash
php artisan leadhub:brand-integrity          # LeadHub
php artisan marketing:consent-integrity      # Marketing
php artisan notifications:uniqueness-integrity
```

`php artisan migrate` reporting success means the migrations ran. It does not
mean the unique constraints they were supposed to leave behind are in place, and
it says nothing about the rows already in the tables. These three commands read
the indexes and the rows as they are right now and say plainly whether one
address on one list still means one consent record, whether one recipient still
means one preference row, and whether a contact email is still unique within its
brand. They change nothing unless you pass `--repair`.

## Multiple CP users

Assigning leads, tasks or opportunities to team members means more than one
Control Panel user, which requires **Statamic Pro**:

```dotenv
STATAMIC_PRO_ENABLED=true
```

Without it, LeadHub's assignment features still work but there is only ever one
person to assign to.

## Installing from a local checkout

**Twenty-four of the twenty-six packages are on Packagist**, so the normal case
needs nothing but `composer require`, and the sibling packages an addon depends
on resolve on their own. None of the packages declares a `repositories` block,
and you do not need one either.

The two exceptions are [Client Rooms](/clientrooms/installation) and
[Assessments](/assessments/installation). Both are tagged at 0.1.0, neither is
published, and their repositories are private, so `composer require` finds
nothing and a `repositories` entry does not help either. Their installation pages
say what the install will be.

The exception is development. If you are working against a local checkout of
one of the packages, add a path or VCS repository to your own `composer.json`:

```json
{
  "repositories": [
    { "type": "path", "url": "../statamic-leadhub" }
  ]
}
```

::: warning Path repositories do not survive a deploy
A `composer.json` that references `../statamic-*` will fail `composer install`
on any machine that does not have those sibling directories, which includes
every Docker build. Remove the `repositories` block before you deploy and let
the package resolve from Packagist.
:::

::: tip A `repositories` block only counts in your own project
Composer reads the `repositories` block of the root project and ignores the one
in any package it installs. That is why a dependency can never bring its own
source along, and why every package in this suite had to be published properly
rather than pointing at a Git URL.
:::
