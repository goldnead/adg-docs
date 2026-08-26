# VAT, reverse charge, small business

<AddonHeader />

One class answers one question about one line: **which VAT rate applies, and why.**

Arithmetic only. No database, no network, no clock, no Statamic. Everything it knows comes
from the `tax` block of the config and from four facts about the line — which makes the
answer reproducible, and an invoice checkable against the reasoning stored on it.

```php
use Goldnead\Invoices\Support\TaxRules;

$result = TaxRules::for(
    productHandle: 'kurs',
    buyerCountry: 'AT',
    buyerVatId: 'ATU12345678',
    isDigital: true,
);
```

## It never guesses

When the config has no rule for a case, the result is **undetermined** — not 19%. A wrong
rate looks like an answer and therefore goes unnoticed; a missing one forces the question.

An undetermined line means **no invoice is written for that payment**. Nothing about the
payment changes; `invoices:pending` lists it and says why.

### Every way a line comes back undetermined

| Code | Means |
| --- | --- |
| `unknown_product_class` | The handle is not in `tax.product_classes` and there is no `default_product_class` |
| `missing_country` | The payment has no buyer country, and `assume_country_when_missing` is null |
| `invalid_country` | Something was stored that is not ISO 3166-1 alpha-2 |
| `vat_id_country_mismatch` | The VAT ID's country and the stated buyer country contradict each other |
| `exemption_without_reason` | An exemption is configured with no `reason` |
| `exemption_outside_domestic` | A domestic-only exemption met a recipient abroad |
| `no_zone_for_country` | No zone covers that country and there is no `'*'` placeholder |
| `no_rate_for_product_class` | The zone has no rate for that class, or one that is not an integer |
| `implausible_rate` | A rate outside 0 or 100–10000 basis points. `19` instead of `1900` |

A payment is checked **line by line** and all open lines are reported at once, so you look
once rather than seven times.

## The decision, in order

1. **§ 19 small business** — if on, it answers everything: no tax, on anything, with the
   reason on the invoice. It comes first because it suspends the rest.
2. **The product's tax class.** No class, no rate.
3. **The buyer's country.** A missing one is not a German one.
4. **The buyer's VAT ID**, if there is one.
5. **An exemption on the tax class.**
6. **B2B into another member state** → reverse charge (digital) or intra-community supply
   (goods).
7. **A third country** → outside scope (digital) or export (goods).
8. **Otherwise a rate out of the zone**, at the seller's own rate or the recipient's,
   depending on the OSS switch.

## Digital or physical

```php
// config/statamic-payments.php
'kurs' => ['name' => '…', 'amount_cent' => 9900, 'digital' => true],
```

**There is no default.** A product that does not say refuses the invoice
(`ProductIncomplete`).

The answer decides between four different mandatory statements:

| | digital | physical |
| --- | --- | --- |
| **B2B, another member state** | reverse charge | intra-community supply |
| **Third country** | not taxable here | export |

A `?? true` made a vinyl record a digital service and printed the wrong note. On a document
that cannot be corrected, guessing is not an option — so it refuses, like a missing country.

## The buyer's VAT ID

Read from `payment.meta['vat_id']`. Collecting it is your checkout's job; this addon reads
what is there.

Only the **format** is checked, per member state. That says nothing about whether the number
was ever issued, whether it is still valid, and whether it belongs to this buyer. Only a
confirmation request (VIES / BZSt) answers that, and it does not belong in a calculation
class: a tax calculation that depends on somebody else's server is one that fails at
checkout when their server is down.

Two behaviours worth knowing:

- **An unrecognised format is not undetermined.** The line is treated as B2C and tax is
  charged, with a note. Charging tax wrongly means owing it (§ 14c UStG) and being able to
  correct it; leaving it off wrongly leaves a hole.
- **A VAT ID whose country contradicts the stated buyer country is undetermined.** That is a
  contradiction in the input rather than a missing rule, and the class cannot tell which of
  the two facts is true, so it does not pick one.

Greece issues its VAT IDs with `EL` while its country code is `GR`. That alias is handled.

::: warning Reverse charge needs more than this addon does
The result carries the note itself: reverse charge needs a **confirmed** VAT ID, and the
turnover has to appear in the recapitulative statement (ZM). An intra-community supply needs
proof the goods arrived (Gelangensbestätigung); an export needs proof of export. None of
those are checked here.
:::

## Gross or net

```php
'prices_include_tax' => false,
```

Global, as in Cargo. It decides whether the amount on a line is split *out of* a gross
figure or added *on top of* a net one.

::: danger The default adds tax on top
`false` treats the stored amount as net. If your catalogue quotes gross prices to consumers
— the ordinary case — the invoice total will then be higher than what the buyer paid. Set it
to `true`.
:::

The split is done by the tax result, not by the writer, for two reasons: the writer once had
its own default for this and it contradicted the config, and the result rounds
**mirror-symmetrically** so a credit note gives back exactly the cent the original took.

## The printed line has to add up

An invoice line prints unit price, quantity, discount and net, and *unit × quantity −
discount* must equal that net. With ordinary rounding it does not: 3 × €10 gross printed
"3 × €8.40" above a net of €25.21.

So the unit price is rounded **up** and the remainder lands in the discount column, where it
is a stated number rather than an unexplained one. The buyer really did pay less than unit ×
quantity, and that is what the document then says.

## Per rate, not per invoice

§ 14 Abs. 4 Nr. 8 UStG wants the amount **broken down by tax rate**, with the tax on each. A
single net line above an invoice carrying 19% and 7% does not satisfy it — and that is the
normal case here, as soon as sheet music sits beside a course.

So the rate lives on the line, and the totals block repeats *Entgelt zu X %* and
*Umsatzsteuer X %* for each rate, in the order the rates first appear on the invoice. A
grand total is added only when there is more than one.

## The notes

One invoice can carry several: exempt tuition beside a course at 19%, or a reverse-charge
line beside a domestic one. Each reason appears **once**, in the order the lines do, and
none is dropped — a missing note on a reverse-charge or § 19 line is a mandatory statement,
not a stylistic matter.

The ordinary domestic case says nothing there. "Umsatzsteuer 19 %" is already in the table,
and repeating it below adds noise to the one place a reader looks for an exception.

Each note is stored as **text** on the invoice, together with the legal basis, because the
rule may be edited and the invoice may not.

## The small business scheme

```php
'small_business' => ['enabled' => true],
```

§ 19 UStG. No tax is shown on anything, whatever the product, the country or the VAT ID say,
and the reason goes on the invoice because German law wants the note.

It answers first and therefore also answers when nothing is configured for the product or
the country: there is nothing left to determine.

One case it flags rather than resolves: a **cross-border B2B** sale while the scheme is on.
§ 19 is a domestic rule and does not obviously override the place-of-supply shift. The result
carries a note saying to have a tax adviser confirm it.

## OSS

```php
'oss' => ['destination_taxation' => false],
```

Below €10,000 of annual turnover into other member states a B2C sale into the EU carries the
seller's own rate; above it, the recipient country's.

Which side you are on is a fact about your turnover across the current and previous calendar
year, into *all* other member states combined. A calculation class that ran that query would
stop being reproducible — its answer would depend on when you called it.

So it is a **switch**. Flip it when you register for OSS, and fill in the zones for the
countries you sell to, or those lines come back undetermined. Either way the choice is
recorded as a note on the result.

Anyone wanting the threshold decided automatically builds a separate service, evaluates it
at the moment of payment, stores its verdict on the payment, and feeds that in — not the
other way round.

## A missing country

```php
'assume_country_when_missing' => null,
```

Null means a payment with no country gets no invoice. Payments taken before
`statamic-payments` 1.9.0 have none, and "none" is not "Germany".

Setting a country here is available and is recorded as a note naming the assumption:
*the operator makes that assumption, not this class.* Set it only if you know every one of
those payments was domestic.
