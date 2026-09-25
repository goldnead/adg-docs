# Installation

<AddonHeader />

<Requirements laravel="12.40+ / 13.x" />

Required alongside it: `goldnead/statamic-brand-context` 1.14 or later, which Composer pulls in.
The IMAP client is `directorytree/imapengine`; it needs no `ext-imap`.

## Composer

**Inbox is not on Packagist yet.** The repository is private in this release, so Composer
has to be told where it is, and the machine running `composer install` needs read access to
`goldnead/statamic-inbox` on GitHub (a token in `auth.json` or an SSH key):

```json
{
    "repositories": [
        { "type": "vcs", "url": "https://github.com/goldnead/statamic-inbox" }
    ]
}
```

```bash
composer require goldnead/statamic-inbox
php artisan migrate
```

This is the one package in the suite that needs a `repositories` block. Every sibling it works
with resolves from Packagist as usual.

The migrations create five tables: `inbox_mailboxes`, `inbox_conversations`, `inbox_messages`,
`inbox_attachments` and `inbox_fetch_failures`. Every row carries a `brand_id`. Until they
exist, the Control Panel screens say so instead of failing.

## The scheduler

Mail arrives through `inbox:fetch`, which the addon registers with Laravel's scheduler to run
**every minute**, without overlapping itself. Each mailbox also holds its own lock, so one slow
server holds up nothing else. Make sure the server runs

```bash
* * * * * cd /path/to/site && php artisan schedule:run >> /dev/null 2>&1
```

or no mail ever arrives. See [Queues & scheduling](/guide/queues).

## The queue

A reply is stored at once and then sent by a queued job (`SendReply`) on the queue named in
`inbox.queue` (`INBOX_QUEUE`, default `default`). On a site with a real queue connection a
worker has to run for that queue, or replies wait in the conversation as not yet sent. With
`QUEUE_CONNECTION=sync` the reply goes out inside the request.

The job runs once. It is never retried automatically; see [Replying](/inbox/replying#when-sending-fails).

## What comes with it

Every sibling below is optional and detected at runtime:

| Package | What it adds |
| --- | --- |
| `goldnead/statamic-leadhub` 2.13+ | Conversations linked to contacts, the contact card, "Create contact", an "E-Mails" panel on the contact, timeline entries. |
| `goldnead/statamic-suppression` 1.3+ | A reply to a hard-bounced, complaining or invalid address is refused. |
| `goldnead/statamic-email-templates` | "From template" in the reply form, with the contact's merge variables. |
| `goldnead/statamic-activity` | `inbox.email_received` and `inbox.email_sent` in the activity ledger. |
| `goldnead/statamic-automations` | An "Email received" trigger in the automation builder. |

Older LeadHub and Suppression versions are declared as a Composer conflict, so they cannot be
installed together by accident.

## Permissions

Three, under **Postfach** in a role's permissions:

| Permission | Allows |
| --- | --- |
| `view inbox` | the conversation list, a conversation, its attachments |
| `reply inbox` (child of `view inbox`) | replying, status and snooze, template and AI draft, creating and linking a contact |
| `manage inbox mailboxes` | the mailbox screens, the connection test, the settings section |

The nav entry **Postfach** sits under **Tools**, with the number of unread conversations in
its label.

## Publishable tags

| Tag | What it publishes |
| --- | --- |
| `inbox-config` | `config/inbox.php` |

```bash
php artisan vendor:publish --tag=inbox-config
```

## First mailbox

Control Panel → **Postfach** → **Mailboxes** → create. Pick the provider, enter the address
and the app password, press **Test connection**, save. The next scheduler run imports the last
90 days of INBOX and Sent. See [Mailboxes and app passwords](/inbox/mailboxes).
