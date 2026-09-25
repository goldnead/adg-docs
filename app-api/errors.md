# Errors

<AddonHeader />

Every error has one shape:

```json
{ "error": { "code": "not_member", "message": "You are not a member of this team.", "field": "team" } }
```

`code` is stable, `message` is translated, `field` names the input, and `details` carries what
the client needs to act: `blockers`, `products`, `quota`, `retry_after`, `method`. Branch on
`code`, show `message`.

| Status | Codes |
| --- | --- |
| 400 | `stateful_origin_required` |
| 401 | `unauthenticated`, `tokens_disabled` |
| 402 | `payment_required` |
| 403 | `forbidden`, `two_factor_setup_required`, `token_ability_missing`, `not_member`, `invitation_wrong_email`, `join_disabled`, `impersonation_locked`, `email_unverified`, `invalid_signature` |
| 404 | `not_found`, `product_not_found`, `invitation_not_found`, `join_code_invalid`, `export_disabled`, `portal_disabled` |
| 409 | `consent_changed`, `two_factor_already_enabled`, `already_verified`, `verification_disabled`, `deletion_blocked`, `account_refused`, `offer_unavailable`, `sold_out`, `tokens_unsupported`, `cancel_elsewhere` (with `details.cancellation_url`), `cancel_busy`, `pause_unavailable`, `switch_unavailable`, `method_unavailable` |
| 410 | `invitation_expired`, `invitation_used`, `invitation_revoked` |
| 419 | `csrf_token_mismatch` |
| 422 | `validation_failed` (with `details.errors`), `invalid_credentials`, `passkey_required`, `invalid_passkey`, `two_factor_not_started`, `reset_failed`, `email_rejected`, `consent_required`, `idempotency_key_reused`, `checkout_refused`, `confirmation_required`, `pause_date_invalid`, `team_required`, `unknown_role`, `last_owner`, `already_member`, `personal_team`, `code_unavailable`, `request_refused` |
| 423 | `elevation_required` (with `details.method`, `details.confirm_url`), `read_only` |
| 429 | `too_many_requests` (with `Retry-After`), `too_many_attempts`, `quota_exceeded` |
| 503 | `provider_unavailable`, `cancel_failed`, `pause_failed`, `resume_failed`, `switch_failed`, `method_failed` |

Which codes each endpoint can answer is listed per operation in the
[OpenAPI description](https://github.com/goldnead/statamic-app-api/blob/v0.2.0/openapi.json).

The messages live in `lang/{de,en}`; publish them with `--tag=app-api-translations` to change
the wording without touching a code.
