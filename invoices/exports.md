# Exports for tax and bookkeeping

<AddonHeader />

A period of invoices and credit notes, handed to whoever does the books: a CSV with one row
per document and rate, a tax report per treatment, place of supply and rate, and a ZIP of
the period's PDFs. In the Control Panel under **Utilities → Invoice export**, and on the
command line as `invoices:export`.

Every figure comes from the issued documents, credit notes with a minus. Nothing is
recalculated.

<Figure
  src="invoices-export"
  alt="The Invoice export utility: a period picker with presets from last month to this year, and a tax report table with treatment, place of supply, rate, documents, net, tax and gross, including a reverse charge line and the OSS share"
  caption="The tax report for one month and one brand. The OSS figure is the tax owed in other EU countries; which figure goes on which line of a return is the tax adviser's call." />

::: warning Upgrading to 2.2: run `migrate` before the next sale
The invoice writer now fills two new columns on `invoice_items`, `tax_mechanism` and
`place_of_supply` (migration `2026_09_23_120000`). An invoice written before the migration
has run fails on the missing column.

```bash
php artisan migrate
```
:::

## The period

Presets for last month, this month, last quarter, this quarter, last year and this year, or
a first and a last day. Periods are read in the application's time zone. A period that
cannot be read is named on the screen, and the previous month is shown instead; it is not
replaced in silence.

The screen shows the documents of the brand you are looking at, and says so. Archives and
CSV file names carry the brand, and the screen lists and hands out only the current brand's
archives.

## The tax report

Net, tax and gross per **treatment** (taxable, small business, reverse charge,
intra-community supply, export, outside the scope, exempt), **place of supply** and **rate**,
with the number of documents and a total. Credit notes are subtracted.

- **Tax owed in other EU countries** is shown separately under the table: the One-Stop-Shop
  figure.
- **Under § 19** the turnover is in the report with a tax of zero, and the report says that
  no tax is due.
- **Two currencies in one period** are added without conversion, and the report says so,
  naming them.
- **Lines from before 2.2** carry no treatment and place of supply of their own. The export
  derives both from the document and counts how many it derived, on screen and on the
  command line.

The report is also a download, as a CSV in the same formats as the documents.

## The documents as CSV

One row per document and rate, credit notes with a minus, in the order of the invoice date,
then the number. The CSV streams, so a year does not run into the request timeout.

Three profiles on the screen:

| Profile | Separator | Encoding | Decimal mark |
| --- | --- | --- | --- |
| Excel, DATEV, Lexware Office | `;` | UTF-8 with BOM | `,` |
| Older desktop programs | `;` | Windows-1252 | `,` |
| International | `,` | UTF-8 | `.` |

The column names are **fixed German headers**, so an import mapping saved in the bookkeeping
software keeps working next month:

`Belegart` · `Belegnummer` · `Belegdatum` · `Bezug` · `Kunde` · `E-Mail` · `Land` ·
`USt-IdNr.` · `Leistungsort` · `Steuerart` · `Steuersatz` · `Netto` · `Steuer` · `Brutto` ·
`Währung` · `Buchungstext` · `Marke`

The treatment column carries German words for the same reason (`steuerpflichtig`,
`Kleinunternehmer`, `Reverse Charge`, …), and the brand column carries the brand's name.

Two things a spreadsheet would otherwise get wrong:

- **Formulas.** Every text column a buyer could have typed into (name, e-mail, VAT ID,
  reference, booking text) gets a leading apostrophe when it starts with `=`, `+`, `-`,
  `@`, a tab or a carriage return, so the spreadsheet opens it as text rather than running
  it. Amounts stay numbers.
- **Windows-1252.** Characters outside the code page are spelt in Latin: "Łukasz" becomes
  "Lukasz", independent of the process locale.

The CSV imports into bookkeeping software. Posting accounts are that software's job, and a
native DATEV EXTF batch is not part of this addon.

## The PDF archive

Every document of the period as a PDF, in one ZIP file. The archive is built by a queued
job, `BuildPdfArchive`, with a timeout of 1800 seconds, and waits on the export disk until
it is downloaded.

::: danger Set the queue's `retry_after` above 1800 seconds
Otherwise the queue hands the same job to a second worker while the first is still
rendering, and two workers build the same archive.

```php
// config/queue.php, on the connection the job runs on
'retry_after' => 1900,
```
:::

A job the queue gives up on shows as **failed** on the screen. One still marked as being
built after longer than its timeout is shown as not finished, with a request to build it
again, rather than "being built" forever.

The archive holds every invoice of the period, names and addresses included. Keep it on a
private disk:

```php
'export' => [
    'disk' => env('INVOICES_EXPORT_DISK', 'local'),
    'directory' => 'invoices/exports',
],
```

It leaves only through the Control Panel route that checks the utility permission.

## On the command line

```bash
php artisan invoices:export csv --month=2026-08 --output=august.csv
php artisan invoices:export report --quarter=2026-Q3
php artisan invoices:export pdf --year=2025 --output=belege-2025.zip
php artisan invoices:export pdf --year=2025 --queue
```

| Option | |
| --- | --- |
| `csv`, `report` or `pdf` | What to export |
| `--from=` · `--to=` | First and last day, `YYYY-MM-DD` |
| `--month=` | `YYYY-MM` |
| `--quarter=` | `YYYY-Q1` to `YYYY-Q4` |
| `--year=` | `YYYY` |
| `--brand=` | Only the documents of this brand (ID) |
| `--delimiter=` | `;`, `,` or `tab` |
| `--encoding=` | `utf-8-bom`, `utf-8` or `windows-1252` |
| `--decimal=` | `,` or `.` |
| `--output=` | Target file. Without it a CSV goes to standard output, so it can be piped |
| `--queue` | Queue the PDF archive instead of building it in the command |

Without a period option the command takes the previous calendar month and says so. The
defaults are the first profile: semicolon, UTF-8 with BOM, decimal comma. A comma as both
separator and decimal mark is refused, because the two cannot be told apart. `report`
prints the table as well, with the OSS figure, the number of derived lines and a warning
when the period mixes currencies. `pdf` needs `--output` or `--queue`.

The command's own messages are German, like the invoice.

## Permission

`access invoice-exports utility`, which Statamic registers with the utility. Every download
route sits under the utility and inherits the same check, so the permission that shows the
screen is the one that guards the files.
