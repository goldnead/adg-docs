# Payload templates

<AddonHeader />

A payload template is a string — usually JSON — with `{{ namespace:key }}` tokens
that are resolved at delivery time.

```json
{
  "id": "{{ entry:id }}",
  "title": "{{ entry:title }}",
  "site": "{{ site:handle }}",
  "updated_at": "{{ system:timestamp_iso }}"
}
```

This is a token renderer, not Antlers. There are no loops, no conditionals and no
modifiers, deliberately: a payload template is a data mapping, and a template
language in it becomes a place where logic hides.

## Namespaces

Each namespace is a **variable resolver**, and which ones are available depends on
the trigger that fired.

| Namespace | Available for | Resolves |
| --- | --- | --- |
| `entry` | `entry.*` triggers | the entry's fields, plus id, slug, url, permalink, collection |
| `form` | `form.submitted` | the submission's fields |
| `user` | `user.saved` | the user's fields |
| `asset` | `asset.saved` | the asset's path, filename, container, metadata |
| `site` | always | handle, locale, url, name |
| `system` | always | timestamps, app name, environment |
| `trigger` | always | the trigger handle and its metadata |
| `payload` | custom event triggers | whatever the event mapper returned |

A token whose namespace is not available for the current trigger resolves to empty
rather than throwing. That keeps a shared template usable across two triggers, and
means a typo in a namespace is silent — check a test delivery's rendered body rather
than assuming.

## Common tokens

```
{{ entry:id }}              {{ system:timestamp_iso }}
{{ entry:title }}           {{ system:timestamp }}
{{ entry:slug }}            {{ system:app_name }}
{{ entry:url }}             {{ system:environment }}
{{ entry:permalink }}       {{ site:handle }}
{{ entry:collection }}      {{ site:locale }}
{{ entry:<any field> }}     {{ trigger:handle }}
```

Any field on the entry is addressable by its handle, including nested ones for
grouped fields.

## Reusable templates

Templates can be saved and reused across hooks under **Webhooks → Templates**, with a
JSON editor and validation. A hook then references the template rather than carrying
its own copy.

Use a saved template when more than one hook sends the same shape — a canonical
"entry envelope" for three different destinations, say. Use an inline template when
the shape is specific to one destination, which is most of the time.

Editing a saved template changes every hook that references it, including the ones
you forgot about. That is the point, and it is also the risk: check the references
before editing.

## Presets write the template for you

Picking an [integration preset](/webhook-manager/outbound#integration-presets)
supplies a template shaped for that destination. You can edit it afterwards; the
preset is a starting point, not a mode.

## Validation

The JSON editor validates as you type, and a template that is not valid JSON is
refused on save. What it cannot validate is whether the *rendered* result is valid
JSON, which is a different question:

```json
{ "title": "{{ entry:title }}" }
```

An entry titled `He said "hello"` renders to broken JSON here, because the quotes are
not escaped.

::: warning Escaping is the renderer's job, and it needs the right context
Tokens inside a JSON string value are escaped for JSON. A token used **as** a
structural element is not something the renderer can fix. Keep tokens inside quoted
string values, and where you need a number or a boolean, make sure the source field
is one:

```json
{ "count": "{{ entry:count }}" }     // a string "42"
{ "count": {{ entry:count }} }       // a number 42, and broken if the field is empty
```

The first form is nearly always the right one. A destination that insists on a real
number is better served by a custom variable resolver than by an unquoted token.
:::

## Non-JSON payloads

The renderer is content-agnostic, so a form-encoded or XML body works the same way.
Set the `Content-Type` header on the hook to match; the addon does not infer it from
the template.

## Debug tools

**Webhooks → Debug** renders a template against a chosen source record and shows the
result, without sending anything. That is the fastest way to find out what
`{{ entry:some_field }}` actually contains for a grouped field or a relationship.

Behind the `use webhook debug tools` permission, and worth switching the whole module
off in production:

```php
'features' => ['debug_tools' => false],
```

## Adding a namespace

Register a variable resolver from a service provider's `boot()`:

```php
use Goldnead\WebhookManager\Facades\WebhookManager;

WebhookManager::registerVariableResolver(new ShopVariableResolver());
```

The resolver's handle becomes the namespace, so the above makes
`{{ shop:order_total }}` available. Implement
`Goldnead\WebhookManager\Contracts\TemplateVariableResolverInterface`. See
[Extending](/webhook-manager/extending).

Registering a resolver whose handle matches an existing one **replaces** it, which is
how you override `entry` if you must, and how you clobber it by accident if you pick
a careless handle.

## Masking in the Control Panel

Rendered bodies are masked in the CP according to `logging.mask_payload_keys`, and
reading them unmasked is the separate `view sensitive payloads` permission.

If your payload carries a field the default list does not catch, add it:

```php
'logging' => [
    'mask_payload_keys' => ['password', 'secret', 'token', 'api_key', 'apikey', 'iban'],
],
```
