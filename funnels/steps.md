# The five kinds of step

<AddonHeader />

| Step | Handle | What it is | Ways out |
| --- | --- | --- | --- |
| **Entry** | `entry` | The first page. Lives under the funnel's own URL. | one |
| **Form** | `capture` | A page that asks who this is. | one (`submitted`) |
| **Page** | `page` | A plain page: a thank-you, an explanation, a delivery notice. | one |
| **Offer** | `offer` | Where money can change hands. | **two**: `accepted`, `declined` |
| **Finish** | `finish` | The end. Marks the visit complete. | none |

Deliberately few. A funnel that needs a dozen node types is an automation wearing a
costume; this is a path with pages on it, and the shape of the path is the product.

All five are pages a visitor stands on, so all five have a URL and all five carry the
shared page fields below.

<Figure
  src="funnels-offer-step"
  alt="An Offer step selected, showing the offer picker, the deadline fields and the accepted and declined outputs"
  caption="An offer step has two ways out. Declining is an answer, and it needs somewhere to go." />

## Fields every step has

| Field | Type | What it does |
| --- | --- | --- |
| `label` | text | The name on the card. The slug is derived from it, **once**. |
| `entry` | entry picker | A Statamic entry. Then that entry *is* the page. Beats the two fields below. |
| `template` | text | Your own Antlers template. Empty uses the shipped one. |
| `headline` | text | Shown by the shipped template. |
| `body` | textarea | Shown by the shipped template, through the `markdown` modifier. |
| `split_share` | text | A whole percentage for version B. Empty or 0 means no test. |
| `variant_entry`, `variant_headline`, `variant_body` | | What version B changes. |

The entry picker only offers **published entries in collections that have a route**. A
step pointing at a routeless entry would render, but nothing about it would be a page.

`entry`, `template`, `headline` and `body` are three ways to say what the page is, in that
order of precedence. See [Landing pages from entries](/funnels/landing-pages), and
[Deadlines and split tests](/funnels/deadlines-and-tests) for the four `split_*` and
`variant_*` fields.

## Entry

One per funnel, because a path has one beginning. The editor treats it as a **unique**
kind: it cannot be duplicated, and its menu offers *Replace* rather than *Delete* —
deleting the only entry point would leave a funnel nobody can walk into.

It is also the only step whose URL is the funnel's own:

```
/f/{funnel}            the entry step
/f/{funnel}/{slug}     every other step
```

A visitor should not have to know they are in a funnel to be in one.

A funnel with no entry step answers 404. So does a funnel that is not live.

## Form

The step that asks who this is. It carries one extra field:

| Field | Type | What it does |
| --- | --- | --- |
| `form` | form picker | A Statamic form. Handed to the template as `funnel:form`. |
| `billing` | select | What the invoice needs: `minimal` (email only), `name`, `full` (name and address, required above 250 €), or `offer` — the fields the next offer step asks for, from the field library in `statamic-offers`. |
| `newsletter` | select | `hidden`, or `optional`: an unticked box under the email field. There is no pre-ticked option. |
| `newsletter_label` | text | The sentence beside the box. Recorded on the visit with the tick. |

**Purchase and newsletter are two facts.** The address becomes a contact; only the ticked box
is consent, and only that is handed to LeadHub as consent. A purchase tags the contact
`kunde` and grants nothing else.

**Fields from the offer.** With `billing: offer` the step searches the graph forward for the
next offer step, asks it which checkout fields it wants (`Offer::checkoutFields()`) and takes
labels, types, options and `required` from `Offers::fieldLibrary()`. The values land in
`visit.meta['billing']` under their own keys. Without the library, or without an offer
behind the step, the step asks for the email only and says so in the log.

This addon never grew a form system of its own. A site already has forms, with fields,
validation and notifications; a funnel that grew its own would be a second, worse copy of
all of it.

What the **advance route** requires when leaving a form step is narrow and fixed:

| Posted field | Rule |
| --- | --- |
| `email` | required, a valid address, max 191 |
| `name` | optional, max 191 |

Both are written onto the walk, and [`FunnelFormSubmitted`](/funnels/reference#events) is
dispatched with them before the walk moves on — so a sibling that wants the contact gets
it whether or not there is a next step. That is also the event the optional
[LeadHub bridge](/funnels/configuration#integrations) listens for.

The shipped template renders a plain name and email form posting to the advance route. A
template of your own is free to render `funnel:form` however the site renders forms, as
long as what finally reaches `funnel:action` carries an `email`.

## Page

Nothing but the shared fields. A thank-you, an explanation, a delivery notice, a page that
sets something up before the offer. Leaving it records `submitted` and follows the single
`default` output.

## Offer

| Field | Type | What it does |
| --- | --- | --- |
| `offer` | offer picker | From [Offers](/offers/). The price comes from there, never from the page. |
| `countdown` | select | `none`, `fixed` or `rolling`. |
| `countdown_until` | text | For a fixed deadline. Any date the server can read. |
| `countdown_hours` | text | For a rolling window, per visitor. |

**Two ways out, and both are ordinary.** Most visitors decline. A funnel whose `declined`
branch leads nowhere gives up on most of its visitors, so the canvas draws both handles
and the editor nags about neither.

What the advance route does with each:

- **`accept=0`** — records `declined`, follows the `declined` edge. It keeps working after
  the deadline has passed: a closed offer is not a closed funnel, and somebody standing on
  an expired page must be able to move on rather than being stuck.
- **`accept=1`** — checks the deadline, requires the order confirmation checkbox
  (`confirmed`), settles the basket, and starts a payment. `accepted` is recorded when the
  payment is paid, not here.

The order button carries its own wording and its own confirmation, because saving the card
details does not save the consent.

### Bumps and coupons

An offer can carry other offers as tick-boxes beside the order button, and the page can
take a coupon code. Both are settled on the server:

- **Only bumps the offer lists can be ticked.** The form says which boxes were checked;
  the offer says which boxes exist, and only the intersection is bought. A bump switched
  off simply stops appearing.
- **A coupon code is a string from the browser**; what it is worth is looked up. No amount
  ever comes from a request.

Set [`coupons => false`](/funnels/configuration#coupons) to leave the field off the page
entirely.

### A second purchase in the same walk

If the walk has already paid once and the site collects mandates, the second offer is
charged against what the first payment left behind, and the buyer types nothing.

The consent is not skipped: a follow-up order still needs its own unambiguously labelled
button. See
[Bumps and follow-up offers](/payments/bumps) in the payments addon.

A second submit on the same step — a double click, a reloaded confirmation, an impatient
visitor — does not start a second payment. The step remembers which payment it started,
and either waits for it or moves on if it has already been paid. A **failed** payment is
not remembered: they got nothing, so they may try again.

## Account

The page after the purchase: the visit's email read-only, a name, a password (min. 8,
repeated). Creates the Statamic user or updates the one with that address — never a
duplicate — logs them in and carries on. *Later* carries on without an account.

| Field | Type | What it does |
| --- | --- | --- |
| `optional` | select | Whether *Later* is offered. Default yes: a mandatory account is an abandoned checkout after the checkout. |
| `login_after` | select | Whether the visitor is logged in once the account exists. Default yes. |

The address is the visit's, never the form's. A browser that never reached the step gets a
403 like on every other step; a visit without an address gets an error, not a guessed
account. No mail is sent from here — the access mail is the site's.

## Finish

The end of the walk. Reaching it sets `completed_at`, records `completed` and fires
[`FunnelCompleted`](/funnels/reference#events).

| Field | Type | What it does |
| --- | --- | --- |
| `redirect` | text | Where to send them instead of showing this page. Empty shows the page. |

Nothing leaves a Finish step: it declares no outputs, so the canvas draws no handle under
it.

Reaching the end *is* the end. Waiting for a form submit on a page that has no form was a
real bug: `completed_at` was never set in the ordinary path, `FunnelCompleted` never
fired, and `{{ funnels:progress }}` sent people back to the thank-you page for ever.

## Mail nodes

A mail is drawn on the canvas but is **not a step**: it hangs off another step's output and
the visitor never enters it. One rule: **the mail goes out when the visitor takes the output
it hangs off** — `default` is *continue* on an entry or page and *submitted* on a form,
`accepted` is *paid* (when the webhook says so), `declined` is *declined*. The Finish step has
no output; "the walk is complete" is the output that leads to it, and that is where a
completion mail goes.

| Field | Type | What it does |
| --- | --- | --- |
| `template` | select | A published `et_templates` entry from `statamic-email-templates`. |
| `delay_amount`, `delay_unit` | integer, select | A queue delay in minutes, hours or days. The site's queue has to run. |
| `recipient` | select | `visitor` (the address from the form step) or `fixed`. |
| `recipient_address` | text | For `fixed`: an internal inbox, for instance. |
| `subject_override` | text | Empty uses the template's subject. Placeholders work here too. |

Placeholders come from the walk: `{{ visitor.name }}`, `{{ visitor.email }}`,
`{{ contact.salutation }}`, `{{ funnel.title }}`, `{{ funnel.continue_url }}`,
`{{ step.label }}` and, after a paid purchase, `{{ order.total }}`, `{{ order.reference }}`,
`{{ order.lines }}`. `sender.*`, `date` and `unsubscribe_url` are the same as in every other
template of the family.

**Once per visit and node**, enforced by a unique index on `funnel_mail_deliveries`. Every mail
leaves a row: triggered, delivered, or failed with a reason (no template, no recipient yet,
templates addon missing). The editor shows the three numbers on the node, and the preview's
stepper lists the mail right behind its step and shows the rendered mail with sample data.

The delay is Laravel's own `dispatch()->delay()`, not the automations engine: one queue in
the house, no second scheduler, and a funnel with a mail on it works without
`statamic-automations`. A multi-step sequence over days remains an automation.

## Disabled steps

A step can be switched off in the editor. A disabled step 404s on the front end and cannot
be advanced from, but stays on the canvas with its wiring intact.
