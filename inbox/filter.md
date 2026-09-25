# Only relevant mail

<AddonHeader />

The inbox is for conversations with leads and customers. Newsletters, invoices from mailing
services and automatic notifications stay in your mail program; they never reach Statamic.
Since 0.2.

The filter works in two stages.

## Stage 1: bulk mail is not taken over

When a mailbox is fetched, every mail is checked **before** it is stored. A bulk mail is not
stored at all, attachments included. Only a skip record is kept (Message-ID, folder, UID, reason,
time), so the mail is not fetched again and the mailbox page can count it.

A mail is bulk mail when one of these holds:

| Reason | What gives it away |
| --- | --- |
| List | `List-Unsubscribe`, `List-Id` or `List-Post` is present |
| Precedence | `Precedence: bulk`, `list` or `junk` |
| Automatic | `Auto-Submitted` is present and not `no` |
| Mailing service | `Feedback-ID`, `X-Campaign`, `X-Mailchimp-*`, `X-SES-Outgoing`, `X-MC-User` and similar |
| No reply | the sender address starts with `noreply`, `no-reply`, `donotreply`, `do-not-reply`, `mailer-daemon` or `postmaster`, and `Reply-To` names no person either |
| Bounce | `Return-Path: <>` |

**Contact forms and booking tools** send as `noreply@` and put the person in `Reply-To`. Such a
mail is that person writing: they become the other side of the conversation, a reply goes to
them, and the exceptions below apply to them.

Three exceptions always win, over bulk mail and over a hidden sender:

- The sender is a **LeadHub contact**.
- You have **written to that address** from this mailbox before.
- The mail **belongs to an existing conversation** (its `In-Reply-To` or `References` name a
  stored message). A customer who answers through a ticket system or with an out-of-office
  reply is never lost. The Sent folder is read before INBOX, so a reply to a mail you sent in the
  same minute finds its thread.

Mail from your **Sent** folder is never bulk mail, unless it went to more than ten people or out
by Bcc list: then it is a circular and is skipped too.

A skip record keeps the Message-ID only as a hash, the folder, the UID, the reason and the time;
the sender only for a hidden sender, where removing the rule needs it.

The switch **Skip bulk mail** ("Massenmails überspringen") sits on the mailbox page under
**Filter**, on by default. The page also says how many bulk mails were skipped in the last 30
days.

Your own header names can be added in `config/inbox.php` under `filter.bulk_headers`.

## Stage 2: first contacts wait in "Neu"

A conversation is **relevant** when one of these holds:

1. The other side is a LeadHub contact.
2. You answered or started it (it has an outgoing message).
3. You have written to that address from this mailbox before: a known correspondent.

Every other conversation (not bulk mail, but someone you do not know yet) gets the status
`new` and shows up only in the tab **Neu**, with its own count. The tabs Offen, Wartet, Erledigt
and Geschlummert show relevant conversations only, and the number in the menu counts only
relevant unread ones.

In **Neu**, per row or in the conversation:

- **Accept** ("Übernehmen"): the conversation becomes relevant, without a CRM contact, and stays
  so when the next mail arrives.
- **Create contact** ("Kontakt anlegen"): creates the LeadHub contact; the conversation becomes
  relevant.
- **Hide sender** or **Hide domain** ("Absender ausblenden", "Domain ausblenden"): see below.

Answering a conversation takes it out of **Neu** by itself.

## Hiding a sender or a domain

Only from a conversation in **Neu**. The rule goes on the mailbox's blocklist and future mail
from that sender or domain is not stored. Existing **first contacts** from it are **deleted in
Statamic**, attachments included; conversations you answered, with a contact or taken over
stay, and their senders keep coming through (see the exceptions above). The mails themselves stay
in Gmail or your mailbox, untouched. A dialog says all this before anything happens, with the
number of conversations that will be deleted.

Freemail domains (gmail.com, gmx.de, web.de, t-online.de, outlook.com and others) cannot be hidden
as a whole, because every address there is somebody else; hide the sender instead. More such
domains can be added under `filter.freemail_domains`.

The mailbox page lists hidden senders and domains under **Filter**, each with **Remove**
("Entfernen"). Removing a rule lets future mail through again; it needs `reply inbox`, like hiding.
Deleted conversations come back only with a later import.

## Your own addresses

The mailbox address and the **further own addresses** of a mailbox (aliases, one per line on the
**Filter** tab) are never the other side of a conversation. A mail to yourself, or between your
own addresses, makes no conversation.

## Cleaning up mail imported before 0.2

```bash
php artisan inbox:reclassify --dry-run          # counts only, changes nothing
php artisan inbox:reclassify                    # applies stage 1 and 2
php artisan inbox:reclassify --mailbox=1        # one mailbox
```

For every stored message it reads the headers again from the server, **headers only and with
PEEK**, so nothing is marked read and nothing moves. Then it deletes bulk conversations and
conversations with yourself (files included, with skip records), and files unknown people under
**Neu**; a conversation in **Neu** that has become relevant (a new contact, say) leaves it. A
conversation whose headers cannot be read is never deleted, but is still filed by relevance. Run
the dry run first.

New messages store the headers the filter decides on, so a later run needs no server at all.

## Getting back what was skipped

0.2.0 could skip a real person: a contact-form mail from `noreply@`, or a reply that arrived in
the same fetch as your own mail. 0.2.1 no longer does, and brings those back:

```bash
php artisan inbox:reclassify --reconsider-skipped --dry-run   # counts only
php artisan inbox:reclassify --reconsider-skipped             # imports what is no bulk mail
```

It looks at every skip record except hidden senders: the headers at the recorded folder and UID
(PEEK), or, when that UID is gone (archived), a search by Message-ID in INBOX and All Mail. What
no longer counts as bulk mail is imported, and its record removed. Afterwards every remaining
record keeps only the hash of its Message-ID.
