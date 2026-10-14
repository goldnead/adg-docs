# Configuration

<AddonHeader />

Everything works without a config file. Publish it only to change the realtime behaviour or the
time format of a live message:

```bash
php artisan vendor:publish --tag=messaging-config
```

```php
// config/messaging.php
return [
    'realtime' => env('MESSAGING_REALTIME'),

    'client' => [
        'host' => env('MESSAGING_CLIENT_HOST'),
        'port' => env('MESSAGING_CLIENT_PORT'),
        'scheme' => env('MESSAGING_CLIENT_SCHEME'),
    ],

    'time_format' => 'd.m.Y H:i',
    'timezone' => null,
];
```

## `realtime`

`null` follows the broadcast connection: realtime is on as soon as `broadcasting.default` is a
`reverb` or `pusher` connection, and off otherwise (`null`, `log`), **without an error**. `true`
forces it on, `false` forces it off. Set through `MESSAGING_REALTIME`.

## `client`

Where the browser finds the websocket server. Empty means the host, port and scheme of the page,
which is right whenever your proxy routes `/app` to the server on the same domain. The server
side (`broadcasting.connections.*.options`) may point somewhere internal. Set through
`MESSAGING_CLIENT_HOST`, `MESSAGING_CLIENT_PORT` and `MESSAGING_CLIENT_SCHEME`.

## `time_format` and `timezone`

How the time of a message delivered live is written. `timezone` `null` uses `app.timezone`.

## Environment summary

| Variable | Default | |
| --- | --- | --- |
| `MESSAGING_REALTIME` | unset | `true` / `false` to force; unset follows the broadcast connection |
| `MESSAGING_CLIENT_HOST` | unset | Host the browser connects to |
| `MESSAGING_CLIENT_PORT` | unset | Port the browser connects to |
| `MESSAGING_CLIENT_SCHEME` | unset | `http` or `https` for the browser connection |

The values that tell PHP where the websocket server is (`REVERB_APP_KEY`, `REVERB_APP_SECRET`,
`REVERB_APP_ID`, `REVERB_HOST`, `REVERB_PORT`, `REVERB_SCHEME`) belong to Laravel Reverb, see
[Realtime in 3 steps](/messaging/realtime).
