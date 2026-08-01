# Installation

<AddonHeader />

<Requirements php="8.3+" statamic="6.0+" laravel="12.x / 13.x" queue="Only for realtime broadcasts. Mail is sent synchronously." />

```bash
composer require goldnead/statamic-notifications
php artisan migrate
php artisan vendor:publish --tag=notifications-config
```

::: warning PHP 8.3, not 8.2
This is the one package in the suite that requires PHP `^8.3`. Everything else takes `^8.2`. An
8.2 host can install the rest of the family and not this.
:::

## What it requires

Three sibling packages, all hard requires rather than suggestions:

| Package | Constraint | Why |
| --- | --- | --- |
| `goldnead/statamic-brand-context` | `^1.0` | Scopes every row to a brand. Inert in a single-brand application. |
| `goldnead/statamic-identity-contracts` | `^1.0` | Answers who a recipient is without depending on your user model. |
| `goldnead/statamic-suppression` | `^1.0` | Answers whether a mailbox may be written to at all. The mail channel and the digest both ask before sending. |

Plus `statamic/cms ^6.0` and `laravel/framework ^12.0|^13.0`. Composer resolves all of them from
Packagist, so the single `composer require` line above is the whole installation.

`goldnead/statamic-leadhub` is only suggested. When it is present the bundled CRM digest source
attaches itself; see [Digests](/notifications/digests).

## Verify the constraints, not just the migration

```bash
php artisan notifications:uniqueness-integrity
```

::: warning Run this. `migrate` reporting success is a different question.
It means the migrations ran. It does not mean the constraints they were supposed to leave behind are in
place, and it says nothing at all about the rows.

This command reads the indexes that are on `notification_preferences` and `notification_digest_runs` **right
now**, and the rows that are in them, and says plainly whether one recipient still means one row per key. It
changes nothing.

**Installs created before 1.0.4 could hold duplicate rows for contact recipients**, because the unique of the
day led with `user_id` and no engine constrains a NULL. Where those rows exist the migration **stops and
names them** rather than choosing between them: which of two preferences is the one a person currently holds
is not a decision a schema change gets to make.

Delete the rows that are not the ones to keep, then run `migrate` again. `--repair` rebuilds the index alone
once nothing is in the way, and refuses while anything is.

You will be pointed at this command by `migrate` itself.
:::

## Register your types in a service provider

Nothing works properly until types are registered, and **where** you register them matters more than it
looks:

```php
// app/Providers/AppServiceProvider.php
public function boot(): void
{
    Notifications::registerType('community.mention', function ($type) {
        $type->label('Erwähnung')
            ->defaultChannels(['in_app', 'mail'])
            ->renderUsing(fn ($item) => [
                'message' => $item->actor_name.' hat dich erwähnt.',
                'link' => '/account/community/posts/'.$item->subject_id,
            ]);
    });
}
```

A type registered anywhere else — in a controller, in a console one-off — is unknown to the scheduled digest
process and its items are silently skipped there. See [Types](/notifications/types).

## Schedule the digests yourself

```bash
php artisan notifications:send-digests --frequency=weekly [--dry-run] [--now=…]
```

**Scheduling is deliberately left to the host.** A send window is an audience decision, not a package
default, so register the command in your own scheduler so the window matches your people:

```php
// routes/console.php
Schedule::command('notifications:send-digests --frequency=daily')->dailyAt('07:00');
Schedule::command('notifications:send-digests --frequency=weekly')->mondays()->at('08:00');
```

Without this, `digest`-channel notifications are collected and never sent. Nothing errors.

## A queue worker

```bash
php artisan queue:work
```

::: warning The mail channel does not queue
`MailChannel` calls `Mail::to($address)->send(…)` and `NotificationMail` is a plain `Mailable`
without `ShouldQueue`, so **an immediate mail is sent inline, inside the request or command that
called `notify()`**. The digest command sends the same way. No worker is involved and none is
needed for mail to arrive.

The practical consequence is a latency one, not a delivery one: a request that notifies twenty
people waits for twenty SMTP round trips. If that matters, queue the work that calls `notify()`,
or push the mailable onto the queue yourself by overriding the `mail` channel binding — see
[Types](/notifications/types).
:::

What a worker **is** needed for is realtime: `NotificationReceived` implements `ShouldBroadcast`,
so the broadcast goes through the queue. Without a worker the bell simply does not update live,
and everything else — the persisted row, the mail — is unaffected. Realtime is off by default; see
[Realtime](/notifications/realtime).

## Verify it works

```php
Notifications::notify($user, 'community.mention', [
    'message' => 'Test',
    'link' => '/',
    'dedupe_key' => 'test:1',
]);
```

Then **Tools → Notifications**, behind `view notifications`. The inspector answers "did this person get it",
which is the question support actually asks.

Notify twice with the same `dedupe_key` and confirm you get one row.

## Testing against MySQL

The default test run uses in-memory SQLite. Before a release, point it at a real MySQL server:

```bash
vendor/bin/pest -c phpunit.mysql.xml
```

::: danger SQLite is not a substitute
It has no index length limit, no fixed column widths and no per-character byte cost, so **a schema that
MySQL refuses outright can pass a fully green SQLite run** — which is how v1.0.4's defect reached
production.

`tests/Unit/IndexKeyLengthTest.php` closes that particular gap without needing a server: it compiles the
migrations through Laravel's MySQL grammar and measures every index against InnoDB's 3072-byte limit.
:::

## Licence

MIT.
