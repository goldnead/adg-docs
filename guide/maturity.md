# Maturity

**This suite is work in progress.** Twenty-four packages went public inside five
weeks. They are tagged, they are on Packagist, they have documentation, and the
documentation reads finished. That last part is misleading, so this page says
plainly what is behind each package.

None of them is abandoned and none of them is a toy. But there is a real
difference between an addon that has run four brands in production since spring
and one that has never been installed anywhere, and a reader deciding what to put
on a client site needs to see that difference before installing, not after.

## The three levels

<MaturityTable />

## What a level does and does not promise

**Proven** means the addon has run on live sites for months, across several
brands, and its behaviour under real data is known. Breaking changes go through a
major version. It does not mean bug-free.

**New** means the addon is installed and working in production, but it shipped in
August 2026. Its edges have not been hit yet. Expect faster-moving minor
releases, and read its changelog before upgrading rather than after.

**Experimental** means nobody has proven it on a production site. The code is
written, the tests it has pass, and it may be perfectly fine — but no one has
found out yet. If you install one of these, budget for being the first person to
find something.

## How a level is decided

Three questions, in this order:

1. **Is it running on a live site, and for how long?** This is the one that
   counts. A package with a thousand tests that nobody has installed is
   experimental; a package with two hundred that has run four brands since spring
   is proven.
2. **Does it carry its own test suite and CI?** Every addon in the suite has
   tests except Flow Canvas, and every one runs them in CI except Flow Canvas and
   Invoices.
3. **Which paths have actually been exercised?** An addon can be installed
   everywhere and still have a whole feature nobody has used. Where that is true,
   it is written down as a note next to the addon above, rather than hidden
   inside a level.

The level lives in `.vitepress/addons.mjs`, in one map, next to the licence.
Everything on this site that shows a level reads it from there: the card on the
hub page, the chip in each addon's header, and the table above. There is no
second place to update and therefore no second place to forget.

## If you are putting one of these on a client site

- Read the addon's own changelog first. A **New** addon's minor releases move
  fast, and some of them change behaviour.
- Pin to a tag, not to `dev-main`. Every package is tagged and on Packagist.
- Do not install an **Experimental** addon on a site you cannot roll back.
- Tell us. Nothing here has a phone-home and no addon counts your contacts,
  deliveries or runs, which also means we have no idea who is running what. If
  you are using one in production, [info@adriangoldner.com](mailto:info@adriangoldner.com)
  is the address — it is what moves an addon from **New** to **Proven**.

## This is not the same as licensing

A level says how far along an addon is. It says nothing about whether it costs
money, and the two do not line up: some MIT packages are proven, and some
commercial ones are new. Sixteen packages are commercial and exactly one of them
can be bought today. That is a separate problem with a separate page:
[Licensing](/guide/licensing).
