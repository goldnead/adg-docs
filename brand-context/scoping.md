# Scoping models

<AddonHeader />

To make one of your own models brand-aware: add a column, add a trait.

## The column

```php
Schema::table('invoices', function (Blueprint $table) {
    $table->foreignId('brand_id')->nullable()->index();
});
```

Then backfill it to the default brand, so no row is left without one:

```php
DB::table('invoices')->whereNull('brand_id')->update([
    'brand_id' => Brand::where('handle', config('brand-context.default_handle'))->value('id'),
]);
```

Add the column and backfill it **now**, even if you have no intention of enabling
multi-brand. That is exactly what the suite's own addons do, and it is why turning
multi-brand on later needs no migration. A nullable-and-empty `brand_id` is free;
retrofitting one onto a live table is not.

## The trait

```php
use Goldnead\BrandContext\Concerns\HasBrand;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasBrand;
}
```

That applies the global `BrandScope` and stamps `brand_id` on create. In
single-brand mode both are no-ops beyond the stamping.

## What changes for your queries

Nothing, syntactically. That is the point of a global scope.

```php
Invoice::where('status', 'open')->get();
```

In multi-brand mode this returns the current brand's open invoices, and with no
current brand it returns none.

```php
BrandContext::runFor('acme', fn () => Invoice::sum('total'));
BrandContext::withoutBrandScope(fn () => Invoice::sum('total'));  // all brands
```

## Unique indexes

Once a table is scoped, "unique" almost always means "unique within a brand":

```php
$table->unique(['brand_id', 'number']);   // right
$table->unique('number');                 // wrong: two brands cannot both have INV-001
```

Two traps here, both of which have shipped in this suite:

**Never lead a unique with a nullable column.** No engine constrains a NULL, so a
unique on `(user_id, type, channel)` where `user_id` is NULL for some recipients
constrains nothing at all for those rows. Put the non-nullable column first, or make
the nullable one non-nullable with a sentinel.

**Watch the index length on MySQL.** Under `utf8mb4` every character costs four
bytes of InnoDB's 3072-byte limit, so a unique across two `string(255)` columns
does not fit. SQLite has no such limit, which means a fully green SQLite test suite
can pass a schema MySQL refuses outright. Cap the columns and test against MySQL.

## Relationships across brands

A relationship from a scoped model to another scoped model is filtered on both
ends, which is what you want and occasionally surprising:

```php
$invoice->lines;   // scoped; if the lines table is scoped too, the brand must match
```

A relationship to an **unscoped** model — `brands` itself, or a Statamic user — is
not filtered, because there is nothing to filter by. For users, that gap is what
[Brand members](/brand-context/members) fills.

## Console commands and workers

A command has no session, so no brand is current, so with `fail_mode=closed` your
scoped model returns nothing. This is the single most common surprise when
adopting multi-brand.

Name the brand:

```php
public function handle(): int
{
    $handles = $this->option('brand')
        ? [$this->option('brand')]
        : Brand::pluck('handle');

    foreach ($handles as $handle) {
        BrandContext::runFor($handle, fn () => $this->sweep());
    }

    return self::SUCCESS;
}
```

Or use the `RunsForEachBrand` trait, which is what the suite's own commands do,
and accept `--brand=` so an operator can narrow the run.

The same applies to a queued job. Capture the brand at dispatch time and restore it
in `handle()`; by the time the worker runs there is no request left to infer it
from.

## Testing a scoped model

Two tests are worth writing for every scoped table, because they fail loudly when
somebody forgets the trait or the index:

```php
it('does not leak across brands', function () {
    BrandContext::runFor('acme', fn () => Invoice::factory()->create());
    BrandContext::runFor('contoso', fn () => expect(Invoice::count())->toBe(0));
});

it('returns nothing with no current brand', function () {
    BrandContext::runFor('acme', fn () => Invoice::factory()->create());
    BrandContext::setCurrent(null);
    expect(Invoice::count())->toBe(0);   // fail-closed, not fail-open
});
```

The second one is the important one. A scoping bug that fails *open* passes any
test that only checks the happy path.
