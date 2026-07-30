# Brands and scope

<AddonHeader />

Every other addon in this family scopes a row to a brand and stops there. This one asks a
sharper question first: **is this fact about the mailbox, or about the relationship?**

## Which facts cross the boundary

| Reason | Scope | Why |
| --- | --- | --- |
| `hard_bounce` | **global** | The mailbox does not exist. It bounces identically from every brand, and every brand that re-learns it pays for the discovery in shared sending reputation. |
| `invalid_email` | **global** | The same fact, reported differently. |
| `soft_bounce_threshold` | **global** | A mailbox that failed five times in thirty days failed as a mailbox. |
| `provider_import` | **global** | The ESP is describing the address, not the relationship. |
| `complaint` | **brand** | The recipient objected to *this* sender. It says nothing about anybody else. |
| `manual` | **brand** | An editorial act inside one brand's context. |

A complaint deliberately does not go global. Making it so would contradict the consent rule the
subscription schema already carries: somebody who unsubscribed from Acme has said nothing about
Contoso.

All six are reversible in `config/suppression.php`, never through a migration:

```php
'scopes' => [
    'hard_bounce' => 'global',
    'invalid_email' => 'global',
    'soft_bounce_threshold' => 'global',
    'provider_import' => 'global',
    'complaint' => 'brand',
    'manual' => 'brand',
],
```

`brand_id` is stored explicitly on every row, and `0` means "every brand".

## Why the models do not use `HasBrand`

::: danger The one intentional exception in the family
`BrandScope` adds `where brand_id = currentId()`. Applied here it would hide every global row
(`brand_id = 0`) from the gate query — a fail-open bug in precisely the query that must never
fail open — and its `creating` hook would stamp the current brand over the intended `0`.

So the models carry `scopeVisibleTo()` instead: global rows plus one brand's own, with
`brand_id` set explicitly on every write.

A future contributor "fixing" these models for consistency with the rest of the suite would
reintroduce both bugs. `tests/Feature/CrossBrandTest.php` is what stops that. Read it before
touching either model.
:::

This is the deliberate counterpart to how [Brand Context](/brand-context/scoping) works
everywhere else. There, a query that cannot see a brand should return nothing. Here, a query
that cannot see a brand must still return the global rows, because a dead mailbox is dead in
every brand.

## Single-brand installs

Nothing changes. Without multi-brand every row lands in the default brand or in `0`, both of
which are visible, so the scope distinction is invisible until the day a second brand exists.

## Asking on behalf of another brand

Both gate methods take an explicit brand id:

```php
app(Gate::class)->isSuppressed($email, brandId: $brand->id);
```

Use it in a queue worker that processes brands in a loop and cannot rely on a current brand
being set. Leave it out anywhere a brand context is already established.
