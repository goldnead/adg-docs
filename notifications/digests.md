# Channels & digests

<AddonHeader />

## Channels

| Channel | Behaviour |
| --- | --- |
| `in_app` | the row itself, plus an optional realtime nudge |
| `mail` | one e-mail per notification, rendered through the type |
| `digest` | **no-op at notify time**; the item waits for the next digest run |

```php
'channels' => [
    'in_app' => InAppChannel::class,
    'mail' => MailChannel::class,
    'digest' => DigestChannel::class,
],
```

Register your own:

```php
Notifications::registerChannel('slack', SlackChannel::class);
```

The channel key is the name types and preferences refer to, so removing one while preference rows still name it
leaves those rows as deviations against a channel that no longer exists.

::: tip `digest` is not "mail, later"
It is "collect this, and mention it in the next summary". A type with `['digest']` alone sends no mail at
notify time, and if nothing runs the digest command, sends none at all.
:::

## Digests

```bash
php artisan notifications:send-digests --frequency=weekly [--dry-run] [--now=…]
```

Two things this does that the system it replaces did not.

### A window

**Daily covers 24 hours. Weekly covers 7 days.**

The old digest took "everything currently unread", which is unbounded and unrelated to the period being
reported — so a two-month-old unread item appeared in a mail headed "this week".

### A record of the send

`notification_digest_runs` is unique on **(brand, recipient, frequency, window start)**, and every collected
item is stamped `digested_at`.

::: danger Without this, an unread item went out again every week
For as long as it stayed unread. That is the defect the table exists to prevent, and it is why the run record
is a uniqueness constraint rather than a log line.
:::

## Scheduling is left to the host

**Deliberately.** A send window is an audience decision, not a package default.

```php
// routes/console.php
Schedule::command('notifications:send-digests --frequency=daily')->dailyAt('07:00');
Schedule::command('notifications:send-digests --frequency=weekly')->mondays()->at('08:00');
```

Without this, `digest`-channel notifications are collected and never sent. Nothing errors, nothing warns —
they simply accumulate.

```php
'digest' => [
    'default_frequency' => env('NOTIFICATIONS_DIGEST_FREQUENCY', 'weekly'),
],
```

Register both frequencies if any type or preference uses each. Running only the weekly command means every
`daily` recipient gets nothing.

### `--dry-run` and `--now`

`--dry-run` shows what would be sent. `--now=…` pins the clock, which is how you test a window boundary without
waiting a week.

Both are worth using before you trust a schedule change.

## Digest sources

Other addons contribute things **nobody was notified about**:

```php
Notifications::registerSource('community', CommunityDigestSource::class);
```

A source answers "what should this person **also** see for this window?" — open follow-ups, upcoming events,
unanswered questions. Things that are not notifications because nothing happened, but which belong in a
summary.

**A failing source is reported and skipped**: one addon's broken query must not silence everybody's weekly
mail. That is the right trade, and it means a source that has been broken for a month is invisible unless you
read the log.

A **LeadHub source ships bundled** and attaches only when that addon is installed, contributing open tasks.

## Unregistered types are skipped in the digest

The type registry lives per process. A type registered ad hoc is unknown to the scheduled digest process,
falls back to the `in_app` default, and is **silently skipped** there.

The notification exists and is never summarised. That skipping is deliberate — it is what stops an immediate
e-mail being repeated days later — which is exactly why types must be registered in a
[service provider](/notifications/types#register-in-a-service-provider-not-anywhere-else).

## Multi-brand

Digest runs are unique per brand, and the command has no session, so it needs a brand to work in. It iterates
brands like the other scheduled commands in the suite.

If you wrap it yourself, use `BrandContext::runFor()`. See
[Brands](/guide/brands#fail-closed).

## Choosing channels per type

| Type shape | Default channels |
| --- | --- |
| Rare and urgent — account security, an assignment | `['in_app', 'mail']` |
| Frequent and low-urgency — a reply, a comment | `['in_app', 'digest']` |
| Purely informational | `['digest']` |
| Legal or security notice | `['in_app', 'mail']` + `required()` |

Because most people never open a preference centre, your
[defaults](/notifications/types#default-channels) are in practice what almost everybody gets. Put
high-frequency types in the digest, so somebody who wants more can opt **up** rather than having to opt out of
forty emails.
