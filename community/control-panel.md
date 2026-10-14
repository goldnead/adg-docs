# The Control Panel

<AddonHeader />

A **Community** section in the navigation, with **Posts**, **Comments** and **Rooms**, and a
dashboard widget. The Control Panel is written in English; `lang/de.json` translates it.

## Posts and Comments

Core's native listing, with search and filters for room, region, status, visibility and author
(person or team).

Per row and in bulk:

- **Approve** (pre-moderation)
- **Hide**, with a reason
- **Show** again
- **Delete**

They run through `PostService` and `CommentService`, so the Control Panel and your code follow
the same rules.

**Authors appear by display name only**, a team post by the team name, never by email address or
account id, and the search never looks at either.

<Figure
  src="community-comments"
  alt="The Comments screen in the Control Panel, with the same search, filters and moderation actions as posts"
  caption="Comments, moderated the same way." />

## Rooms

A list with member and post counts. **Create** and **edit** use core's publish form. `kind` must
be one of `Room::KINDS`. You can **pin** one published post per room; it leads that room's feed.

<Figure
  src="community-room-form"
  alt="The room form in the Control Panel"
  caption="The room form." />

## The widget

Add it under `widgets` in `config/statamic/cp.php` with `type => community`. It shows posts and
comments of the last 7 days, posts waiting for approval and hidden items.

## Permissions

| Permission | |
| --- | --- |
| `view community` | Opens the screens |
| `moderate community` | Lets you change things: moderate, create and edit rooms. A child of `view community`. |

The room form and every moderation route need `moderate community`. The listings need
`view community`.
