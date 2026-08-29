# Delivery and storage

<AddonHeader />

The addon writes the document, prints it and sends it to the buyer. Filing it and handing it
to an accountant hang off two events.

## Rendering it

```php
use Goldnead\Invoices\Support\Renderer;

$html = app(Renderer::class)->html($invoice);     // a string
$view = app(Renderer::class)->view($invoice);     // a View, to return from a controller
```

```php
use Goldnead\Invoices\Contracts\PdfRenderer;

$pdf = app(PdfRenderer::class)->render($invoice); // raw PDF bytes
```

**One template, two outputs.** The PDF prints the same Blade the preview shows, so the two
cannot drift — there is no second, rebuilt layout to fall out of step with what gets printed.

## The print engine

`Contracts\PdfRenderer` hangs in the container; the bundled implementation is `DompdfRenderer`.
**dompdf, because it is pure PHP.** Every other candidate makes an infrastructure decision on
your behalf — Browsershot wants Node and a Chromium, wkhtmltopdf wants a system binary and a
queue worker to keep it off the request. An addon that quietly adds a system dependency is an
addon that stops being installable.

A host that already runs a headless browser rebinds that interface and the bundled engine
stops mattering. Paper size is `invoices.pdf.paper`, `A4` by default.

**The same invoice is the same file, byte for byte.** dompdf otherwise stamps every render
with the wall clock (`CreationDate`, `ModDate`) and a random document id (`/ID`), so two
renders of one invoice would differ. Both are derived from the invoice instead — the creation
date is the date it was issued, which is also the truer answer. Without that, the second
download in nine years is a different document from the one the buyer holds, visible to nobody
until it is a question during an audit.

The template is deliberately free of images and external fonts, and remote fetching is switched
off in the engine rather than left to convention. A page that depends on a CDN is, in five
years, an invoice without a layout — and you have to keep it for ten.

## Sending it to the buyer

Delivery hangs off `InvoiceIssued`, not a cron run: exactly the invoices that were written go
out, once each. If a mandatory field is missing, **no invoice is created at all**, so the
sending path only ever sees finished documents and cannot get round that check.

```php
// config/invoices.php
'delivery' => [
    'enabled' => env('INVOICES_DELIVER', true),
    'subject' => 'Ihre Rechnung :number',
    'filename' => 'Rechnung-:number.pdf',
],
```

`:number` is the invoice number in both strings. Switch `enabled` off and the host sends them
itself; the event stays where it is.

The mail leaves through brand-context's `BrandMailer`, so the sender identity belongs to the
brand. A brand that declares a mail identity and omits the address **sends nothing at all**; a
brand that declares none falls back to the seller frozen on *this* invoice rather than the
host-wide sender, which in a multi-brand setup belongs to somebody else.

<Figure
  src="invoices-invoice"
  alt="A rendered German invoice with three lines at two VAT rates, showing net and tax broken out per rate before the total"
  caption="Two rates on one invoice. § 14 Abs. 4 Nr. 8 UStG wants the split, so the document carries it." />

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

If you run `statamic-payments`, its customer portal already does this: the buyer reaches their
own invoices over a magic link, and you write nothing.

Without it, that is a route of yours, and it needs a lock of yours. This addon ships no route,
no controller and no signed URL, because who may see an invoice is a question about your site's
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

The addon's own delivery listener hangs off `InvoiceIssued`. The one worth adding is whatever
your bookkeeping does with a document — an export, a folder, a message to somebody.

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
