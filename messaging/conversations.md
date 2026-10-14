# Conversations

<AddonHeader />

Everything goes through `ConversationService`, resolved from the container. Every call is
authorised by `ConversationPolicy`; an unauthorised call throws
`Illuminate\Auth\Access\AuthorizationException`.

```php
use Goldnead\Messaging\Services\ConversationService;

$conversations = app(ConversationService::class);

// A person writes to a team, optionally anonymous, optionally about something (type, id).
$conversation = $conversations->start($singer, $team, 'Hallo, ich suche einen Chor.', anonymous: true, subject: ['choir', 7]);

$conversations->reply($conversation, $teamMember, 'Komm gern zur Probe.');
$conversations->shareProfile($conversation, $singer); // the anonymous side reveals itself
$conversations->block($conversation, $teamMember);    // only for the blocking person
$conversations->archive($conversation, $singer);      // per person

$thread = $conversations->thread($conversation, $viewer); // what a page or a mail renders
$conversations->markRead($conversation, $viewer);
```

## The model

| Model | |
| --- | --- |
| `Conversation` | Optional subject (`subject_type`, `subject_id`), exactly one of `recipient_team_id` and `recipient_user_id`, `anonymous`, `profile_shared`. |
| `ConversationParticipant` | Role `initiator` or `member`, and `archived`, `blocked`, `flagged` per person. |
| `Message` | Sender, body, `read_at`, `hidden`. |

## A person as recipient

`start($initiator, null, $body, $anonymous, $subject, recipientUser: $person)` opens a
conversation with one person instead of a team. Exactly one of team and person must be given,
otherwise `MessagingException`. The same rules apply: only the two participants read and reply,
nobody else, and an anonymous initiator stays masked.

## Rules

- **Who is in it.** `start()` adds the initiator and every other member of the team. A team with
  nobody else cannot receive a conversation.
- **Who reads and writes.** The initiator and the recipient: the person, or the members of the
  recipient team *as they are now*. A member who has left the team loses the conversation, even
  if a participant row remains from their time in it. Admins of other teams get nothing.
- **What a message is.** Plain text, tags stripped, at most `ConversationService::MAX_BODY_LENGTH`
  (10000) characters. Empty or longer text throws `MessagingException`.
- **Anonymity.** An anonymous side shows as `Anonyme:r Interessent:in` until it calls
  `shareProfile()`. Only the initiator can.
- **Blocking.** `block()` stops the blocking person from sending. It changes nothing for the
  others.
- **Archiving and reading** are per person.
- **Rendering.** Use `ConversationService::thread()` and `Conversation::displayName()`, never the
  raw rows. A hidden message drops out of `thread()`.
- **`flagged`** marks a conversation as reported. Setting it is up to your site; moderators can
  only hide a message once a participant has flagged the conversation.

## The event

`Goldnead\Messaging\Events\MessageSent` fires **once per message, after commit**. Listen to it to
notify the other side.

**A listener for anonymous conversations must not put the sender's name or the text in a mail.**
Ask `$message->conversation->displayName()` for the name to show.

## Rendering a live message

`ConversationService::present($conversation, $message, $viewer)` returns the array the browser
script displays. The name depends on who is looking, which is why [realtime](/messaging/realtime)
sends ids and lets each browser fetch its own rendering.
