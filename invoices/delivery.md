# Delivery and storage

<AddonHeader />

The addon writes the document and stops there. Sending it, filing it and handing it to an
accountant all hang off two events.

## Rendering it

```php
use Goldnead\Invoices\Support\Renderer;

$html = app(Renderer::class)->html($invoice);     // a string
$view = app(Renderer::class)->view($invoice);     // a View, to return from a controller
```

**HTML, and only HTML.** The same template the preview shows, so the two cannot drift — there
is no second, rebuilt preview to fall out of step with what gets printed.

## Why no PDF

Turning HTML into a PDF is a decision about infrastructure: a print dialog, a headless
browser, a queue worker, a hosted service. Every one of those is a choice about how a site is
deployed, and an addon should not make it for its host.

What the addon guarantees instead is that whatever renders it sees exactly what the preview
showed.

The template is deliberately free of images and external fonts. A page that depends on a CDN
is, in five years, an invoice without a layout — and you have to keep it for ten.

## What the document shows

- Recipient block: name, address, country, as they were frozen
- Sender block: name, address, VAT ID
- A heading that says *Rechnung* or *Stornorechnung*, with the number; a credit note names
  what it reverses
- Invoice date and **service date** (the same date on an immediate sale, written out rather
  than assumed), plus the recipient's VAT ID where there is one
- A line table: description, quantity, unit price, discount, VAT rate, net
- **Totals per rate** — *Entgelt zu 19 %*, *Umsatzsteuer 19 %*, and so on — then a grand
  total. Net and tax subtotals only appear when there is more than one rate
- The tax note, where the rate is not the ordinary one
- A footer: tax number, email, IBAN, where they are configured

The **discount column only appears when there is a discount**. A column full of dashes is
not evidence of anything, it is noise.

## Publishing the template

```bash
php artisan vendor:publish --tag=invoices-views
```

Lands in `resources/views/vendor/invoices/`. Edit `invoice.blade.php` there.

Two things to keep if you do:

- **Nothing external.** No web fonts, no remote images, no CDN.
- **The per-rate breakdown.** § 14 Abs. 4 Nr. 8 UStG requires it, and a single net line over
  an invoice with two rates does not satisfy it.

The view receives `$invoice`, `$seller`, `$empfaenger`, `$hatRabatt`, `$nachSatz` and
`$euro` — the last a closure, rather than a helper, so the template cannot reach for a global
a host may have redefined.

## Serving it to a buyer

That is a route of yours, and it needs a lock of yours. The addon ships no route, no
controller and no signed URL, because who may see an invoice is a question about your site's
accounts, not about invoicing.

```php
Route::get('/rechnung/{invoice}', function (Invoice $invoice) {
    abort_unless($invoice->buyer_email === auth()->user()?->email, 403);

    return app(Renderer::class)->view($invoice);
})->middleware('auth');
```

An invoice URL that is guessable is a list of who bought what.

## Storing it

Nothing is written to disk. The row is the record, and the document is rendered from it on
demand — which is deliberate: a stored file and a row that can produce a different file are
two truths.

If your retention policy needs a file, render it at `InvoiceIssued` and put it wherever your
policy says.

## The events

```php
use Goldnead\Invoices\Events\InvoiceIssued;
use Goldnead\Invoices\Events\CreditNoteIssued;

Event::listen(InvoiceIssued::class, function (InvoiceIssued $event) {
    $event->invoice;          // items already loaded
});

Event::listen(CreditNoteIssued::class, function (CreditNoteIssued $event) {
    $event->creditNote;
    $event->reverses;         // the invoice it undoes
});
```

`InvoiceIssued` fires **after** the transaction, so a listener always finds the row.

`CreditNoteIssued` carries both documents, because a credit note read alone says nothing
about what it undid.

Emailing the invoice is the obvious listener. A second one worth having is whatever your
bookkeeping does with a document — an export, a folder, a message to somebody.

::: warning A listener that throws
Nothing here releases a fulfilment claim: by the time these fire, the invoice exists. But a
listener that throws will still surface wherever the event was dispatched from, which for
`auto_issue` is inside the payment webhook. Queue slow or fragile work.
:::

## Catching up

```bash
php artisan invoices:pending
php artisan invoices:pending --write
```

Paid payments with no invoice, and what is missing. Useful in three situations: after
installing the addon on a site that has already sold something, after fixing a tax rule that
was missing, and as a check nobody is falling through.

The listing distinguishes **not attempted** from **could not be written**, because the two
need different things: a run, or a decision about a tax rule.
