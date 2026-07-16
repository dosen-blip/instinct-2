# Instinct Site Map

## Architecture

The site has no build step. Static HTML shells load one stylesheet, an image manifest, and one JavaScript application.

| Visible area | Primary source | Also inspect |
|---|---|---|
| Global menu, brand, ticket status | `siteHeader()` in `app.js` | `.site-header`, `.site-nav*` in `styles.css`; phone menu behaviour in `setupNav()` |
| Home page | `renderHome()` | `renderMobileHome()`, `pastEvents`, `eventTile()`, `mobileHomeEvent()` |
| Next Event page | `renderNextEvent()` | `renderMobileNextEvent()`, home teaser, global ticket status, related links |
| Event recaps | `recaps` data and `renderRecap()` | `renderMobileRecap()`, `pastEvents`, recap navigation and pager |
| Artist pages | `artists` data and `renderArtist()` | `renderMobileArtist()`, global artist menu, lineup cards |
| Footer | `siteFooter()` | `.site-footer*` styles and every route |
| Photo lightbox | `setupLightbox()` | gallery buttons, alt text, focus and Escape behaviour |
| Links and routes | `routes` and `links` near top of `app.js` | repeated inline external URLs and all root HTML shells |
| Appearance and spacing | `styles.css` | desktop rules, `@media (max-width: 1050px)`, and `@media (max-width: 720px)` |
| Responsive images | `imageTag()`, `image-manifest.js` | `assets/`, image report, `$manage-instinct-media` |

## Public Route Shells

- `index.html` -> home
- `next-event.html` -> next event
- `escapade-afterparty.html`, `vol-1.html` through `vol-4.html` -> recaps
- `dj-cobb.html`, `seb-b-balla.html`, `babyjake.html`, `ty-groove.html`, `seb-couture.html`, `dose.html` -> artists

Each shell must keep this load order: `styles.css`, then deferred `image-manifest.js`, then deferred `app.js`.

## Content Search Rules

Before changing a date, venue, artist, status, call-to-action, or ticket link:

1. Search the whole repository for the old value and the visible label.
2. Inspect `routes`, `links`, `recaps`, `pastEvents`, and `artists`.
3. Inspect both desktop and mobile render functions.
4. Decide whether the old event becomes a recap or archive item.
5. Verify navigation labels and page titles where relevant.
6. Search again after editing to catch stale copies.

## Design System

- Background: black; text: white.
- Primary green accent: `--accent` (`#32e07a`).
- Existing purple glow is part of the event visual language.
- Display type: Archivo; body: Space Grotesk; labels: Space Mono.
- Official brand mark is a CSS mask using `assets/instinct-mark.svg`.
- The key phone breakpoint is 720px.

Use committed code as the final source of truth. Do not trust an older description when it disagrees with the page or application data.
