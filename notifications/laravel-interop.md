# Laravel interop

<AddonHeader />

This addon does **not** build on Laravel's `notifications` table. It does coexist with it, and existing
`$user->notify()` call sites can route in through a channel.

## Why not Laravel's table

Three reasons, each of which would have to be worked around forever:

**No brand column.** Isolation would have to hide inside the JSON payload — which is exactly what
[brand-context](/brand-context/) exists to prevent. A scope cannot filter on a key inside a JSON blob
reliably, and a tenancy guarantee that depends on payload shape is not a guarantee.

**No dedupe key.** So the same fact reaching two producers yields two notifications, and there is nowhere to
put the fingerprint that would prevent it.

**Identification by `notifiable_type/id`.** The rest of the suite identifies people by a shared
[Identity](/identity-contracts/), which may join by `user_id`, `contact_uuid` or `anonymous_id`. A
polymorphic pair cannot express "this contact, who has never logged in".

The table here is `notification_items`, so **enabling Laravel's database channel alongside it still works.**
The two do not collide.

## Routing existing call sites in

Add a channel to a notification you already have:

```php
public function via($notifiable): array
{
    return ['notifications'];
}

public function toNotifications($notifiable): array
{
    return [
        'type' => 'crm.lead_assigned',
        'message' => '…',
        'link' => '…',
    ];
}
```

Now `$user->notify(new LeadAssigned($lead))` writes a persisted, brand-scoped, preference-respecting
notification instead of only sending mail.

## Migrating gradually

The `via()` array is a list, so you can run both during a transition:

```php
public function via($notifiable): array
{
    return ['mail', 'notifications'];
}
```

That sends the mail you already sent **and** persists the row, which is the safe first step: nobody stops
getting anything, and you can look at the inspector to check the rows look right.

Then drop `'mail'` and let the type's channels decide:

```php
Notifications::registerType('crm.lead_assigned', function ($type) {
    $type->label('Lead zugewiesen')
        ->defaultChannels(['in_app', 'mail'])
        ->renderUsing(fn ($item) => [
            'message' => 'Dir wurde ein Lead zugewiesen.',
            'link' => '/cp/leadhub/contacts/'.$item->subject_id,
        ]);
});
```

::: warning Add a dedupe key while you are in there
`toNotifications()` can return one, and it is the main thing Laravel's own notifications could not do:

```php
'dedupe_key' => 'lead-assigned:'.$this->lead->uuid,
```

Without it, two producers of the same event notify twice, and a queue retry notifies again.
:::

## What you gain by moving

| | Laravel notifications | This addon |
| --- | --- | --- |
| Persisted | optional, via the database channel | always |
| Brand-scoped | no | yes |
| Deduplicated | no | with a `dedupe_key` |
| Per-type, per-channel preferences | no | yes, as deviations |
| Digests with a window and a send record | no | yes |
| Answers "did this person get it" | no | the CP inspector |
| Recipient may be a CRM contact | awkward | yes |

## What you give up

Nothing, if you keep `'mail'` in `via()` during the transition. Afterwards:

- **Laravel's own database channel** stops being the place notifications live, though it still works if you want
  it for something else.
- **`$notifiable->notifications()`** relationships point at Laravel's table, not this one. Read through this
  addon's API instead.
- **Broadcast notifications** with a payload are not how this addon does realtime — it broadcasts a
  content-free refresh signal instead, deliberately. See [Realtime](/notifications/realtime).

## When to keep using Laravel's

Use Laravel's notifications when **the notification is a mail, the recipient does not need to see it again, and
nobody will ask "did they get it"**.

A password reset. A one-time verification code. A receipt that also exists as a PDF somewhere.

Use this addon when any of those three stop being true. See
[Choosing an addon](/guide/choosing#notifications-or-laravel-notifications).

## LeadHub's own three

LeadHub predates this addon and keeps three Laravel notifications — new lead, lead assigned, daily follow-up
digest — for compatibility.

When both addons are installed, LeadHub uses **this** addon for **task assignment** (in-app, mail or digest, per
the assignee's preferences) and contributes **overdue follow-ups** to the digest. It does not duplicate the
other three.

Without this addon the task-notification path is a **no-op**, not a fallback to mail.

To move the other three across, write the listener yourself and register the type in a service provider. See
[LeadHub → Assignment](/leadhub/assignment#why-leadhub-keeps-its-own-three).
