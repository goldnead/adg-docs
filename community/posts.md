# Rooms, posts and the feed

<AddonHeader />

Everything goes through four services, resolved from the container: `PostService`,
`CommentService`, `ReactionService` and `RoomService`. Every write is authorised by
`CommunityPolicy`. It throws `AuthorizationException` when the account may not do it, and
`CommunityException` for an empty, oversized or invalid input.

```php
use Goldnead\Community\Services\PostService;

$post = app(PostService::class)->create($user, '<p>Hallo Chor</p>', room: $room, title: 'Willkommen');
$feed = app(PostService::class)->feed($room)->paginate(20);
```

## The model

| Model | |
| --- | --- |
| `Room` | `region`, `style` or `topic` (validated against `Room::KINDS`), a curated flag, `archived_at`, an optional pinned post. `RoomMembership` per account. |
| `Post` | Author (an account, optionally as a team), category, room, region, title, sanitised HTML body, `status` (`published` or `pending`), `hidden` with an optional reason. |
| `Comment` | One level of replies, sanitised HTML body, `hidden`. |
| `Reaction` | One per account and target (a post or a comment). Reacting again changes the kind; a double click returns the existing reaction instead of failing. |

## Services

| Service | Calls |
| --- | --- |
| `PostService` | `create($user, $body, $room, $category, $region, $title, $team)`, `update`, `delete`, `approve`, `hide`, `feed($room, $region)` |
| `CommentService` | `create($post, $user, $body, $parent, $team)`, `update`, `delete` |
| `ReactionService` | `react($target, $user, $kind)`, `remove` |
| `RoomService` | `syncCurated()`, `save($room, $attributes)`, `pin($room, $post)`, `join`, `leave` |

## The feed

`PostService::feed($room, $region)` returns a query, ordered by `published_at` and then id.

- **Reactions never change the order.** The one pinned post of a room leads its feed.
- **Pending and hidden posts are not in it.**
- An index on `(status, hidden, published_at)` serves it, so paginate it directly.

## Posting as a team

With a `Team`, a post or comment is written in the team's name. Only an account with the team
permission `post as team` may do this; the team's owner has it. In the Control Panel the post
then shows the team name as its author.

## Events

| Event | When |
| --- | --- |
| `Goldnead\Community\Events\PostCreated` | When a post **becomes public**: on creation, or on approval when pre-moderation held it back. A post waiting for approval fires nothing, so no listener can announce what nobody may see. |
| `Goldnead\Community\Events\CommentCreated` | Once per stored comment. |

Both fire after commit.
