# Payment methods

<AddonHeader />

Which Mollie methods the hosted checkout offers, and — the part that decides whether a
subscription works — which of them the provider can charge again without the buyer.

## Choosing the methods

```php
// config/statamic-payments.php
'methods' => ['creditcard', 'paypal', 'ideal'],
```

or `STATAMIC_PAYMENTS_METHODS=creditcard,paypal,ideal`. The list goes to Mollie as `method`
on every payment the checkout creates; one entry as a string, several as a list, both shapes
are the API's own.

`null` — the default — sends no `method` at all and Mollie shows what the account has
switched on. That is right for most sites: what is available is decided in the Mollie
dashboard, not in a config file.

## Which methods charge again by themselves

A subscription or a payment plan is only one if the provider can take the next instalment
**without the buyer**. With some methods it can; with the others the customer has to trigger
every instalment by hand — which, for a recurring agreement, is no method at all.

| Method (Mollie id) | Charged again automatically? | Note |
| --- | --- | --- |
| Card (`creditcard`) | **yes** | card mandate |
| SEPA direct debit (`directdebit`) | **yes** | the mandate comes from a first payment via iDEAL, Bancontact, SOFORT, EPS, KBC/CBC, Belfius, Przelewy24 or Pay by Bank |
| PayPal (`paypal`) | **yes** | PayPal billing agreement |
| Apple Pay (`applepay`), Google Pay (`googlepay`) | **yes** | tokenised card payment; the follow-up runs on the card mandate |
| iDEAL, Bancontact, SOFORT, EPS, KBC, Belfius, Przelewy24, Pay by Bank | first payment only | leaves a SEPA mandate behind; is not charged again itself |
| Klarna, bank transfer, invoice (`billie`), `in3`, TWINT, paysafecard, gift cards, vouchers | **no** | the customer pays each instalment |

Sources: Mollie's recurring-payments guide, and ablefy's own note to its merchants — automatic
charging works for card, SEPA, Google Pay and Apple Pay; everything else the customer triggers
per instalment. Both lists live in `Goldnead\StatamicPayments\Support\PaymentMethods`
(`RECURRING`, `MANDATE_FIRST`) and are configuration, not truth: when Mollie enables a method
for recurring, the list is where that goes.

## What the checkout does with it

With `follow_up.collect_mandate` on, the checkout asks Mollie to remember the buyer
(`customerId`, `sequenceType: first`) — but **only when at least one listed method can leave a
mandate**. A `first` payment offered on Klarna alone is refused by the provider, and the buyer
would see an error where a checkout belongs. With no methods configured the request goes out
as before and Mollie itself shows only the methods that can carry a mandate.

```php
use Goldnead\StatamicPayments\Support\PaymentMethods;

PaymentMethods::chargesAutomatically('directdebit');   // true
PaymentMethods::chargesAutomatically('klarna');        // false
PaymentMethods::canHoldMandate(['ideal', 'klarna']);   // true — iDEAL can
PaymentMethods::configured();                          // the cleaned list, [] for "Mollie decides"
```

::: warning A subscription sold on a method that cannot recur
is a subscription whose second instalment never comes. If the site sells recurring products,
either leave `methods` at `null` (Mollie restricts the `first` payment itself) or list only
methods from the top half of the table.
:::
