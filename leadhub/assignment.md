# Assignment & notifications

<AddonHeader />

Assign an owner to any lead and keep the team informed by email.

## Owners

Pick an assignee on the contact detail page. The change is recorded on the timeline. Filter
the contacts list:

```
?assigned_to=<id>
?assigned_to=none
?mine
```

## Who can be picked

The users who may `view leadhub` **and** belong to the current brand, per
[`BrandMembers`](/brand-context/members) (**Users → Brand Members**).

Three things about that rule:

- **Superusers are not exempt** from the brand half.
- **A user with no membership anywhere counts as a member of every brand.** So an install
  that has recorded no memberships — every install, until somebody records one — sees exactly
  the list it saw before the feature existed.
- The same list backs the **task assignee** and the **opportunity owner**, and the same list
  is what a write is validated against. You cannot assign to somebody the dropdown would not
  have offered.

::: warning An empty dropdown is almost always the wrong API
If assignee dropdowns go empty after you assign your first user, the calling code is using
`assignedUserIdsOf()` where it should use `usersOf()`. The `assigned…` methods return raw
rows and deliberately do not apply the every-brand rule. See
[Brand members](/brand-context/members#which-methods-apply-the-rule).
:::

## The three notifications

All opt-in, all Laravel notifications using the mail channel:

| Notification | Fires when |
| --- | --- |
| **New lead** | A contact is first created |
| **Lead assigned** | A lead gets an owner |
| **Daily follow-up digest** | Once a day, summarising due and overdue follow-ups |

There is no `features.notifications`. The switch is `notifications.enabled`, and each of the
three has its own flag beside it:

```php
'notifications' => [
    'enabled' => env('LEADHUB_NOTIFICATIONS', true),

    'new_lead' => true,
    'on_assignment' => true,

    'recipients' => env('LEADHUB_NOTIFY_EMAILS'),   // comma-separated team inbox(es)

    'digest' => [
        'enabled' => true,
        'time' => env('LEADHUB_DIGEST_TIME', '08:00'),   // server time, daily
        'fallback_recipients' => env('LEADHUB_DIGEST_EMAILS'),
    ],
],
```

`recipients` is the fallback inbox for an **unassigned** lead. Once a lead has an owner, the
owner is notified and `recipients` is not copied.

```dotenv
LEADHUB_NOTIFY_EMAILS=team@example.com,sales@example.com
```

They respect your existing `MAIL_*` config, and **sending is fail-safe**: a mailer error is
logged and never blocks the lead pipeline. Which also means a misconfigured mailer produces
silence plus a log line, not an error you will notice.

## The digest

Wired into the Laravel scheduler automatically. Make sure your app actually runs the
scheduler:

```bash
php artisan schedule:work    # or a cron entry calling schedule:run
```

Trigger it by hand to check the content:

```bash
php artisan leadhub:followups:digest
```

A related command fires `LeadHubFollowupDue` for follow-ups that have become due, which is
what an [Automations](/automations/) *Lead Follow-up Due* trigger listens to:

```bash
php artisan leadhub:followups:due
```

## Task assignment, through the Notifications addon

When [`goldnead/statamic-notifications`](/notifications/) is installed, handing a task to
somebody notifies them **there** — in-app, mail or digest, according to their own
preferences — and open tasks are contributed to that addon's digest.

```php
'notifications' => ['on_task_assignment' => true],
```

Two details worth knowing:

- **Assigning a task to yourself notifies nobody.** Correct, and occasionally confusing when
  you are testing it.
- **Without the Notifications addon the whole path is a no-op**, not a fallback to mail.
  LeadHub does not have a second implementation of task notifications.

## Why LeadHub keeps its own three

LeadHub predates the Notifications addon, and its three notifications stay for compatibility.
When both are installed, LeadHub uses the Notifications addon for **task assignment** only,
and does not duplicate the other three.

If you want new-lead notifications to go through the Notifications addon — with per-recipient
preferences and a digest — the current answer is a listener of your own:

```php
Event::listen(LeadHubContactCreated::class, function ($event) {
    Notifications::notifyMany($salesTeam, 'crm.lead_created', [
        'subject' => $event->contact,
        'dedupe_key' => 'lead:'.$event->contact->uuid,
    ]);
});
```

Register the type in a service provider, not in the listener — a type registered ad hoc is
unknown to the scheduled digest process and its items are silently skipped there. See
[Notifications → Types](/notifications/types).

## Statamic Pro

Assigning leads to different team members means more than one Control Panel user, which
requires Statamic Pro:

```dotenv
STATAMIC_PRO_ENABLED=true
```

Without it, everything works and there is only ever one person to assign to.

## Multi-brand

The assignee list is brand-scoped through `BrandMembers`, so on a two-brand install each
brand offers its own team — once memberships exist.

In a console command or a queue worker there is no session, so `BrandMembers` **throws**
rather than guessing. Name the brand:

```php
BrandContext::runFor('acme', fn () => /* … */);
```
