# Installation

<AddonHeader />

<Requirements php="8.3+" laravel="12.40+ or 13.x" />

```bash
composer require goldnead/statamic-directory
php artisan migrate
```

The service provider is discovered automatically and the migrations load from the package.
`goldnead/statamic-teams` (`^0.4`) is required and installed with it: the claim adapter and the
edit permission both come from Teams.

## First run

1. Create the profile collection or collections in Statamic and put their handles in
   [`directory.collections`](/directory/types) (or `directory.collection` for a single one,
   default `choirs`).
2. Give the entries the fields the [mapping](/directory/configuration#fields) names: `title`,
   `city`, `description`, `visibility`, `hidden` and, for radius search, `lat` and `lng`.
3. Project the entries that already exist:

   ```bash
   php artisan directory:rebuild
   ```

From then on, saving or deleting an entry keeps its row in step.

## Updating

Run `php artisan migrate` after an update, and again after you add a filter to
`directory.filters`: filters are columns of the projection, and the migration creates them.

```bash
composer update goldnead/statamic-directory
php artisan migrate
```

The Control Panel bundle is committed in `resources/dist`; you do not build it. If you work on
the addon itself, `npm install && npm run build` rebuilds it.
