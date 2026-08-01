# Notifying

<AddonHeader />

```php
use Goldnead\Notifications\Facades\Notifications;

Notifications::notify($user, 'community.mention', [
    'actor' => $author,               // anything IdentityContext can resolve
    'subject' => $post,               // any Eloquent model
    'message' => 'Bea hat dich erwähnt.',
    'link' => '/account/community/posts/'.$post->id,
    'dedupe_key' => 'mention:'.$mention->id,
]);
```

```php
Notifications::notifyMany($subscribers, 'lms.lesson_published', [
    'dedupe_key' => 'lesson:'.$lesson->id,   // scoped per recipient automatically
]);
```

## The arguments

| Key | Notes |
| --- | --- |
| `actor` | Who caused it. Anything `IdentityContext` can resolve. |
| `subject` | Any Eloquent model, stored polymorphically |
| `message` | Fallback text, used when the type does not render one |
| `link` | Fallback URL |
| `dedupe_key` | The fact's fingerprint |

`message` and `link` are fallbacks. When the type has a `renderUsing()` callback, that wins — which is why
the host owns the wording. Passing them anyway is worth it for the unregistered-type case.

## `notifyMany()` and the dedupe key

```php
Notifications::notifyMany($subscribers, 'lms.lesson_published', [
    'dedupe_key' => 'lesson:'.$lesson->id,
]);
```

The key is **scoped per recipient automatically**, so one key yields one notification *each*, not one in
total. That is what makes "tell everybody about this lesson, and do not tell them twice" a single line.

## Recipients must be identifiable

**Notifying an anonymous visitor returns `null`.** There would be no way to ever show it to them again.

Contrast with [Activity](/activity/), which happily records a fact about an anonymous visitor because a
pre-identification page view is real. Notifications is about reaching a person, so it needs one.

A recipient may be anything `IdentityContext` resolves to a `user` or `contact` identity:

```php
Notifications::notify($statamicUser, …);
Notifications::notify($eloquentUser, …);
Notifications::notify($leadHubContact, …);
Notifications::notify('a@example.com', …);      // resolved via ContactLocator
```

## Idempotency

Pass a `dedupe_key` and **the same fact reaching two producers yields one notification.**

```php
'dedupe_key' => 'mention:'.$mention->id,   // a fact
'dedupe_key' => 'mention:'.now(),          // a moment — a retry notifies twice
```

Choose the key from the fact, not the moment. Leave it off only when repeated notifications are genuinely
what you want, which is rare — for notifications, unlike for a ledger, the second identical nudge is almost
always noise.

## Notifying never breaks the caller

A mail transport error must not roll back the comment that caused it. So a failure is logged and swallowed.

The corollary: **a failed send is visible in `laravel.log` and nowhere else.** If people report not getting
mail and nothing errored, that is where to look.

## The row is always written

```
notify() → row written → channels consulted per preferences
```

Preferences govern how somebody is **reached**, not whether the thing happened. Turning off `in_app` silences
the realtime nudge; it does not erase history.

That is what lets the CP inspector answer "did this person get it".

## Unregistered types still deliver

In-app, using whatever you passed as `message` and `link`. A missing registration never silently swallows
somebody's notification.

::: danger But an ad-hoc registration is silently skipped in the digest
The registry lives **per process**. A type registered inside a controller or a console one-off is unknown to
the scheduled digest process, falls back to the `in_app` default, and is skipped there — so the notification
exists and is never summarised.

Register types in a **service provider**. See [Types](/notifications/types).
:::

## Where to call `notify()`

**In a listener, not in a controller.** The thing that happened is the event; notifying is a consequence, and
keeping it in a listener means a second producer of the same event does not need to duplicate the call.

```php
Event::listen(LeadHubContactCreated::class, function ($event) use ($salesTeam) {
    Notifications::notifyMany($salesTeam, 'crm.lead_created', [
        'subject' => $event->contact,
        'dedupe_key' => 'lead:'.$event->contact->uuid,
    ]);
});
```

**Not in a loop over thousands of recipients.** `notifyMany()` exists for that, and it handles the per-recipient
dedupe scoping for you.

## In a queue worker

There is no request, so `IdentityContext::current()` returns a `system` identity and — in multi-brand mode —
there is no current brand.

Capture what you need at dispatch and pass it in:

```php
dispatch(new NotifyMentioned($user->id, IdentityContext::current()->toArray()));
```

Wrap the work in `BrandContext::runFor()` in the worker, or the notification cannot be stamped with a brand.

## LeadHub, if you run it

LeadHub uses this addon for **task assignment** when both are installed — in-app, mail or digest, per the
assignee's own preferences — and contributes **overdue follow-ups** to the digest: uncompleted rows
in `leadhub_followups` whose contact is assigned to the recipient and whose due date has passed.

Its other three notifications (new lead, lead assigned, daily follow-up digest) remain its own Laravel
notifications, for compatibility. If you want those to go through this addon instead, write the listener
yourself and register the type in a service provider. See
[LeadHub → Assignment](/leadhub/assignment#why-leadhub-keeps-its-own-three).
