# Troubleshooting

<AddonHeader />

## A form submission creates no contact

Almost always the form mapping. In order:

1. **Is the form mapped and enabled?** **LeadHub → Forms → Configure**. A form with no mapping,
   or a disabled one, is skipped silently. Installing LeadHub does not start harvesting every
   form.
2. **Is the email field mapped?** It is required — it is the deduplication key.
3. **Is a brand current?** In multi-brand mode nothing outside the current brand is visible.
4. **Check `laravel.log`.**

That last point matters more here than anywhere else in the suite. The submission listener is
**fail-safe**: any exception is caught and logged so a LeadHub error never breaks the visitor's
form. Which means **the log is the only place the reason exists.** A submission that silently
did not become a contact has a stack trace there and nothing anywhere else.

## Two contacts for the same person

Deduplication runs on `email_normalized`:

```php
'email_normalization' => ['trim' => true, 'lowercase' => true],
```

If either is off, `  Adrian@Example.com ` and `adrian@example.com` are two contacts. Turn both
on, then merge:

```php
LeadHub::merge($duplicate, $survivor);
```

Also check `leadhub:brand-integrity` — if the per-brand unique index on `email_normalized` is
missing, nothing at the database level was preventing the duplicate.

## A manual correction keeps getting overwritten

`overwrite_existing_fields_from_submissions` is `true`. Set it back to `false`, which is the
default, and the next form will stop undoing your salesperson's edit.

## The assignee dropdown is empty

Two causes:

**Brand membership.** Assignability is `view leadhub` **and** brand membership. A user with no
membership anywhere counts as a member of every brand, so a fresh install sees everybody — but a
partially-assigned install narrows only the users you assigned.

**Wrong API.** If you built your own dropdown, `assignedUserIdsOf()` returns raw rows and
deliberately does not apply the every-brand rule. Use `usersOf()`. See
[Brand members](/brand-context/members#which-methods-apply-the-rule).

## `hasPermission()`, `isSuper()` or `id()` crashes

The install uses Eloquent users with a custom user model, so the guard returns something that is
not a Statamic user.

```php
$user->can($permission);
Statamic\Facades\User::fromUser($user);   // for isSuper()
$user->getAuthIdentifier();               // instead of id()
```

A testbench always hands you a Statamic user, which is why this class of bug is invisible in a
test suite and immediate on a real install. It was a real production crash in the CP controllers
and policies of this addon, fixed in 1.0.1.

## Notifications are not sent

1. `features.notifications` must be `true`.
2. `LEADHUB_NOTIFY_EMAILS` must be set.
3. The mailer must work — and **sending is fail-safe**, so a broken mailer produces a log line
   and silence, not an error you would notice.
4. The digest needs the scheduler:

```bash
php artisan schedule:work
php artisan leadhub:followups:digest    # to check the content by hand
```

## Task assignment notifies nobody

Three legitimate reasons:

- You assigned the task **to yourself**. That deliberately notifies nobody.
- `goldnead/statamic-notifications` is **not installed**. The whole path is a no-op, not a
  fallback to mail.
- `notifications.on_task_assignment` is `false`.

## A segment is stale, or half-correct

Mutation-driven rules stay fresh without the scheduler; time-based ones
(`within_days`, `older_than_days`) do not. The result is a segment that is partly right, with
nothing reporting a problem.

```bash
php artisan schedule:work
php artisan leadhub:segments:sweep
```

## A segment matches nobody

An **empty rule set matches nobody**, deliberately. Express "everyone" as no segment at all.

Also check that the segment is active: a deactivated segment returns `[]` from
`segmentMemberIds()`.

## Marketing ignores my segment

Segment targeting needs LeadHub **`^1.1`**. On older versions Marketing degrades gracefully to a
whole-list send, with no error — which is exactly what "ignored" looks like.

Also check the capability guard in any custom integration:

```php
method_exists(LeadHub::getFacadeRoot(), 'segmentMemberIds');   // not on the facade class
```

## `method_exists` on the facade always returns false

Because the facade forwards through `__callStatic`. Resolve the root first. This is how every
LeadHub action node in Automations once failed silently on every real install.

## Scores did not change after I edited the point table

By design. **Changing a rule affects future activity only** — scores already awarded are a
running total and are not recalculated, and there is no recalculation command.

Also check whether the brand has rules at all: while it has none, `leadhub.scoring` in the config
file decides. Import when you are ready:

```bash
php artisan leadhub:scoring:import --dry-run
php artisan leadhub:scoring:import
```

The import never overwrites a rule whose points differ from the config file — that rule is one
somebody edited in the CP. Use `--force` to override deliberately.

## A CRM push never happens

1. `features.crm_destinations` must be `true`, and the destination `enabled`.
2. Check `triggers` — a destination listening only for `created` will not fire on an update.
3. **A queue worker must be running.** Pushes are queued.
4. Is the contact `do_not_contact`? Opted-out contacts are never pushed, by every driver.
5. Look at **LeadHub → Sync log**, which records every attempt with its HTTP code and message.

## The Sync log screen is empty

You are on the **flat** driver, where the dedicated log table is skipped gracefully. The timeline
entry is still written, so the information exists on the contact — but the screen has nothing.
Use the eloquent driver if you rely on the log.

## An HMAC-signed webhook fails verification

Recompute over the **raw body**:

```php
$expected = 'sha256='.hash_hmac('sha256', $request->getContent(), $secret);
hash_equals($expected, $request->header('X-LeadHub-Signature'));
```

A re-serialised parsed body will never match — key order and whitespace change.

## A CRM-core module is missing from the CP

`ingestion`, `companies`, `tasks`, `pipelines`, `merge` and `scoring` need the **eloquent**
driver. On flat they are unavailable, not degraded.

```bash
php artisan leadhub:storage:migrate --from=flat --to=eloquent --dry-run
```

## Flat-driver data is not showing up

The JSON indexes drifted. They rebuild on mtime change, and a deploy that rewrites mtimes or a
hand-edit can outpace that:

```bash
php artisan leadhub:stache:warm --clear
```

## Everything collapsed onto one contact

Something cast a UUID to `int`, which yields `0`. On the flat driver a contact's identifier is
its **`uuid`**, not `id`. Check any consumer reading contact ids, including segment-handle
mirroring.

## `entryClass() on null` after importing a database

Statamic's Stache lives in the database `cache` table and holds the other environment's absolute
paths.

```bash
php artisan cache:clear
php artisan stache:clear && php artisan stache:warm
```

## Duplicate rows survive a migration

That is the designed behaviour. `leadhub:brand-integrity` names every colliding row and never
deletes one, and `--repair` refuses to build an index while anything would have to go for it —
because which of two contacts is *the* contact is not a decision a schema change gets to make.

Delete the rows you do not want, then migrate again.

## A webhook trigger from LeadHub never fires

The bridge did not register. Historically this was a **boot-order** bug: LeadHub's bridge booted
before Webhook Manager existed and lost all fourteen registrations, with nothing but log
warnings. It now defers with a retry and an idempotency guard.

Check `features.webhook_manager` is `true`, that both addons are installed, and grep the log for
warnings from the bridge.

## A CP screen is blank

```bash
php artisan vendor:publish --tag=statamic-leadhub --force
php artisan statamic:install
```

Statamic publishes addon assets from a `statamic:install` hook in `post-autoload-dump`. Without
it, nothing publishes.
