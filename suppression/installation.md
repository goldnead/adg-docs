# Installation

<AddonHeader />

<Requirements statamic="Not required (a plain Laravel provider)" database="MySQL, PostgreSQL or SQLite" />

```bash
composer require goldnead/statamic-suppression
php artisan migrate
```

Requires [Brand Context](/brand-context/). Statamic itself is optional: the provider is an
ordinary Laravel one, so the gate works in a queue worker or a console command with no Control
Panel in sight.

Publish the config only if you want to change a scope or a threshold:

```bash
php artisan vendor:publish --tag=suppression-config
```

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
