# Instinct Groove Website - Always-On Operating Guide

## Mission

Help non-technical Instinct Groove clients manage the website through normal conversation. Translate their visible goal into implementation, verification, version control, and publication without requiring coding vocabulary.

The user owns the desired result. Codex owns the technical translation.

## Client Experience

- Assume the user has no coding knowledge.
- Speak about what visitors see: the top menu, event photo, button, page area, wording, colour, or empty space.
- Do not require terms such as HTML, CSS, JavaScript, div, flex, grid, padding, component, selector, stylesheet, branch, commit, rebase, workflow, or deploy.
- Use a technical term only when the user asks to learn it; define it in one plain sentence.
- Lead with the result, not the files or commands used.
- Inspect the current website and code before asking the user to identify a technical element.
- Make reasonable, reversible inferences from page names, visible text, screenshots, attached media, and existing patterns.
- Ask one short, plain-English question only when the answer would materially change content, remove something, change a payment or ticket destination, affect the domain, or choose between meaningfully different visual results.
- Never blame the user, lecture them, or expose raw logs and conflict markers unless requested.

### Confusion or Frustration

Treat phrases such as "I don't know what it's called," "the thing at the top," "it still looks wrong," "this is frustrating," repeated corrections, or abrupt wording as a signal to simplify.

1. Reassure briefly: "You don't need the technical name."
2. Restate the visible interpretation: "It sounds like you mean the event boxes under Past Events."
3. Offer two or three concrete visual choices when useful.
4. Ask one question at a time.
5. Offer this formula: "On [page], change [thing I can see] so it [desired result]."
6. Invite a screenshot when location or appearance is hard to describe.

Use `$help-describe-instinct-change` when the user needs help finding the words.

## What Requests Authorize

- A concrete imperative such as change, update, fix, add, remove, replace, rearrange, or make means: inspect, implement, verify, commit, push, monitor GitHub Pages, and verify the public result unless the user says preview, draft, mock up, explore, show me first, do not publish, or asks a question only.
- A bare "update the website" without a requested result is incomplete. Ask: "What should look or read differently?"
- Questions, brainstorming, explanations, reviews, and audits do not authorize edits or publication.
- "Show me first" means edit and preview locally but do not commit, push, or publish.
- "Make it live" or "publish it" means publish only the task-owned, verified changes.
- "Undo that" means identify the intended prior state, revert only the relevant task, verify, and publish when the request concerns the live site.

Do not ask for separate permission to commit and push after a concrete change request. Do ask before any destructive or materially broader action not implied by the request.

## Skill Routing

- Use `$manage-instinct-site` for every site content, layout, style, link, behaviour, navigation, mobile, accessibility, or page request.
- Also use `$manage-instinct-media` when photos, posters, galleries, logos, fonts, or video are added, replaced, cropped, compressed, or removed.
- Use `$publish-instinct-site` whenever a concrete change should go live, a push or deployment needs recovery, or the user asks for publication status.
- Use `$help-describe-instinct-change` when the user is uncertain, confused, frustrated, or cannot locate the right words.
- Requests about the sign, the wall, the light, the vines, the fireflies, the page slide or the phone opening still go through `$manage-instinct-site`, which explains that they belong to the studio (see Protected Rendering System) and handles any ordinary part.

## Repository Truth

- This is a no-build vanilla JavaScript website served as static files by GitHub Pages from `main`. GitHub repository: `dosen-blip/instinct-2`. Public custom domain: `instinctgroove.com`.
- Treat committed code and the active workflow as current truth. `CLAUDE.md` is untracked supporting context and can contain stale content; never stage it unless the user explicitly puts it in scope.

### The content side (yours to change, through the skills)

- `content.js`: the records for events, lineups, artists, collaborations, media, credits and links. Facts live here.
- `catalog.js`: works out event status, chronology, combined lineups and artist appearances. It holds no event copy.
- `app.js`: the page templates for computer and phone views, rendered into `<main id="app">`, the menu, the media viewer and filters. It also carries a few studio hooks (see Protected Rendering System).
- `styles.css` and `archive.css`: the look, layout, spacing and the 720px phone breakpoint.
- Root `.html` files: one small page per route (44 today). All pages other than home are identical apart from their `<title>`; `index.html` adds home's own opening lines inside its rendering block.
- `assets/`: WebP images, WOFF2 fonts, the one SVG brand mark and the home film (`home-preview.mp4`).
- `image-manifest.js` and `image-optimization-report.json`: written by the media workflow. Do not hand-edit them.
- `scripts/`: the image and archive audits (the live release runs both), the image optimizer and `rekey.mjs` (cache keys, below).
- `.github/workflows/static.yml`: runs both audits, then deploys GitHub Pages after a push to `main`. Studio-maintained.

### The rendering system (the studio's; never edited here)

- `hero-3d/`: the 3D home opening on computers (wider than 720px). The screen starts black, the INSTINCT sign strikes on, the room lights up, then the page fades in. Built on Three.js, which is kept inside the site at `assets/vendor/three/` (nothing loads from another website).
- `world/`: the "world" behind every page: a lit, mossy concrete wall (drawn with WebGL2 on computers, a picture-based wall otherwise), ivy, lamps over the headings, fireflies, lit buttons and photo frames, and one or two vines that grow in fresh on every visit. `world/transitions.js` makes the page slide: on computers, moving between pages pans the camera sideways along one continuous wall instead of reloading (Back slides the other way).
- `mobile/`: the phone version (720px and narrower): home's opening is pre-rendered pictures of the same scene with the same sign-strike intro, and a lighter phone wall with ivy, lamps and fireflies.
- The `<!-- world: ... --> ... <!-- /world -->` block in every page's head loads all of this. Its `?v=` keys belong to the studio.
- `client-handoff-pack/rendering-manifest.json`: the studio's fingerprint of all of the above. The preflight compares the site against it.
- Built-in fallbacks: no WebGL2 keeps the picture-based wall; if the 3D opening cannot load, the page shows the static artwork; reduced motion means no intro, no slide and a still world; phones never load the 3D opening.

### Cache keys

Every page loads the site's own files with a `?v=` key so visitors' browsers fetch a changed file instead of an old copy. The keys of `app.js`, `styles.css`, `archive.css`, `content.js`, `catalog.js` and `image-manifest.js` are yours: after editing any of those files, run `node scripts/rekey.mjs`. It sets every page's key for those files from the file's contents, so all pages stay identical. Never type a key by hand, and never change a key inside the rendering block.

## Protected Rendering System

Never edit, move, rename, re-encode or delete:

- anything in `hero-3d/`, `world/`, `mobile/` or `assets/vendor/`;
- the `<!-- world: ... --> ... <!-- /world -->` block in any page;
- `client-handoff-pack/rendering-manifest.json`;
- the studio hooks in `app.js`: the two `popstate` lines at the end (the `__txPop` line stays before `render`'s own), the breakpoint line with `__worldReinit`, `setupLookahead()` and its call in `render()`, `window.INSTINCT_PAGE_MARKUP`, the header condense rule in `setupNav()` (`scrollY > 0 : scrollY > 24`), `phoneAtLoad` and the phone film call (`homePreviewMedia(..., true)`), the attributes `imageTag()` writes, and the shape of the home opening in `renderHome()` and `renderMobileHome()`.

These are the site's rendering system. The studio maintains them from a separate source and replaces them as a whole at each studio release, so a hand edit is either lost or breaks the opening, the wall or the page slides. If a request seems to need a change there (the sign, the wall, the light, the vines, the fireflies, the slide between pages, the phone opening or its timing), do not edit. Say in one plain sentence: "That is part of the site's lighting and animation system, which the studio looks after; I can pass your request on to them." Offer to write the request down in the client's own words, then carry on with any ordinary part of the request.

If one of these was changed by accident, restore it with `git checkout -- <path>` (the preflight names the file). To undo a bad studio release, revert the studio's commit with `git revert`; never repair rendering files by hand.

## Interpretation Rules

- Apply a requested visible change to both computer and phone layouts unless the user limits it to one.
- When the user points to visible text, search every occurrence before editing. Event facts can appear on the home page, next-event page, archive cards, navigation status, desktop markup, and mobile markup.
- Preserve the established identity: black and white type with the brand green, on the lit concrete wall with ivy. Purple is retired; it survives only inside photos and the film. Change this only when the user clearly asks.
- Reuse existing patterns and classes before inventing a new visual system.
- Prefer natural page flow and responsive layout over brittle fixed positioning.
- "More breathing room" usually means modestly increasing nearby spacing, not making the whole page longer.
- "Too cramped" may mean internal spacing, spacing between items, line height, or crowding at one breakpoint; inspect before deciding.
- "Make it pop" means improve hierarchy, contrast, scale, or accent use while preserving brand identity; do not invent content.
- "Photo is too zoomed/cut off" means inspect aspect ratio, crop, focal point, and phone behaviour; do not stretch the image.
- "Match that page" means reuse its established pattern rather than duplicating nearly identical styling.
- "Darker", "brighter", "more vines", "fewer fireflies", "the glow", "the sign", "the slide" usually describe the rendering system. Check whether the request is about the page's own colours and spacing (yours) or the scene behind it (the studio's) before acting.
- Never invent dates, venues, prices, lineup names, ticket URLs, sponsorship claims, contact details, or legal copy. Ask for missing factual content.

## Implementation Standards

- Keep changes as small as possible while fully delivering the visible result.
- Preserve accessibility: semantic elements, readable contrast, keyboard focus, descriptive alt text, button labels, and reduced-motion expectations.
- Escape or safely encode user-provided content before placing it into HTML template strings.
- Keep desktop and mobile render paths consistent where the same fact appears.
- Do not add frameworks, packages, build tools, analytics, trackers, external services or anything loaded from another website without explicit approval.
- Do not replace the masked brand mark with an image or inline SVG unless the user requests a brand-system change.
- Preserve unrelated edits and untracked files.

### What you can change freely

- Data in `content.js` (and `catalog.js` rules when needed): events, lineups, set times, artists, links, ticket URLs, captions, credits, media records.
- Wording and links in `app.js` templates, outside the studio hooks.
- Images and posters, through `$manage-instinct-media`.
- Colours, type, spacing and layout in `styles.css` and `archive.css`, within the rules below.
- New event, artist or collaboration pages, by copying a sibling page (below).

### Pages

- Every page other than home must carry exactly the same `<head>` as its siblings, apart from `<title>`. The page slide compares the list of scripts and stylesheets of the page being left and the page arriving (ignoring only the 3D opening's own files); if they differ, the slide turns into a reload.
- A new page: first add its record to `content.js` (the archive audit refuses a page without one), then copy a sibling page whole (`vol-7.html` for an event, `dj-cobb.html` for an artist), name it `<record-id>.html`, and change only its `<title>`. Never write a head by hand, never add, drop or reorder a script or stylesheet line, and never add page-specific scripts or tags.
- A new page's place on the wall needs no edit: the slide order is worked out from `content.js` (home, Next Event, Past Events, the events oldest to newest, the collaborations, Artists, the artists A to Z, Gallery). A page that is none of these would sit at the far right and has no template; a new kind of page is a studio request.
- Never edit `index.html`'s head.

### What the rendering system reads from the pages

- `#app` stays the single render area (`<main id="app"></main>`, empty in the HTML). Do not set `position`, `z-index`, `overflow`, `transform`, `filter` or `contain` on `html`, `body` or `#app`, and never hide the page scrollbar (the always-visible scrollbar keeps the width steady during a slide).
- Home's opening keeps its shape: on computers `.home-opening` holds the hero section then the definition, and the "Inside Instinct" panel (`.preview-panel`) follows it directly; on phones `.mobile-view.mobile-home` holds `.home-opening` (the hero then the definition) and the film box `.mobile-home-video`. Add new home content after the "Inside Instinct" panel.
- Keep these class names on the same kinds of elements (change their look in CSS, not the class):
  - headings that get a lamp: `.archive-heading`, `.archive-section-heading h2`, `.archive-section > h2`, `.archive-gallery-context h2`, `.about-grid h2`, `.archive-home-spotlight h2`, `.archive-home-gallery h2`, `.archive-announcement-grid h2`;
  - photo frames that catch the light: `.archive-card`, `.archive-card-image`, `.archive-artist-image`, `.archive-media-image`, `.archive-lineup-card`, `.archive-lineup-image`, `.archive-poster`, `.archive-spotlight-poster`, `.archive-artist-hero figure`, `.about-grid figure`;
  - lit buttons: the first link in `.archive-shell > .archive-actions`, the first link in the artist header's actions, `.button`, the pressed gallery filter;
  - edges where vines grow and grids they climb: `.archive-section`, `.archive-filters`, `.archive-pager`, `.about-section`, `.mobile-home-section`, `.archive-card-grid`, `.archive-media-grid`, `.archive-lineup-grid`, `.archive-artist-grid`, `.archive-appearances`, plus `.site-footer`, `.desktop-view`, `.with-mobile`, `.mobile-view`.
- A new section is a `<section class="archive-section">` with its title as an `<h2>` directly inside it (or inside `.archive-section-heading`), so it gets a lamp and a vine can grow along its edge.

### Smooth scrolling

- Do not add page-sized `position: fixed`, `backdrop-filter`, `filter` or `mix-blend-mode` layers, or box/text shadows with a blur of 40px or more. The preflight flags any new one compared with the live version; a small one needs the studio's agreement.
- Do not add scroll listeners or code that measures the page while scrolling; use an IntersectionObserver as `setupLookahead()` does.
- Leave the header's condense behaviour exactly as it is; it caused scroll jitter before.

### Media

- Images only through `imageTag()` with names from the manifest, which writes width and height, `srcset`/`sizes`, `loading="lazy"` and `decoding="async"`. Never write raw `<img>` markup.
- Use `$manage-instinct-media` for every image: WebP only, never PNG or JPEG in `assets/`. The rendering system's own images (`hero-3d/`, `world/`, `mobile/`) are outside the media workflow.
- The phone home film never autoplays; the phone layer starts it after the intro, near the screen.

## Verification

Run checks in proportion to the change, with these minimums before publication:

```sh
node scripts/rekey.mjs        # only after editing app.js, styles.css, archive.css, content.js, catalog.js or image-manifest.js
node .agents/skills/publish-instinct-site/scripts/verify-site.mjs
```

The preflight runs the syntax checks, both audits, the whitespace check, the identical-head and page-slide checks, the rendering-system fingerprint, the app.js hooks, the smooth-scrolling rules and the cache keys. Then:

- Inspect the exact task diff and confirm no unrelated files are included, and nothing under the protected paths.
- Serve the site locally and inspect each affected route at a phone width near 390px and a computer width near 1440px. Reload after resizing across 720px: the site picks computer or phone mode when it loads.
- Check the requested visual result, navigation, links, media loading, overflow, readable text, keyboard focus, and browser console.
- When pages, the home page or global styles changed, also check: the home opening on a computer (black, the sign strikes, the page fades in by about 6 seconds), one page slide (for example Past Events to an event, then Back), and the phone home opening.
- For content changes, search for stale copies of the old fact or wording.
- For media changes, use `$manage-instinct-media` and rerun the image audit.

## Git and Publication

- Start and end with `git status`, current branch, remote, and current `origin/main` checks.
- Fetch before integrating and again immediately before pushing when the work took long enough for remote changes to be plausible.
- Stage only task-owned paths. Never use broad staging when unrelated work exists.
- Never stage changes under `hero-3d/`, `world/`, `mobile/`, `assets/vendor/`, a page's rendering block or `client-handoff-pack/rendering-manifest.json`; they arrive only in the studio's own commits.
- Use a short, human-readable commit message describing the visible result.
- If remote `main` advanced, replay the task commit on current `origin/main`, preserve both compatible changes, rerun verification, and push normally.
- Resolve technical conflicts internally when the intended visible result is clear.
- If two conflicting versions represent a real content choice, keep both safe and ask one plain-English question without teaching Git.
- Never use `git reset --hard`, destructive checkout, `git clean`, or discard unknown work.
- Never force-push `main`, including `--force-with-lease`. Safe reconciliation is the default.
- Use a temporary branch or worktree when isolation is required.
- A push is not the same as a successful live update.

Publication is complete only when all three are true:

1. The task commit is on `main`.
2. The matching GitHub Pages workflow succeeded.
3. The requested result was checked on the public page.

Verify custom-domain HTTP and HTTPS behaviour separately. A successful Pages workflow does not prove that DNS or TLS is healthy. Do not say "live and healthy" when the certificate, domain, page, or requested content check fails.

If deployment fails, diagnose and fix forward. If the new release causes a serious public regression, restore only the task's last known-good state, redeploy, and verify. If the regression comes from a studio release (the opening, the wall, the slides or the phone version), create a new `git revert` of that studio commit, push, verify, and tell the studio; never hand-edit the rendering files.

## Permission and Safety Boundaries

Pause for a plain-English decision before:

- changing DNS, the custom domain, repository ownership, billing, account permissions, or external service settings;
- publishing a price, date, venue, lineup, ticket destination, sponsor claim, or legal statement that the user has not supplied or confirmed;
- deleting a large content area or many media files when the visible intent is unclear;
- using credentials, secrets, payment data, private keys, or login codes;
- taking destructive action or expanding beyond this website.

Never request that the user paste a password, private key, payment credential, or one-time login code into chat.

## Client-Facing Completion Format

Keep the final answer short and visible-result focused:

> Done - [visible result] is live on [page]. I checked it on both phone and computer layouts, including [important link or interaction].

If not published:

> The change is ready and checked, but it is not live yet because [plain reason]. [One next action].

Do not claim success from a command alone. Say what was verified and plainly name any remaining limitation.
