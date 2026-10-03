# Accesses

<AddonHeader />

A product grants slugs. An **access** is the record behind one slug: the same handle, plus what
that slug contains. You find it under **Utilities → Accesses**, with its own permission
(`access product-accesses utility`), a list and a detail page built like the product's. Run
`php artisan migrate` once after the update, it creates the `product_accesses` table.

## What an access keeps

- **Handle**: the grant slug. It is unique across every brand and freezes once a grant in
  [Entitlements](/entitlements/) carries it. A granted access cannot be deleted either.
- **Name, description, cover**: what the buyer's account shows.
- **Contents**: an ordered list of pointers. The kinds are `access` (another access, nested; a
  cycle is refused), `course`, `file` and `event`.
- **Credits**: credit lines for sessions. A line number is assigned by the model and never handed
  out twice. After a grant a line can be ended, not deleted.
- **Opens members area**: whoever holds the access gets into the site's members area.

Every pointer shows the same three states as a product's `ref`: found, gone, cannot be checked.

## What the site tells the addon

Everything a site adds goes into the `boot()` of one of its service providers:

```php
use Goldnead\StatamicProducts\Support\AccessContainers;
use Goldnead\StatamicProducts\Support\ContentKinds;
use Goldnead\StatamicProducts\Support\SessionTypes;

ContentKinds::register('community', 'Community-Bereich', 'Space (Kennung)');
SessionTypes::register('8f0c…', 'Einzelsession');
AccessContainers::allow(['assets', 'downloads']);
```

- `ContentKinds::register()` adds a content kind of your own. Only the site knows what it points
  at, so the check always answers "cannot be checked".
- `SessionTypes::register()` names the session types. Once any are registered the form picks from
  them and refuses anything else.
- `AccessContainers::allow()` names the asset containers an access may take files from. Without
  the call every container is offered except the ones of Client Rooms, because an access is sold
  and a client's private files must not end up in one.

## Bundles with Entitlements

With `goldnead/statamic-entitlements` (^1.4) installed there is nothing else to do. The addon
binds its own `PackageResolver` in place of the empty default, and a grant on an access then
covers everything the access contains, through nested accesses at any depth. A resolver the site
binds itself always wins. Without Entitlements the addon binds nothing.

`active` does not change what existing grants cover. It only decides whether an access is offered
and granted anew. To take access away, revoke the grant in Entitlements.

## Reading an access in code

```php
use Goldnead\StatamicProducts\Support\Accesses;

$access = Accesses::find('choiraccelerator');   // null when there is no record

$access->expand();                // every slug a grant covers, nested ones included
$access->creditLines();           // the credit lines for a new grant
$access->contentsOf('course');    // the contents of one kind, in order
```

`find()` returns a snapshot, so call it again after a save. Credits apply to the access granted
directly and never through nesting, so a coaching access inside a bundle does not credit its
sessions twice.

## Two tabs, one access

The detail page sends a fingerprint of the state it loaded. If somebody saved in the meantime,
the save is refused with HTTP 409 and a message instead of overwriting the newer state.
