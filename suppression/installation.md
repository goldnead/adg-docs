# Installation

<AddonHeader />

<Requirements statamic="6.0+ (transitively, via Brand Context)" laravel="12.x / 13.x" />

```bash
composer require goldnead/statamic-suppression
php artisan migrate
```

## A library, not an addon

This package is a Composer library that answers one question. It registers no Control Panel
screen, no nav item, no permission and no Antlers tag, and its provider is an ordinary
`Illuminate\Support\ServiceProvider` rather than Statamic's `AddonServiceProvider`. There is
nothing to enable after installing it and nothing to look at. What you get is a facade, a
contract and two tables.

That is also why it boots in places Statamic does not: a queue worker, a console command,
another package's test bed.

## What it requires

It requires [Brand Context](/brand-context/) `^1.4`, PHP `^8.2` and `laravel/framework`
`^12.0|^13.0`.

`statamic/cms` is not in this package's own `require`, but **Statamic is required in practice**:
Brand Context requires `statamic/cms ^6.0`, so installing Suppression pulls Statamic in
transitively. Treat Statamic 6 as a hard requirement. What the plain Laravel provider buys you is
not a Statamic-free install, it is a gate that keeps working in contexts where Statamic has not
booted.

Publish the config only if you want to change a scope or a threshold:

```bash
php artisan vendor:publish --tag=suppression-config
```

See [Configuration](/suppression/configuration) for what is in there.

Most people never type any of this. The package arrives as a dependency of Marketing.

## Verifying it works

```bash
php artisan suppression:suppress --email=dead@example.com --reason=hard_bounce
```

Then ask the gate:

```php
app(\Goldnead\Suppression\Contracts\Gate::class)->isSuppressed('dead@example.com');   // true
```

Release it again:

```bash
php artisan suppression:release --email=dead@example.com --reason="testing the installation"
```

`--reason` is optional here and mandatory only for releasing a complaint.

## The migration

Two tables, and both have an index shape that matters:

- `suppressions.brand_id` is `NOT NULL DEFAULT 0`. MySQL treats NULLs as distinct inside a
  unique index, so a nullable "global" would silently permit duplicate rows of the one fact the
  table exists to state once.
- `suppression_events.dedupe_key` is nullable **and** unique, which is the same NULL rule read
  the other way. Provider events carry a key so a redelivery is harmless; manual actions carry
  none, so a second legitimate release is not swallowed as a duplicate of the first.

::: tip Run the suite against MySQL before you trust it
Two of this package's guarantees are InnoDB index behaviours SQLite does not express the same
way. `vendor/bin/pest -c phpunit.mysql.xml` runs the identical suite against a real server.
:::
