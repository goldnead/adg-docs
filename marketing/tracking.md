# Tracking

<AddonHeader />

```php
'tracking' => [
    'opens' => true,
    'clicks' => true,
],
```

Both are per recipient, and both feed the campaign report.

## Opens

A 1×1 pixel at `{prefix}/open/{token}`. The token identifies the message, so an open is attributed to
a person rather than only counted.

::: warning Open tracking is structurally unreliable
Not a bug, and not fixable:

- **Image-blocking clients never report an open.** The person read the email; you recorded nothing.
- **Prefetching clients report opens nobody made.** Apple Mail Privacy Protection fetches every image
  in every message, on delivery, from a proxy.

So an open rate is a lower bound mixed with false positives, in a ratio that depends on your
audience's mail clients and changes when Apple ships an update.

Treat **click rate** as the real number, and treat an open-rate change as a hypothesis rather than a
finding.
:::

## Clicks

Links are rewritten to signed redirects at `{prefix}/click/{token}`. The signature is what stops the
redirect being used as an open one, and the token attributes the click.

A click is a real signal: somebody's mail client does not click links.

## What the report shows

Per campaign: open rate, click rate, bounces and unsubscribes, over the per-recipient `Message` rows
that back them.

Because messages are per recipient, "who clicked" is answerable, not only "how many".

## Turning tracking off

```php
'tracking' => ['opens' => false, 'clicks' => false],
```

A legitimate privacy decision, and the cost is specific: with `clicks` off you lose the only reliable
engagement signal, and with both off the report reduces to sends, bounces and unsubscribes.

If you turn one off, turn off opens. It is the one whose data is least trustworthy and whose privacy
cost is highest — a tracking pixel fires without any action by the reader.

## Clicks and lead scoring

[LeadHub's scoring](/leadhub/scoring) can award points for a tracked email link click:

```php
// config/leadhub.php
'scoring' => ['events' => ['email_link_clicked' => 3]],
'click_tracking' => ['dedupe_window' => 60],   // minutes
```

Two properties worth knowing:

- **Consent-first.** Even with scoring on, a click is only ever scored when the contact has marketing
  consent.
- **Deduplicated.** Repeated clicks of the same link by the same contact inside the window are
  recorded once and scored once, so a prefetching client or somebody re-reading the email does not
  inflate the score.

`LeadHubEmailLinkClicked` fires on a scored click, so it is available as a webhook trigger.

## Message events

| Event | Recorded when |
| --- | --- |
| `MessageSent` | The message was handed to the mailer |
| `MessageOpened` | The pixel was fetched |
| `MessageClicked` | A tracked link was followed |
| `MessageBounced` | The ESP reported a bounce |
| `MessageComplained` | The ESP reported a spam complaint |

Bounces and complaints do not come from tracking; they arrive from your ESP through
[an inbound webhook](/marketing/suppression#esp-feedback-webhooks). Without that wired up, the bounce
and complaint columns in your report stay at zero regardless of reality.

## Storage

Message events are always Eloquent, whichever storage driver you chose for lists and campaigns. They
are high-volume per-recipient telemetry and belong in a database.

There is no automatic pruning of message events in the current release, so on a site sending
frequently to a large list this table grows. Worth watching.

## Activity

With [Activity](/activity/) installed, the bundled Marketing producer records
`marketing.email_sent`, `email_opened`, `email_clicked`, `email_bounced` and `email_complained` into
the ledger as well.

That is not a duplication to resolve. The message events are Marketing's own per-campaign reporting;
the ledger is the site's cross-domain record, in one shape every consumer can read, and it is what a
future analytics layer would read from. See
[Boundaries](/guide/boundaries#ledger-vs-analytics).

Note that opens go into the ledger **without** a dedupe key, deliberately: the second open is a second
fact, and `event_id` alone keeps retries safe. See
[Activity → Recording](/activity/recording#two-idempotency-keys).

## Privacy notes

- No IP addresses are stored by the tracking endpoints.
- Activity records only a coarse device category — `mobile`, `desktop`, `tablet`, `bot` — never a raw
  user agent.
- The click redirect is signed, so the endpoint cannot be used as a general-purpose open redirect by
  somebody who finds it.

If your privacy policy describes what you track, `clicks` on and `opens` off is the configuration that
is easiest to describe honestly.
