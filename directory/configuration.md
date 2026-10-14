# Configuration

<AddonHeader />

The defaults ship with the package. To change them, publish the file:

```bash
php artisan vendor:publish --tag=directory-config
```

```php
// config/directory.php
return [
    'collection' => env('DIRECTORY_COLLECTION', 'choirs'),

    'fields' => [
        'title' => 'title',
        'city' => 'city',
        'description' => 'description',
        'visibility' => 'visibility',
        'hidden' => 'hidden',
        'lat' => 'lat',
        'lng' => 'lng',
    ],

    'filters' => [
        'choir_type' => 'choir_type',
        'target_group' => 'target_group',
    ],

    'search' => [
        'per_page' => 20,
        'max_per_page' => 50,
        'max_radius_km' => 500,
    ],
];
```

## `collection`

The handle of the profile collection. Defaults to `choirs`, or to `DIRECTORY_COLLECTION`. To
search several kinds of profile, use [`collections`](/directory/types) instead; without it this
single handle works as before.

## `fields`

Which Entry field feeds which part of the projection. The left side is what the addon calls it,
the right side is the field handle in your blueprint. `lat` and `lng` fill the coordinate
columns; a profile without valid coordinates is left out of every location search. The
`visibility` and `hidden` fields decide whether a profile is public, see
[Searching profiles](/directory/search#what-is-public).

## `filters`

Filter parameter (and projection column) on the left, Entry field on the right. The defaults are
`choir_type` and `target_group`. A filter is an exact match on an indexed column. **Run
`php artisan migrate` after changing this list**, because the migration is what creates the
columns.

## `search`

| Key | Default | |
| --- | --- | --- |
| `per_page` | `20` | Page size when the request does not name one. |
| `max_per_page` | `50` | The largest page a request can ask for. |
| `max_radius_km` | `500` | The largest `radius_km` a request can ask for. |

## Environment

| Variable | Default | |
| --- | --- | --- |
| `DIRECTORY_COLLECTION` | `choirs` | The single profile collection handle. |
