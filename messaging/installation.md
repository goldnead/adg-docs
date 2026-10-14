# Installation

<AddonHeader />

<Requirements laravel="12.40+ or 13.x" />

```bash
composer require goldnead/statamic-messaging
php artisan migrate
```

The service provider is discovered automatically and the migrations load from the package; there
is nothing to publish. Laravel 13 needs PHP 8.3.

## What it needs

| Package | | |
| --- | --- | --- |
| [`goldnead/statamic-teams`](/teams/) `^0.4` | Required | Supplies teams and their members, the recipients of a conversation. |
| [`goldnead/statamic-accounts`](/accounts/) | Suggested | Export and erasure of a person's messages. See [Personal data](/messaging/personal-data). |
| [`goldnead/statamic-notifications`](/notifications/) | Suggested | Tell the other side that a message arrived: listen to `MessageSent`. |
| `laravel/reverb` | Optional | Realtime. See [Realtime in 3 steps](/messaging/realtime). |

## Before you store the first message

Texts are encrypted with your `APP_KEY`. **Decide how you will rotate that key before you have
messages**, because a key change without `APP_PREVIOUS_KEYS` makes every stored message
unreadable for good. See [Encrypted messages](/messaging/encryption).

## Updating

Run `php artisan migrate` after an update. Two migrations upgrade an install that has plain
texts: one widens `messages.body` to `longText`, one encrypts the rows that are still plain. Both
are safe to run twice, and `migrate:rollback` decrypts again. Moderation adds `hidden_reason`
and `hidden_at` to `messages`, and person-to-person conversations add `recipient_user_id`.

```bash
composer update goldnead/statamic-messaging
php artisan migrate
```

The compiled Control Panel assets are committed in `resources/dist/build`. If you work on the
addon itself, rebuild them with `composer install && npm ci && npm run build`; its CI fails on
a stale build.
