# Bumps and follow-up offers

<AddonHeader />

Two different things, and the difference is *when the money moves*.

|  | Order bump | Follow-up offer |
| --- | --- | --- |
| When | at checkout, before paying | after the payment has gone through |
| How | a second line on the same payment | a **second payment**, charged against the stored mandate |
| Needs | nothing | `follow_up.enabled`, `collect_mandate`, and a mandate on the first payment |
| Off by default | no | **yes** |

<Figure
  src="payments-follow-up-offer"
  alt="A follow-up offer presented after a completed payment"
  caption="A follow-up offer is a second payment, not an edit to the first." />

## Order bumps

A checkbox at checkout that adds a second item. It is one payment with two lines, because
modelling it as a second payment would be a lie about what the buyer did and would charge
them twice.

```php
app(Checkout::class)->start(['noten-paket', 'uebungsblaetter'], $buyer);
app(Checkout::class)->start(['noten-paket' => 1, 'uebungsblaetter' => 3], $buyer);
```

The first handle is the `primary` line; the rest are `bump`. **All or none** — a handle
that is not in the catalogue refuses the whole checkout. See
[Starting a checkout](/payments/checkout#all-or-none).

That is the whole mechanism on this side. Which bumps a given offer carries, in which order,
and whether a ticked box is one the page was allowed to offer at all, is
[Offers](/offers/bumps): the list on the offer is the authority, not the form the buyer
sees.

## Follow-up offers

An offer shown *after* a payment, charged without asking for card details a second time.

**Off by default, and that is not caution about the code.** The technical part is small;
the part that decides whether you may ship it is not.

### What is actually saved

The card details. **Not the consent.**

In Germany an order placed online needs its own button, labelled unambiguously, with the
essential details directly above it — the *Button-Lösung*, § 312j Abs. 3 BGB. That applies
to a follow-up offer exactly as it applies to a checkout. There is no "one click" exemption
for a second purchase.

So the flow this addon supports is:

1. The buyer pays for the first thing. The checkout tells them, in plain words, that their
   payment method will be remembered so they can be offered more.
2. On the thank-you page they see one more offer, with price, VAT note, what they get and
   when — **directly above** a button that says *„Zahlungspflichtig bestellen"*.
3. They click it. A normal form post, with a CSRF token, like any other order.
4. The charge happens without them typing a card number.

Step 3 is not optional and cannot be skipped by this addon. Everything the addon does is to
make step 4 possible.

### Switching it on

```php
// config/statamic-payments.php
'follow_up' => [
    'enabled' => true,
    'collect_mandate' => true,
],
```

Both. `collect_mandate` is what makes the first payment ask the provider to remember the
buyer; without it there is nothing to charge against later.

### In a template

```antlers
{{ payments:offer payment="{payment_id}" product="begleit-cd" }}
  {{ if no_results }}
    {{# Nothing to offer: not eligible, or already taken. #}}
  {{ else }}
    <form method="POST" action="{{ action }}">
        {{ csrf_field }}
        <input type="hidden" name="payment" value="{{ payment_id }}">
        <input type="hidden" name="product" value="{{ product }}">

        <h2>{{ name }}</h2>
        <p>{{ amount }} {{ currency }} inkl. MwSt. Sofort verfügbar.</p>

        <label>
            <input type="checkbox" name="confirmed" value="1" required>
            Ich bestelle kostenpflichtig und stimme zu, dass die Lieferung sofort
            beginnt. Damit erlischt mein Widerrufsrecht.
        </label>

        <button type="submit">Zahlungspflichtig bestellen</button>
    </form>
  {{ /if }}
{{ /payments:offer }}
```

The tag yields these variables:

| Variable | |
| --- | --- |
| `payment_id` | the original payment |
| `product` | the handle to buy |
| `name` | the product's name |
| `amount` | formatted with a comma and a thousands dot, German style |
| `amount_cent` | the integer, if you would rather format it yourself |
| `currency` | |
| `action` | the accept endpoint |

::: danger `{{ if no_results }} … {{ else }}` is not optional
Like every Statamic tag pair, this one parses its block once even when there is nothing to
yield. Markup written outside that branch is printed anyway — and here that would be an
order button for an offer that is not on the table, or one that has already been taken.
:::

The tag yields **nothing at all** unless the offer may actually be made: follow-ups
switched on, this payment paid, and a stored mandate behind it. A page that showed the offer
and then failed at the till would be worse than a page that never showed it.

### What the page must carry

The tag hands over the values; the template prints them. Deliberately — a button generated
by a package is exactly the thing nobody reads before shipping.

- The product name, and what the buyer gets
- The total price, gross, in the currency they are charged
- A VAT note, if you show net prices anywhere else
- Delivery or access timing
- A link to your terms and to your right-of-withdrawal notice
- For digital goods delivered immediately: the buyer's explicit agreement that delivery
  begins at once **and** their acknowledgement that this ends the right of withdrawal
  (§ 356 Abs. 5 BGB)
- A button labelled `Zahlungspflichtig bestellen`, or another wording that is just as
  unambiguous — "Weiter" and "Jetzt sichern" are not

**This is not legal advice.** It is the list of things that came up when this feature was
designed. Twenty minutes of a lawyer's time on the wording is cheaper than the alternative.

### What happens after the click

A second payment row, linked to the first through `parent_payment_id`, with its line marked
`upsell`. Its status is **whatever the provider says** — usually `pending` at first, because
a recurring charge is accepted now and settled later.

It is not marked paid, and nothing is fulfilled, until the webhook says so. Same rule as at
checkout: only the provider decides whether money moved.

**The offer disappears once it has been taken.** A second click, a double submit, a reloaded
confirmation: all of them would otherwise be a second charge for the same thing. A
*refused* charge does not count as taken — the buyer got nothing, so the offer comes back.

The endpoint is `POST /!/statamic-payments/offer`, throttled to 10 a minute, and it **keeps
CSRF**: the caller is a browser, a person and an order. Dropping it would let a page on
another site place an order on this one. It validates `payment`, `product` and an
`accepted` checkbox called `confirmed` — that checkbox is the record that the person
clicked something labelled as an order.

### What this is not

A funnel. There is no notion of steps, conditions, downsells, or what to offer next. This is
one offer, on one page, charged once. Sequencing belongs above this seam.
