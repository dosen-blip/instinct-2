---
name: manage-instinct-media
description: Add, replace, crop, optimize, or remove Instinct Groove website photos, posters, gallery images, logos, and videos. Use whenever a client attaches or mentions an image or video, asks to change a crop or focal point, creates a gallery, reports a blurry or stretched image, or needs responsive media prepared for phone and computer layouts.
---

# Manage Instinct Media

Own asset naming, safe optimization, responsive variants, manifest/report generation, placement, alt text, crop behaviour, and media verification. Do not expose this pipeline to the client.

## Choose the Workflow

- One new or replacement raster image: use `scripts/add-image.mjs` from the repository root.
- Many images with a verified complete master source set: read [references/media-workflow.md](references/media-workflow.md), then consider the repository bulk optimizer.
- Gallery update: import each raster, update the matching desktop and mobile arrays in `app.js`, and verify order/lightbox.
- Crop-only request: first try layout-safe focal positioning in CSS. Create a new derivative only when the same source cannot serve both views well.
- Video: inspect codec, dimensions, duration, file size, poster, autoplay/mute behaviour, and phone/computer playback. The raster audit does not check videos.
- Font or brand mark: preserve WOFF2 fonts and the intentional SVG mask pattern unless the user explicitly requests a brand-system change.

## Single-Image Workflow

1. Inspect the attached original at full resolution and confirm the intended visible placement from context.
2. Create a short lowercase hyphenated logical name, such as `vol5-poster` or `artist-name-portrait`.
3. Run a dry run:

```sh
node .agents/skills/manage-instinct-media/scripts/add-image.mjs --input "/path/to/upload" --name "logical-name" --dry-run
```

4. Import it. Add `--replace` only when intentionally replacing an existing logical image. Add `--text-heavy` for posters or artwork with important text.
5. Update `app.js` through `asset('logical-name')` and `imageTag()`. Do not write raw `<img>` markup.
6. Write useful alt text based on the image's purpose, not its filename.
7. Adjust focal crop with existing CSS patterns without stretching the image.
8. Run `node scripts/audit-images.mjs` and the site preflight.
9. Inspect the affected route on a phone and computer.

## Safety Rules

- Do not add PNG or JPEG files to tracked `assets/`.
- Preserve original uploads under ignored `source-images/`; never commit private or unlicensed originals.
- Never run `scripts/optimize-images.mjs` against a partial `source-images/` folder. It removes generated WebPs that are missing from its input.
- Treat `image-manifest.js` and `image-optimization-report.json` as generated outputs. Modify them only through a verified generator.
- Do not re-encode already generated assets in place.
- Do not hand-delete responsive variants. Remove the logical record and its candidates transactionally, then rerun the audit.
- Preserve faces, poster text, logos, and the requested focal subject at both breakpoints.
- Do not publish media the user may not have permission to use; ask one plain question when rights are materially unclear.
- Check large video size separately. The current raster audit does not cover the MP4.

## Client Communication

Say what was visibly placed or improved and where it appears. If a crop has two legitimate choices, show the choices as visible outcomes: "fill the whole box and crop a little" versus "show the whole photo with some empty space."
