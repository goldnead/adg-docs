# Bridges

<AddonHeader />

Five optional integrations. None is a Composer dependency, each is detected at runtime, and each
can be switched off while its addon is installed.

| Sibling | Marker class | Config switch | What it does |
| --- | --- | --- | --- |
| [LeadHub](/leadhub/) | `Goldnead\Leadhub\Facades\LeadHub` | `integrations.leadhub` | Finds or creates the contact and writes the resource's tags onto it |
| [Marketing](/marketing/) | `Goldnead\Marketing\Services\SubscriptionService` | `integrations.marketing` | Subscribes the confirmed address to the resource's mailing list |
| [Email Templates](/email-templates/) | `Goldnead\EmailTemplates\Facades\EmailTemplates` | `integrations.email_templates` | Renders both mails from a CP-authored template |
| [Suppression](/suppression/) | `Goldnead\Suppression\Facades\SuppressionGate` | `integrations.suppression` | Holds a send to a blocked address |
| [Activity](/activity/) | `Goldnead\Activity\Facades\Activity` | `integrations.activity` | Records the four domain events as facts |

## The three rules every bridge follows

**1. `class_exists` before anything else.** Not `interface_exists` on a contract the sibling might
rename, and not a config flag alone. The check is against the class the bridge actually calls.

**2. Never `method_exists()` on a facade class.** A facade answers every static call through
`__callStatic`, so it declares none of the methods it forwards, and
`method_exists(SomeFacade::class, 'thing')` is always `false`.

```php
// Wrong, and false even when the method is right there
method_exists(\Goldnead\Leadhub\Facades\LeadHub::class, 'findByEmail')

// Right: probe the object behind the facade
$facade::getFacadeRoot()
```

This is why a whole set of LeadHub bridges elsewhere in the suite silently did nothing. Each
bridge here probes `getFacadeRoot()` for the specific methods it needs.

**3. A sibling's failure is never this addon's failure.**

```php
protected function attempt(string $what, callable $callback)
{
    try {
        return $callback();
    } catch (\Throwable $e) {
        Log::warning('[lead-magnets] '.$what.' failed: '.$e->getMessage());

        return null;
    }
}
```

Delivering the resource is the promise. Tagging a contact is a courtesy. A broken sibling cannot
stop a download.

## The order on activation

```
leadhub  →  marketing
```

The contact first, because the tags are written onto it. The mailing-list subscription last,
because it is the only step that may itself start a second consent flow.

## LeadHub

On activation, `findByEmail()`, else `create(['email' => …, 'source' => 'lead-magnets'])`. The
returned id is written to `grants.contact_id`. Then `addTag()` for each entry in the resource's
`tags` list.

The contact id is stored as an unconstrained `string(64)` with no foreign key, because a foreign
key to a table that may not exist is not a constraint, it is an install failure.

Without LeadHub, `contact_id` stays null and the normalised email is the only subject the grant
has.

## Marketing

Runs only when the resource names a `marketing_list`, and only when a list with that handle
exists.

```php
$service->subscribe($list, $grant->email, [], [
    'source' => 'lead-magnets',
    'resource' => $handle,
]);
```

::: warning A resource request is not a mailing-list opt-in
The bridge deliberately does **not** borrow Marketing's double opt-in for the resource itself. The
confirmation this package sends is consent to receive one file; a mailing-list subscription is a
separate permission that a resource request may not silently grant.

`composer.json` suggests that Marketing "lends its double-opt-in wording to the confirmation
mail". That is not implemented anywhere. The confirmation wording comes from this package's own
translations or from Email Templates.
:::

Marketing is read from, never written to beyond that one subscribe call. Its own consent rules
apply from there.

## Email Templates

`resolve($slug)`, then a duck-typed read of the body (`html`, `body` or `content`) and the subject
(`subject` or `title`), then a simple interpolation replacing `{{ key }}` and `{{key}}`.

Falls back to the Blade view for an empty slug, a missing template, **and** a template whose body
is empty. A half-finished template in the Control Panel does not send an empty mail.

## Suppression

```php
$suppression->blocks($grant->email);   // bool
```

| Situation | Answer |
| --- | --- |
| Suppression not installed | `false`. Fails **open**, because there is nothing to ask |
| Installed, address clear | `false` |
| Installed, address blocked | `true`, the send is held |
| Installed, the gate throws | `true`, the send is held, and a warning is logged |

A held send does not fail the request. The grant is created or activated as normal and the reason
is written into `meta` as `last_hold`.

Two reasons exist: `confirmation_suppressed` and `delivery_suppressed`.

Suppression and Email Templates are called inline by the delivery service rather than through the
event listener wiring, which is why neither counts towards "is any sibling installed".

## Activity

Four fact types, one per domain event:

```
lead-magnets.resource.requested
lead-magnets.resource.confirmed
lead-magnets.resource.delivered
lead-magnets.resource.downloaded
```

Recorded with the grant as the subject, the address alongside it, and the event's payload as
properties.

**The confirmation secret never enters a payload.** Neither the plaintext token nor `token_hash`
nor any signed URL is in the event, and a test asserts it.

## Switching one off

```php
'integrations' => [
    'marketing' => false,
],
```

Turns the bridge off while the addon is present. Nothing turns a bridge **on** where the classes
are missing, because there would be nothing to call.

## Testing without the siblings

The five bridges expose their target class through a `protected` method rather than a constant:

```php
protected function facade(): string
{
    return \Goldnead\Leadhub\Facades\LeadHub::class;
}
```

That is the seam. A test subclasses the bridge, returns a stub class name and rebinds it as a
container singleton. It is a method rather than a `class_alias`, because an alias is process-global
and cannot be undone.

The package's own suite runs in a process where none of the five sibling classes exists, because
none of them is in `require` or `require-dev`. That is not a mocked absence, it is a real one.
