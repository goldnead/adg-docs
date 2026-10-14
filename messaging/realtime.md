# Realtime in 3 steps

<AddonHeader />

New messages appear in an open conversation without reloading, and the inbox updates while it is
open. It uses websockets through [Laravel Reverb](https://laravel.com/docs/reverb), so there is
no polling and no third-party service.

It switches on by itself as soon as the default broadcast connection is `reverb` or `pusher`,
and stays off, **without an error**, otherwise.

## 1. Install and configure the server

```bash
composer require laravel/reverb
php artisan reverb:install      # writes config/reverb.php and the REVERB_* values into .env
```

Set `BROADCAST_CONNECTION=reverb` and make sure `REVERB_APP_KEY`, `REVERB_APP_SECRET`,
`REVERB_APP_ID`, `REVERB_HOST`, `REVERB_PORT` and `REVERB_SCHEME` are set. They describe where
**PHP** reaches the server. The **browser** connects to the host and port of the page (route
`/app` to Reverb in your proxy), or to `MESSAGING_CLIENT_HOST`, `MESSAGING_CLIENT_PORT` and
`MESSAGING_CLIENT_SCHEME` if it lives elsewhere.

## 2. Put the tag in the template

In the conversation view, and once in the inbox:

```antlers
{{ messaging:realtime conversation="{ cid }" }}
```

Mark where new messages go, and how one looks. Without a template the script builds a plain
paragraph.

```antlers
<div data-messaging-list aria-live="polite">
    {{ messages }}<div data-message-id="{{ id }}">…</div>{{ /messages }}
</div>

<template data-messaging-template="theirs">
    <div><p data-field="body"></p><small><span data-field="sender"></span> <span data-field="time"></span></small></div>
</template>
<template data-messaging-template="mine">…</template>
```

For the inbox, wrap the parts that should follow along (the list, the unread badges) in
`data-messaging-refresh="name"`. When something arrives for the person, the script fetches the
current page again and swaps those regions.

## 3. Run the server

Run it next to the app, as a second process or container:

```bash
php artisan reverb:start --host=0.0.0.0 --port=8080
```

Behind a proxy, route the paths `/app` and `/apps` to it.

## How it works, and what it will not do

- **Private channels.** Every message, hide and restore is announced on
  `messaging.conversation.{id}` (only participants who are still allowed to read it and have not
  blocked it) and `messaging.user.{key}` (only that person). The addon registers both channels
  and, when the app has none, `/broadcasting/auth`.
- **The broadcast carries two ids and nothing else.** No text, no name, nothing about an
  anonymous identity. The browser fetches the message from
  `GET /messaging/realtime/{conversation}/messages/{message}`, which applies the same rules as
  the page: a hidden message, a foreign conversation and a stranger all get 404. The sender's
  name depends on who is looking, which is why the server cannot send one rendering to
  everybody.
- **Moderation is live.** A hidden message disappears from open conversations at once; a restored
  one returns in place.
- **It never blocks sending.** The signal leaves in the same request (`ShouldBroadcastNow`)
  instead of waiting for a queue worker. A dead websocket server is reported and ignored:
  sending a message never fails because of it.
- **No build step in your app.** The client is a prebuilt script (`resources/dist/realtime`,
  Echo and the Pusher client included, about 27 kB gzipped) served by the addon at
  `/messaging/realtime.js`. No CDN. It reads the CSRF token from `<meta name="csrf-token">` if
  there is one.
- **Switches.** `MESSAGING_REALTIME=false` forces it off, `true` forces it on.
  `php artisan vendor:publish --tag=messaging-config` publishes `config/messaging.php` (time zone
  and format of a live message).
