# Troubleshooting

<AddonHeader />

## `notify()` returned null

The recipient is not identifiable. Notifying an anonymous visitor returns `null`, because there would be no way
to ever show it to them again.

Pass something `IdentityContext` resolves to a `user` or `contact` identity: a Statamic user, an Eloquent user, a
LeadHub contact, or an email string that a bound `ContactLocator` can resolve.

## The row exists but no e-mail arrived

In order:

1. **Is `mail` in the type's channels, or in the recipient's preferences?** A type defaulting to
   `['in_app', 'digest']` sends no mail.
2. **Is a queue worker running?** The mail channel queues delivery.
3. **`laravel.log`.** Notifying is fail-safe: a transport error is logged and swallowed so it cannot roll back
   the comment that caused it. The log is the only place the reason exists.
4. **Is the type registered at all?** An unregistered type falls back to `in_app` only.

## Nothing appears in the digest

Three distinct causes, and they look identical:

**No scheduled command.** Scheduling is **deliberately left to the host**. Register it:

```php
Schedule::command('notifications:send-digests --frequency=daily')->dailyAt('07:00');
Schedule::command('notifications:send-digests --frequency=weekly')->mondays()->at('08:00');
```

Register **both** frequencies if anything uses each — running only the weekly command means every `daily`
recipient gets nothing.

**The type is not registered globally.**

::: danger This is the one that catches everybody
The type registry lives **per process**. A type registered ad hoc — in a controller, in a console one-off — is
unknown to the scheduled digest process, falls back to the `in_app` default, and is **silently skipped** there.
The notification exists and is never summarised.

That skipping is deliberate: it is what stops an immediate e-mail being repeated days later. Which is exactly
why registration has to be in a **service provider**.
:::

**Nothing is in the window.** Daily covers 24 hours, weekly covers 7 days. An item older than the window is not
in it — deliberately, unlike the "everything currently unread" behaviour this replaced.

```bash
php artisan notifications:send-digests --frequency=weekly --dry-run --now="2026-07-30 08:00"
```

`--now` pins the clock, which is how you test a window boundary without waiting a week.

## The same item went out in two digests

It should not: every collected item is stamped `digested_at`, and `notification_digest_runs` is unique on
(brand, recipient, frequency, window start).

If it happened, check that unique index is actually in force:

```bash
php artisan notifications:uniqueness-integrity
```

Note that daily and weekly are separate frequencies, so an item legitimately appears in both if a recipient is
subscribed to both. That is not a bug; do not run both frequencies for the same audience.

## `migrate` stopped and named some rows

Working as designed. **Installs created before 1.0.4 could hold duplicate preference rows for contact
recipients**, because the unique of the day led with `user_id` and no engine constrains a NULL.

The migration refuses to choose between them: which of two preferences is the one a person currently holds is
not a decision a schema change gets to make.

Delete the rows that are not the ones to keep, then migrate again.

```bash
php artisan notifications:uniqueness-integrity            # names them
php artisan notifications:uniqueness-integrity --repair   # rebuilds the index, once nothing is in the way
```

`--repair` refuses while anything would have to go.

## `migrate` succeeded and something is still wrong

`migrate` reporting success means the migrations ran. It does not mean the constraints they were supposed to
leave behind are in place, and it says nothing at all about the rows.

```bash
php artisan notifications:uniqueness-integrity
```

It reads the indexes that are on the tables **right now**, and the rows that are in them, and says plainly
whether one recipient still means one row per key. It changes nothing.

## A green test suite and a broken production schema

SQLite has no index length limit, no fixed column widths and no per-character byte cost, so **a schema MySQL
refuses outright can pass a fully green SQLite run** — which is how v1.0.4's defect reached production.

```bash
vendor/bin/pest -c phpunit.mysql.xml
```

`tests/Unit/IndexKeyLengthTest.php` closes that particular gap without a server: it compiles the migrations
through Laravel's MySQL grammar and measures every index against InnoDB's 3072-byte limit.

## Turning off a preference did not hide the notification

By design. **The persisted row is always written**, because it is the record that this happened.

Preferences govern how somebody is *reached*: turning off `in_app` silences the realtime nudge, it does not
erase history. That is what lets the inspector answer "did this person get it".

## Changing a default channel had no effect

It should have. Preferences are stored **only as deviations**, so a new default reaches everyone who never
expressed an opinion.

If it did not, those recipients have explicit rows. Check with `matrixFor($user)` whether the value is a
deviation or a default.

## All notifications went to one recipient

Something cast a user id to `int`. `$user->id()` is a **UUID** under the file users repository, and casting it
yields `0`.

See [Identity](/guide/identity#a-user-id-is-a-string).

## Realtime does not fire

1. `NOTIFICATIONS_REALTIME=true`.
2. A broadcaster is configured and running. This addon ships none.
3. The channel is authorised in `routes/channels.php`, **comparing as strings** — a UUID and an integer key
   both live in that column depending on the users repository.
4. The recipient has `in_app` enabled. The nudge is part of that channel.

A dead broadcaster is logged and swallowed, so realtime degrades to "the bell updates on page load", which is
what you had before turning it on.

## The bell shows nothing after realtime fires

The broadcast is a **content-free refresh signal**. Your client has to re-fetch through the normal authorised
endpoint — the signal carries no notification data, deliberately, so a socket subscriber can never see more
than the API would have given them.

```js
Echo.private(`users.${userId}`).listen('.notifications.refresh', () => fetchNotifications())
```

## The list is missing older notifications

```php
'list_limit' => 30,
```

The bell is a recent view, not an archive. **Tools → Notifications** in the CP is where history lives.

## A digest is missing one addon's items

A **failing digest source is reported and skipped** — one addon's broken query must not silence everybody's
weekly mail.

Which means a source that has been broken for a month is invisible unless you read the log. Grep for it.

The bundled LeadHub source attaches only when that addon is installed.

## LeadHub task assignment notifies nobody

Three legitimate reasons:

- The task was assigned **to the assigner**. That deliberately notifies nobody.
- `leadhub.notifications.on_task_assignment` is `false`.
- This addon is not installed — in which case the whole path is a **no-op**, not a fallback to mail.

## A query returns nothing in a console command

Multi-brand, no current brand, fail-closed. Wrap it:

```php
BrandContext::runFor('acme', fn () => /* … */);
```

## The notification rows table keeps growing

There is **no automatic retention in v1**, named plainly rather than implied. If you need one, write a scheduled
command against `notification_items` yourself, and keep in mind that deleting a row deletes the answer to "did
this person get it".
