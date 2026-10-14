# Messaging

<AddonHeader />

Conversations between a person and a team, or between two people, with anonymous requests,
profile release and blocking. Message texts are stored encrypted, a moderator can hide a
reported message without ever reading one, and new messages can appear in an open conversation
over websockets.

The public side has **no screens**: a site builds its inbox and conversation pages on
`ConversationService`. The Control Panel has a moderation backend.

## What it is

- **Conversations with a team or a person.** A singer writes to a choir (a team in
  [Teams](/teams/)), or one person writes to another. See [Conversations](/messaging/conversations).
- **Anonymous requests.** The initiator can stay "Anonyme:r Interessent:in" until they choose to
  release their profile.
- **Encrypted texts.** `messages.body` is encrypted with `APP_KEY`. See
  [Encrypted messages](/messaging/encryption).
- **Realtime over Laravel Reverb**, off until you turn it on. See
  [Realtime in 3 steps](/messaging/realtime).
- **Moderation in the Control Panel** that shows the shape of conversations and never their
  content. See [The Control Panel](/messaging/control-panel).
- **Personal data** handled when [Accounts](/accounts/) is installed. See
  [Personal data](/messaging/personal-data).

## What it is not

- **Not an inbox UI.** No routes for conversation pages, no templates. You render
  `ConversationService::thread()` yourself. The only routes the addon adds are the realtime ones.
- **Not a mail client.** For your own mailbox in the Control Panel see [Inbox](/inbox/).
- **Not a notifier.** It fires `MessageSent`; sending a mail or a notification about it is yours
  or [Notifications](/notifications/)'.
- **Not searchable.** Texts are encrypted, so nothing filters, searches or sorts on them in SQL.

## How it fits

```
start($singer, $team, $text, anonymous: true)
   → Conversation + participants (initiator, every other team member)
   → Message (text encrypted)  → MessageSent (after commit)
                               → MessageBroadcast (ids only, if realtime is on)

reply / shareProfile / block / archive / markRead   → per person
hideMessage / unhideMessage / unblock               → moderator, skips the policy
```

## Next

- [Installation](/messaging/installation)
- [Configuration](/messaging/configuration)
- [Conversations](/messaging/conversations)
- [Encrypted messages](/messaging/encryption)
- [Realtime in 3 steps](/messaging/realtime)
- [The Control Panel](/messaging/control-panel)
- [Personal data](/messaging/personal-data)
- [Reference](/messaging/reference)
