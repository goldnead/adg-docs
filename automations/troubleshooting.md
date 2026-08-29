# Troubleshooting

<AddonHeader />

## The automation never runs, and there is no run

No run means the trigger never matched. In order:

1. **Is it enabled?** Every imported and template-installed automation starts disabled.
2. **Does the trigger's scope cover the event?** A Form Submitted trigger scoped to one
   form will not fire for another.
3. **Is a brand current?** In multi-brand mode a console command or worker with no brand
   sees no automations.
4. **Is Webhook Manager doing it instead?** If both are installed, check both.
5. **Is the trigger registered at all?**
   `array_keys(Automations::nodes()->all())` lists every registered handle.

## The run is stuck at `waiting`

A Delay node parked it, and nothing is resuming it. This is the quietest failure in the
suite: no error, no failed job, no alert.

```bash
php artisan schedule:work           # the real fix
php artisan automations:run-due     # to unstick the ones already waiting
```

## Entry Published fires on every save

It is `EntrySaved` gated on `published()`, because Statamic 6 has no `EntryPublished`
event. Every save of a published entry fires it.

Add a Filter comparing the previous state if you need the draft-to-published transition
specifically.

An earlier release did not gate it at all and fired on drafts too; if you see that, you
are on a version before the fix.

## The run is `stopped` and I expected it to act

`stopped` means a Filter or a Stop node ended it deliberately. Open the node log and look
at what the filter was **handed**, not at what you think it should have been handed.

The usual cause is a token that resolved to empty: a wrong field handle, or a namespace
the trigger does not provide. Use the token picker rather than typing tokens.

## A token resolves to nothing

What is in the context depends on the trigger. `{{ lead.status }}` on a Form Submitted
trigger resolves to nothing, silently.

For a custom event trigger, the context contains whatever your `payload` mapper returned,
under the key you named. With no mapper the listener serialises the event via `toArray()`
or its public properties — which for an event holding a private property produces nothing
at all.

## A test run passed but the real run failed

Test mode performs no real side effects by default:

```php
'test_mode' => [
    'send_real_webhooks' => false,
    'send_real_emails' => false,
    'persist_leadhub_changes' => false,
    'persist_statamic_changes' => false,
    'call_real_ai' => false,
],
```

So a green test proves the flow is right, not that the destination accepts the payload or
that the LeadHub field you are writing exists. Flip the one switch you need, run the test
again, then flip it back.

## Retrying a failed run duplicates work

Use **partial retry**, which resumes from the failing node with the context the run
already had. A full retry re-runs the earlier nodes, which is how you get two leads and
two tags.

Behind the `retry automation runs` permission.

## A LeadHub node is missing, or fails on every install

Missing: LeadHub is not installed, or the class names under
`integrations.leadhub.detect` do not match the version you run.

Failing on every real install: this was a genuine bug in 1.0.2 and earlier. The adapters
called `method_exists` on the **facade class**, which returns `false` for anything
forwarded through `__callStatic`, so every LeadHub action node failed everywhere while
passing in a testbench. Fixed in 1.0.3 by resolving `getFacadeRoot()` first.

If you write your own integration, check the root:

```php
method_exists(LeadHub::getFacadeRoot(), 'segmentMemberIds');
```

## Row actions in the CP return 404

Fixed in 1.0.2. The index page passed the wrong `apiBase`, so Delete, Toggle, Duplicate
and Export all 404'd. Upgrade.

## A custom node does not appear in the library

1. **Registered in `register()` instead of `boot()`.** Statamic boots addon providers
   first, so the registries only exist by `boot()`.
2. **Wrapped in `app->booted()`.** Statamic already calls `bootAddon()` inside one, so
   nesting fires immediately and is still too early.
3. **Handle collision.** A matching handle **replaces** rather than adds.

Ask the registries:

```php
array_keys(Automations::nodes()->all());          // every registered handle
Automations::nodes()->has('shop_order_shipped');  // yours specifically
Automations::describe(ShopOrderShippedAction::class);  // is the class itself valid?
```

`describe()` takes a class and validates that one class; it throws with a message naming
what is wrong. It is not a registry dump, and calling it with no argument is a `TypeError`.

So: `describe()` passes, the handle is not in `nodes()->all()`, and nothing threw → it is
the licence gate, or the registration code never ran.

## An imported automation does not work

Ids do not travel between environments. A node configured with an entry id, a Webhook
Manager destination or a LeadHub tag that exists only on the source environment imports
cleanly and fails at run time.

Run **Validate**, check every environment-specific node, and **Test** before enabling.

## `automations:sync` does nothing

File sync is a deploy step, not a live binding. Editing a JSON file has no effect until
the command runs, and the database remains the engine's store.

Check `features.file_storage` and `file_storage.enabled` are both on.

## Encrypted run logs are unreadable

`APP_KEY` changed. `runs.encrypt_context` uses Laravel's `Crypt`, so rotating the key
without re-encrypting makes existing rows unreadable.

There is no recovery from a lost key. Turn this setting on once, early, and treat
`APP_KEY` accordingly.

## The runs table is enormous

**`automations:prune` is not scheduled by the addon.** Only `automations:run-due` and
`automations:run-scheduled` are. If nobody added a schedule entry, nothing has ever
pruned:

```php
// routes/console.php
Schedule::command('automations:prune')->daily();
```

```bash
php artisan automations:prune --dry-run   # how many rows would go
php artisan automations:prune             # clear the backlog now
```

Also check `runs.prune_after_days` is not `null`, which disables pruning entirely, and
consider `store_node_io => false` only as a last resort — it costs you the debugging log.

## A CP screen is blank

Assets were never published. The config tag publishes configuration, not assets — the
assets come from Statamic's own install hook:

```bash
php artisan statamic:install
```

Statamic publishes addon assets from a `statamic:install` hook in `post-autoload-dump`.
Without that hook nothing publishes. On a cold Docker build it needs `CACHE_STORE=array`
and an existing SQLite file.

## A CP 404 renders the site layout and then 500s

Your application's Inertia middleware is handling CP routes. Statamic 6's CP is itself
Inertia, and its catch-all is GET-only, so a non-GET request to a missing CP route falls
into the front-end catch-all.

```php
if (\Statamic\Statamic::isCpRoute()) {
    return $next($request);
}
```

## An automation triggers itself

An action mutated a record that fires the same trigger. `max_call_depth` (default 3) is
the backstop and the engine refuses past it.

Raising the limit lengthens the loop rather than fixing it. Add a Filter that excludes the
state your own action produces — a tag, a status, a field the automation sets.

## It fires twice

Both this addon and Webhook Manager are wired to the same event and destination. Both
configurations look individually correct, which is why the failure is silent.

Symptom: an automation run log **and** a Webhook Manager delivery, milliseconds apart.
Delete whichever you did not mean to keep. See [Boundaries](/guide/boundaries).
