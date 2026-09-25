# Inbox

<AddonHeader />

The mailbox you already use, as conversations in the Statamic Control Panel. The addon fetches
INBOX and Sent over IMAP, threads the mail into conversations, links each one to a LeadHub
contact when the address is known, and replies over the mailbox's own SMTP. A reply therefore
comes from the real address and lands in the normal Sent folder, and the mail program on your
phone shows the same history as the Control Panel.

## What it is

- **Your existing mailbox, read over IMAP.** Google Workspace, Migadu, manitu, All-Inkl or any
  server that accepts an app password. No forwarding, no second address, no change to the MX.
  See [Mailboxes and app passwords](/inbox/mailboxes).
- **Conversations, not single mails.** Messages are threaded by `In-Reply-To`, then
  `References`, then by the other side's address plus the subject within 30 days. The list has
  four tabs: open, waiting, closed and snoozed. See [Reading conversations](/inbox/conversations).
- **Replies from the Control Panel**, in plain text, with attachments, from a template or from
  an AI draft. Nothing is sent without a click. See [Replying](/inbox/replying).
- **LeadHub on both sides.** A conversation shows the contact card; the contact shows an
  "E-Mails" panel with its conversations; received and sent mail go on the contact's timeline.
  See [LeadHub and the suite](/inbox/suite).
- **Careful with strangers' mail.** HTML is sanitised and shown in a sandboxed frame without
  scripts, remote images load only on a click, attachments are served only to users with the
  permission, and the password never leaves the server. See [Security](/inbox/security).

## What it is not

- **Not a mail server.** It reads and writes a mailbox that lives elsewhere. Your provider
  still receives, stores and sends the mail.
- **Not a helpdesk.** There is no assignment, no collision warning when two people answer, and
  no ticket view. Conversations belong to the mailbox, not to a person.
- **Not a newsletter tool.** Replies go out one by one over the mailbox's SMTP. Bulk mail is
  [Marketing](/marketing/).
- **Not a CRM.** A contact is never created by the fetch. Every newsletter and every spam mail
  would otherwise become a LeadHub contact. Creating one is a button.

## How it fits

```
your mail provider (IMAP)                 inbox:fetch, every minute
  INBOX + Sent  ──── new UIDs ────▶  parse → sanitise → thread
                                       │
                                       ├─ conversation (open / waiting / closed, snooze)
                                       ├─ InboxMessageReceived
                                       │    ├─ LeadHub timeline (known contacts only)
                                       │    ├─ Activity: inbox.email_received
                                       │    └─ Automations: "Email received"
                                       ▼
Control Panel → Postfach → conversation → reply (text, template, AI draft)
  → suppression check → stored → queue: SendReply
       → SMTP of the mailbox → APPEND to Sent (not on Gmail)
       → InboxMessageSent → LeadHub timeline, Activity
```

## Limits in this release

- **No Microsoft 365 and no OAuth.** Login is an app password over IMAP and SMTP. Microsoft
  has switched basic authentication off, so Microsoft 365 and Outlook.com mailboxes cannot be
  connected.
- **Polling, not push.** New mail arrives with the next scheduler run, at most a minute late.
  There is no IMAP IDLE and no inbound webhook.
- **Not on Packagist.** The repository is private in this release; installing it needs a
  `repositories` entry and access to the repository. See [Installation](/inbox/installation).
- **Mailboxes cannot be deleted from the Control Panel.** A mailbox can be switched off
  (`active`), which stops fetching it.
- **Replies are plain text.** HTML mail is read, not written.
- **No automatic retry of a failed send.** Sending twice is worse than not sending. A failed
  reply stays on the conversation with its error, and the text can be put back into the form.
- **The Control Panel strings ship in German.** They are written in English and translated in
  `lang/de.json`; a few labels, the nav entry **Postfach** among them, are German in every
  locale.
- **Only the reply form is wired to templates and the AI.** There is no automation action that
  sends a reply.

## Next

- [Installation](/inbox/installation)
- [Configuration](/inbox/configuration)
- [Mailboxes and app passwords](/inbox/mailboxes)
- [Reading conversations](/inbox/conversations)
- [Replying](/inbox/replying)
- [LeadHub and the suite](/inbox/suite)
- [Security](/inbox/security)
- [Reference](/inbox/reference): command, routes, permissions, tables, events
