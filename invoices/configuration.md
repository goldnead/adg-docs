# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=invoices-config
```

Everything lives in `config/invoices.php`. There is no Control Panel screen: a tax rule that
can be changed by whoever can log in is a tax rule that can be changed by whoever can log in.

## The top level

| Key | Default | |
| --- | --- | --- |
| `auto_issue` | `true` | An invoice on every paid payment, a credit note on every full refund |
| `number.prefix` | `RE` | |
| `number.period` | `Y-m` | A date format. `Y` yearly, `''` never restarts |
| `number.separator` | `-` | |
| `number.pad` | `3` | `RE2026-08-001` |
| `number.prefix_per_brand` | `[]` | Brand id → its own prefix |
| `seller` | env-backed, empty | Frozen onto every invoice |
| `seller_per_brand` | `[]` | Merged over `seller` for that brand |
| `small_amount_cent` | `25000` | Where a Kleinbetragsrechnung ends |
| `tax.*` | see below | |

## The number series

```php
'number' => [
    'prefix' => 'RE',
    'period' => 'Y-m',
    'separator' => '-',
    'pad' => 3,
    'prefix_per_brand' => [3 => 'CW', 4 => 'HM'],
],
```

`period` decides how often the series restarts. Changing the format later **renumbers
nothing**: the resolved series is stored on the counter, so an old invoice stays in the
series it was issued in.

`prefix_per_brand` is not optional on a multi-brand installation — see
[The number](/invoices/numbering#one-series-per-brand).

## Who is sending

```php
'seller' => [
    'name' => env('INVOICES_SELLER_NAME'),
    'address' => env('INVOICES_SELLER_ADDRESS'),
    'vat_id' => env('INVOICES_SELLER_VAT_ID'),
    'tax_number' => env('INVOICES_SELLER_TAX_NUMBER'),
    'email' => env('INVOICES_SELLER_EMAIL'),
    'iban' => env('INVOICES_SELLER_IBAN'),
],

'seller_per_brand' => [
    3 => ['name' => 'Chorwerk', 'vat_id' => 'DE987654321'],
],
```

`seller_per_brand` is merged **over** `seller`, so a brand only states what differs.

`name` and `address` are checked before anything is written; a missing one refuses the
invoice rather than producing a document that is not one.

## Where a small-amount invoice ends

```php
'small_amount_cent' => 25000,
```

Below this gross amount, § 33 UStDV allows a *Kleinbetragsrechnung*: no recipient name and
address. That is the ordinary case for a digital product bought by an email address and
nothing else, and demanding an address there would refuse invoices the law is perfectly
happy with.

Above it, § 14 UStG wants both, and the addon refuses to write the document without them.
The recipient's address is read from `payment.meta['address']`; the name from
`payment.name`.

## Tax

The whole block is handed to one class that reads it and calculates. No database, no
network, no clock — so the same inputs give the same answer in two years, and an invoice can
be checked against the reasoning stored on it.

::: warning An unknown key throws
`TaxRules` refuses a key it does not know, and refuses a stray sub-key inside
`small_business` and `oss`. A misspelt key would quietly leave its default in place — and a
default is exactly what this class exists not to fall back on.
:::

### The switches

```php
'tax' => [
    'small_business' => ['enabled' => false],   // § 19 UStG
    'merchant_country' => 'DE',
    'merchant_vat_id' => env('INVOICES_SELLER_VAT_ID'),
    'prices_include_tax' => false,
    'assume_country_when_missing' => null,
    'oss' => ['destination_taxation' => false],
],
```

| Key | |
| --- | --- |
| `small_business` | § 19 UStG. Suspends everything below it: no tax is shown on anything, and the reason goes on the invoice |
| `merchant_country` | Where the seller sits. Decides what counts as domestic, EU and export |
| `merchant_vat_id` | Needed on the document for reverse charge, § 14a UStG |
| `prices_include_tax` | **Are the amounts on your products gross or net?** Global, as in Cargo |
| `assume_country_when_missing` | Null means a payment with no country gets no invoice. Set a country here **only** if you know every such payment was domestic — it is your assumption, not the calculation's, and it is recorded as a note on the result |
| `oss.destination_taxation` | Flip it when you register for OSS. The 10,000 € threshold itself is not calculated |

::: danger `prices_include_tax` is the one to get right first
The default is `false`, which means the stored amount is treated as **net** and tax is added
on top. The invoice total is then higher than what the buyer paid.

A consumer-facing shop quotes gross prices. Set it to `true`, or every invoice will disagree
with its payment.
:::

### Product classes

```php
'product_classes' => [
    'cw-kurs' => 'standard',
    'chorwerk-noten' => 'reduced',
    'einzelunterricht' => 'teaching',
],
'default_product_class' => null,
```

The key is the **product's handle**. A handle that is not listed has no class, and no class
means no rate — the line comes back undetermined and no invoice is written.

`default_product_class` is null on purpose: it makes an unconfigured product visible instead
of silently taxing it. Set it once you are sure every product you sell belongs in the same
class.

### Zones and rates

```php
'zones' => [
    'de' => [
        'countries' => ['DE'],
        'rates' => ['standard' => 1900, 'reduced' => 700],
    ],
    'at' => ['countries' => ['AT'], 'rates' => ['standard' => 2000, 'reduced' => 1000]],
    'rest' => ['countries' => ['*'], 'rates' => ['standard' => 1900, 'reduced' => 700]],
],
```

**Rates are basis points.** `1900` is 19%, `700` is 7%, `0` is zero-rated. `19` is the typo
everybody makes, and left alone it would print "Umsatzsteuer 0,19 %" and charge 19 cents on
a hundred euros — so a value between 1 and 99 is refused as implausible.

`'*'` is the placeholder for every country not named. An explicitly named country always
beats it. **Zones do not stack**: the most specific match wins, because a compound rate is
not a thing EU VAT has.

Only Germany ships filled in. Foreign rates change, and a stale one here is worse than a
missing one.

### Exemptions

```php
'exemptions' => [
    'teaching' => [
        'reason' => 'Steuerfrei nach § 4 Nr. 20 Buchst. a UStG.',
        'legal_basis' => '§ 4 Nr. 20 Buchst. a UStG',
        'domestic_only' => true,
    ],
],
```

A tax class that is exempt rather than rated. **An exemption without a `reason` is refused**
— § 14 Abs. 4 Nr. 8 UStG wants the exemption stated on the invoice, and one without a stated
ground is unusable.

`domestic_only` defaults to `true`: the exemption is a German rule and is not applied to a
supply whose place is abroad. Whether it holds there is a question of foreign law, and this
addon does not answer it.

### The sentences

```php
'texts' => [
    'small_business' => 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.',
    'reverse_charge' => 'Steuerschuldnerschaft des Leistungsempfängers.',
    'intra_community_supply' => 'Steuerfreie innergemeinschaftliche Lieferung.',
    'export' => 'Steuerfreie Ausfuhrlieferung.',
    'outside_scope' => 'Nicht im Inland steuerbar; der Leistungsort liegt im Land des Empfängers.',
    'zero_rate' => 'Kein Umsatzsteuerausweis.',
],
'legal_bases' => [ /* … */ ],
```

German, because the invoice is. The wording is yours together with your tax adviser; these
are the customary formulations, and § 14a Abs. 5 UStG prescribes the phrase
*Steuerschuldnerschaft des Leistungsempfängers* for reverse charge.

The chosen sentence is **copied onto the invoice as text**, not referenced. The rule may be
edited; the invoice may not.

`legal_bases` is stored alongside each decision so an audit can follow it years later.

### EU member states

`tax.eu_member_states` overrides the built-in list, which is law rather than taste and is
there only in case something changes before the addon catches up. Northern Ireland (VAT
prefix XI) is deliberately not modelled.

## Environment summary

```dotenv
INVOICES_AUTO_ISSUE=true
INVOICES_PREFIX=RE
INVOICES_PERIOD=Y-m
INVOICES_SELLER_NAME=
INVOICES_SELLER_ADDRESS=
INVOICES_SELLER_VAT_ID=
INVOICES_SELLER_TAX_NUMBER=
INVOICES_SELLER_EMAIL=
INVOICES_SELLER_IBAN=
INVOICES_SMALL_BUSINESS=false
INVOICES_MERCHANT_COUNTRY=DE
INVOICES_PRICES_INCLUDE_TAX=false
INVOICES_OSS_DESTINATION=false
```
