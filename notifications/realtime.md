# Realtime

<AddonHeader />

Off by default.

```php
'realtime' => [
    'enabled' => env('NOTIFICATIONS_REALTIME', false),
    'channel_prefix' => 'users',
],
```

```dotenv
NOTIFICATIONS_REALTIME=true
```

## What is broadcast

A **content-free refresh signal** on `users.{id}`.

Not the notification. Not the message. Not the link. Just "something changed, ask again".

The client then re-fetches through the **normal authorised endpoint**, which means a socket subscriber can
never see more than the API would have given them.

::: tip This is the security property, not a limitation
Broadcasting the payload would put notification content on a channel whose authorisation you have to get right
separately, forever, for every future notification type.

Broadcasting nothing means the only place authorisation is enforced is the endpoint you already had — so a
mistake in channel authorisation leaks the fact that something happened, not what.
:::

## What you need on your side

Realtime needs a broadcaster. This addon does not ship one, and does not care which you use: Laravel Reverb,
Pusher, Ably, or `laravel-echo-server`.

```dotenv
BROADCAST_CONNECTION=reverb
```

Then authorise the channel in `routes/channels.php`:

```php
Broadcast::channel('users.{id}', function ($user, $id) {
    return (string) $user->id() === (string) $id;
});
```

::: warning Compare as strings
`$user->id()` is a **UUID** under the file users repository and a numeric key under the Eloquent one. A
loose comparison or an `int` cast is how you end up authorising the wrong person, or nobody.

See [Identity](/guide/identity#a-user-id-is-a-string).
:::

## The client side

```js
Echo.private(`users.${userId}`).listen('.NotificationReceived', () => {
    fetchNotifications()   // your normal authorised endpoint
})
```

::: warning The leading dot is not a typo
`NotificationReceived::broadcastAs()` returns the bare string `NotificationReceived`. Echo
prefixes an event name with the application namespace unless the name starts with a dot, so
`listen('NotificationReceived', …)` subscribes to `App.Events.NotificationReceived` and never
fires. Use `.NotificationReceived`.
:::

The payload is `{ reason: 'refresh', type: '<the notification type>' }`. `type` is there so a
client can decide whether this particular signal is worth a re-fetch; `reason` is constant and
exists only to make the shape self-describing.

`fetchNotifications()` is whatever you already call to populate the bell — there is no endpoint in
this package for it. The facade methods you need are `Notifications::forRecipient($user)`,
`Notifications::unreadCount($user)` and `Notifications::markRead($item)`; wire them to a route in
your own application. The signal's only job is to tell you when.

```php
'list_limit' => 30,
```

The list endpoint returns at most that many. The bell is a recent view, not an archive — the CP inspector is
where history lives.

## When to turn it on

**Turn it on** when your site has a persistent authenticated surface people sit on — a member area, a community,
a dashboard — where a notification arriving while they are looking at the page should be visible without a
reload.

**Leave it off** for a site where people arrive, do a thing, and leave. A broadcaster is real infrastructure to
run and monitor, and polling on page load is enough when nobody is on the page for ten minutes.

## Preferences and realtime

The realtime nudge is part of the `in_app` channel. So a recipient who has turned `in_app` off gets no
signal — and the **row is still written**, because
[preferences govern how somebody is reached, not whether it happened](/notifications/concepts#the-persisted-row-is-always-written).

Which means their bell will show it the next time they load the page. That is intended: they asked not to be
nudged, not to be kept in the dark.

## Multi-brand

The channel is per user, not per brand, because a person is one person however many brands they belong to.

Notification **rows** are brand-scoped, so the list endpoint returns only the current brand's — and a user in
two brands, with the brand switcher on one of them, sees that brand's notifications. The refresh signal does not
carry a brand, and does not need to: the endpoint applies the scope.

## Failure behaviour

Broadcasting is part of the fail-safe path: a broadcaster being down is logged and swallowed, and the
notification is still persisted and still delivered on its other channels.

So a dead broadcaster degrades to "the bell updates on page load", which is the behaviour you had before you
turned it on. Nothing to recover.
