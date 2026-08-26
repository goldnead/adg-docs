# Troubleshooting

<AddonHeader />

## Every step answers 419 Page Expired

You are on a version before **1.3.1**, or on a template of your own that does not print a
CSRF token.

The shipped template's `{{ csrf_field }}` used to render to an empty string, because the
step was rendered with a plain Laravel `view()` and the cascade — which is where that
variable comes from — never ran. Every form posted without a token and Laravel rejected
it. Upgrade.

In a template of your own, print `{{ csrf_field }}` inside every form that posts to
`funnel:action`.

## The funnel URL 404s

In order:

1. **Is it live?** An unpublished funnel answers 404 rather than showing a warning. A
   half-built funnel handed to a visitor is worse than a missing page, because it takes
   money in the middle.
2. **Does it have an Entry step?** A funnel with none cannot be walked.
3. **Is the step disabled?** A disabled step 404s and stays on the canvas.
4. **Is the prefix what you think?** `route_prefix` is `f` by default, and changing it
   changes every funnel URL on the site.

## Advancing answers 403

The walk has not `entered` the step it is trying to leave. That check is deliberate:
without it somebody could skip a form, or take the `accepted` branch of an offer they
never saw.

It is normally a lost walk cookie. Check that `statamic_funnel` reaches the server, and in
particular that nothing has added it back to Laravel's cookie encryption — Laravel
silently discards a cookie it cannot decrypt, which looks exactly like a visitor who never
came back. The addon excludes it on purpose.

## The money arrived and the walk stands still

**Accepted means paid**, and only the payment provider's webhook says so. If that endpoint
is not reachable from the internet, offers get paid for and no walk ever advances past
them.

Check, in order:

1. The payments addon received the webhook and the payment is `paid`.
2. `funnel_visits.payment_id` points at that payment.
3. `funnel_visits.meta.pending_step` names the offer step.

A payment made outside a funnel matches no visit and is ignored, which is the ordinary
case on a site that also sells directly.

## An offer accepted, and it went back to the offer page

The payment came back **pending**, which is the ordinary answer for a recurring charge or
a follow-up against a stored mandate. The visitor is sent back with a note that the money
is on its way, and the webhook moves the walk on.

Advancing on acceptance rather than on payment is the one mistake this family of addons is
written against.

## "This offer is not available right now."

The offer handle on the step does not resolve, or the offer is not sellable. The failure
is logged as a warning naming the funnel, the step and the handle.

The same condition on the *page* renders no order form at all rather than a broken one.

## The price prints as `1249.50` on a German site

Print `funnel:offer:amount_local`, not `amount`. In German the dot groups thousands, so
that is not a badly styled number, it is a different one.

`amount` keeps the dot for anything that parses. Both shapes need
`goldnead/statamic-offers` 1.2 or newer.

## The deadline passed and the offer is still buyable

`countdown_until` could not be read as a date, and an unreadable date is treated as **no**
deadline rather than one that has passed — a typo in the Control Panel should leave an
offer buyable, not close it for everybody.

Check the value the server sees. `2026-09-30 23:59` is fine.

## The countdown does not tick

The script is not on the page. Either
`php artisan vendor:publish --tag=statamic-funnels` was never run, or
[`styles`](/funnels/configuration#styles) is `false`, or the template is your own and does
not load it.

The deadline is enforced regardless. A page with a frozen clock still refuses a late
order.

## The pages are unstyled

Same cause: `public/vendor/statamic-funnels/funnels.css` was never published. See
[Installation](/funnels/installation#the-third-command-is-not-optional).

## The split test is not running

`Split` treats a step as running a test only when both are true:

- the share is between 1 and 99 — 0 and 100 both mean everybody sees one version
- version B actually sets something: `variant_entry`, `variant_headline` or
  `variant_body`

An empty share is read as **50**, so a filled variant with a blank share *is* an even
split, not "off". To switch a test off, clear the variant fields or set the share to 0.

## A step points at an entry and shows the step's own headline instead

The entry is unpublished. That is deliberate: `handleDraft()` would 404, and a page pulled
back into draft must not take a running funnel down with it, so the step falls back to its
own fields and the walk carries on.

Everything else about the entry — password protection, `private`, its own `redirect` — is
left to Statamic and still applies.

## A field of the landing page came out blank

A template writing the funnel's context flat. Statamic merges view data **over** an
entry's own fields, so a flat `body` blanks the `body` of the page being rendered.

Read `funnel:` — one key, and the only shape that is safe on an entry. Versions before
1.1.0 spread it flat and had this bug themselves.

## The preview is blank, or 404s

The pass expired (15 minutes, extended on every refresh), belongs to a different funnel, or
the route's 60/minute throttle is biting. Close the preview and open it again.

If it renders but the numbers on the cards do not move, that is correct: a preview writes
nothing — no visit, no step event, no offer impression.

## Renaming a step did not change its URL

By design. A slug is derived from the label once and then left alone, because a slug that
followed the label would break every link already sent out — and the second half of most
funnels arrives by email.

## `{{ funnels:progress }}` shows nothing

It falls through to `no_results` when there is no walk, when the walk is finished, or when
the funnel is not live. All three are ordinary.

It never *starts* a walk, so it shows nothing for a visitor who has not entered the funnel.
An early release did start one, which meant a cookie and a database row for every visitor
and every crawler.

## The step cards show no numbers

Nobody has reached those steps yet. A step nobody has reached shows nothing at all rather
than zeroes, because the difference between "nobody yet" and "everybody left here" is the
only reason to put numbers on a card.

A terminal step shows only its visitor count: a thank-you page is not converting at 0 %,
it is the end.

## The Funnels utility is missing

The role lacks `access funnels utility`. Grant it under **CP → Users → Permissions →
Utilities**.

## An offer draws one handle instead of two

`goldnead/statamic-flow-canvas` older than 1.0.1. The shared canvas registered output
specs from one addon's group names only, so an offer's two declared outputs collapsed to
one — with the branches already wired underneath, going nowhere.
