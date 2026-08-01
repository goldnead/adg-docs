# Permissions

Every addon with a Control Panel screen registers Statamic permissions in its own
group. Assign them to roles under **CP → Users → Roles**.

Nothing in the suite invents its own authorisation layer. A permission check is
always `$user->can('…')`, which means Statamic's own `Gate::after` hook decides,
which means a superuser passes everything.

## The full list

### Brand Context

| Permission | Grants |
| --- | --- |
| `manage brand members` | the **Users → Brand Members** screen, in multi-brand mode |

### Webhook Manager

| Permission | Grants |
| --- | --- |
| `view webhooks` | the Webhooks section at all |
| `manage outbound webhooks` | create, edit and delete outbound hooks |
| `test outbound webhooks` | the "send test" button |
| `view webhook deliveries` | the delivery list and detail |
| `view sensitive payloads` | unmasked request and response bodies |
| `replay webhook deliveries` | single and batch replay |
| `manage inbound endpoints` | inbound endpoint CRUD |
| `manage webhook rules` | the rule builder |
| `manage webhook templates` | payload template CRUD |
| `manage webhook settings` | the settings screen, including the storage driver |
| `use webhook debug tools` | the debug utilities |

`view sensitive payloads` is the one to be deliberate about: without it, payload
bodies are masked according to the addon's masking rules. It is a separate
permission precisely so that a support role can read delivery status and error
messages without reading customer data.

### Automations

| Permission | Grants |
| --- | --- |
| `view automations` | the Automations section |
| `create automations` · `edit automations` · `delete automations` | authoring |
| `enable automations` | flipping an automation live |
| `run automation tests` | test runs against sample data |
| `view automation runs` | the run history and node logs |
| `retry automation runs` | partial retry from a node |
| `manage automation settings` | the settings screen |

`enable automations` is separate from `edit automations` on purpose: it lets you
give somebody the builder without giving them the ability to point a live flow at
production.

### LeadHub

| Permission | Grants |
| --- | --- |
| `view leadhub` | the LeadHub section, and eligibility to be assigned a lead |
| `view leadhub contacts` | the contact list and detail |
| `create leadhub contacts` · `edit leadhub contacts` | authoring |
| `delete leadhub contacts` · `archive leadhub contacts` | removal |
| `export leadhub contacts` | CSV export |
| `manage leadhub tags` | tag CRUD |
| `manage leadhub form mappings` | which forms feed LeadHub, and the field map |
| `manage leadhub segments` · `view leadhub segments` | segments |
| `manage leadhub scoring` | the per-brand point table |
| `manage leadhub tasks` · `manage leadhub opportunities` · `manage leadhub companies` | the CRM-core modules |
| `manage leadhub settings` | settings |

`view leadhub` doubles as the assignability test: the people offered as a lead
owner, a task assignee or an opportunity owner are the users who may
`view leadhub` **and** belong to the current brand. Superusers are not exempt
from the brand part.

### Marketing

| Permission | Grants |
| --- | --- |
| `view marketing` | the Marketing section |
| `manage marketing lists` | list CRUD, including double-opt-in settings |
| `manage marketing subscribers` | subscription state by hand |
| `manage marketing campaigns` | composing and scheduling |
| `send marketing campaigns` | actually sending |
| `manage marketing templates` | email template CRUD |

`send marketing campaigns` is deliberately separate from
`manage marketing campaigns`. Writing the newsletter and pressing send to four
thousand people are different levels of trust.

### Activity

| Permission | Grants |
| --- | --- |
| `view activity` | the read-only ledger inspector at **Tools → Activity** |

Activity registered a second permission, `manage activity retention`, up to
1.0.6. It was removed in 1.1.0 because nothing checked it: pruning and
anonymising happen through Artisan commands, and Artisan does not consult
gates. A checkbox that controls nothing is worse than no checkbox. Restrict
those operations by restricting who can run Artisan.

### Notifications

| Permission | Grants |
| --- | --- |
| `view notifications` | the read-only inspector at **Tools → Notifications** |
| `manage notification digests` | nothing, at present |

::: warning `manage notification digests` is not enforced
It is registered, so it appears in the role editor, but no code checks it. The
only authorisation in Notifications is `view notifications` on the inspector;
the digest commands run through Artisan, which does not consult gates. Granting
or withholding it changes nothing today. This is the same problem Activity
solved by removing its equivalent permission.
:::

### The packages that register no permissions

Email Templates, Table of Contents, Identity Contracts, Suppression and
Preference Center register none.

Email Templates uses a native Statamic collection, so the ordinary collection
permissions apply. Table of Contents has no Control Panel surface at all.
Identity Contracts and Suppression are libraries with no Control Panel surface.
Preference Center serves public pages only: its authorisation is the magic-link
token, not a role.

## Writing a permission check against these addons

Use `can()`, and never the raw auth user's Statamic-specific methods:

```php
// correct
$user->can('view leadhub');

// crashes on an install with eloquent users and a custom user model
$user->hasPermission('view leadhub');
$user->isSuper();
$user->id();
```

An install can use Eloquent users with `App\Models\User`, in which case the guard
returns something that has none of those three methods. `can()` works either way
because Statamic hooks into the gate. If you genuinely need `isSuper()`, go
through `Statamic\Facades\User::fromUser($user)`, and use `getAuthIdentifier()`
in place of `id()`.

See [Identity](/guide/identity#the-eloquent-users-trap).
