# Attribution

<AddonHeader />

The hard part of a partner programme is not the commission but the question *whose sale is
this?* It is answered from two places, and never from a field the buyer could fill in.

## The link

Any page of the site with `?ref={code}`, or `/!/affiliates/go/{code}?to=/path` for places that
cannot carry a query string (a QR code, a print ad, a platform that strips parameters).

A middleware in the `web` group sees the code on a `GET` request, looks it up among the
brand's **active** partners and notes it: in an encrypted cookie when the visitor has
consented, and in the visitor's existing session for the rest of the visit. A code that is not
an active partner is ignored. Because the cookie is encrypted like every other cookie in the
`web` group, a visitor cannot write a partner into it by hand.

When [Payments](/payments/)' checkout creates the payment in that same visitor's request, the
referral is written down against the payment id. It only becomes a sale when the payment is
paid: a referral noted at a checkout nobody paid stays without a date and does not count in
the partner's figures.

### First or last

`tracking.attribution` decides what a second partner's link does while a referral is alive:

- `last` (default): the most recent link takes the sale.
- `first`: the first partner keeps it until the cookie expires.

The same partner's link again does not restart the clock. The cookie's life is counted from
the first click, and a cookie written later, after consent, is not extended either.

### How long a click counts

`tracking.cookie_days`, 30 by default, counted from the click. `0` means only for the visit.
A referral older than that does not count, whichever store it comes from, so a long-lived
session cannot outlive it.

### The `go` link

`/!/affiliates/go/{code}?to=/kurse` notes the referral and redirects to `/kurse`. Only paths
on this site are accepted: anything that is not a path starting with a single `/` goes to the
home page instead, so the link cannot be turned into an open redirect. The `go` link is not
throttled.

## Consent {#consent}

The referral cookie is written only with the visitor's consent. `consent.mode`:

| Mode | |
| --- | --- |
| `auto` (default) | Ask [Consent](/consent/) whether the visitor accepted the service `affiliates`. Without that addon, no cookie is written at all. |
| `always` | Write the cookie. Your site asks for consent some other way. |
| `never` | Never write a cookie. |

Without consent, and with `consent.session_fallback` on (the default), the referral is kept in
the session the visitor already has. That puts nothing new on their device, and a sale in the
same visit is still attributed. A later "yes" in the banner turns it into a cookie on the next
page view.

With Consent installed, add the service to `config/statamic-consent.php`. A service the
banner does not list is never accepted, and the addon then works on the session alone.

## The coupon

A partner can own coupon codes of [Offers](/offers/), entered on the partner's edit screen.
When a paid first payment carries one (`discount_code`, or `meta.coupon.code`), the sale is the
partner's, cookie or not. With `commissions.coupon_wins` on (the default) the coupon also beats
another partner's link on the same order.

A coupon code belongs to one partner per brand. The screen refuses a code another partner of
the brand already owns. Should two owners exist anyway (older data, a direct write), the sale
goes to nobody and the log says why. The partner screen flags codes that Offers does not know.

Nothing of Offers is read but the code on the payment, so the coupon only has to exist there.

## Renewals, follow-ups and plan switches

A subscription renewal and an accepted follow-up offer have neither a link nor a coupon of
their own. They inherit the referral of the payment they follow. A cookie the buyer carries
today does not re-attribute them.

A plan switch in Payments (the difference charge, marked `meta.subscription_change`) counts as
a renewal of the subscription's first payment and inherits its referral. It is never attributed
by the cookie the buyer carries at that moment.

## Brands

A payment attributes only to a partner of its own brand. Work triggered by a webhook runs in
the partner's brand, so that brand's settings apply. Link codes are unique across the whole
host, because the link does not say which brand it is for.

## Static caching {#static-caching}

With Statamic's full static caching (`strategy: full`) a cached page is served by the web
server without PHP, so `?ref=` on it never reaches the middleware. Two ways out:

- Hand out `/!/affiliates/go/{code}?to=/page` links. That route is always handled by PHP,
  notes the referral itself and then redirects to the plain page. The partner screen in the
  Control Panel shows this short link next to the normal one for that reason.
- Or add a web-server rule that bypasses the static cache for URLs carrying `ref=`.

The half-measure strategy runs PHP on every request and needs nothing.

## Clicks

With `tracking.count_clicks` on, a click is counted once per visit and partner, with the
landing path only: no IP address, no user agent. The partner's conversion rate is link sales
per click and never shows more than 100 %.
