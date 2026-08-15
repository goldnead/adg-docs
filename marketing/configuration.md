# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=marketing-config
```

## Highlights

| Key | Default | Purpose |
| --- | --- | --- |
| `storage.driver` | `flat` | `flat` (YAML in `content/marketing/`) or `eloquent` |
| `sending.mailer` | app default | Laravel mailer for campaigns |
| `sending.messages_per_minute` | `0` | Throttle for ESP rate limits; `0` = off |
| `subscriptions.double_opt_in` | `true` | Default for new lists, overridable per list |
| `unsubscribe.global_opt_out` | `false` | Also set LeadHub `do_not_contact` on unsubscribe |
| `tracking.opens` / `tracking.clicks` | `true` | Toggle tracking |
| `timeline.enabled` | `true` | Write every mail onto the recipient's LeadHub timeline |
| `timeline.types` | `[]` | Which kinds of entry to write; empty means all six |
| `archive.enabled` | `false` | The public web version of a campaign. **Off unless asked for.** |
| `leadhub.tag_subscribers` | `true` | Tag contacts with `list:{handle}` |

## Storage

```php
'storage' => [
    'driver' => env('MARKETING_DRIVER', 'flat'),
    'flat' => [
        'path' => env('MARKETING_FLAT_PATH', base_path('content/marketing')),
    ],
],
```

Governs lists, campaigns and templates. **Runtime data — subscriptions, messages, events — is
always Eloquent**, whichever driver you pick, so "flat" never means "no database".

## Sending

```php
'sending' => [
    'mailer' => env('MARKETING_MAILER'),
    'queue' => env('MARKETING_QUEUE', 'default'),
    'chunk' => 200,
    'messages_per_minute' => (int) env('MARKETING_PER_MINUTE', 0),
],
```

`mailer` defaults to your app's. Pointing marketing mail at a **separate** mailer is worth doing:
bulk and transactional sending have different reputations, and a campaign complaint should not
affect your password-reset deliverability.

`chunk` is how many recipients are resolved per batch. `messages_per_minute` is the throttle —
set it below your ESP's limit, because exceeding it means rejected messages the addon records per
recipient and cannot undo.

## From address

```php
'from' => [
    'name' => env('MARKETING_FROM_NAME'),
    'email' => env('MARKETING_FROM_EMAIL'),
],
```

Set both. Falling back to your app defaults means your newsletter comes from
`noreply@`, which costs you replies and looks like automation.

## Subscriptions

```php
'subscriptions' => [
    'double_opt_in' => true,
    'honeypot' => 'website',
],
```

`double_opt_in` is the default for **new** lists and is overridable per list. Leave it on: an
unconfirmed address is not consent, and in several jurisdictions is not defensible.

`honeypot` is the name of the decoy field the subscribe tag renders. Change it if `website`
collides with a real field on your form — a bot filling it in is silently rejected, and so is a
human whose browser autofilled your actual website field into it.

## Unsubscribe

```php
'unsubscribe' => [
    'global_opt_out' => false,
],
```

`true` means unsubscribing from **one** list sets LeadHub's `do_not_contact`, which stops every
CRM push and every other list.

Turn it on if your lists are one relationship. Leave it off if they are genuinely separate
consents, where leaving the newsletter should not cancel the customer notifications.

## Tracking

```php
'tracking' => [
    'opens' => true,
    'clicks' => true,
],
```

Opens are a 1×1 pixel; clicks are signed redirects. Both are per-recipient and feed the campaign
report.

Turning either off is a legitimate privacy decision. Open tracking in particular is unreliable —
image-blocking clients never report, prefetching clients report opens nobody made — so a low open
rate may be your audience's mail client rather than your subject line. See
[Tracking](/marketing/tracking).

## Timeline

```php
'timeline' => [
    'enabled' => true,
    'types' => [],
],
```

Every mail this addon sends is written onto the recipient's LeadHub timeline, so "what has this
person had from us, and did they read it" is answerable where somebody actually asks it — on the
contact, rather than in a table keyed by message.

**Nothing is written for an address with no contact.** A tracking pixel must not be able to create a
CRM record.

`types` narrows what is written. An installation sending to fifty thousand people may not want a row
per open on every contact; leaving it empty means all six kinds. The constants are on
`Integrations\Leadhub\TimelineRecorder`. See [Tracking](/marketing/tracking#on-the-leadhub-timeline).

## Web archive

```php
'archive' => [
    'enabled' => env('MARKETING_ARCHIVE', false),
    'prefix' => env('MARKETING_ARCHIVE_PREFIX', 'newsletter'),
    'title' => env('MARKETING_ARCHIVE_TITLE'),
    'neutral_name' => null,
    'feed_limit' => 20,
],
```

A public web version of a campaign, on a stable readable URL. **Off in the shipped default**, and
while it is off its three routes are not registered at all — which is also why the per-campaign
"Publish a public web version" switch is not on screen until you turn this on.

`enabled` defaults to `false` because the archive claims a readable path, and a site that already has
a page at `/newsletter` would lose it to a `composer update`. Visibility is then still per campaign
and off by default. See [Campaigns → The web archive](/marketing/campaigns#the-web-archive).

## Routes

```php
'routes' => [
    'prefix' => env('MARKETING_ROUTE_PREFIX', '!/marketing'),
],
```

Where the public subscribe, confirm, unsubscribe and tracking endpoints live — six routes, and
since 1.9.0 no preference route among them. The `!` prefix is Statamic's convention for addon
routes.

::: warning Changing the prefix breaks links already sent
Confirmation and unsubscribe links in mail already delivered point at the old prefix. Change this
before you send anything, or keep a redirect.
:::

This prefix does not reach the [Preference Center](/preference-center/). That addon serves its own
route, and changing this value has no effect on it.

## LeadHub

```php
'leadhub' => [
    'tag_subscribers' => true,
    'tag_prefix' => 'list:',
    'hard_bounce_opt_out' => true,
    'complaint_opt_out' => true,
],
```

`tag_subscribers` tags each contact with `list:{handle}`, which makes "everyone on the newsletter"
expressible as a LeadHub tag condition in a segment.

`hard_bounce_opt_out` and `complaint_opt_out` set LeadHub's `do_not_contact` on a hard bounce or a
spam complaint. **Leave both on.** Continuing to mail an address that hard-bounced damages your
sending reputation, and continuing after a complaint is worse than that.

## Integrations

```php
'integrations' => [
    'automations' => true,
    'webhook_manager' => true,
],
```

Both auto-detected, both no-ops when the sibling addon is absent. See
[Extending](/marketing/extending).

## Environment summary

```dotenv
MARKETING_DRIVER=flat
MARKETING_FLAT_PATH=
MARKETING_MAILER=
MARKETING_QUEUE=default
MARKETING_PER_MINUTE=0
MARKETING_FROM_NAME=
MARKETING_FROM_EMAIL=
MARKETING_ROUTE_PREFIX=!/marketing
MARKETING_ESP_WEBHOOK_SECRET=
MARKETING_ARCHIVE=false
MARKETING_ARCHIVE_PREFIX=newsletter
MARKETING_ARCHIVE_TITLE=
```

`MARKETING_ESP_WEBHOOK_SECRET` is read by the ESP inbound endpoint, which stays **disabled** until
it is set. See [Unsubscribes & suppression](/marketing/suppression#esp-feedback-webhooks).
