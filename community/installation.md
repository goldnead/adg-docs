# Installation

<AddonHeader />

<Requirements laravel="12.40+ or 13.x" />

```bash
composer require goldnead/statamic-community
php artisan migrate
php artisan db:seed --class='Goldnead\Community\Seeders\RoomSeeder'
php artisan vendor:publish --tag=community-config   # optional
```

The seeder creates the curated rooms from `community.rooms`. It is idempotent, keyed by slug, so
running it again is harmless.

## What it needs

| Package | | |
| --- | --- | --- |
| [`goldnead/statamic-teams`](/teams/) `^0.4` | Required | Posting as a team, and the `post as team` permission. |
| [`goldnead/statamic-accounts`](/accounts/) | Suggested | Confirmed accounts, and the export and erasure of personal data. |
| [`goldnead/statamic-notifications`](/notifications/) | Suggested | Tell people about new posts and comments: listen to `PostCreated` and `CommentCreated`. |

## Updating

Run `php artisan migrate` after an update. The Control Panel release (0.1.0) added a composite
feed index `(status, hidden, published_at)`, `hidden_reason` on posts and comments, and
`pinned_post_id` on rooms.

```bash
composer update goldnead/statamic-community
php artisan migrate
```

The built Control Panel assets are committed in `dist/`. If you work on the addon itself, run
`npm ci && npm run build` after changing `resources/`; its CI fails when `dist/` is stale.
