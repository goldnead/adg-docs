# Support

## Where to report

| What | Where |
| --- | --- |
| A bug in an addon | that addon's GitHub repository, under [github.com/goldnead](https://github.com/goldnead) |
| A commercial-licence question | the [Statamic Marketplace](https://statamic.com/addons) listing |
| A mistake or a gap on this site | [the docs repository](https://github.com/goldnead/adg-docs) — every page has a *Suggest a change* link at the bottom |
| Anything else | [info@adriangoldner.com](mailto:info@adriangoldner.com) |

## What to include in a bug report

Half the reports in this suite have been environment-specific rather than
logic-specific, so the environment is not a formality:

```
Addon + version:        goldnead/statamic-leadhub 1.10.1
Statamic / Laravel:     6.18 / 12.x
PHP:                    8.3
Database:               MySQL 8.0
Storage driver:         eloquent
Multi-brand:            off
Queue connection:       redis, worker running
Users repository:       file | eloquent (+ custom user model?)
```

The last two lines matter more than they look. A queue that is not being worked
and an Eloquent users repository with a custom user model are between them
responsible for a large share of "it does nothing" and "it crashes on save".

Then the useful output:

```bash
php artisan webhook-manager:health
php artisan leadhub:brand-integrity
php artisan marketing:consent-integrity
php artisan notifications:uniqueness-integrity
```

Plus the relevant `laravel.log` excerpt. Because the suite is fail-safe by
design — an addon catches its own exception, logs it, and returns — **the log is
often the only place the failure is visible at all**. A form submission that
silently did not create a contact has a stack trace in `laravel.log` and nothing
anywhere else.

## Reproducing

Four of the addons ship a script that builds a throwaway Statamic install with the
addon wired in as a path repository, which is the fastest way to prove a bug is
in the addon rather than in your project:

```bash
./scripts/setup-playground.sh      # webhook-manager, automations, leadhub, marketing
cd playground && php artisan serve  # → http://127.0.0.1:8000/cp
```

`./scripts/smoke-test.sh` in LeadHub and Webhook Manager goes further and asserts
an end-to-end path — a real form submission through the real listener into both
storage drivers, or a rendered payload template delivered through the real
delivery engine. It exits non-zero on the first failed step and leaves the broken
project in place so you can go and look.

## Security

Do not open a public issue for a security problem. Email
[info@adriangoldner.com](mailto:info@adriangoldner.com) directly.

Two things worth knowing about the suite's security posture when you report:

- Payload bodies are masked in the Control Panel and reading them unmasked is a
  separate permission (`view sensitive payloads`).
- Activity's sanitizer redacts secret-shaped keys at any depth on every write, and
  Automations can encrypt run logs at rest. If you find personal data or a secret
  in a place it should not be, that is a bug in the sanitizer or the masking rules,
  and it is worth reporting even if the data is only visible to a superuser.

## Contributing

Pull requests are welcome on the MIT-licensed addons.

1. Open an issue first to discuss the change.
2. Add tests for new domain behaviour.
3. Keep the scope tight, one concept per PR.
4. If you touch a migration, run the MySQL suite:
   `vendor/bin/pest -c phpunit.mysql.xml`. A green SQLite run is not evidence.

## Contributing to these docs

The site is [VitePress](https://vitepress.dev) and the content is markdown. Every
page has an edit link.

```bash
git clone git@github.com:goldnead/adg-docs.git
cd adg-docs
npm install
npm run dev
```

The addon registry lives in `.vitepress/addons.mjs` and generates the navigation
and every addon's sidebar. Adding an addon means adding one entry there and
creating the pages it lists; the uniform section structure comes for free, which
is the point.

`npm run build` fails on a dead internal link, so a broken cross-reference cannot
be merged.
