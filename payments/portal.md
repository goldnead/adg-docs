# The customer portal

<AddonHeader />

A buyer without an account can see their orders, download the invoice, cancel a subscription,
put a different card on file and, from **1.25**, pause or switch a subscription where you allow
it. There is no password: the way in is a signed link, valid for thirty minutes, mailed to the
address on the order. On by default, because § 312k BGB requires a cancellation button on the
site where the contract was concluded.

<Figure
  src="payments-portal-pause"
  alt="The portal page Ihre Bestellungen, German: a greeting line, two running memberships, one paused until 28.10.2026 with a Fortsetzen button, one running with a Pausieren button, each with Verträge hier kündigen and Zahlungsmittel ändern, and the orders below"
  caption="The portal with pausing allowed. The paused contract offers Resume and says nothing is charged until the next regular billing day." />

```
GET  /!/statamic-payments/konto/anmelden     ask for a link
GET  /!/statamic-payments/konto/kuendigen    where the § 312k cancellation button goes
GET  /!/statamic-payments/konto/             orders and running contracts
```

Put `route('statamic-payments.portal.request')` and, for the statutory button,
`route('statamic-payments.portal.cancel.entry')` in your footer. The prefix is
`portal.prefix` (env `STATAMIC_PAYMENTS_PORTAL_PREFIX`). The cancellation itself is described in
[Consent, withdrawal and cancellation](/payments/recht).

## How it looks

| Key | |
| --- | --- |
| `portal.logo_url` | A web address or a path on this site, shown above every portal page. Env `STATAMIC_PAYMENTS_PORTAL_LOGO`. |
| `portal.logo_alt` | Its text. Defaults to the app name. |
| `portal.greeting` | A few words of your own above the list. Plain text. |

All three, like the switches below, are editable per brand on the shared settings screen.

### Du or Sie

`anrede` (`sie` or `du`, env `STATAMIC_PAYMENTS_ANREDE`, since 1.29) sets how the German texts
address the buyer: portal, checkout refusals, withdrawal and cancellation pages, the confirmation
mails, reminders and dunning. The default `sie` is the wording the addon has always shipped. Pick
the one the rest of your site speaks: an account area that says "du" on one page and "Ihr Vertrag"
on the next reads like two shops. The statutory button words contain no form of address and are
the same either way. English is not affected.

The `du` lines ship in `lang/de/du/`. **Published views bypass the setting** if they were published
before 1.29: they call `__()` directly. Publish them again, or replace `__('statamic-payments::…')`
in your copies with `\Goldnead\StatamicPayments\Support\Anrede::trans('statamic-payments::…')`.

## What the buyer may do

| Key | Default | |
| --- | --- | --- |
| `portal.self_cancel` | `true` | Whether the portal shows the cancel button. A product overrides it with `portal_cancel` in its catalogue entry. |
| `portal.allow_pause` | `false` | Whether the buyer may pause and resume. A product overrides it with `pausable`. |
| `portal.allow_switch` | `false` | Whether the buyer may move to another product. Only what the current product lists under `switch_to` is offered. |

**Turning `self_cancel` off does not switch off the right.** The cancellation without login
stays open, and the portal points there instead of offering its own button.

Pausing in the portal asks for an optional date to resume on and says that nothing is charged
until the next regular billing day. Switching shows the new price and, for an upgrade, the
difference charged now. What happens behind both is on
[Pausing, switching and replacing](/payments/subscription-changes).

A contract that is being changed at the provider at this moment shows "please try again in a
moment" instead of an action. The statutory cancellation button is the exception: it is always
accepted, noted on the row and carried out once the change is done.

The amounts shown are the amounts charged: with a running coupon, the lowered amount and the date
of the last charge the coupon covers.

## Updating the views

The portal's pages are Blade views of this addon. 1.25 adds pages for pausing and switching and
changes the overview. If you published the views before, publish them again, or merge the new
ones into your copies:

```bash
php artisan vendor:publish --tag=statamic-payments-views --force
```

`--force` overwrites your published copies. Without published views there is nothing to do.
