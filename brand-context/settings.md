# Addon settings

<AddonHeader />

Since **1.12.0** this package provides the settings screen for the whole suite. An addon
declares its fields and registers; the screen, the validation, the storage and the brand
dimension come from here.

Operators find it under **Settings → Addon Settings**. Every addon that registered is one
section on that page.

## What an addon writes

Four static methods and one line in `boot()`. Nothing else — no controller, no request, no
model, no Vue page.

```php
use Goldnead\BrandContext\Contracts\ProvidesSettings;

class Settings implements ProvidesSettings
{
    public static function settingsNamespace(): string
    {
        return 'automations';
    }

    public static function settingsConfigPath(): string
    {
        return 'automations';
    }

    public static function settingsPermission(): string
    {
        return 'manage automation settings';
    }

    public static function settingsGroups(): array
    {
        return [
            [
                'title' => __('Runs'),
                'description' => __('How much of each run is kept, and for how long.'),
                'fields' => [
                    [
                        'key' => 'runs.prune_after_days',
                        'type' => 'integer',
                        'label' => __('Retention'),
                        'description' => __('Days a finished run is kept.'),
                        'nullable' => true,
                        'min' => 1,
                    ],
                ],
            ],
        ];
    }
}
```

```php
// In your ServiceProvider's boot():
app(\Goldnead\BrandContext\Settings\SettingsRegistry::class)->register(Settings::class);
```

The addon still registers its own permission, exactly as before. This package only asks which
one to check.

## Field types

| `type` | Control | Notes |
| --- | --- | --- |
| `string` | text input | `max:255` |
| `integer` | number input | `min` and `max` are optional |
| `boolean` | switch | |
| `list` | textarea, one entry per line | add `items => 'integer'` when the entries are numbers |
| `select` | dropdown | `options` as `['value' => 'Label']` **or** `[['value' => …, 'label' => …]]` |

`nullable` marks a field where empty is a real answer. An unset retention means "same as the
packaged default", which is a different state from zero days, and the validation, the form and
the store each keep them apart.

::: warning Declare `items` on a numeric list
A textarea hands back strings. Without `items => 'integer'` a list whose packaged default holds
`[500, 502, 504]` is stored as `["500", "502", "504"]`, which never equals the default — so the
row can never be deleted and the field stays pinned to its own value forever. Any reader
comparing strictly (`in_array($code, …, true)`) also stops matching, silently.
:::

## Only the difference is stored

One row in `brand_settings` per key somebody actually changed:

| `brand_id` | `namespace` | `key` | `value` |
| --- | --- | --- | --- |
| 1 | `automations` | `runs.prune_after_days` | `30` |

Everything unset keeps following `config/<addon>.php`. Saving a value back to the packaged
default **deletes its row** rather than pinning it — that is the difference that matters,
because a table mirroring every key would freeze the defaults of the day the site was
installed, and a later release could never move them again.

The stored values are pushed onto the live config, so `config('automations.runs.prune_after_days')`
keeps answering correctly and existing readers need no change. For new code there is an explicit
reader:

```php
use Goldnead\BrandContext\Facades\BrandSettings;

BrandSettings::for('automations')->get('runs.prune_after_days');
BrandSettings::for('automations')->values();
```

## Brands

Values belong to a brand. On a single-brand install — which is most of them — there is one
brand and everything lives on it, so nothing about this is visible. In multi-brand mode the
switcher in the Control Panel header decides which brand's settings you are editing, and the
screen names it.

The live config follows the switch, including inside a queue worker and inside
`RunsForEachBrand`.

## What does not belong on this screen

Three exclusions, inherited from the addon where they were paid for:

- **Secrets.** API keys, SMTP credentials and tokens stay in `.env` and the secret store.
  Offered here they would land in the database, and from there in every backup and export.
- **Anything not switchable under a running install.** Storage drivers, table names, migration
  paths. A control that needs the data moved first is a control that breaks the site.
- **Detected state.** Whether a sibling addon is installed is Composer's answer, not an
  operator's. Show it somewhere, do not offer it here.

::: warning Values read during boot cannot be settings
The overrides are applied from `app->booted()`, after every provider has had its `boot()`.
Anything read *while* the application boots therefore still sees the packaged value: route
prefixes and middleware, nav registration, the scheduler. Offering such a key would produce a
control that appears to work and takes effect only after the next deploy — or not at all under
`route:cache`.
:::

## When the tables are not there

Reading needs no database at all: with no `brand_settings` table the screen shows what the
config files say. Saving does need it, so the screen says so and names `php artisan migrate`
instead of offering a Save that answers with an SQL error. The same holds on an installation
whose migrations have never run — the page renders read-only rather than failing.
