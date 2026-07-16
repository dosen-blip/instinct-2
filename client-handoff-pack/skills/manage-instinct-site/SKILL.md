---
name: manage-instinct-site
description: Turn a non-technical client's plain-English request into accurate edits to the Instinct Groove website. Use for any request to change, fix, add, remove, rewrite, rearrange, resize, recolor, restyle, or explain a page, section, menu, button, card, event, artist, link, desktop view, or phone view, including vague visual language and screenshots.
---

# Manage Instinct Site

Own the translation from a visible client goal to a small, verified website change. Keep technical work internal and communicate in plain English.

## Workflow

1. Read the top-level `AGENTS.md` and inspect current repository state.
2. Restate the desired visible outcome internally. Do not translate the client's words into a question about coding terms.
3. Read [references/site-map.md](references/site-map.md) to locate the source of truth.
4. For layout, style, or vague visual language, read [references/plain-english-design.md](references/plain-english-design.md).
5. For ambiguous, confused, or frustrated requests, apply `$help-describe-instinct-change`.
6. Inspect the actual page, relevant render path, styles, and repeated content before editing.
7. Infer low-risk, reversible details. Ask one plain question only for a material content or visual fork.
8. Implement the smallest coherent change. Keep desktop and mobile variants aligned unless the request is breakpoint-specific.
9. Use `$manage-instinct-media` for any media pipeline work.
10. Run the matching checks in [references/verification.md](references/verification.md) and inspect phone and computer layouts.
11. If the request is concrete and not preview-only, apply `$publish-instinct-site` without asking the client to repeat the publication request.

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
- Preserve unrelated and pre-existing work.

## Intent Examples

- "Make the boxes less cramped" -> inspect internal padding, text wrapping, gap, and both breakpoints; make a modest coherent spacing change.
- "Move the next event higher" -> adjust section order or natural spacing before considering fixed positioning.
- "Make this photo show more of the people" -> inspect crop and focal position; use the media skill if a new derivative is needed.
- "Update the next event" -> update every current-event occurrence, not only the first visible card.
- "Make it match the recap page" -> reuse that page's existing pattern rather than duplicating its styles.
- "Show me first" -> edit and preview, then stop before commit and publication.

## Completion

State the visible result, the affected page, phone/computer verification, publication status, and any one remaining limitation. Do not expose implementation details unless asked.
