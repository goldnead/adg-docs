# Community

<AddonHeader />

Curated rooms, posts, comments and reactions, with a chronological feed. A person can post as
themselves or, with the right permission, as a team from [Teams](/teams/).

The public side has **no routes and no screens**: a site builds its pages on the services. The
Control Panel has a moderation backend.

<Figure
  src="community-posts"
  alt="The Posts screen in the Control Panel: a listing of posts with search, filters for room, region, status, visibility and author, and row actions for approve, hide and delete"
  caption="Posts in core's native listing, with moderation per row and in bulk." />

## What it is

- **Rooms**, curated by you. A room has a kind (`region`, `style` or `topic`), can be archived
  and can pin one post to the top of its feed. See [Rooms, posts and the feed](/community/posts).
- **Posts, comments and reactions.** One level of replies, one reaction per account and target.
- **A chronological feed.** Ordered by publication time, never by reactions.
- **Safe bodies.** HTML is reduced to an allow-list; links only with safe schemes.
- **Optional pre-moderation**, so the first post of a newcomer waits for a moderator. See
  [Rules and moderation](/community/moderation).
- **A moderation backend** in the Control Panel. See [The Control Panel](/community/control-panel).
- **Personal data** handled when [Accounts](/accounts/) is installed. See
  [Personal data](/community/personal-data).

## What it is not

- **Not a front end.** No routes, no templates. You render `PostService::feed()` and friends.
- **Not a notifier.** It fires `PostCreated` and `CommentCreated`; announcing them is yours, or
  [Notifications](/notifications/)'.
- **Not a ranking.** Reactions never change the order of the feed.

## How it fits

```
PostService::create($user, $html, room: $room)
   → sanitised, status published (or pending under pre-moderation)
   → PostCreated   (when it becomes public)
CommentService::create(...)  → CommentCreated
ReactionService::react(...)  → one per account and target

Moderator (Control Panel) → approve / hide with a reason / show / delete
```

## Next

- [Installation](/community/installation)
- [Configuration](/community/configuration)
- [Rooms, posts and the feed](/community/posts)
- [Rules and moderation](/community/moderation)
- [The Control Panel](/community/control-panel)
- [Personal data](/community/personal-data)
- [Reference](/community/reference)
