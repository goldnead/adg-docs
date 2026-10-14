# Rules and moderation

<AddonHeader />

## Who may do what

- **Post, comment, react:** a confirmed account (`email_verified_at`, or
  `accounts.verification.field`). `community.require_confirmed` turns this off.
- **As a team:** only with the team permission `post as team` (the owner has it).
- **Edit:** the author only, and only while the account is confirmed.
- **Delete:** the author, or a moderator (`moderate community`).
- **Hide and restore:** moderators, with `PostService::hide()`, which takes an optional reason.

## Pre-moderation

`community.pre_moderation`, default **off**. When on, a new post is `pending` until
`PostService::approve()`. Off means nobody on a fresh install is silenced; on means the first
post of a newcomer needs a moderator.

- **Moderators and trusted accounts skip the queue.** Moderators always publish directly, and so
  do accounts with `trusted_after` published posts.
- **Approving is atomic.** Of two moderators approving at once, only one publishes and fires
  `PostCreated`.
- Pending and hidden posts are not in the feed.

## Bodies {#bodies}

Bodies keep only `community.allowed_tags` and `allowed_attributes`:

- no scripts, no event handlers;
- links only with `http`, `https`, `mailto` or `tel`, or relative. `vbscript:`, `data:`, `file:`
  and others are stripped;
- a body over 60000 bytes is refused with `CommunityException::tooLong()`;
- titles and regions are cut at 255 characters.

## Hiding is not deleting

A hidden post or comment stays in the database with its reason, drops out of the feed, and can
be shown again. Deleting removes it.

## Curated rooms

Rooms live in `community.rooms`. `RoomSeeder` or `RoomService::syncCurated()` creates them by
slug, idempotently. A room can also be created and edited in the Control Panel, see
[The Control Panel](/community/control-panel). One published post per room can be pinned; it
leads that room's feed.
