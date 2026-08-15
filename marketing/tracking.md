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

A 1×1 pixel at `{prefix}/o/{uuid}.gif`. The UUID identifies the message, so an open is attributed to
a person rather than only counted.

::: warning Open tracking is structurally unreliable
Not a bug, and not fixable:

- **Image-blocking clients never report an open.** The person read the email; you recorded nothing.
- **Prefetching clients report opens nobody made.** Apple Mail Privacy Protection fetches the pixel
  for **every delivered message**, shortly after delivery, whether or not anybody looks at it — and
  then caches the image, so there is no second fetch when the person actually reads it. Security
  gateways do the same on the way in: Mimecast, Proofpoint, Barracuda, Symantec and the rest fetch
  every URL in an incoming message as a matter of policy.

So an open rate is a lower bound mixed with false positives, in a ratio that depends on your
audience's mail clients and changes when Apple ships an update.

Treat **click rate** as the real number, and treat an open-rate change as a hypothesis rather than a
finding.
:::

### Machine opens

Since 2.8.0 the addon marks the ones it can recognise. `Support\MachineOpen` is asked once per
fetch, while the request is in hand, and answers a single question: a person, or something loading
the image on their behalf?

::: warning It is a heuristic, not detection
Apple's Mail Privacy Protection does not announce itself. Being indistinguishable is the whole point
of it, and no amount of work here changes that.

What is actually recognised: a list of scanners and link previewers by user agent; the fingerprint
MPP's proxy currently presents (a bare WebKit on a Mac, with none of the `Safari`, `Version` or
`Mail` tokens a real client sends); and an open with no user agent at all within 30 seconds of the
send. Apple may change any of that without notice.
:::

**The direction of the doubt is the decision: an unknown client counts as a person.** Filing a real
reader as a machine is the error that makes the whole thing worse than not having it, so the
heuristic only claims what it recognises and stays quiet otherwise.

Gmail's `GoogleImageProxy` counts as a person **on purpose**. Gmail proxies the image when the
message is actually opened, so its fetch *is* a reading. Calling it a machine would throw away real
signal from a large share of most lists.

**And a click counts as a person.** It has to: under MPP the proxy has already fetched the pixel, so
the only open on record is the machine's. Counting opens alone would report "read by nobody" for a
campaign somebody clicked all the way through — directly beneath a note saying that a click is what
proves a person was there.

### How to read your numbers now

**The existing counters are unchanged.** `opens` still counts every fetch, machine or not, and the
open rate is still calculated the way it always was. That is deliberate: the report compares this
campaign against every earlier one, and quietly redefining "opens" would look like a collapse in
engagement that never happened.

The new figures stand next to the old ones, under their own names:

| Figure | Counts |
| --- | --- |
| **Opens**, open rate | Every fetch of the pixel, machine or person. Unchanged, and still the number to use when comparing against a campaign sent before 2.8.0. |
| **Human opens** | Messages with at least one open believed to be a person — **or a click**. This is the number to read. |
| **Machine only** | Opens minus human opens: the part of your open count that does not mean anybody read anything. |
| **Human open rate** | Human opens against delivered, the same denominator the existing open rate uses, so the two are comparable at a glance. |

Two consequences worth expecting:

- **Human opens can exceed the open count.** Somebody whose client blocks images and who clicked is
  a person with no recorded open at all. "Machine only" is clamped at zero rather than going
  negative.
- **An Apple-heavy audience produces a large "machine only".** That is the measurement becoming
  honest, not interest falling off.

::: tip The one-line version for whoever reads the report
The open rate answers "how many pixels loaded". The human open rate answers "how many people we have
evidence for". The click rate is still the only number nobody loads on your behalf.
:::

### What is stored

The verdict, and nothing it was made from: a boolean `machine` column on
`marketing_message_events`.

**No user agent and no IP address is kept.** An IP is personal data, a stored user agent is a
fingerprint, and neither is needed once the question has been answered.

## Clicks

Links are rewritten to signed redirects at `{prefix}/c/{uuid}`. The signature is what stops the
redirect being used as an open one, and the UUID attributes the click. The unsubscribe and confirm
links are left alone by the rewriter, along with anchors, `mailto:` and `tel:`.

A click is a real signal: somebody's mail client does not click links.

## What the report shows

Per campaign: open rate, click rate, bounces and unsubscribes, over the per-recipient `Message` rows
that back them — plus, since 2.9.0, the people behind each of those numbers on their own tab. See
[Campaigns → The report](/marketing/campaigns#the-report).

Because messages are per recipient, "who clicked" is answerable, not only "how many".

**Since 2.10.0 the split above is also drawn.** The overview carries a curve of opens and clicks over
the time since the send, with preloads in their own colour — the most visible consequence of
everything on this page. It is where an Apple-heavy audience stops being a large "machine only"
figure and becomes a shape: one bar at the wall of delivery, and the reading spread over the days
after it.

Two properties of that chart follow directly from this page, and both are on
[Campaigns → The activity curve](/marketing/campaigns#the-activity-curve): its axis is measured
against the tallest *human* bar, because the preload hour is otherwise tall enough to flatten
everything else into a hairline; and a campaign sent before 15 August 2026 predates the `machine`
column, so its split cannot be read at all.

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
| `MessageOpened` | The pixel was fetched for the **first** time. `metadata['machine']` says whether that fetch looked automated |
| `MessageOpenedByHuman` | The first open that was **not** a machine's |
| `MessageClicked` | A tracked link was followed for the first time |
| `MessageBounced` | The ESP reported a bounce |
| `MessageComplained` | The ESP reported a spam complaint |

`MessageOpenedByHuman` (2.8.0) exists because of the ordering behind a scanning mailbox. There the
first open is practically always the machine's, so `MessageOpened` has already fired — carrying
`machine: true` — and it does not fire again when the person themselves reads the mail. Without a
second event, anything listening would say "preloaded" forever and never once say somebody read it.

Sibling addons and your own listeners can subscribe to it. So does this addon's own timeline
recorder, below.

Bounces and complaints do not come from tracking; they arrive from your ESP through
[an inbound webhook](/marketing/suppression#esp-feedback-webhooks). Without that wired up, the bounce
and complaint columns in your report stay at zero regardless of reality.

## Storage

Message events are always Eloquent, whichever storage driver you chose for lists and campaigns. They
are high-volume per-recipient telemetry and belong in a database.

There is no automatic pruning of message events in the current release, so on a site sending
frequently to a large list this table grows. Worth watching.

## On the LeadHub timeline

Since 2.8.0, every mail this addon sends is also written onto the recipient's
[LeadHub timeline](/leadhub/timelines): sent, opened, prefetched, clicked, bounced, complained. With
subject, campaign and list as readable lines rather than a payload dump.

The facts were always recorded — in `marketing_messages` and `marketing_message_events`, keyed by
message, which is exactly where nobody looking at a *person* would find them.

Two properties carry the whole thing, and neither is about the good case:

- **A tracking pixel never creates a contact.** Where the address has no LeadHub contact, nothing is
  written and nothing is created. Somebody who signed up and never confirmed has no contact on
  purpose, and an opened confirmation mail is not consent to be filed.
- **Nothing on this path can turn a delivered mail into a failure.** It hangs off the send path and
  off two public tracking endpoints, so it catches everything and logs it throttled — a CRM
  mid-upgrade must not break a send or a tracking pixel.

An entry is written once per fact per message, keyed so a retried job cannot turn one reading into
two.

```php
'timeline' => [
    'enabled' => true,
    'types' => [],       // empty = all six kinds
],
```

`types` narrows what is written, by the constants on `Integrations\Leadhub\TimelineRecorder`:

| Constant | Type |
| --- | --- |
| `TYPE_SENT` | `marketing.mail_sent` |
| `TYPE_OPENED` | `marketing.mail_opened` |
| `TYPE_PREFETCHED` | `marketing.mail_prefetched` |
| `TYPE_CLICKED` | `marketing.mail_clicked` |
| `TYPE_BOUNCED` | `marketing.mail_bounced` |
| `TYPE_COMPLAINED` | `marketing.mail_complained` |

A machine open is filed as `mail_prefetched`, not as `mail_opened` — the distinction from
[Machine opens](#machine-opens), on the screen where somebody reads it.

::: tip Fifty thousand recipients is a good reason to narrow this
A row per open on every contact is a legitimate thing not to want. Narrow `types` to
`marketing.mail_sent` and `marketing.mail_clicked`, or switch `enabled` off entirely. Nothing else
in the addon depends on it.
:::

The whole path is skipped when LeadHub is absent or too old to have `findByEmail()` and `ingest()` —
checked with `method_exists`, not against a version number.

## Activity

With [Activity](/activity/) installed, its Marketing producer records `marketing.email_sent`,
`email_opened`, `email_clicked`, `email_bounced` and `email_complained` into the ledger as well.

The producer ships with the Activity addon, not with this one. Marketing contains no Activity code
at all: it fires its own events, and Activity listens where it is installed.

That is not a duplication to resolve. The message events are Marketing's own per-campaign reporting;
the ledger is the site's cross-domain record, in one shape every consumer can read, and it is what a
future analytics layer would read from. See
[Boundaries](/guide/boundaries#ledger-vs-analytics).

Note that opens go into the ledger **without** a dedupe key, deliberately: the second open is a second
fact, and `event_id` alone keeps retries safe. See
[Activity → Recording](/activity/recording#two-idempotency-keys).

## Privacy notes

- No IP addresses are stored by the tracking endpoints.
- The machine/person verdict on an open is stored as one boolean. The user agent it was derived from
  is used once, in the request, and never written down.
- Activity records only a coarse device category — `mobile`, `desktop`, `tablet`, `bot` — never a raw
  user agent.
- The click redirect is signed, so the endpoint cannot be used as a general-purpose open redirect by
  somebody who finds it.

If your privacy policy describes what you track, `clicks` on and `opens` off is the configuration that
is easiest to describe honestly.
