# Reference

<AddonHeader />

## Command

```bash
php artisan inbox:fetch                # every active mailbox of every brand
php artisan inbox:fetch --mailbox=3    # only this one
```

Fetches the mailboxes one after the other, each under its own cache lock
(`inbox:fetch:{id}`, held at most `fetch.lock_seconds`). A mailbox still being fetched is
skipped with a line saying so; one failing mailbox does not stop the rest. The output is one
line per mailbox with the number of new messages. The command always exits `0`; a mailbox
that failed as a whole is also logged as an error.

**Scheduled** by the addon: every minute, `withoutOverlapping(15)`, named `inbox-fetch`.
Needs `php artisan schedule:run` every minute on the server.

## Queue job

| Job | Queue | Tries |
| --- | --- | --- |
| `Goldnead\StatamicInbox\Sending\SendReply` | `inbox.queue` (`default`) | 1 |

## Events

Both carry the stored `Goldnead\StatamicInbox\Models\Message` as `$message`.

| Event | Fired |
| --- | --- |
| `Goldnead\StatamicInbox\Events\InboxMessageReceived` | once per incoming message stored by a fetch; not for mail found in Sent |
| `Goldnead\StatamicInbox\Events\InboxMessageSent` | after a reply went out over SMTP (and after the Sent copy, successful or not) |

What listens to them when the siblings are installed is on
[LeadHub and the suite](/inbox/suite).

## Permissions

| Permission | Parent | Label |
| --- | --- | --- |
| `view inbox` | | View conversations |
| `reply inbox` | `view inbox` | Reply to conversations |
| `manage inbox mailboxes` | | Manage mailboxes |

Group **Postfach**. The settings section is guarded by `manage inbox mailboxes`.

## Navigation

**Postfach** under **Tools**, to `inbox.index`, for `view inbox`. With unread conversations the
label reads `Postfach (n)`, and the count is also in the `data-inbox-unread` attribute. No child
entries: the mailboxes are one button away in the list's header.

## Control Panel routes

Under the Control Panel prefix, names prefixed `statamic.cp.`:

| Method | Path | Name | Permission |
| --- | --- | --- | --- |
| GET | `inbox` | `inbox.index` | `view inbox` |
| GET | `inbox/conversations/{id}` | `inbox.conversations.show` | `view inbox` |
| PATCH | `inbox/conversations/{id}` | `inbox.conversations.update` | `reply inbox` |
| POST | `inbox/conversations/{id}/reply` | `inbox.conversations.reply` | `reply inbox` |
| POST | `inbox/conversations/{id}/draft` | `inbox.conversations.draft` | `reply inbox` |
| POST | `inbox/conversations/{id}/template` | `inbox.conversations.template` | `reply inbox` |
| POST | `inbox/conversations/{id}/contact` | `inbox.conversations.contact` | `reply inbox` |
| GET | `inbox/attachments/{id}` | `inbox.attachments.show` | `view inbox` |
| GET | `inbox/mailboxes` | `inbox.mailboxes.index` | `manage inbox mailboxes` |
| GET | `inbox/mailboxes/create` | `inbox.mailboxes.create` | `manage inbox mailboxes` |
| POST | `inbox/mailboxes` | `inbox.mailboxes.store` | `manage inbox mailboxes` |
| POST | `inbox/mailboxes/test` | `inbox.mailboxes.test-new` | `manage inbox mailboxes` |
| GET | `inbox/mailboxes/{id}/edit` | `inbox.mailboxes.edit` | `manage inbox mailboxes` |
| PATCH | `inbox/mailboxes/{id}` | `inbox.mailboxes.update` | `manage inbox mailboxes` |
| POST | `inbox/mailboxes/{id}/test` | `inbox.mailboxes.test` | `manage inbox mailboxes` |

`GET inbox` answers core's Listing with JSON when asked for it (`tab`, `search`, `mailbox`,
`filters`, `order`, `perPage` up to 500). `PATCH inbox/conversations/{id}` accepts `status`
(`open`, `waiting`, `closed`), `snoozed_until`, `unread` and `contact_id`. There is no route to
delete a mailbox or a conversation, and no front-end route.

## Tables

Every table has a `brand_id` and is scoped by Brand Context.

| Table | Holds |
| --- | --- |
| `inbox_mailboxes` | One IMAP/SMTP account: address, sender name, servers, login, encrypted password, folders, `append_sent`, UID cursor and UIDVALIDITY per folder, `import_since`, `active`, the last error and its scope (`mailbox`, `folder`, `message`), `folder_errors`. |
| `inbox_conversations` | Mailbox, subject and its normalised form, the other side's address, `contact_id`, `status`, `snoozed_until`, `last_message_at`, `unread`. |
| `inbox_messages` | Direction (`in`, `out`), Message-ID (unique per mailbox; an overlong one indexed by hash with the full id beside it), `In-Reply-To`, `References`, sender, `to`, `cc`, subject, text, sanitised HTML, text without the quote, `sent_at`, folder and UID, `has_remote_images`, `send_error`, `filed_error`. |
| `inbox_attachments` | Message, file name, MIME type, Content-ID, size, path on the attachments disk. |
| `inbox_fetch_failures` | A message that could not be stored: mailbox, folder, UID, error, attempts, first and last seen, `gave_up_at` after three attempts. |

Deleting a mailbox row cascades to its conversations, messages, attachment rows and failures.
The files on the attachments disk are not removed by the cascade.

## Contracts

The IMAP client and the SMTP transport are bound through two interfaces. A site or a test
binding its own wins:

| Contract | Default |
| --- | --- |
| `Goldnead\StatamicInbox\Contracts\MailboxClientFactory` | `Imap\ImapEngineClientFactory` (directorytree/imapengine) |
| `Goldnead\StatamicInbox\Contracts\TransportFactory` | `Mail\SmtpTransportFactory` |
