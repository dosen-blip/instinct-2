# Maintaining the Instinct archive

This local preview starts from published revision `222b4e1` (September 8, 2026). It has not been committed, pushed or published. The original working folder and its existing edits are preserved.

## One record, many views

- `content.js`: editorial records for events, artists and media. This is the place to update facts, links, captions, credits and selections.
- `catalog.js`: derives event status, chronology, combined lineups and artist appearances. It contains no event-specific marketing copy.
- `app.js`: shared page templates, navigation, filters and accessible media viewer. Phone and computer layouts use the same event, artist and media content.
- `archive.css`: the shared archive, Gallery and artist layouts, using the existing fonts and colours in `styles.css`.
- `image-manifest.js` and `image-optimization-report.json`: generated image pipeline outputs. Do not hand-edit these.

## Add an event without displacing an older one

1. Add a permanent event ID and record in `content.js`. Use the confirmed ISO date (`YYYY-MM-DD`), title, venue, poster, original announcement source and lineup.
2. Add a matching `.html` shell using the same stylesheet and script load order as `vol-7.html`. Keep every existing URL.
3. Refer to existing artist IDs in the lineup. Add a new artist only if needed. Never copy biographies into the event.
4. For multiple sessions, use `announcements`, each with its own title, poster, venue, hours and lineup. The combined lineup is derived automatically; do not duplicate it in the parent record.
5. Keep event-specific set times in the lineup. Never store a set time or a permanent “current artist” flag on the artist profile.
6. Use `endsAt` with an explicit UTC offset when the actual closing time is confirmed. An overnight event remains current until that instant. Without a known closing time, the fallback changes status after the calendar date ends in `America/Toronto`; this is a display rule, not a claim about the event's closing hour.
7. Keep ticket URLs in the event/announcement record. Expired events do not display purchase calls to action. An event with no photos remains an event page and archive entry.
8. The homepage, archive, artist appearances and next-event view update from these records. No menu list needs replacing. The open page checks for status transitions every minute and when it becomes visible again.

## Add or curate media

1. Use the existing media import skill for new files. Keep master files; never run the bulk optimizer against an incomplete source folder.
2. Add one media record with a stable ID, type, logical image name, descriptive caption, alt text, event ID, confirmed credit and credit URL. Add its ID to the owning event's `mediaIds` list.
3. Set `curated: true` to show it on both the event page and Gallery. For an excluded alternate crop or screenshot, keep the file and record, set `curated: false`, and state the reason in `reviewNote`.
4. `albumUrl` is a full external photo album; `creditUrl` is a photographer's profile. They must not be interchanged.
5. Local videos need a poster, source, duration and any established event/creator attribution. The current one-minute film has no established event or filmmaker attribution, so it stays in the general Gallery, outside individual event albums.
6. Artist YouTube/SoundCloud links remain on their profiles. Do not label them as recordings of an Instinct event without supporting evidence.

The Gallery initially shows 12 items and offers Show more. Filters are reflected in the URL. The viewer can browse the full selected collection, with previous/next controls, keyboard arrows, native video controls, Escape, a modal focus boundary and focus restoration.

## Artist identities and collaborations

All previously published artist URLs remain available. Comfort and G3LIO now have individual profiles with a shared performance credit. BALLA, Niko Couture and Seb B have individual records connected to their existing collaboration pages. The shared photographs remain captioned as collaboration photographs; no new solo portraits or biographies were invented.

Historical lineup acts without a previously written biography have a concise profile with their existing image and recorded event appearance. The directory lists 24 distinct artist/act entries. Joint profiles with individual member records stay accessible from their event lineups, without extra directory cards. Individual directory cards use the existing artist-associated photographs, including shared B2B photographs; profile captions identify shared photographs. Do not suppress a photo just because another artist uses the same source. Artists appear once in the directory, including when scheduled for an upcoming event. Do not merge similarly named artists without evidence.

## Before a future publication

Run from this preview folder:

```sh
node --check app.js
node --check content.js
node --check catalog.js
node scripts/audit-images.mjs
node scripts/audit-archive.mjs
git diff --check
```

Also run the handoff pack's `publish-instinct-site/scripts/verify-site.mjs`, with this folder as the working directory. Both image and archive audits are now included in the local copy of the Pages workflow.

The archive audit checks permanent routes, original URL retention, orphan artists, lineup connections, media ownership, duplicate selected photographs, asset references, script order, link schemes, complete date formats and event status boundaries. Keep visual and interaction checks at 390px and 1440px: image loading, overflow, keyboard use, Gallery filters, poster/media viewer, video playback and browser errors.

Publishing still requires a later user request. Recheck remote history and integrate only this preview's changes before any release.

Card previews use square artist frames and 4:3 gallery/album frames. Explicit image heights inside these frames prevent intrinsic HTML image dimensions from producing tall strips. Full photographs remain available in the media viewer.

Artist directory revision: all 26 entries now represent individual artists. Four former B2B profile records are retained under `collaborations` for historical copy; their old URLs show the related event. Event sets carry individual artist IDs and an explicit `b2b` flag. Each artist page derives a unique, reciprocal “B2B’d with” partner list from those sets. A joint billing using “+” alone is not assumed to be B2B.

Gallery presentation: one section per event, each with a single heading, date and photography credit. Each section initially shows six images and expands independently. Media cards have no visible captions or repeated event labels; the viewer retains its counter, attribution and event link. Descriptive alt text remains available to screen readers. The general film has its own section because its event is not established.
