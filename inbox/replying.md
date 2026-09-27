# Replying

<AddonHeader />

The reply form sits under the thread, for users with `reply inbox`. It has three tabs:
**Write**, **From template** and **AI draft** ("Schreiben", "Vorlage", "KI-Entwurf"). Template
and AI draft only ever fill the text field. **Nothing is sent without a click on Send.**

## What a reply is

- **Plain text**, up to 100,000 characters, with up to ten attachments of 20 MB each. Since
  0.2.2 it goes out with an HTML copy as well: everything escaped, line breaks kept, web
  addresses as links, the quote as a blockquote. No markup you type reaches the mail.
- **Signed**, if the mailbox has signatures: under the text and above the quote, after the
  separator `-- ` in the text part. See [Signatures](#signatures).
- **To** the other side of the conversation, one address. No Cc in this release.
- **From** the mailbox's address, under its [sender name](/inbox/mailboxes#the-form).
- **Subject** `Re: ` plus the conversation's subject, never `Re: Re:`.
- **Headers** that thread it in every mail program: its own `Message-ID` on the mailbox's
  domain, `In-Reply-To` the message answered (the newest incoming one), `References` the chain
  before it.
- **Quoted underneath**: the answered message, behind a marker line and "On …, … wrote:". The
  marker lets the next answer be cut from the quote exactly.

## Signatures

Since 0.2.2. Each mailbox can have several, on the **Signatures** tab of its form
("Signaturen"):

- a **name**, only shown in the reply form;
- the **text**: plain text, line breaks stay, web addresses become links. Two placeholders are
  filled in when the reply is stored: `{{ sender.name }}` (the mailbox's
  [sender name](/inbox/mailboxes#the-form)) and `{{ mailbox.email }}`. The buttons "Name
  einfügen" and "Adresse einfügen" insert them;
- one of them is the **default** ("Als Standard verwenden");
- optionally **LeadHub tags**. For a contact with one of those tags that signature is
  preselected. The order decides: the first signature from the top that fits wins. Without a
  match, the default.

In the reply form a picker sits under the text, with a preview of the signature and why it is
preselected ("Passt zum Tag Coaching", "Standard"). **Ohne Signatur** leaves it out. A mailbox
without signatures shows no picker.

## What happens on Send

```
Send
 → suppression check                  refused: nothing stored, the form says why
 → stored as an outgoing message      the text is never lost from here on
 → conversation: waiting, read, snooze ended
 → queue (inbox.queue): SendReply
      → SMTP of the mailbox
      → APPEND to the Sent folder     skipped on Gmail, which files it itself
      → InboxMessageSent              LeadHub timeline, Activity
```

The reply goes out over the **mailbox's own SMTP**, so it lands in the mailbox's Sent folder
and the other side sees your real address. When the next fetch finds the same message in Sent,
the Message-ID keeps it from being stored twice.

On a site with a queue worker the form reports "reply sent" once the job is queued; the SMTP
conversation happens in the worker. With the `sync` connection it happens inside the request,
and an error comes back to the form at once.

## When sending fails

The job runs **once**. Sending twice is worse than not sending, so there is no automatic retry.
A failure is kept on the message (`send_error`, with the password masked):

- the list shows **not sent** on the conversation,
- the message in the thread stays expanded with the error in words and the server's message,
- **put into reply** puts the text back into the form, to send again once the cause is fixed.

When the mail went out but the copy for the Sent folder could not be stored, the message says
**sent, but not filed in the Sent folder** (`filed_error`). The recipient has the reply; only
your mail program will not show it under Sent.

## Suppression

With [Suppression](/suppression/) 1.3 or later installed, a reply to an address on the list
with the reason **hard bounce**, **complaint** or **invalid address** is refused before anything
is stored. A manual block or a soft-bounce threshold does not stop a reply: somebody who wrote
to you has not objected to an answer.

The check is **fail-closed**: when the list cannot be read, nothing is sent. Without the
package nothing is checked.

## From template

With [Email Templates](/email-templates/) installed, **From template** lists the managed
templates of the current brand. Picking one fills the text field with its plain-text version
(or the HTML body turned into text) after the merge variables are applied:

| Variable | Value |
| --- | --- |
| `contact.email` | the LeadHub contact's address, else the conversation's |
| `contact.first_name`, `contact.last_name`, `contact.full_name` | from LeadHub |
| `contact.salutation` | `Hallo <first name>`, or `Hallo` without one |
| `conversation.subject` | the conversation's subject |

If the field already has text, the form asks before replacing it. The template's subject is not
used; the reply keeps `Re:` and the conversation's subject.

## AI draft

With `ANTHROPIC_API_KEY` set, **AI draft** asks the Claude Messages API for a reply. An optional
instruction ("short, offer a date") goes with it. The draft lands in the text field, to read,
change and send yourself. Without a key, the tab says that no key is configured and nothing
leaves the site.

**What is sent to the API** (`ai.base_url`, model `ai.model`):

- a fixed instruction to write only the reply body, in the language of the last message,
  without inventing facts, prices or dates, followed by the **style** from the settings
  (`ai.style_prompt`), if set; with a signature picked in the form, also the instruction not to
  sign the reply (no closing line with a name), which overrides the style;
- the other side: the LeadHub contact's name and address, and the **five newest LeadHub notes**
  on that contact, or only the address when there is no contact;
- the subject and the **six newest messages** of the conversation, each with direction (a
  [system mail](/inbox/filter#mail-your-website-sends) marked as the website's), sender name or
  address, date and up to 2,000 characters of its text without the quoted history;
- your instruction, if any.

Attachments, HTML and other conversations are not sent. Check that sending this to Anthropic
fits your privacy notice before you set the key.

An error (no key, the API unreachable, a refused key, an empty answer) is shown in the form in
words; the API key never appears in it.
