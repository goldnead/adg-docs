# Troubleshooting

Symptom first. Each addon section has its own troubleshooting page for
addon-specific failures; this page covers the ones that span the suite.

## A Control Panel screen is blank, or `ViteManifestNotFoundException`

The addon's compiled assets were never published.

```bash
php artisan vendor:publish --tag=statamic-leadhub --force
php artisan statamic:install
```

Statamic publishes addon assets from a `statamic:install` hook in
`post-autoload-dump`. If your `composer.json` does not have it, no addon in the
suite will ever publish anything:

```json
"scripts": {
    "post-autoload-dump": [
        "@php artisan statamic:install --ansi"
    ]
}
```

On a cold Docker build the hook needs `CACHE_STORE=array` and an existing SQLite
file, or it fails before it publishes.

## A CP 404 renders the site's front-end layout and then 500s

Symptom: a wrong CP URL produces a Vite manifest error from your *site's*
`app.blade.php` rather than a CP 404 page.

Cause: an Inertia middleware on your application side is handling CP routes.
Statamic 6's CP is itself Inertia, and its catch-all is GET-only, so a non-GET
request to a missing CP route falls through into the front-end catch-all.

Fix: bypass your own middleware for CP routes.

```php
public function handle($request, Closure $next)
{
    if (\Statamic\Statamic::isCpRoute()) {
        return $next($request);
    }
    // …
}
```

## `entryClass() on null` after importing a database

Statamic's Stache can live in the database `cache` table, and the serialised
cache holds the *other* environment's absolute paths.

```bash
php artisan cache:clear
php artisan stache:clear
php artisan stache:warm
```

## Nothing happens when the event fires

Work through it in this order:

1. **Is a queue worker running?** Most side effects in the suite are queued. With
   `QUEUE_CONNECTION=sync` they run inline; with a real driver and no worker they
   run never. `php artisan queue:work`.
2. **Is the automation or webhook enabled?** Imports always create disabled
   automations, deliberately.
3. **Is it configured in the other addon?** If both Automations and Webhook
   Manager are installed, check both. See [Boundaries](/guide/boundaries).
4. **Is a brand current?** In multi-brand mode, a console command or worker with
   no brand sees nothing, because the scope fails closed.
5. **Is the trigger registered?** `Automations::describe(YourTrigger::class)`
   resolves the handle and kind the registry holds for that class, and throws if
   it holds nothing. On a Free install, remember that a Pro-gated registration
   is skipped silently rather than reported.

## An integration between two addons is silently missing

The optional integrations are detected with `class_exists` plus a capability check.
Three things break them:

- The sibling addon is not installed. Expected; the feature degrades.
- The sibling is too old. `method_exists` on the facade **root** returns false, and
  the feature degrades. Check [Compatibility](/guide/compatibility).
- Registration ran too early. Statamic boots addon providers before application
  providers, and it calls `bootAddon()` inside an `app->booted()` callback of its
  own, so nesting another one fires immediately and is still too early.

The historical version of the third one is worth knowing: LeadHub's Webhook
Manager bridge booted before Webhook Manager existed, and all fourteen trigger
registrations were lost with nothing but log warnings. If you write a bridge, use
a deferred boot with a retry and an idempotency guard.

## `method_exists` on a facade always returns false

Because the facade forwards through `__callStatic`. Resolve the root:

```php
method_exists(LeadHub::getFacadeRoot(), 'segmentMemberIds');
```

## The app crashes on `hasPermission()`, `isSuper()` or `id()`

The install uses Eloquent users with a custom user model, so the guard returns
something that is not a Statamic user. Use `$user->can()`,
`Statamic\Facades\User::fromUser()` and `getAuthIdentifier()` instead. See
[Identity](/guide/identity#the-eloquent-users-trap).

## An inbound webhook returns 419

CSRF. Laravel's CSRF middleware skips itself automatically in unit tests, so a
test suite is blind to this and a live endpoint returns 419 anyway. The route
needs `withoutMiddleware(ValidateCsrfToken::class)`. Webhook Manager fixed this in
1.0.1; if you have written your own inbound route, check it.

## A scheduled thing never runs

`php artisan schedule:work`, or a cron entry calling `schedule:run`. The failures
are quiet by nature: scheduled campaigns never send, automation delays never
resume, and time-based segment rules go stale while mutation-driven rules stay
fresh, which produces a half-correct segment. See
[Queues & scheduling](/guide/queues).

## `composer install` fails on a deploy with a path repository

A `composer.json` referencing `../statamic-*` cannot resolve on any machine
without those sibling directories, including every Docker build. Remove the
`repositories` block and let the package resolve from Packagist, where all
twenty-four are published. A path repository is a development convenience only.

For private VCS repositories, `preferred-install: source` avoids needing a token
for the dist zipball, and `COMPOSER_AUTH` must be set **as an environment
variable before** the PHP setup step. An `auth.json` written afterwards is never
read.

## Migrations succeeded but something is still wrong

Ask the database directly rather than trusting the migration output:

```bash
php artisan leadhub:brand-integrity
php artisan marketing:consent-integrity
php artisan notifications:uniqueness-integrity
php artisan webhook-manager:health
```

The first three read the indexes and the rows and say plainly whether the
uniqueness guarantee is in force. The fourth prints delivery counts and recent
failures.

## Still stuck

Collect these before opening an issue: the addon and version, Statamic and Laravel
versions, PHP version, database engine, storage driver, whether multi-brand is on,
and the output of the relevant integrity or health command. See
[Support](/guide/support).
