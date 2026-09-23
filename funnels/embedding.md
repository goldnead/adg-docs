# Embedding and in-app browsers

<AddonHeader />

A funnel can open as a popup or sit inline on another website, and it warns a visitor who
opened it inside the browser of a social app.

## Popup and inline

```html
<script src="https://your-site.com/vendor/statamic-funnels/embed.js" async></script>

<a href="https://your-site.com/f/course" data-funnel-popup>Sign up</a>
<div data-funnel-embed="https://your-site.com/f/course"></div>
```

Any element with `data-funnel-popup` opens the popup: a button, an image, a text link. Its value
or its `href` is the address. `data-funnel-embed` sits inline, and the frame grows with the page,
margins included, and again when a bump shows or hides. The editor shows both snippets under
**Settings → Embedding**.

<Figure
  src="funnels-embed-popup"
  alt="A choir's website, darkened, with the funnel's first page open in a popup on top: the headline Stimmbildung im Chor, one line of text and a Weiter button, a close button in the corner"
  caption="A funnel opened as a popup on another website, in the playground." />

`embed.js` ships in the front-end assets, so it needs the
[publish step](/funnels/installation#the-third-command-is-not-optional).

## Which sites may frame it

Every funnel page sends `Content-Security-Policy: frame-ancestors 'self'` plus the domains
listed on that funnel (**Settings → Embedding**), and removes `X-Frame-Options`. A site that is
not on the list shows an empty frame.

::: warning Behaviour change in 1.17
Before 1.17 funnel pages sent no frame policy of their own. A site that frames a funnel page
from **another domain** today has to list that domain on the funnel, or the frame stays empty
after the update. Framing from your own domain keeps working.
:::

### Your site's own headers win

A CSP middleware of the site, or a web server that sets `X-Frame-Options: SAMEORIGIN` or
`DENY` (nginx `add_header`, Apache `Header set`), is applied after this addon and blocks the
embed. Exempt the funnel routes there (`/f/*` with the default
[`route_prefix`](/funnels/configuration#route-prefix)), or let them keep the
`frame-ancestors` this addon sends. A middleware that replaces the whole
`Content-Security-Policy` header replaces this one too; add to it rather than overwrite it.

## How the visit travels without cookies

Inside a frame on another site, the browser holds back this site's cookies. So the walk
travels signed in the page's links and forms (`w`, `_walk`), valid for
[`embed.link_minutes`](/funnels/configuration) (180 by default).

- A signed walk counts **only inside a frame**: `embed=1`, and the browser reports
  `Sec-Fetch-Dest: iframe`. A link with somebody else's walk, opened normally, is ignored, so
  nobody can put a visitor into someone else's visit by sending a link.
- Inside a frame no cookie is ever written, and an existing cookie is never overwritten.
- The signed walk is removed from the address before any script on the page runs, so a pixel
  cannot send it along.
- The embedded forms post to their own route, `statamic-funnels.advance-embed`, without a CSRF
  token. It accepts a post only from this site's own origin and only with a valid signed walk.
  A template of your own keeps working as long as it posts to `funnel:action`.
- No fixed consent banner is drawn inside a frame.

## Paying leaves the frame

Stripe and Mollie refuse to be framed, so the order button targets the top window. The way back
from the provider carries a one-time token bound to the payment, not to the walk, and the page
removes it from the address with a redirect. It only works in the browser that ordered: the
order sets a short-lived cookie that the return has to match.

## Known limits

- **Safari before 16.4** does not send `Sec-Fetch-Dest`. It gets no walk inside the frame, so an
  embedded funnel does not carry the visit from page to page there. This fails closed: nobody's
  visit is taken over, but the visitor starts again on every page. If those browsers matter,
  link to the funnel instead of embedding it.
- **A payment that switches to a banking app** and comes back in another browser loses the
  visit, because the return is bound to the browser that ordered. The payment itself arrives and
  is recorded, and the walk advances on the webhook as always. Only the next funnel page is not
  shown to the buyer.

## The in-app browser notice

Instagram, Facebook, Threads, TikTok, LinkedIn, Pinterest and Snapchat open links in their own
browser, where saved cards, Apple Pay and the bank's app are missing. A funnel page opened there
starts with a notice, a **Copy link** button and, on Android, a link that opens Chrome. iOS offers
no such link, so the text points to the app's menu instead; on Android the text leaves Apple Pay
out.

The app is recognised on the server from the user agent, so the notice is there from the first
paint and nothing flickers. It is on by default. Per funnel it can be switched off or reworded
under **Settings → In-app browser**, with `:app` standing for the app's name.
`in_app_browser.enabled: false` switches it off for every funnel.
