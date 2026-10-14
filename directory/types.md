# Profile types

<AddonHeader />

One collection is enough for most sites. When the directory lists more than one kind of profile,
for example choirs and choir leaders, `directory.collections` names them all, each with its own
field mapping and filters.

```php
'collections' => [
    'choirs' => ['filters' => ['choir_type' => 'choir_type']],
    'leaders' => [
        'fields' => ['title' => 'name', 'city' => 'town'],
        'filters' => ['focus' => 'focuses'],
    ],
],
```

Keys a collection leaves out fall back to the global `fields` and `filters`. Without
`directory.collections`, the old single `directory.collection` format works unchanged.

## What changes

- **The first entry is the default type.** A search with no `type` looks there.
- **The projection stores the handle** in a `collection` column. Existing rows get the first
  collection; run `php artisan migrate`.
- **Filter columns are shared across collections.** Filter parameters of other types are ignored
  in a search, so `focus` does nothing on a `choirs` search.
- **`type` selects the type**: `GET /directory/profiles?type=leaders` and
  `{{ directory:search type="leaders" }}`. An unknown `type` is invalid.
- **Public data carries `type`.**
- **Everything else applies per collection**: visibility, the hidden field, the claim adapter and
  the team binding.
