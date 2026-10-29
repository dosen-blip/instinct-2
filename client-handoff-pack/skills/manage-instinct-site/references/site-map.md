# Instinct Site Map

## Architecture

The site has no build step. Each page is a small static HTML file. `app.js` renders every page into `<main id="app">` from the records in `content.js` and `catalog.js`. Behind the page, a studio-maintained rendering system draws the scene: the 3D opening on the computer home page, the lit concrete wall with ivy, lamps and fireflies on every page, the sideways page slide on computers, and the phone version.

## Two Zones

| Zone | Paths | Who changes it |
|---|---|---|
| Content | `content.js`, `catalog.js`, `app.js` (outside the studio hooks), `styles.css`, `archive.css`, page titles, `assets/` through the media workflow, new pages copied from a sibling | You, through the skills |
| Rendering system | `hero-3d/`, `world/`, `mobile/`, `assets/vendor/`, the `<!-- world: ... --> ... <!-- /world -->` block in every page, `client-handoff-pack/rendering-manifest.json`, the studio hooks in `app.js` | The studio only. Never edit; offer to pass the request on |

The studio hooks in `app.js`: the two `popstate` lines at the end (`__txPop` before `render`), the breakpoint line with `__worldReinit`, `setupLookahead()` and its call, `window.INSTINCT_PAGE_MARKUP`, the header condense rule in `setupNav()`, `phoneAtLoad` and the phone film call with `true`, the attributes `imageTag()` writes, and the shape of the home opening in `renderHome()` and `renderMobileHome()`.

## Rendering System at a Glance

| Folder or file | What visitors see | Notes |
|---|---|---|
| `hero-3d/` | Computer home opening: black, the INSTINCT sign strikes on, the room lights, the camera settles, the page fades in by about 6 s; the live 3D wall runs on behind "Inside Instinct" | Computers only (wider than 720px). Three.js from `assets/vendor/three/`. If it cannot start, the static artwork stays |
| `world/world.js`, `world.css` | The lit concrete wall behind every page, ivy, lamps over headings, fireflies, lit buttons, photos lit like prints on the wall, 1-2 vines growing along section edges on each visit | Reads the page's class names (below). Phones get a lighter version |
| `world/wall-gl.js` | The sharper WebGL2 wall and lighting on computers | Without WebGL2, or with reduced motion, the picture-based wall stays |
| `world/transitions.js`, `transitions.css` | The page slide: on computers, links between pages pan sideways along the wall; Back pans the other way | Compares the pages' scripts and stylesheets; a mismatch turns the slide into a lights-dip and reload |
| `world/lookahead.js` | Nothing visible: preloads the next pages' images | |
| `mobile/` | Phone home opening (pre-rendered plates of the same scene, same intro), the phone wall, the film starting after the intro | Phones only (720px and narrower) |
| `<!-- world -->` block | Loads all of the above | Home's block also has the phone hero images, the intro switch and the phone hero loader |

Fallbacks: reduced motion gives no intro, no slide and a still world; phones never load the 3D opening; resizing across 720px reloads the page in the other mode.

## Content Map

| Visible area | Primary source | Also inspect |
|---|---|---|
| Global menu, brand, ticket status | `siteHeader()` in `app.js` | `.site-header`, `.site-nav*` in `styles.css`; phone menu in `setupNav()` (leave its condense rule alone) |
| Home page | `renderHome()`, `renderMobileHome()` | `nextSpotlight()`, `homeArchive()`, `homeGallery()`; keep the opening's shape |
| Next Event page | `renderNextEvent()` and the upcoming event in `content.js` | home spotlight, ticket status, the anniversary layout |
| Event pages | `content.js` events and `renderEvent()` | `catalog.js` status, past-events cards, pager |
| Artist and collaboration pages | `content.js` artists / collaborations and `renderArtist()` | directory, lineup cards, appearances |
| Gallery | `content.js` media and `renderGallery()` | filters, media viewer |
| Footer | `siteFooter()` | `.site-footer*` styles and every route |
| Media viewer | `setupViewer()` | gallery buttons, alt text, focus and Escape behaviour |
| Links and routes | `routes` near the top of `app.js`, `content.links` | repeated external URLs, page files |
| Appearance and spacing | `styles.css`, `archive.css` | desktop rules, `@media (max-width: 1050px)`, `@media (max-width: 720px)`; the world's own `world/world.css` restyles some of it (read, never edit) |
| Responsive images | `imageTag()`, `image-manifest.js` | `assets/`, image report, `$manage-instinct-media` |

## Pages

- `index.html`: home. Its head is the shared head plus home's own opening lines. Never edit it.
- Every other page (`next-event.html`, `past-events.html`, `artists.html`, `gallery.html`, one per event, artist and collaboration): identical apart from `<title>`.
- New page: add the record to `content.js` first (the archive audit refuses a page without one), then copy a sibling page whole (`vol-7.html` for an event, `dj-cobb.html` for an artist), name it `<record-id>.html`, change only the `<title>`. Never add, drop or reorder a script or stylesheet line.
- Slide order on the wall comes from `content.js` automatically: home, Next Event, Past Events, events oldest to newest, collaborations, Artists, artists A to Z, Gallery. Nothing to edit. A page outside these kinds would hang at the far right and has no template: a new kind of page is a studio request.

## Class Names the Lit Wall Reads

Keep them on the same kinds of elements; restyle with CSS instead of renaming.

- Headings that get a lamp: `.archive-heading`, `.archive-section-heading h2`, `.archive-section > h2`, `.archive-gallery-context h2`, `.about-grid h2`, `.archive-home-spotlight h2`, `.archive-home-gallery h2`, `.archive-announcement-grid h2`.
- Photos lit like prints, and their frames: `.archive-card`, `.archive-card-image`, `.archive-artist-image`, `.archive-media-image`, `.archive-lineup-card`, `.archive-lineup-image`, `.archive-poster`, `.archive-spotlight-poster`, `.archive-artist-hero figure`, `.about-grid figure`.
- Lit buttons: the first link in `.archive-shell > .archive-actions`, the first link in the artist header's actions, `.button`, the pressed gallery filter.
- Edges where vines grow and grids they climb: `.archive-section`, `.archive-filters`, `.archive-pager`, `.about-section`, `.mobile-home-section`, `.archive-card-grid`, `.archive-media-grid`, `.archive-lineup-grid`, `.archive-artist-grid`, `.archive-appearances`; also `.site-footer`, `.desktop-view`, `.with-mobile`, `.mobile-view`, `.section-border`.
- Home opening: computers `.desktop-view > .home-opening` (the `.home-hero` section, then the definition) followed directly by `.preview-panel`; phones `.mobile-view.mobile-home > .home-opening` (`.mobile-home-hero`, then the definition) and `.mobile-home-video`.
- A new section: `<section class="archive-section">` with an `<h2>` directly inside (or in `.archive-section-heading`), so it gets a lamp and a vine can grow on its edge.

## Content Search Rules

Before changing a date, venue, artist, status, call-to-action, or ticket link:

1. Search the whole repository for the old value and the visible label.
2. Inspect the matching `content.js` records (events, artists, collaborations, media, links).
3. Inspect both computer and phone render paths in `app.js`.
4. Check how `catalog.js` derives status (upcoming, past) and lineups.
5. Verify navigation labels and page titles where relevant.
6. Search again after editing to catch stale copies.

## Design System

- Background: black; text: white; one accent: brand green `--accent` (`#32e07a`).
- Purple is retired: the world's stylesheet points the old purple tokens at the green. It survives only inside photos and the film.
- The scene's own colours (moss, the sign's warm white, firefly lime) belong to the rendering system.
- Display type: Archivo; body: Space Grotesk; labels: Space Mono.
- Official brand mark is a CSS mask using `assets/instinct-mark.svg`.
- The key phone breakpoint is 720px; the site chooses computer or phone mode when a page loads.

Use committed code as the final source of truth. Do not trust an older description when it disagrees with the page or application data.
