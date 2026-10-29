# Verification Matrix

After editing `app.js`, `styles.css`, `archive.css`, `content.js`, `catalog.js` or `image-manifest.js`, refresh the cache keys first:

```sh
node scripts/rekey.mjs
```

Always run:

```sh
node .agents/skills/publish-instinct-site/scripts/verify-site.mjs
```

It prints PASS lines and, on failure, numbered problems in plain English with the fix, and exits non-zero. It checks:

- code syntax (`app.js`, `content.js`, `catalog.js`, `image-manifest.js`), the image audit, the archive audit and stray whitespace;
- every page other than home has an identical head apart from its title, and all pages load the same scripts and stylesheets in the same order (the comparison the page slide makes);
- home's head is the shared head plus only its own opening lines;
- the rendering system (`hero-3d/`, `world/`, `mobile/`, `assets/vendor/`, every page's `<!-- world -->` block) matches the studio's fingerprint in `client-handoff-pack/rendering-manifest.json`; a changed file is named with `git checkout -- <path>` to restore it;
- no `lab/` or outside-website references in the pages;
- the studio hooks in `app.js`, the home opening's shape, and the class names the lit wall reads;
- nothing heavy added since the live version: new fixed, blurred, filtered or blended layers, big soft shadows, rules on `html`/`body`/`#app`, scroll listeners;
- cache keys consistent on every page and fresh for every changed file (`scripts/rekey.mjs --check`);
- page links, the release workflow and merge leftovers.

Never "fix" a rendering-system failure by editing or regenerating the manifest: restore the named file.

Then add the checks that match the task.

| Change | Required checks |
|---|---|
| Wording or facts | Search old and new text; inspect every affected route; confirm desktop/mobile copies match |
| Layout or spacing | Phone and computer screenshots; overflow; text wrapping; nearby sections; focus state; lamps still over the headings |
| Navigation | Every route; active state; phone toggle; keyboard use; external destination; one page slide and Back on a computer |
| Event details | Home, Next Event, ticket status, links, desktop/mobile, archive implications |
| New page | Record in `content.js`; page copied from a sibling with only the title changed; preflight passes; a slide to it and Back on a computer; the phone version |
| Recap or artist | Page, navigation, neighbours, lineup cards, gallery/viewer, title |
| Link or button | Correct URL, new-tab behaviour if intended, repeated copies, accessible label |
| Photo or poster | Media pipeline, focal crop, intrinsic ratio, alt text, image audit, phone/computer |
| Video | Playback, poster fallback, type, muted rules, file size, phone/computer; the phone home film must not autoplay |
| Global styles or the home page | Every page type at phone and computer widths, plus the three scene checks below |

## Scene Checks

When pages, the home page or global styles changed, look at these on the local site (they are not judged by the preflight):

1. **The intro** (computer, home, wider than 720px, reloaded): black, the sign strikes on, the room lights, the menu and the definition fade in by about 6 seconds. Scrolling past "Inside Instinct" hands the 3D wall over to the lit wall with no visible seam. No console errors.
2. **A page slide** (computer): Past Events, then an event card. The camera pans sideways along the wall, then Back pans the other way. A brief dip to black and a reload instead means the pages' heads differ.
3. **The phone hero** (390px, reloaded): home plays the plate intro (black, sign, room) and reveals the page; the film starts only after the intro, near the screen; subpages show the phone wall with ivy and fireflies; links load normally.

The site picks computer or phone mode when a page loads: after resizing across 720px, reload. In a hidden or background browser tab, animations pause, so judge motion only in a visible window.

For visual checks, serve the repository locally (`python3 -m http.server 4599`) and use the available browser inspection tool. Check the browser console for errors. A screenshot alone does not verify links or keyboard behaviour.
