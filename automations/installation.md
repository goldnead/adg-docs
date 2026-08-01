# Installation

<AddonHeader />

<Requirements laravel="12.x or 13.x" database="MySQL or SQLite" queue="Required. Anything but sync." />

```bash
composer require goldnead/statamic-automations
php artisan migrate
```

## What comes with it

Two packages are hard dependencies and install alongside it:

| Package | Why |
| --- | --- |
| `goldnead/statamic-brand-context` | Automations, runs and templates are brand-scoped. A migration adds a required `brand_id` to the automations table, so this is not optional even on a single-brand site. |
| `inertiajs/inertia-laravel` | The Control Panel screens are Inertia pages. |

Neither needs configuring for a single-brand install. Brand Context ships its own
migrations, which the `migrate` above runs.

The addon ships its compiled Control Panel assets (Inertia + Vue 3) under
`resources/dist/build/`, and Statamic publishes them to your site's
`public/vendor/statamic-automations/` automatically on install. **There is no end-user
build step.**

Optionally publish the config:

```bash
php artisan vendor:publish --tag=statamic-automations-config
```

## A queue worker is not optional

Automation runs are dispatched off the request thread, and the **Delay** node is
implemented as a scheduled resume. With `QUEUE_CONNECTION=sync` a five-node flow runs
inline inside the request that triggered it, and a delay cannot work at all.

```bash
php artisan queue:work --queue=default
```

Give it a dedicated queue if a backlog of automation runs should not delay your
transactional mail:

```dotenv
STATAMIC_AUTOMATIONS_QUEUE=automations
```

```bash
php artisan queue:work --queue=automations,default
```

## The scheduler is not optional either

Two commands are registered with Laravel's scheduler automatically, both every minute and
`withoutOverlapping`:

| Command | What it does | Without the scheduler |
| --- | --- | --- |
| `automations:run-due` | Resumes runs whose delay or wait window has elapsed | Delayed runs wait forever |
| `automations:run-scheduled` | Starts time-triggered automations | They never start |

```bash
php artisan schedule:work    # or a cron entry calling schedule:run
```

The first failure is the quiet one: a flow with a three-day delay sits in a waiting
state indefinitely, and nothing anywhere reports a problem.

::: warning Pruning is yours to schedule
`automations:prune` is **not** registered with the scheduler. Without an entry of your
own the runs table grows without bound:

```php
// routes/console.php
Schedule::command('automations:prune')->daily();
```
:::

## Verifying the install

1. CP → **Automations** in the Tools section. Its children are *Dashboard*,
   *Automations*, *Runs*, *Audit log*, *Automation templates*, *Import* and *Settings*.
2. Open **Automation templates** and install one — one click, and you have a valid flow.
3. **Test** it. Test mode performs no real side effects by default.
4. Look at the run log.

If the section is missing, see
[a blank CP screen](/automations/troubleshooting#a-cp-screen-is-blank).

## Multiple Control Panel users

Anything that assigns work to a person implies more than one CP user, which requires
Statamic Pro:

```dotenv
STATAMIC_PRO_ENABLED=true
```

## Pro features

The Free edition includes the full builder, all triggers, all logic nodes and the core
actions. Pro unlocks the AI action and custom node registration:

```php
'features' => [
    'custom_actions_requires_pro' => true,
    'ai_action_requires_pro' => true,
],
```

The edition resolves through Statamic's own licensing system. For a self-hosted
arrangement that must not make outbound calls, the addon also supports a local key:

```dotenv
STATAMIC_AUTOMATIONS_LICENSE_MODE=config
STATAMIC_AUTOMATIONS_LICENSE_KEY=…
```

See [Configuration](/automations/configuration#license).

## Developing against a clone

The front end is built with the official Statamic 6 Vite convention
(`@statamic/cms/vite-plugin`):

```bash
composer install && npm install && npm run build
```

Or spin up a full Statamic 6 playground with the addon wired in as a path repository:

```bash
./scripts/setup-playground.sh
cd playground && php artisan serve    # → http://127.0.0.1:8000/cp
```

::: warning Two Statamic 6 build gotchas
Statamic 6 reads an addon's Vite config **only** from the service provider's `$vite`
property; `extra.statamic.vite` in `composer.json` is ignored. And
`@statamic/cms`'s Vite plugin needs `@vitejs/plugin-vue` in the project that resolves
it, not in the addon.
:::

## Licence

Commercial software, licensed (not sold) through the
[Statamic Marketplace](https://statamic.com/addons).
