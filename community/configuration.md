# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=community-config
```

```php
// config/community.php
return [
    'pre_moderation' => false,
    'trusted_after' => 1,
    'require_confirmed' => true,
    'confirmed_field' => null,
    'categories' => ['community', 'announcement', 'question', 'offer'],
    'allowed_tags' => ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'blockquote', 'a'],
    'allowed_attributes' => ['href'],
    'reactions' => ['like', 'helpful', 'thanks'],
    'rooms' => [ /* curated rooms: slug, name, kind, icon, description */ ],
];
```

## `pre_moderation` and `trusted_after`

Off by default, so nobody on a fresh install is silenced. When on, a new post stays `pending`
until a moderator approves it. Moderators (`moderate community`) always publish directly, and
so do accounts that already have `trusted_after` published posts (default `1`). With the default
that means: the first post of a newcomer needs a moderator, the second does not.

## `require_confirmed` and `confirmed_field`

Posting, commenting and reacting need a **confirmed account**: `email_verified_at`, or the
field named by `confirmed_field`, falling back to `accounts.verification.field`. Set
`require_confirmed` to `false` to turn the requirement off.

## `categories`

The categories a post can have. Default `community`, `announcement`, `question`, `offer`.

## `allowed_tags` and `allowed_attributes`

What survives in a post or comment body. The defaults keep paragraphs, line breaks, basic
emphasis, lists, quotes and links (`href` only). See
[Rules and moderation](/community/moderation#bodies) for what else is stripped.

## `reactions`

The kinds of reaction. Default `like`, `helpful`, `thanks`. One per account and target.

## `rooms`

The curated rooms `RoomSeeder` (or `RoomService::syncCurated()`) creates by slug. Each has `slug`,
`name`, `kind` (`region`, `style` or `topic`), `icon` and `description`. A `kind` outside
`Room::KINDS` is refused with a `CommunityException`. The shipped defaults are six topic rooms
(Allgemein, Aushilfen-Börse, Stimme & Technik, Chorleitung, Verein & Orga, Material & Noten);
replace them with your own.
