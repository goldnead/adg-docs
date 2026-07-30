# Brand Context

<AddonHeader />

Optional multi-brand (multi-tenant) foundation for Statamic addons.

**Single-brand by default.** Most installs use the dependent addons exactly as
they did before: one brand, no switcher, no visible machinery. The global scope
is a no-op and every record belongs to a single default brand.

**Multi-brand behind a flag.** Turn `multi_brand` on and you get hard brand
isolation: the global scope filters every branded model by the current brand, new
records are stamped with it, and the Control Panel brand switcher appears.

The database schema is **identical in both modes** — `brand_id` is present
everywhere and backfilled to the default brand — so enabling multi-brand later
needs no migration. That property is the whole point of the design, and it is why
six addons in the suite carry the column whether you use it or not.

```php
use Goldnead\BrandContext\Concerns\HasBrand;

class Contact extends Model
{
    use HasBrand; // requires a brand_id column
}
```

```php
BrandContext::runFor('acme', function () {
    Contact::create([...]); // stamped with acme, invisible to every other brand
});
```

## Who needs this page

You do not install Brand Context deliberately. It arrives as a Composer
dependency of Webhook Manager, Automations, LeadHub, Marketing, Activity and
Notifications, and on a single-brand install it does nothing you have to think
about.

Read this section when either of these is true:

- You want two or more brands isolated inside one Statamic install.
- You are writing your own addon or application code and want your models to
  participate in the same scoping the suite's models do.

## What it does not do

- **It is not a Statamic multi-site feature.** Statamic sites are about locales and
  URLs. A brand is about which rows a query may see. The two are orthogonal: one
  brand can own several sites, and one site can serve several brands.
- **It does not scope Statamic content.** Entries, terms, assets and globals are
  Statamic's, not Eloquent models, and are untouched.
- **It does not scope Statamic users.** A user is not an Eloquent row under the
  file driver, so "the users of this brand" has its own mechanism. See
  [Brand members](/brand-context/members).
- **It is not authorisation.** Membership is affiliation. Permissions are still
  permissions.

## Isolation guarantees, in multi-brand mode

- A query on a `HasBrand` model only ever returns the current brand's rows.
- With no current brand resolved and `fail_mode=closed` (the default), reads return
  **no** rows. Nothing leaks across brands, and the failure is visible rather than
  silent.
- Cross-brand access is opt-in and explicit: `BrandContext::withoutBrandScope()`.
- **Consent is per brand.** The same email address can hold independent
  consent and subscription state in different brands; uniqueness is enforced as
  `(brand_id, …)`.

## Next

- [Installation](/brand-context/installation)
- [Configuration](/brand-context/configuration) — five keys, and what each one costs
- [Concepts](/brand-context/concepts) — brands, the scope, the manager, the middleware
- [Scoping models](/brand-context/scoping) — `HasBrand` on your own tables
- [Brand members](/brand-context/members) — including the rule that surprises everybody
- [Public routes](/brand-context/public-routes) — links in emails, with no session
