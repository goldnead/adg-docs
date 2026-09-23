# Tracking code and the Meta pixel

<AddonHeader />

Per funnel, under **Settings → Tracking** in the editor:

| Slot | Printed |
| --- | --- |
| Head code | before `</head>` on every page of the funnel |
| Purchase code | once per paid purchase, on the page after it. Placeholders `{amount}`, `{currency}`, `{order_id}`. |
| Meta pixel ID | the pixel, with PageView, InitiateCheckout and Purchase |

A checkout step can carry a purchase code of its own (`tracking_purchase`, in the step's
inspector). The code goes into the finished response, before `</head>` and `</body>`, so it also
works on steps that show an entry. Nothing is printed in the preview.

<Figure
  src="funnels-tracking-settings"
  alt="The funnel settings stack, Tracking panel in German: a note that every script starts only once the service meta_pixel is allowed, the head code field, its consent service, the purchase code field with the placeholders, its consent service, and the Meta pixel ID"
  caption="Tracking in a funnel's settings. Each slot names the consent service that releases it." />

## Only with consent

With [Consent](/consent/) installed, every script is parked as
`type="text/plain" data-consent-service="<service>"` and starts once the visitor allows that
service. `<noscript>` and every element that is not a script are dropped, because they would load
without consent.

Each slot names its own service. Empty means
[`tracking.consent_service`](/funnels/configuration), `meta_pixel` by default. The service has
to exist in `config/statamic-consent.php`; the editor warns when it does not, and a service the
banner never offers keeps the code blocked for good.

The shipped step template is a whole document, with `<head>` and a viewport, and includes
`{{ consent:head }}` and `{{ consent:banner }}` when Consent is installed, so parked scripts can
actually start. **A template of your own has to include both itself.**

Without Consent, `tracking.without_consent_addon` decides: `block` (the default) prints nothing,
`render` prints the code as it is, for a site whose own banner controls it.

::: warning Whether you may track is not this addon's call
The addon makes sure nothing runs before the visitor said yes to the service you named. Which
service a pixel belongs under, what the banner says about it, and whether your privacy policy
covers it is for you and whoever advises you on data protection.
:::

## Who may edit it

Tracking code is raw JavaScript on the site's pages. Changing it, the pixel ID and the services
needs the permission **Edit tracking code** (`edit funnels tracking code`). Without it the
fields are read-only, and the server refuses a change even when the request is sent by hand.
Building funnels does not include it.

It is the one thing on a funnel page that is printed unescaped. Everything else is escaped;
see [The checkout step → Escaping](/funnels/checkout#escaping).

## Meta Conversions API

With `FUNNELS_META_CAPI_TOKEN` set, PageView (on every page), InitiateCheckout (on ordering) and
Purchase also go to Meta from the server, **with the same event ID as the pixel**, so Meta can
count each once.

- **Queued.** The server events are a queued job, so they need a queue worker.
- **Purchase comes from the webhook.** It is sent on Payments' `PaymentPaid`, so a buyer who
  closes the tab still counts. An earlier purchase of the same walk is found through
  `meta.funnel_visit_id` on the payment.
- **Only with consent.** The webhook has no browser, so the purchase uses the consent recorded on
  the visit.
- **`user_data` is an allow-list**: the hashed email address, and the IP address, the browser
  and the `_fbp`/`_fbc` cookies only with consent.
- `FUNNELS_META_TEST_EVENT_CODE` sends to the Events Manager's test view. Remove it after
  testing.

::: danger Not tested against a real Meta account
The Conversions API is covered by tests with faked responses only. It has not been run against a
real Meta pixel. A request Meta accepts is not proof that the counting works: send a test event
and check in the Events Manager that it shows up **as one event**, not two.
:::
