# Events

<AddonHeader />

Every change of state is a Laravel event with a serialisable payload: ids and addresses,
never a link or a token. All live in `Goldnead\Accounts\Events` and carry `user_id`,
`email` and `name`.

| Event | Trigger handle | Payload beyond `user_id`, `email`, `name` | Mail |
| --- | --- | --- | --- |
| `EmailVerificationSent` | `accounts.verification.sent` | | `accounts-verify-email` |
| `EmailVerified` | `accounts.email.verified` | | |
| `EmailChangeRequested` | `accounts.email_change.requested` | `new_email` | `accounts-confirm-email-change` |
| `EmailChanged` | `accounts.email.changed` | `old_email` (`email` is the new one) | `accounts-email-changed`, to the old address |
| `AccountDeletionRequested` | `accounts.deletion.requested` | `scheduled_for` | `accounts-deletion-scheduled` |
| `AccountDeletionCancelled` | `accounts.deletion.cancelled` | | |
| `AccountDeletionBlocked` | `accounts.deletion.blocked` | `reasons` (how many) | `accounts-deletion-blocked` |
| `AccountDeleting` | (hook, no trigger) | | |
| `AccountDeleted` | `accounts.deleted` | | `accounts-account-deleted` |
| `PersonalDataExported` | `accounts.data.exported` | `sections`, `requested_by` | |

## `AccountDeleting` is a hook

It is dispatched synchronously inside the purge's transaction, while the user still exists,
for addons that must clean up: cancel something, anonymise a contact. A listener that throws
rolls the deletion back and keeps that one account scheduled; the next daily run tries
again. For data that belongs to your addon, prefer an [eraser](/accounts/deletion#your-own-data-an-eraser):
it can also say what blocks a deletion, and its result is recorded.

## Automations and webhooks

With [Automations](/automations/) installed, every event except `AccountDeleting` is an
automation trigger in the group **Accounts**, with its context under `account.*`. With
[Webhook Manager](/webhook-manager/), every such event is a webhook trigger. Both register
through the siblings' own `registerEventTrigger()`, and both can be switched off with
`integrations.automations` and `integrations.webhook_manager`.

The [wiring screen](/accounts/control-panel#wiring) shows, for each event, how many
automations and webhooks listen to it.

## One confirmation, one event

When Laravel's own verification is in use (see [Mails](/accounts/mails#one-confirmation-mail-not-two)),
Laravel's `Verified` event is turned into this addon's `EmailVerified`, with the same ledger
entry. A listener on `EmailVerified` therefore hears every confirmation, whichever mail sent
the link.
