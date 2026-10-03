# Control Panel

<AddonHeader />

Everything here is the same grant and the same revocation as in code, written by an admin. The
nav entry is **Entitlements**, and **Vergaben** in a German Control Panel. Set
`entitlements.cp.enabled` to `false` to remove the screens; the switch bites on the routes as well
as on the nav entry.

## The screens

- **Listing**: filter by state, source and product. The search matches names, emails and catalogue
  names as well as slugs, and `?subject=type:id` narrows it to one subject.
- **Detail**: the resolved state and a timeline, the manual grant form and the revocation form.
- **Limits** and **Wiring**: limits per product, and the events with the automations and webhooks
  that listen.

Manual grants are always written with source `manual`. The form does not let an admin type
`thrivecart` and fabricate a purchase in the audit trail. Revoking needs a reason.

## Picking a person

The grant form finds a person through core's user search, by name or email. Type and ID remain for
any other subject. A user subject reads as the person, with name, email and a link to the user
page.

## The product catalogue

Without a catalogue the product is a text field. Register names for your slugs and the Control
Panel offers a picker instead:

```php
use Goldnead\Entitlements\Facades\Entitlements;

Entitlements::registerProducts(fn () => [
    'choiraccelerator' => 'Choir Accelerator',
    'masterclass' => ['label' => 'Masterclass', 'group' => 'Adrian Goldner'],
]);
```

A source can be a closure (read when a form asks, never at boot), an array, an object with
`grantableProducts()`, or a class tagged `entitlements.product-catalog`. A source that throws is
logged and skipped. While no source answers with a product, every product field stays free text.
`goldnead/statamic-products` registers its accesses this way.

It is a registry of names, never a whitelist. A grant on a slug nobody registered stays valid and
is flagged "not in the catalogue" on the grant and on the user page.

## On the user page

Add the `user_entitlements` fieldtype to your user blueprint:

```yaml
-
  handle: zugaenge
  field:
    type: user_entitlements
    display: Zugänge
```

The section lists the user's own grants with name, state, source, from, until and a link to the
grant. From a stack you grant an access (picker, optional start and end) or revoke it with a
mandatory reason. Both post to the manual grant and the revocation, so the result is the same row
as on the grant screen, with the acting admin.

The same permissions apply: without `view entitlements` the section shows nothing, the grant button
needs `grant entitlements` and revoking needs `revoke entitlements`. The fieldtype stores nothing
on the user. On the create screen it asks to save first.
