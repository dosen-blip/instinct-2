---
name: manage-instinct-site
description: Turn a non-technical client's plain-English request into accurate edits to the Instinct Groove website, and keep the site's studio-maintained rendering system (the 3D opening, the lit wall, the page slides, the phone version) untouched. Use for any request to change, fix, add, remove, rewrite, rearrange, resize, recolor, restyle, or explain a page, section, menu, button, card, event, artist, link, desktop view, or phone view, including vague visual language, screenshots, and requests about the sign, wall, lights, vines, fireflies or page slide.
---

# Manage Instinct Site

Own the translation from a visible client goal to a small, verified website change. Keep technical work internal and communicate in plain English.

## Workflow

1. Read the top-level `AGENTS.md` and inspect current repository state.
2. Restate the desired visible outcome internally. Do not translate the client's words into a question about coding terms.
3. Read [references/site-map.md](references/site-map.md) to locate the source of truth and the protected zones.
4. For layout, style, or vague visual language, read [references/plain-english-design.md](references/plain-english-design.md).
5. For ambiguous, confused, or frustrated requests, apply `$help-describe-instinct-change`.
6. Inspect the actual page, relevant render path, styles, and repeated content before editing.
7. Decide whether the request is about the page (yours) or the scene behind it (the studio's). For the studio's part, follow Studio-Side Requests below.
8. Infer low-risk, reversible details. Ask one plain question only for a material content or visual fork.
9. Implement the smallest coherent change. Keep desktop and mobile variants aligned unless the request is breakpoint-specific.
10. Use `$manage-instinct-media` for any media pipeline work.
11. If you edited `app.js`, `styles.css`, `archive.css`, `content.js`, `catalog.js` or `image-manifest.js`, run `node scripts/rekey.mjs`.
12. Run the matching checks in [references/verification.md](references/verification.md), including the preflight, and inspect phone and computer layouts.
13. If the request is concrete and not preview-only, apply `$publish-instinct-site` without asking the client to repeat the publication request.

## Translation Contract

- Translate "what visitors should see" into code; never require the client to name files, elements, classes, or layout systems.
- Use screenshots, visible wording, page order, and existing patterns to locate the target.
- Treat "this," "that box," or "the thing at the top" as a localization task, not user failure.
- When a word such as "cleaner," "premium," "bigger," or "more space" has several plausible implementations, inspect context and propose at most three visible choices.
- Preserve factual content. Never invent dates, lineup details, venues, prices, links, sponsorships, or legal claims.
- Report "I made the event heading easier to notice," not "I changed the h1 font-size."

## Change Rules

- Search all occurrences of changed facts or labels.
- Check separate desktop and mobile render functions in `app.js`.
- Reuse existing CSS patterns and tokens before creating new ones.
- Preserve the existing visual identity unless the user explicitly changes it.
- Preserve semantics, keyboard access, focus visibility, alt text, and readable contrast.
- Do not add dependencies or a build system for a normal site edit.
- Do not touch generated image files by hand; route media work through `$manage-instinct-media`.
- Never edit `hero-3d/`, `world/`, `mobile/`, `assets/vendor/`, a page's `<!-- world -->` block, `client-handoff-pack/rendering-manifest.json` or the studio hooks in `app.js` (listed in `AGENTS.md`).
- A new event, artist or collaboration page: add its `content.js` record, copy a sibling page whole, change only the `<title>`. Never hand-write or reorder a page head.
- Keep the class names and structure the lit wall reads (headings, photo frames, sections, the home opening); see the site map.
- No new page-sized fixed, blurred, filtered or blended layers, big soft shadows, or scroll listeners.
- Preserve unrelated and pre-existing work.

## Intent Examples

- "Make the boxes less cramped" -> inspect internal padding, text wrapping, gap, and both breakpoints; make a modest coherent spacing change.
- "Move the next event higher" -> adjust section order or natural spacing before considering fixed positioning.
- "Make this photo show more of the people" -> inspect crop and focal position; use the media skill if a new derivative is needed.
- "Update the next event" -> update every current-event occurrence, not only the first visible card.
- "Make it match the recap page" -> reuse that page's existing pattern rather than duplicating its styles.
- "Show me first" -> edit and preview, then stop before commit and publication.
- "Add the new artist" -> add the `content.js` record and image, copy `dj-cobb.html` to the new id, change its title; the page takes its place on the wall by itself.
- "Make the page darker" -> if it means a panel, card or text colour, change it in CSS; if it means the wall, the light or the glow behind everything, it is studio-side.
- "More vines on the gallery" or "slow down the page slide" -> studio-side; offer to pass it on.

## Studio-Side Requests

The sign, the wall, its light and haze, the ivy and growing vines, the fireflies, the lit buttons' glow, the page slide, the home intro and the phone opening are drawn by the rendering system. Do not edit it, and do not imitate it with new CSS layers over the page. Say once, plainly: "That is part of the site's lighting and animation system, which the studio looks after; I can pass your request on to them." Offer to write the request in the client's words (page, what they see, what they want). Then do any ordinary part of the request yourself. If the preflight reports a protected file as changed, restore it with the command it gives before anything else.

## Completion

State the visible result, the affected page, phone/computer verification, publication status, and any one remaining limitation. Do not expose implementation details unless asked.
