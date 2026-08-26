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

## Disabled steps

A step can be switched off in the editor. A disabled step 404s on the front end and cannot
be advanced from, but stays on the canvas with its wiring intact.
