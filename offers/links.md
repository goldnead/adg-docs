# Links and QR codes

<AddonHeader />

Two kinds of link, both with a QR code generated on the server: a **coupon link** that arrives
with the code already filled in, and a **short link** per offer that changes its target when
the offer ends or sells out.

## Coupon links

Every coupon has links with its code in the address:

```text
https://example.com/workshop?coupon=CHOR20
```

- one to its **Link target page**, `link_url` on the coupon. Empty means the home page;
- plus one per offer the coupon applies to that has a [short link](#short-links).

The coupon panel shows each link with its QR code and a download as SVG or PNG.

<Figure
  src="offers-coupon-links-qr"
  alt="The coupon form with the target page /workshop and two prefilled links, each with a QR code and SVG and PNG downloads"
  caption="One coupon, two links: its own target page and the short link of the offer it applies to." />

**A link only prefills.** The code is redeemed in the basket against the same table as a typed
one, so an expired or exhausted code arriving through a link is worth what a typed one is
worth: nothing. A checkout reads it with

```php
$coupon = \Goldnead\StatamicOffers\Offers::couponFromRequest($request, $offer);
```

which returns the live coupon or `null`, and logs why an expired, exhausted, unknown or foreign
code was ignored instead of failing the page. A printed flyer with an old code opens the page
without the discount rather than an error.

The parameter is `coupon`, set in `coupon_link.parameter` and read everywhere through
`Offers::couponParameter()`. A checkout built on [Funnels](/funnels/) asks that method too, so
renaming it renames it on both sides. **Every link already printed with the old name then leads to the
page without the discount.**

## Short links

An offer may have a short link:

```text
https://example.com/go/herbst-workshop
```

It leads to **Target** while the offer runs and to **Target afterwards** (a waiting list, the
full-price page) once it switches. It switches

- when the date in **Switch on** passes: the link's own date, else the offer's
  `available_until`;
- or, when **Switch once sold out** is on (the default), once the quantity limit is sold.

Without a second target it stays on the first. A 404 on a printed flyer is worse than a page
that says "sold out".

<Figure
  src="offers-short-link"
  alt="The short link section of the offer form: target afterwards, switch date, the sold-out switch, and the link with its QR code, where it leads right now and the visits per target"
  caption="The panel says where the link leads right now and how often each target was visited." />

Four things it does deliberately:

- **302, never 301.** A browser that cached a permanent redirect would keep sending people to
  the old target after the switch.
- **The query string travels along**, so a coupon link through the short link keeps its code
  and a `utm_source` survives. A parameter the target already carries wins: the operator
  wrote it there.
- **Visits are counted per target**, in two counters on the offer, shown in the panel.
- **Not narrowed by brand.** A flyer knows no brand. The slug is unique across all brands, and
  the only thing the route reveals is the target somebody entered for it.

The slug is lowercase letters, digits and `-`, up to 64 characters, and unique. A target is a
path starting with `/` or a full `http(s)://` address. The route answers 404 for an unknown
slug or an offer without a target, and is throttled at 120 requests a minute.

The path before the slug is `links.prefix`, by default `go`. It must not equal a page path of
your site, because the route would take it. `links.base_url` is the address printed in links
and QR codes; empty means `app.url`. Set it when the Control Panel runs under a different
address than the site that should be on the flyer.

## QR codes

Generated on the server, with no external service: the encoder is `bacon/bacon-qr-code`, which
Statamic already ships, and the PNG is written without GD or Imagick.

The downloads sit behind the Control Panel, under the permission of the screen they belong to,
and only for links the offer or coupon already has. There is no free QR generator behind the
Control Panel.

| Route | Permission |
| --- | --- |
| `utilities/offers/{offer}/qr.{svg\|png}` | `access offers utility` |
| `utilities/coupons/{coupon}/qr.{svg\|png}?link=…` | `access coupons utility`; `link` names one of the coupon's own links, default `page` |
