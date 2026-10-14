# Reference

<AddonHeader />

## Console commands

**None.** Nothing is scheduled.

## Permissions

| Permission | |
| --- | --- |
| `view community` | The Control Panel screens |
| `moderate community` | Moderation actions and the room form. Child of `view community`. |
| `post as team` | A **team** permission from [Teams](/teams/), not a Statamic role. Lets a member post and comment in the team's name. |

## Events

| Event | When |
| --- | --- |
| `Goldnead\Community\Events\PostCreated` | A post becomes public. |
| `Goldnead\Community\Events\CommentCreated` | A comment is stored. |

## Exceptions

`AuthorizationException` from `CommunityPolicy`. `CommunityException` for empty, oversized or
invalid input, including `tooLong()` and an invalid room `kind`.

## Control Panel routes

| Route | Permission |
| --- | --- |
| `community.posts.index`, `community.comments.index`, `community.rooms.index` | `view community` |
| `community.rooms.create`, `store`, `edit`, `update` | `moderate community` |
| `community.actions.run`, `community.actions.bulk` | `moderate community` |

## Tables

`community_rooms`, `community_room_memberships`, `community_posts`, `community_comments`,
`community_reactions`.

## Configuration keys

`pre_moderation`, `trusted_after`, `require_confirmed`, `confirmed_field`, `categories`,
`allowed_tags`, `allowed_attributes`, `reactions`, `rooms`. See
[Configuration](/community/configuration).

## Personal data and deletion

See [Personal data](/community/personal-data).
