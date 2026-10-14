# Reference

<AddonHeader />

## Console commands

**None.** Nothing is scheduled.

## Permissions

| Permission | |
| --- | --- |
| `view messaging` | The Control Panel listing, detail and widget |
| `manage messaging` | Hide and show a message, unblock a participant. Child of `view messaging`. |

## `ConversationService`

| Method | |
| --- | --- |
| `start($initiator, ?Team $recipient, string $body, bool $anonymous = false, ?array $subject = null, $recipientUser = null)` | Opens a conversation with a team or, with `recipientUser:`, a person. Exactly one recipient. |
| `reply($conversation, $user, $body)` | Adds a message. |
| `shareProfile($conversation, $user)` | The anonymous initiator reveals themselves. |
| `block($conversation, $user)` | The blocking person stops sending. |
| `archive($conversation, $user, $archived = true)` | Per person. |
| `thread($conversation, $viewer)` | The messages as that viewer sees them. |
| `present($conversation, $message, $viewer)` | One message as the browser script renders it. |
| `markRead($conversation, $user)` | |
| `hideMessage($message, $reason)`, `unhideMessage($message)`, `unblock($participant)` | Moderation. Skip the policy. |

`ConversationService::MAX_BODY_LENGTH` is 10000. Other helpers: `Conversation::displayName()`
(with an optional `$initiatorKey`), `Conversation::initiatorKey()`,
`MessagingException::bodyTooLong()`.

## Events

| Event | When |
| --- | --- |
| `Goldnead\Messaging\Events\MessageSent` | Once per stored message, after commit. Must not leak an anonymous sender. |
| `MessageBroadcast` (broadcast) | Sent, hidden and restored messages, on `messaging.conversation.{id}` and `messaging.user.{key}`. Two ids, no text, no name. Only when realtime is on. |

## Routes

| Route | |
| --- | --- |
| `GET /messaging/realtime/{conversation}/messages/{message}` | One message as the viewer may see it; 404 for a hidden message, a foreign conversation or a stranger. |
| `GET /messaging/realtime.js` | The prebuilt client script. |
| `/broadcasting/auth` | Registered by the addon when the app has no broadcasting auth route of its own. |
| Control Panel `messaging.index`, `messaging.show` | Listing and detail. |
| Control Panel `messaging.messages.hide`, `messaging.messages.unhide`, `messaging.participants.unblock` | Moderation. |

## Antlers

| Tag | |
| --- | --- |
| `{{ messaging:realtime conversation="…" }}` | Loads the realtime script for a conversation; without `conversation`, for the inbox. |

## Tables

`conversations`, `conversation_participants`, `messages` (with encrypted `body`, `hidden_reason`,
`hidden_at`).

## Configuration keys

`messaging.realtime`, `messaging.client.host`, `messaging.client.port`,
`messaging.client.scheme`, `messaging.time_format`, `messaging.timezone`. See
[Configuration](/messaging/configuration).

## Personal data and deletion

See [Personal data](/messaging/personal-data).
