# Types

<AddonHeader />

A type says what a notification is **called**, which channels it uses **by default**, and how it
**renders**.

```php
Notifications::registerType('community.mention', function ($type) {
    $type->label('Erwähnung')
        ->defaultChannels(['in_app', 'mail'])
        ->renderUsing(fn ($item) => [
            'message' => $item->actor_name.' hat dich erwähnt.',
            'link' => '/account/community/posts/'.$item->subject_id,
        ]);
});
```

## Register in a service provider. Not anywhere else.

::: danger This is the single most important rule in this addon
The registry lives **per process**. A type registered ad hoc — inside a controller, a console one-off — is
unknown to the scheduled digest process. There it falls back to the `in_app` default and is **silently
skipped**, so the notification exists and is never summarised.

That skipping is deliberate: it is what stops an immediate e-mail being repeated days later. Which is
precisely why the registration has to be global.

```php
// app/Providers/AppServiceProvider.php
public function boot(): void
{
    Notifications::registerType('community.mention', fn ($type) => …);
}
```
:::

## Rendering is a callback, not a template

The **host owns the wording and the URL structure**. The addon never hardcodes a sentence or a route.

```php
->renderUsing(fn ($item) => [
    'message' => $item->actor_name.' hat dich erwähnt.',
    'link' => route('community.post', $item->subject_id),
])
```

That is exactly what made the system this replaces impossible to extract: its notification text and its routes
were baked into the package, so the next domain that needed notifying could not reuse any of it.

Two consequences worth planning for:

**Rendering happens at read time**, not at notify time, so a wording change reaches existing notifications.
Good, and it means the callback must still work for an old item whose subject may since have been deleted.

**Guard for a missing subject:**

```php
->renderUsing(function ($item) {
    $post = Post::find($item->subject_id);

    return [
        'message' => $post
            ? $item->actor_name.' hat dich in "'.$post->title.'" erwähnt.'
            : $item->actor_name.' hat dich erwähnt.',
        'link' => $post ? route('community.post', $post) : '/account/notifications',
    ];
})
```

## Default channels

```php
->defaultChannels(['in_app', 'mail'])
```

The channels used for a recipient who has expressed no preference. Because
[preferences are deviations](/notifications/preferences), **changing this default actually reaches everyone
who never expressed an opinion.**

| Channel | Behaviour |
| --- | --- |
| `in_app` | the row itself, plus an optional realtime nudge |
| `mail` | one e-mail per notification, rendered through the type |
| `digest` | no-op at notify time; the item waits for the next digest run |

Choosing well matters. `['in_app', 'mail']` for a mention is reasonable; `['in_app', 'mail']` for a type that
fires forty times a day is how people stop reading your mail. Use `['in_app', 'digest']` for anything
high-frequency.

## Required types

```php
->required()
```

Makes a type **ignore preferences**. For account security and legal notices only.

::: warning Use this almost never
Every required type is a type somebody cannot turn off. A password-reset notice qualifies; a product
announcement does not, however important it feels this quarter.
:::

## Naming types

```
community.mention
crm.lead_assigned
lms.lesson_published
```

Use a **domain namespace prefix**. It is what makes a preference centre groupable, and it is the difference
between a settings screen with sections and one with forty checkboxes.

Name for the **event**, not for the channel or the wording: `crm.lead_assigned`, not
`crm.lead_assigned_email` and not `crm.you_have_a_new_lead`.

Type handles are an API — a preference row references one, so renaming a type orphans everybody's
preferences for it. Pick once.

## Unregistered types

Still deliver, in-app, using whatever the producer passed as `message` and `link`. A missing registration never
silently swallows somebody's notification.

But it will be skipped in the digest, as above. Treat an unregistered type as a bug you have not got to yet,
not as a supported mode.

## Registering a custom channel

```php
Notifications::registerChannel('slack', SlackChannel::class);
```

The class must implement `Goldnead\Notifications\Contracts\Channel`, which is one method:

```php
use Goldnead\IdentityContracts\Identity;
use Goldnead\Notifications\Contracts\Channel;
use Goldnead\Notifications\Models\NotificationItem;

class SlackChannel implements Channel
{
    public function send(NotificationItem $item, Identity $recipient): void
    {
        // …
    }
}
```

A channel never decides **whether** to deliver. The preference resolver has already done that by
the time `send()` is called, and a channel that re-checks preferences is double-counting a
decision somebody else owns. Doing nothing is allowed — that is exactly what `DigestChannel` does,
leaving the item for the next run.

There is one exception, and it is not a preference: **a channel that reaches a mailbox must ask
the suppression gate first.** A hard bounce means the address is gone and a complaint means
writing to it again carries legal weight, neither of which a recipient can consent away and
neither of which a type may declare itself exempt from by being `required`. `MailChannel` is the
worked example.

::: warning A class that does not implement `Channel` fails at resolve time
`ChannelRegistry::resolve()` declares a `Channel` return type, so the container hands back
something that raises a `TypeError`. `NotificationManager` reports and swallows channel failures
so that one broken route cannot stop the others, which means the symptom is a notification that
persists correctly and never arrives on that channel.
:::

Or in config:

```php
'channels' => [
    'in_app' => InAppChannel::class,
    'mail' => MailChannel::class,
    'digest' => DigestChannel::class,
    'slack' => \App\Notifications\SlackChannel::class,
],
```

The key is the name types and preferences refer to. Removing a key while preference rows still name it leaves
those rows as deviations against a channel that no longer exists.

## A practical set

Three or four types cover most sites, and each one is short:

| Type | Default channels |
| --- | --- |
| `account.security` | `['in_app', 'mail']`, `required()` |
| `crm.lead_assigned` | `['in_app', 'mail']` |
| `community.mention` | `['in_app', 'mail']` |
| `community.reply` | `['in_app', 'digest']` |

The last row is the pattern worth copying: high-frequency, low-urgency types belong in the digest by default,
where somebody can opt *up* to mail rather than having to opt out of forty emails.
