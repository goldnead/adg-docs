# An invoice does not change

<AddonHeader />

Not a convention here. Enforced.

```php
$invoice->update(['buyer_name' => 'Someone else']);   // RuntimeException
$invoice->delete();                                    // RuntimeException

$invoice->items()->create([...]);                      // RuntimeException
$line->update(['net_cent' => 1]);                      // RuntimeException
$line->delete();                                       // RuntimeException
```

German law requires an invoice to be immutable once issued, and a correction is a **second
document** — never an edit. A model that quietly allowed `$invoice->update(...)` would make
the whole series worthless as evidence, and nothing about the row would show it had
happened.

## Head and lines alike

Before 1.0.0 only the head was locked, and `InvoiceItem` had no guard at all: a line could
be added, changed or deleted under a head that kept its totals — and the template printed
both, side by side.

**That is a falsified invoice that reads as correct**, which is worse than an obviously
wrong one. So the lines carry the same three locks:

| Operation | Refused because |
| --- | --- |
| `updating` a line | The totals above it would stay as they are |
| `deleting` a line | The same |
| `creating` a line on its own | The head keeps its total and the document reads as correct while it is not |

Deleting the invoice cascades to its lines in the database, and that is not a route a caller
can take: the head throws first.

## The one door

`InvoiceWriter` writes lines inside `InvoiceItem::whileWriting()`, which is deliberately
explicit and deliberately narrow. It closes again on the way out, and on an exception too.

The alternative — a heuristic like "does this head belong to the operation currently
running?" — cannot be answered reliably once the relation comes back fresh from the
database, and a lock that sometimes errs is not a lock.

If you need to write an invoice, call `Invoices::forPayment()`. There is no supported way to
build one by hand, and that is the feature.

## Everything on it is frozen

Not references. Text and JSON, copied at the moment the invoice is written:

| On the invoice | Rather than |
| --- | --- |
| `buyer_name`, `buyer_email`, `buyer_country`, `buyer_vat_id`, `buyer_address` | a link to a customer record |
| `seller` (JSON) | `config('invoices.seller')` read at print time |
| `tax_reason`, `tax_note`, and the legal basis | a rule that can be edited |
| `tax_rate_bp` on each line | a lookup |
| the line's `name` | the product's current name |

An invoice that changes when somebody edits their profile is not an invoice, it is a view.
Editing the seller block next year does not rewrite last year's documents. Renaming a
product does not rewrite what an old order says was bought.

The same principle runs through [Payments](/payments/tax-and-retention#the-buyers-country):
the buyer's country is frozen on the payment for exactly this reason, one layer down.

## What to do instead

A correction is [a credit note plus a new invoice](/invoices/credit-notes).

That is not a workaround for a limitation. It is what makes a number series usable as
evidence: every document that ever existed still exists, in order, and the two that cancel
each other out both say so.

## What this costs you

A typo in a customer's name cannot be fixed. A wrong tax rate cannot be corrected in place.
A test invoice on a production database cannot be deleted.

All three are the point, and all three are why the addon checks the mandatory details
**before** writing rather than after: the sender's name and address always, and above
`small_amount_cent` the recipient's name and address too. A document that would not be a
valid invoice is refused, not issued and then patched.
