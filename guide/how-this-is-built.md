# How this is built, and how it is checked

Twenty-four Statamic addons went public in four months. That is not a normal pace for one
person, and if you looked at the commit history before reading this, you already know why:
most of the code was written by an AI agent, with me directing it. The commits say so. This
page says the rest.

You are not being asked to take that on faith. Everything below is checkable before you pay.

## What that means, concretely

I decide what gets built, what the constraints are, and what ships. An agent writes most of
the code and most of the tests. I review, reject, and send work back. Some addons went through
five or six rounds before they were tagged; some features were built twice because the first
version was wrong.

The parts an agent is bad at are the parts I do myself: deciding that a feature is worth
having, noticing that a screen feels wrong, and saying no.

## Why this is on the page instead of quietly true

Because you would find it anyway. Of the commits in the public repositories, most carry a
`Co-Authored-By: Claude` line, and some are attributed on GitHub to the `claude` account
outright. Nothing is hidden, so nothing is worth pretending about.

The honest version of the concern is not "an AI wrote this". It is three questions that would
apply to any small vendor:

1. **Does it work, or does it only look like it works?**
2. **Will it still be here in a year?**
3. **Does anyone understand it when it breaks?**

## 1. Does it work

| Counted on 5 September 2026 | |
|---|---|
| Public packages | 25 |
| Test files | 675 |
| Test methods | 2,529 |
| Packages with CI on every push | 24 of 25 |

Every package is public on Packagist. You can `composer require` any of them, build with them
on your own machine, and find out whether they hold up **before** you buy a licence. That is
deliberate: there is no licence key and no activation, so nothing stops you from evaluating
the real thing rather than a demo of it.

The [maturity page](/guide/maturity) grades every addon as proven, new, or experimental, and
says which ones have never run on a production site. It is not marketing copy; it exists so
you do not put an experimental package on a client site by accident.

The [demo](https://demo.adriangoldner.dev) runs every addon with the Control Panel open.

## 2. Will it still be here

The packages are MIT or proprietary, but all of them are **source-available on GitHub**, and
the eight foundation packages are MIT outright. If I stop maintaining this tomorrow, you have
the code, you have the tests, and your installation keeps running: nothing phones home, and
nothing switches off when a licence term ends.

That is the actual insurance. Not a promise about my future.

## 3. Does anyone understand it

This is the fair version of the worry, and the honest answer is: the commit messages are the
documentation of intent. They are unusually long for a reason. A typical one states the
problem, the alternative that was rejected, and why. When something breaks, that history is
what you read.

Read a few before you decide. They are public.

## What this does not claim

- **Not that AI review replaces judgement.** Where a decision needed a human, it got one, and
  where it still needs a lawyer or a tax adviser, the page says so rather than guessing.
- **Not that everything is proven.** Three packages are marked experimental, and the maturity
  page names them.
- **Not that it is finished.** The suite is weeks old in places. The
  [changelogs](https://github.com/goldnead) are the real record.

## If this is a dealbreaker

That is a legitimate position, and I would rather you decide it now than after a purchase.
Everything you need to judge is public: the code, the tests, the CI runs, the commit history.
Nothing about how this was built is behind the paywall.
