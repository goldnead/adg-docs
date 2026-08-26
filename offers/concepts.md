# An offer is not a product

<AddonHeader />

| Term | Means |
| --- | --- |
| **Product** | A thing that exists and costs money. Lives in the [payment catalogue](/payments/catalogue). |
| **Offer** | That thing *presented*: a place, words, and a price that may be its own |
| **Slot** | Where an offer is allowed to appear |
| **Bump** | An offer carried by another offer as a checkbox at checkout |
| **Coupon** | A code somebody types to pay less |
| **Shown / accepted** | The two counters. Accepted means **paid** |

## Why the distinction earns a table

The same product is a €29 purchase on the sales page and a €12 upsell on the thank-you
page. One thing exists; two things are being offered.

Modelling that as two products would put the discounted price in the catalogue as a
first-class thing anybody can buy at any time, which is exactly what an upsell price must
not be. Modelling it as a parameter would put a price in a request, which is the one thing
the payment addon refuses.

So it is a row: a pointer at a product, a price of its own, and the words for this moment.

## What an offer holds

| Field | |
| --- | --- |
| `handle` | unique, lowercase, digits, `-` and `_`. What templates refer to |
| `name` | for you, in the Control Panel, and the fallback headline |
| `product` | a handle from `statamic-payments.products`. Validated against it, so it cannot point at nothing |
| `amount_cent` | its own price, in minor units. Null means "whatever the catalogue says" |
| `currency` | null means the product's, then the site default |
| `compare_at_cent` | what a buyer is told they would normally pay. **Display only** |
| `headline` · `body` · `image` · `button_label` | the words. `image` is a URL; the template decides whether and how it is used |
| `slot` | `bump` · `post_purchase` · `standalone` |
| `bumps` | a list of handles, in the order they were picked |
| `active` | |
| `shown_count` · `accepted_count` | |

**A compare-at price that could be charged would be the same mistake as a price in a
request.** It is never read by anything that computes a total.

## Slots

| Slot | In the CP | Means |
| --- | --- | --- |
| `bump` | At checkout | A checkbox during checkout, charged together with what the buyer came for |
| `post_purchase` | After the purchase | After a payment has gone through, charged on its own |
| `standalone` | Anywhere | Wherever a template asks for it |

A slot is a promise about context. A post-purchase offer shown at checkout would charge
twice for the same journey, which is why the list is fixed rather than free text, and why
only offers placed **At checkout** can be picked as bumps.

The slot does not enforce itself in a template — `{{ offers:show }}` will render whatever
handle you name. What it enforces is the bump list and what `{{ offers:slot }}` returns.

## Sellable

An offer is sellable when three things are true:

1. it is `active`,
2. it has a price — its own, or one the catalogue can supply,
3. **the product behind it still exists in the catalogue**.

The third is why an offer can stop working without anybody touching it: remove a product
from `config/statamic-payments.php` and every offer pointing at it goes quiet. The Offers
screen says *Not sellable: the product is not in the catalogue* rather than showing a price
that cannot be charged.

An offer that is not sellable resolves to nothing, which means a checkout for it returns
`null` and a tag yields `no_results`.

## Counting

Two integers on the row rather than a row per view: an offer on a busy page would write a
row per visitor, and nobody ever asks a question that needs them.

**Shown** is incremented by the tags, unless `count_impressions` is off.

**Accepted** is incremented on `PaymentPaid` — not on the click. An offer whose conversion
rate counts clicks flatters itself every time a card is declined, and a number nobody can
trust is worse than no number.

Every line of a paid payment is counted, so a bump the buyer ticked counts as accepted just
as much as the thing they came for.

## What an offer never is

- **A price in a request.** See [The price rule](/offers/price-rule).
- **A journey.** An offer knows a slot, not what comes before or after it.
- **A product.** Removing an offer removes a presentation. The thing is still sold.
