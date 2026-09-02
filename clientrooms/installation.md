# Installation

<AddonHeader />

<Requirements laravel="12.x / 13.x" database="MySQL or SQLite — required, the tables are the addon" />

```bash
composer require goldnead/statamic-clientrooms
php artisan migrate
php please clientrooms:install
php please vendor:publish --tag=statamic-clientrooms-config
```

**No front-end build step.** The Control Panel screens ship as a committed bundle under
`dist/`, and Statamic publishes it to `public/vendor/statamic-clientrooms` on install. To
republish by hand after an update:

```bash
php artisan vendor:publish --tag=statamic-clientrooms --force
```

## The three steps, and why each one

**`migrate`** creates `client_rooms`, `client_room_tasks` and `client_room_files`. The
tables are the addon; nothing here works without them, so the migration loads
unconditionally. To keep it in your own repository:

```bash
php please vendor:publish --tag=statamic-clientrooms-migrations
```

**`clientrooms:install`** creates the asset container the documents go into. A container is
Statamic content, not schema, which is why it is not part of the migration. The command is
safe to run twice.

**The config** is optional. Without it the defaults below apply.

## Configuration

```php
// config/statamic-clientrooms.php

// The container and the disk it sits on. `local` has no public URL —
// client documents should not have one.
'container' => env('CLIENTROOMS_CONTAINER', 'clientrooms'),
'disk' => env('CLIENTROOMS_DISK', 'local'),

// Which paid product opens a room (needs statamic-payments).
// Kinds are `type` values from statamic-products; `sessions` is a package of
// coaching sessions. Handles work whatever the kind.
'open_on_product_types' => ['sessions'],
'open_on_products' => [],

// Who owns a room that was opened automatically: a user id or an address.
'default_owner' => env('CLIENTROOMS_DEFAULT_OWNER'),

// How long a link handed to the client stays valid.
'download_ttl_minutes' => 30,

// How many timeline entries the room shows at most.
'timeline_limit' => 100,
```

::: warning Put the container on a private disk
The default is `local`, and that is deliberate. On a disk with a public URL every document
is reachable by anyone who knows the path, signed link or not. Change `disk` only to another
private one.
:::

## Dependencies

Only `statamic/cms` `^6.0` and PHP `^8.2`. Nothing else in the suite is required.

### Optional siblings

| Package | What it adds |
| --- | --- |
| [`goldnead/statamic-payments`](/payments/) | A paid coaching product opens the buyer's room on its own. |
| [`goldnead/statamic-leadhub`](/leadhub/) | The room links to the contact and shows LeadHub's merged timeline. |
| [`goldnead/statamic-booking`](/booking/) | Appointments appear on the room's own timeline when LeadHub is absent. |
| [`goldnead/statamic-brand-context`](/brand-context/) | Rooms of different brands stay apart; the same address may have one room per brand. |

Each is detected with `class_exists` at runtime. Installing one later needs no
reconfiguration; removing one costs the feature and nothing else.

## Permissions

Two, under **Client rooms** in the role editor:

| Permission | Opens |
| --- | --- |
| `view client rooms` | The listing, the detail page, the coach's downloads |
| `edit client rooms` | Opening, closing, owner, notes, tasks, uploads, visibility, deletion |

Every write route is guarded twice: `can:` middleware on the route and the same Gate check
inside the controller action.

## The page for the client

The addon ships a starter view. On any page behind your site's login:

```antlers
{{ partial:statamic-clientrooms::room }}
```

To shape it yourself, publish it and edit the copy:

```bash
php please vendor:publish --tag=statamic-clientrooms-views
```

It lands in `resources/views/vendor/statamic-clientrooms/room.antlers.html`. Everything it
prints comes from [the tag](/clientrooms/reference#the-tag).
