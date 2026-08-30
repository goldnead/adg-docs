# The handle is a promise

<AddonHeader />

A handle is `stimmwerkstatt`: lowercase letters, digits, hyphens and underscores, starting
with a letter or a digit. It is what an offer names, what a payment line records, and what an
invoice reprints in three years.

Two rules follow from that, and both of them cost something.

## Unique across every brand

The row is scoped by brand. The handle is not.

That looks inconsistent until you ask **who reads it back**. A provider webhook arriving
hours after the sale. An invoice reprinted next year. A payment row that has carried this
string since the moment money moved. None of those places knows which brand it is in, and a
webhook least of all.

Scoping the name would mean that resolving a price required knowing whose request it was —
and the one context that never knows is the one that takes the money.

So an agency with three brands names its products apart: `nordlicht-stimmwerkstatt`,
`suedwind-stimmwerkstatt`. That is a real cost, and it is smaller than a webhook that cannot
price what it was sent.

Listing products is a different question and *is* scoped. See
[In the payment catalogue](/products/catalogue#two-seams-two-questions).

## Frozen once the product has been paid for

The Control Panel locks the input; the server refuses the change even if something else posts
it.

Renaming after a sale breaks nothing loudly, and that is precisely the problem. It makes an
old invoice show a line whose product nobody can find any more. Payment rows and invoice
lines cannot be migrated along with a tidied-up spelling.

### What actually trips the lock

**A payment at status `paid`, and nothing less.**

The check asks both payment tables — `payment_items.product` and `payments.product`, the
single-product column from before line items existed — for a row carrying this handle whose
payment reached `paid`.

The status matters, and it is the whole rule. [Payments](/payments/) writes both rows
*before* it calls the provider, deliberately: the other order loses the payment entirely if
the process dies in between, and by then the buyer has been charged. Those rows start at
`initiated`.

Up to 1.1.0 the check counted them. One visitor who clicked buy and closed the tab locked the
handle for ever, because unpaid rows are not swept unless you have turned on
`prune_unpaid_after_days`, which ships at `0`. Fixed in 1.2.0.

A refund does not unlock it. Refunds are columns on a paid row, the status stays `paid`, and
the invoice still exists.

::: warning The check also fails closed
If the payment tables cannot be read at all, every handle on the screen locks and a line goes
into the log. A transient database error must not unlock the one edit that cannot be undone.
:::

**Everything else about the product stays editable.** The name, the price, the kind, the
pointer, what it opens. A price that could never be corrected after the first checkout would
be the worse rule by far.

## The same threshold refuses a delete

The delete button on such a product **refuses**, with the reason on screen: its handle is on
payments and invoices that still have to render. Set it to inactive instead.

Refused rather than silently turned into a deactivation. A delete button that quietly does
something else is worse than one that says no.

Because the threshold is the same, a product that has only ever been *started* at the
checkout still deletes normally. Once one payment goes through, retiring is what is left, and
it does everything deleting would have.

An inactive product is out of the catalogue, out of every picker, and unbuyable. It is still
on every invoice that already names it, which is the entire point.

## Names, spellings and second thoughts

Practical consequences, in the order people hit them:

1. **Pick the handle before the product goes on sale, not after.** It is the one field with a
   deadline, and the deadline is the first payment that goes through.
2. **A typo in a handle is a rename, and a rename is only possible while the lock is off.**
   After that, the honest fix is a new product plus retiring the old one — the old invoices
   keep resolving, and new sales use the new name.
3. **Do not reuse a retired handle for a different thing.** The handle is unique, so the
   database will stop you from creating a second row with it; what it cannot stop is
   re-pointing the retired row at something else. An invoice from last year would then name
   this year's product.
4. **A handle that also exists in `config/statamic-payments.php` is charged at the config
   price**, whatever this table says. That collision has its own section in
   [In the payment catalogue](/products/catalogue#config-wins).
