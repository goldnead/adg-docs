# The checkout step

<AddonHeader />

An offer step is the checkout: the offer, its pricing options, the bumps, the coupon field, the
withdrawal wording and the order button. Everything a buyer picks there is settled again on the
server. The page only shows it.

<Figure
  src="funnels-checkout-bumps-country-coupon"
  alt="A checkout step: the workshop at 49,00 EUR, two pricing options, a bump for the sheet music as PDF, a country select, the coupon field filled with SUITE10, the withdrawal wording, the consent box and the order button"
  caption="A checkout step in the playground with two pricing options, a bump, the country question and a coupon from the link. The texts address the buyer formally." />

::: tip What needs which version
Funnels 1.17 requires [Offers](/offers/) 1.12 and [Payments](/payments/) 1.25, so
everything on this page is available once it is installed. The coupon from a link, pay what
you want, the country question and coupon terms come from Offers; the captcha, the reminder
consent and a funnel-wide coupon on a one-click upsell from Payments.
:::

## Bump rules

A checkout step decides, per bump of its offer, when that bump shows. In the editor:
inspector → **Bump rules**.

| Rule | What it does |
| --- | --- |
| Only with these pricing options | The bump belongs to some pricing options only. With any other one it is hidden and unticked. |
| Only together with | The bump shows once another bump is ticked. |
| Preselected | The box starts ticked, and is ticked again when it reappears. |
| Returning customers | *Show to everyone*, *hide from returning customers*, or *only returning customers*. Returning means a paid purchase under the same address outside this walk. The address comes from the form step or the signed-in account. |

The page draws the rules as `data-funnel-bump-*` attributes, and `funnels.js` shows and hides
the boxes as the buyer picks. **The server applies the same rules to the order**: a box a rule
forbids buys nothing, whatever the form says.

After a refused coupon the page comes back with the chosen pricing option, bumps, country and
code still set, and the bumps are the ones for that pricing option.

## A coupon from the link

`?coupon=CODE` on the funnel's address fills the code field. The parameter's name is Offers'
`coupon_link.parameter`. The link usually points at the funnel's entry, so the code is
remembered on the walk until the checkout.

- **Filled in is not redeemed.** An unknown or expired code in a link fills nothing and breaks
  nothing.
- **A code the buyer types that does not apply** (unknown, expired, used up, not for this offer)
  refuses the order, with the reason at the code field. The order is never charged at the full
  price instead. An empty field orders at the regular price.
- **Funnel-wide codes.** A code marked *funnel-wide* in Offers is carried to the later checkouts
  of the walk, and with Payments 1.25 it also applies to a one-click upsell. A refused or failing
  one-click gives the coupon's use back before the checkout takes over.
- **Coupon terms for follow-up payments.** A coupon that runs for more than the first payment of
  a subscription travels as `meta.coupon` on the first payment, frozen. Payments reads it when it
  creates the subscription.
- If the provider refuses the payment, the code's use is given back.

`coupons: false` in the [configuration](/funnels/configuration) leaves the field off every
offer page.

## Pay what you want

For an offer with [pay what you want](/offers/pay-what-you-want), the checkout shows an amount
field with the offer's floor, suggestion and ceiling. The amount is checked on the server, and
an amount below the floor is refused at the field, with the amount typed kept in it. A template
of your own without the field orders at the suggestion, never at zero.

The thank-you page shows the offer's thank-you line for the amount paid:
`{{ funnel:order:thanks }}`.

## The country question

An offer sold only in some countries, or everywhere except some
([Offers → Countries](/offers/setup-fee)), makes the checkout ask for the country, unless the
form step already did. A country outside the rule is refused with the offer's own sentence.

A billing field with the key `country` is always validated as a two-letter country code,
whatever type the field library gives it, so "12" is refused in the form rather than failing
when the payment is created.

## Captcha and the reminder consent

Both come from [Payments](/payments/) 1.25.

- **Captcha.** With `statamic-payments.protection.captcha` on, Payments refuses every checkout
  without a token. The shipped checkout renders the widget; a template of your own uses
  `{{ funnel:captcha }}`. A checkout refused at the door says why: confirm the captcha, too many
  attempts, or a general sentence for the block list. Which list matched stays unsaid. The
  sentence is Payments' own (`Checkout::refusal()`).
- **Reminders on abandonment.** When Payments sends them and wants consent
  (`abandoned.capture = consent`), the checkout shows its own tick box, never pre-ticked and
  separate from the order consent. Ticked, it travels as `meta.reminder_consent`, with the time
  and the wording, on the payment. A box a template sends without the page asking does not count.
- **An expiring thank-you link.** Payments wraps the funnel's return address in its signed link
  when `thanks.expires_minutes` is set. The funnel's own thank-you step keeps working behind it,
  because it reads the purchase from the walk, not from the link.

## Formal address

Every text the checkout shows the buyer addresses them formally, with "Sie", like the rest of
the suite. That covers the shipped labels, the error sentences and the in-app notice. Texts you
write into a step are yours.

## What the page prints, and what it escapes {#escaping}

::: warning Behaviour change in 1.17: HTML in a headline or text is shown as text
The shipped template escapes the headline, the text, offer and bump texts, labels, the
button label, prices, the withdrawal wording, and every value a visitor typed that is put back
into a field. A funnel that put HTML into a headline or a text field now shows the tags
literally. Use Markdown instead.
:::

Markdown from the Control Panel is rendered by the modifier `funnels_markdown`: CommonMark with
raw HTML escaped and unsafe links refused. `[x](javascript:…)` is not a link; quotes (`>`) and
autolinks (`<https://…>`) work.

The only thing the page prints unescaped is the [tracking code](/funnels/tracking), which is
why editing it needs a permission of its own.

A template of your own is yours to escape. Use `funnels_markdown` for text from the Control
Panel rather than printing it raw.

## Errors at the checkout

- A form step that did not validate shows its errors above the form.
- A provider failure at checkout gives the buyer the checkout back with a sentence, and the
  reason is logged. It no longer ends on an error page.
- On a multi-brand install the checkout renders under the brand of the offer, so the withdrawal
  wording on the page is the one the order is checked against.
