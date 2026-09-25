# Reading conversations

<AddonHeader />

**Postfach** under **Tools** opens the conversation list. The nav label carries the number of
unread conversations, `Postfach (3)`.

![The conversation list: a refused app password and two skipped messages above it, tabs Offen, Wartet, Erledigt, Geschlummert, unread conversations with a dot and a "not sent" badge](/screenshots/inbox-conversation-list.png)

The screenshots show the Control Panel in German, the language the strings ship in.

## The list

It is core's listing, with the usual column picker, filters and pagination. Four tabs:

| Tab | German | Holds |
| --- | --- | --- |
| Open | Offen | A new incoming message arrived and nobody has answered. |
| Waiting | Wartet | The last message is yours; the other side is to answer. |
| Closed | Erledigt | Marked done. |
| Snoozed | Geschlummert | Snoozed until a date, whatever the status. |

Each row shows the other side (the LeadHub name, else the name the sender gave, else the
address), the subject with an excerpt of the latest message, the mailbox (only when there is
more than one) and the time of the last message. Unread conversations carry a dot and bold
text; a reply that could not be sent carries a **not sent** badge.

**Search** looks in the subject, the other side's address and the sender names. The
**mailbox** filter narrows the list to one mailbox.

## How mail becomes a conversation

Every message of INBOX and Sent is stored once per mailbox, keyed by its Message-ID. It joins a
conversation by the first rule that matches:

1. Its `In-Reply-To` names a stored message.
2. One of its `References` does, newest first.
3. A reply that arrived earlier already names this message as its parent.
4. Same other side, same subject after stripping `Re:`, `AW:` and the like, last message within
   30 days (`fetch.subject_match_days`).

Otherwise a new conversation opens. Threading never crosses mailboxes. A mail you sent from
your phone turns up in Sent and joins its conversation like any other.

The newest message decides the state. An incoming one opens the conversation, marks it unread
and ends a snooze; an outgoing one sets it to waiting. An older message imported late changes
nothing.

## A conversation

![A conversation: older messages folded, a reply sent but not filed in Sent, the contact card and details on the right, the reply form below](/screenshots/inbox-conversation-thread.png)

Opening a conversation marks it read. The thread shows the newest message and every message
with a problem expanded; older ones are folded behind "show older messages".

- **Quoted text** is hidden and one click away ("show quoted text"). For plain text the part the
  sender wrote is cut from the quoted history when the mail is stored; for HTML the blockquotes
  of Gmail, Apple Mail, Outlook and Thunderbird are hidden in the frame.
- **HTML mail** is shown sanitised, in a sandboxed frame in which no script runs. Links open in
  a new tab.
- **Remote images** are not loaded. Each shows as a grey placeholder until someone clicks
  **Load images** ("Bilder laden"); "block again" undoes it. The sender therefore cannot see that
  the mail was opened.
- **Inline images** (`cid:`) and **attachments** come from the addon's own route, which checks
  `view inbox`. Images and PDFs open in the browser, everything else downloads.

See [Security](/inbox/security) for what exactly is removed and blocked.

On the right: the **contact card** when LeadHub knows the address, else **Create contact**
([LeadHub and the suite](/inbox/suite)), and the details: status, mailbox, last message.

## Status and snooze

With `reply inbox`, the header has:

- **Done** ("Erledigt"), and in the menu back to open or waiting.
- **Snooze** with three presets, tomorrow at 8 am, next Monday at 8 am, in one week, or a date
  and time of your own. A snoozed conversation sits in the Snoozed tab until then and comes
  back on its own; a new incoming message ends the snooze at once. "End snooze" ends it by hand.
- Mark as unread.

Sending a reply sets the conversation to waiting and ends a snooze.
