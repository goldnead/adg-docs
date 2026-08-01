# Troubleshooting

<AddonHeader />

## A scheduled campaign never sent

The scheduler is not running. `marketing:send-scheduled` is registered every minute, and without it the
campaign sits there looking scheduled: no error, no failed job, no warning in the CP.

```bash
php artisan schedule:work        # or a cron entry calling schedule:run
php artisan marketing:send-scheduled
```

This is the most common disappointment with this addon.

## A send started and nothing arrives

1. **Is a queue worker running?** Sending is queued.
2. **Is it watching the right queue?** If you set `MARKETING_QUEUE=marketing`, then
   `php artisan queue:work --queue=marketing,default`.
3. **`queue:failed`.**
4. **Is the throttle very low?** 4,000 recipients at 10 a minute is nearly seven hours. That is the
   throttle working, not a stall.

## The audience is smaller than the segment count

Working as designed. Four groups are excluded at send time even when the segment matches them:

- `pending` subscriptions — started a double opt-in, never confirmed
- `unsubscribed` members
- suppressed addresses from hard bounces and complaints, even while the row says `subscribed`
- contacts with `do_not_contact`

## The segment appears to be ignored

Segment targeting requires LeadHub **`^1.4`**. Where an older one is somehow in place, Marketing
degrades gracefully to a **whole-list send**, with no error — so "ignored" and "too old" look
identical from the CP.

Check the member count in the CP before sending. A count equal to the whole list is the tell.

## A segment matches nobody

An **empty rule set matches nobody**, deliberately: express "everyone" as no segment at all. Also check
the segment is active — a deactivated segment returns `[]`.

If a time-based rule is involved, run the sweep. Mutation-driven rules stay fresh without the
scheduler; time-based ones do not, producing a half-correct segment with plausible numbers.

```bash
php artisan leadhub:segments:sweep
```

## Bounce and complaint counts are always zero

The ESP feedback path is not wired up. Bounces and complaints are not something this addon can observe
— they come from your provider.

Set up the inbound endpoint with `MARKETING_ESP_WEBHOOK_SECRET` and the
`marketing.process_esp_event` action, then verify **both** cases with `curl`. See
[Suppression → ESP feedback webhooks](/marketing/suppression#esp-feedback-webhooks).

An endpoint that accepts everything looks identical to a working one if you only test the happy path.

## The ESP endpoint intermittently returns 429

`inbound.rate_limit_per_minute` defaults to **60**. An ESP delivering a burst of bounce notifications
after a large campaign exceeds it easily, and from the provider's side rejections look like your
endpoint being down.

Raise it in `config/webhook-manager.php`.

## The ESP endpoint is disabled

Deliberate: it stays disabled until `MARKETING_ESP_WEBHOOK_SECRET` is set, because an enabled endpoint
with an empty secret accepts everything.

## The one-click unsubscribe returns 419

CSRF. It arrives as a POST from a mail provider with no session and no token, so that route excludes
the forgery middleware — under all three names it is known by (`PreventRequestForgery`,
`ValidateCsrfToken`, `App\Http\Middleware\VerifyCsrfToken`), because Laravel renamed it and
applications sometimes subclass it. If you have wrapped or replaced that middleware under a fourth
name, exclude it yourself.

::: warning Your test suite cannot see this
Laravel's CSRF middleware skips itself automatically in unit tests. Test with `curl` against a running
server.
:::

## Confirmation and unsubscribe links 404

Four causes, in order:

1. **The link is a `/!/marketing/preferences/{token}` link.** That route was removed in 1.9.0 and
   nothing redirects it, so every one of them in already-delivered mail 404s. See below.
2. **`routes.prefix` changed after mail was sent.** Links in delivered mail point at the old prefix.
   Keep a redirect, or do not change it after sending.
3. **The token belongs to a record in another brand.** Tokens carry the brand precisely because these
   links have no session; if you rebuilt subscriptions, old tokens are gone.
4. **A genuinely expired or already-used token.** The controller decides what that page says — the
   middleware sets no brand and aborts nothing.

## Preference links in already-sent newsletters 404 <Badge type="tip" text="1.9.0" />

Expected, and not repairable from inside the addon.

Marketing served a multi-list preference page at `/!/marketing/preferences/{token}` up to 1.8.1.
1.9.0 removes the page, the controller and the route, because
[`goldnead/statamic-preference-center`](/preference-center/) serves the same screen across marketing,
notifications and suppression, and two addons rendering one page is a fork rather than redundancy.

**No redirect ships with the addon.** Installing the preference centre does not create one either:
it registers its own token route, not marketing's old one. Newsletters you have already sent carry
the old URL, and it now returns 404.

The token in the old URL is the same subscription token the new route takes, so a redirect in your
own application is a small piece of work — but it is yours to write, and it has to exist before you
upgrade if you have delivered mail carrying those links.
[Preference Center → Migrating from Marketing](/preference-center/migrating-from-marketing) walks
through the full cutover, including the caches that have to be cleared for the new route to resolve.

Campaigns sent **after** the upgrade are unaffected: `{{ unsubscribe_url }}` is resolved at render
time and already points wherever the preference page currently lives.

## Subscribing silently does nothing

The honeypot. `subscriptions.honeypot` defaults to `website`, and a submission that fills it in is
silently rejected — including a human whose browser autofilled a legitimate `website` field.

Rename the config value if your form has a real field of that name, and keep the decoy hidden with CSS
rather than `type="hidden"`.

## "Already subscribed" leaks who is on the list

Return the same neutral confirmation for a new and an existing address. Otherwise anybody with your form
can test whether a given address is a subscriber.

## Duplicate subscriptions for one address on one list

The unique index is not in force. `migrate` reporting success does not prove it is.

```bash
php artisan marketing:consent-integrity
php artisan marketing:consent-integrity --repair
```

It names every colliding pair with each row's id, status and confirmation date, and **never deletes a
subscription** — which of two sign-ups is *the* consent record is a decision about people. `--repair`
refuses to build the index while anything would have to go for it.

Specifically worth running on an install that came from 1.2.1 or earlier through 1.6.1–1.6.3.

## Creating a list is refused

The handle already exists in another brand. **List handles are unique across all brands**, because the
public subscribe endpoint derives the brand from the handle the form names, and that only holds while a
handle has one owner. The error message names the brand holding it.

This is a deliberate exception to the per-brand uniqueness used elsewhere in the suite. See
[Brand Context → Public routes](/brand-context/public-routes#the-column-must-be-globally-unique).

## Flat-file lists belong to the wrong brand

Files in the un-prefixed layout are read as the **default brand's**, by design, so a single-brand
install keeps working after the flag flips.

```bash
php artisan marketing:migrate-flat-brands --dry-run
php artisan marketing:migrate-flat-brands --brand=acme
```

Only moves, never overwrites, never deletes, no-op on a second run.

## `{{ first_name }}` renders as an empty gap

Variables that resolve to nothing render as nothing, so `Hallo {{ first_name }},` becomes `Hallo ,`.

```antlers
{{ if first_name }}Hallo {{ first_name }}{{ else }}Hallo{{ /if }},
```

## Open rates dropped, or look implausible

Open tracking is structurally unreliable and not fixable. Image-blocking clients never report; Apple
Mail Privacy Protection fetches every image on delivery from a proxy and reports opens nobody made.

Treat click rate as the real number, and treat an open-rate change as a hypothesis. See
[Tracking](/marketing/tracking#opens).

## The mail arrives but looks broken

Test-send and read it in a **real mail client**, not a browser. The usual causes are relative image
URLs, CSS a mail client strips, and a template that renders fine in a browser preview and not in
Outlook.

If you author templates with [Email Templates](/email-templates/), note that the Bard render path keeps
structural markup and **drops inline styles and unknown attributes**. Heavily styled marketing HTML may
lose styling. See [Email Templates](/email-templates/authoring).

## A listener of mine slowed the signup form to a crawl

Marketing's own path is fail-safe; **your listener is not**, and it runs where the event was dispatched.
A listener that calls an API synchronously turns your signup form into a proxy for that API's uptime.

Queue it.

## A campaign sent to the wrong list

There is no recall. This is the argument for the test send, for looking at the audience count, and for
keeping `send marketing campaigns` a separate permission from `manage marketing campaigns`.
