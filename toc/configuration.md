# Configuration

<AddonHeader />

Optional. The addon runs on its built-in defaults, and publishing the config file
only changes what a tag gets when it names no parameter of its own.

```bash
php artisan vendor:publish --tag=statamic-toc-config
```

```php
// config/statamic-toc.php
return [
    'field' => 'article',   // the field the tag reads with no field= or content=
    'from' => 'h1',         // the level the list starts at
    'depth' => 3,           // how many levels it spans, counted from `from`
    'to' => null,           // the level it stops at, absolute; wins over depth
    'flat' => false,        // a flat array instead of a nested tree
];
```

Five keys, and they are the same five values the addon has always used. Without a
published file the values above apply, so nothing changes by not publishing it.

## A tag parameter always wins

The config sets the default; a parameter on the tag overrides it for that call.

```php
'from' => 'h2',
'depth' => 1,
```

```antlers
{{ toc }}                     {{# h2 only, per the config #}}
{{ toc from="h3" depth="1" }} {{# h3 only, per the parameters #}}
```

## The keys

### `field`

The field the tag reads when it is given neither `field` nor `content`. This is the
usual reason to publish the file at all: if your Bard field is called `content`
rather than `article`, say so once here instead of in every template.

### `from`, `depth` and `to`

The same three values the [tag](/toc/tag#depth-and-from-together) takes. `from` is
where the list starts, `depth` is how many levels it spans, `to` is the deepest level
in absolute terms. A `to` set here wins over a `depth` set here, exactly as it does on
the tag.

### `flat`

The default for the tag's `is_flat` parameter. Note the two names differ: the config
key is `flat`, the tag parameter is `is_flat`.

## What the config does not cover

`exclude`, `when` and `content` are tag parameters only. They describe one call rather
than a site-wide default, and the tag does not read the config for them.

Nothing else about the addon is configurable either: the slug algorithm, the duplicate
suffixing, and the fact that the modifier adds ids to every heading regardless of the
list's range are all fixed. See
[Reference → Behaviour guarantees](/toc/reference#behaviour-guarantees).

## Publishing the views

A second tag, for the [starter-kit partial](/toc/installation) rather than for
behaviour:

```bash
php artisan vendor:publish --tag=statamic-toc-views
```

That copies the addon's views to `resources/views/vendor/statamic-toc`, where you can
rewrite the markup. There is nothing to publish beyond these two tags: the addon has
no migrations, no assets and no Control Panel surface.
