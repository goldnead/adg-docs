# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=suppression-config
```

```php
// config/suppression.php

return [
    'scopes' => [
        'hard_bounce' => 'global',
        'invalid_email' => 'global',
        'soft_bounce_threshold' => 'global',
        'provider_import' => 'global',
        'complaint' => 'brand',
        'manual' => 'brand',
    ],

    'soft_bounce' => [
        'threshold' => (int) env('SUPPRESSION_SOFT_BOUNCE_THRESHOLD', 5),
        'window_days' => (int) env('SUPPRESSION_SOFT_BOUNCE_WINDOW_DAYS', 30),
    ],

    'release' => [
        'min_reason_length' => (int) env('SUPPRESSION_MIN_REASON_LENGTH', 20),
    ],
];
```

Three groups, and only the middle one is a number you are likely to change.

## `scopes`

Whether a reason blocks an address everywhere or only in the brand that recorded it.

| Key | Default |
| --- | --- |
| `scopes.hard_bounce` | `global` |
| `scopes.invalid_email` | `global` |
| `scopes.soft_bounce_threshold` | `global` |
| `scopes.provider_import` | `global` |
| `scopes.complaint` | `brand` |
| `scopes.manual` | `brand` |

The split is by kind of fact rather than by convenience: a hard bounce is a property of the
mailbox and bounces identically from every brand, while a complaint is a property of a
relationship and says nothing about anybody else. The full argument is in
[Brands and scope](/suppression/brands).

The two permitted values are `global` and `brand`, available as `Reasons::SCOPE_GLOBAL` and
`Reasons::SCOPE_BRAND`.

::: tip Changing a scope is a config change, never a migration
`brand_id` is stored explicitly on every row and `0` means "every brand". Forcing everything
global means always writing `0`; forcing everything brand-scoped means never writing it. Rows
already written keep the scope they were written with — a change applies from the next write on,
not retroactively.
:::

## `soft_bounce`

```php
'soft_bounce' => [
    'threshold' => (int) env('SUPPRESSION_SOFT_BOUNCE_THRESHOLD', 5),
    'window_days' => (int) env('SUPPRESSION_SOFT_BOUNCE_WINDOW_DAYS', 30),
],
```

An individual soft bounce is never a suppression: a full mailbox is a fact about today. Only a
run of them inside the window promotes an address, and `recordDelivery()` resets the window.

| Key | Default | Environment variable |
| --- | --- | --- |
| `soft_bounce.threshold` | `5` | `SUPPRESSION_SOFT_BOUNCE_THRESHOLD` |
| `soft_bounce.window_days` | `30` | `SUPPRESSION_SOFT_BOUNCE_WINDOW_DAYS` |

Five in thirty days is a starting value chosen before there was any real data, and it lives in
config for exactly that reason. Read both back with `Suppression::softBounceThreshold()` and
`Suppression::softBounceWindowDays()` rather than reaching for `config()` in a consumer, so a
host that swaps the service keeps one answer.

Raising the threshold makes the package slower to block and more forgiving of a mail server
having a bad week. Lowering it protects sending reputation sooner at the cost of blocking
mailboxes that would have recovered. Neither direction is safe by default, which is why there is
a number here instead of a decision.

## `release`

```php
'release' => [
    'min_reason_length' => (int) env('SUPPRESSION_MIN_REASON_LENGTH', 20),
],
```

The minimum length of the stated reason a deliberate complaint release must carry. It applies to
`releaseComplaint()` and to `suppression:release --force`, and to nothing else: an ordinary
release needs no reason at all.

Twenty characters exists so that "ok" does not satisfy the requirement. The point of the field is
that it still means something to whoever reads it a year later, and a one-word entry is a
checkbox wearing a text input's clothes. See
[Recording and releasing](/suppression/recording#complaints-are-the-exception).

## What is not configurable

- **That the gate falls closed.** It throws rather than answering `false` when it cannot
  establish an answer, and no setting relaxes that. Replacing the behaviour means replacing the
  binding, which is [an extension point](/suppression/extending) rather than a config key.
- **Normalization.** Trim and lowercase, nothing else, in both this package and LeadHub. A
  configurable normalizer would let the two keys drift apart, and a suppression the gate cannot
  find is worse than no suppression.
- **That a complaint release needs a separate call.** `release()` refuses complaints
  unconditionally.
- **That events are append-only.** The event model refuses updates and deletes at the model
  level.
- **Retention.** This package deletes nothing and ships no pruning command. A suppression is
  released, never removed, and the event log is the evidence that the release happened.

## Environment summary

```dotenv
SUPPRESSION_SOFT_BOUNCE_THRESHOLD=5
SUPPRESSION_SOFT_BOUNCE_WINDOW_DAYS=30
SUPPRESSION_MIN_REASON_LENGTH=20
```

`scopes.*` has no environment variables; it is a config-file decision.
