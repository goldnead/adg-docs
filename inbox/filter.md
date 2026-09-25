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
| No reply | the sender address starts with `noreply`, `no-reply`, `donotreply`, `do-not-reply`, `mailer-daemon` or `postmaster` |
| Bounce | `Return-Path: <>` |

Two exceptions always win:

- The sender is a **LeadHub contact**.
- The mail **belongs to an existing conversation** (its `In-Reply-To` or `References` name a
  stored message). A customer who answers through a ticket system or with an out-of-office
  reply is never lost.

Mail from your **Sent** folder is never bulk mail, unless it went to more than ten people or out
by Bcc list: then it is a circular and is skipped too.

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

The rule goes on the mailbox's blocklist. Existing conversations with that sender or domain are
**deleted in Statamic**, attachments included, and future mail from it is not stored. The mails
themselves stay in Gmail or your mailbox, untouched. A dialog says so before anything happens.

Freemail domains (gmail.com, gmx.de, web.de, t-online.de, outlook.com and others) cannot be hidden
as a whole, because every address there is somebody else; hide the sender instead. More such
domains can be added under `filter.freemail_domains`.

The mailbox page lists hidden senders and domains under **Filter**, each with **Remove**
("Entfernen"). Removing a rule lets future mail through again. Deleted conversations come back only
with a later import.

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
**Neu**. A conversation whose headers cannot be read is left as it is. Run the dry run first.

New messages store the headers the filter decides on, so a later run needs no server at all.
