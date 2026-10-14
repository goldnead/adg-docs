# The Control Panel

<AddonHeader />

A moderator's view under **Tools > Messages** (`Nachrichten` in German). It shows the **shape**
of the conversations and never their content: no message text, no participant name or key, and
no free-text subject id appear on any screen, in any response or in the widget. The initiator of
an anonymous conversation is only ever "Initiator".

## The listing

Id, created, last activity, recipient (the team's name, or "Person"), anonymous, message count,
and the flags *flagged*, *blocked* and *has hidden messages*.

Filters: anonymous, flagged, blocked, hidden messages, created (date range). **There is no
search**, because everything a search could match is a text or a name.

## The detail

The metadata, a timeline (message sent, which side, hidden or not, with the moderator's reason)
and the participants by side with their flags.

## Moderation

Needs `manage messaging`.

- **Hide a message** with a reason, and **show it again**.
- **Unblock a participant.**

A message can only be hidden once a participant has flagged the conversation
(`ConversationParticipant::$flagged`). A hidden message drops out of
`ConversationService::thread()`, and, with [realtime](/messaging/realtime) on, out of open
conversations. The same rules sit on `ConversationService::hideMessage()`, `unhideMessage()` and
`unblock()`, which skip the policy because the moderator is not a party to the conversation.
Setting `flagged` is up to your site.

## The widget

A dashboard widget `messaging`: conversations and messages of the last 7 and 30 days, and the
number of flagged conversations.

## Permissions

| Permission | |
| --- | --- |
| `view messaging` | Everything above except the actions |
| `manage messaging` | Hide, show, unblock. A child of `view messaging`. |

Run `php artisan migrate` once after updating: moderation adds `hidden_reason` and `hidden_at`
to `messages`.
