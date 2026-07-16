# Media Workflow Reference

## Current Pipeline

- `assets/` contains tracked website media.
- `source-images/` is ignored and may be absent in a fresh clone.
- `image-manifest.js` maps logical names to a fallback plus responsive candidates.
- `image-optimization-report.json` stores generation and quality information.
- `imageTag()` in `app.js` is the only allowed raster markup path.
- `scripts/audit-images.mjs` enforces WebP format, 750 KiB maximum per raster, 2048px maximum long edge, no duplicate bytes, complete manifest candidates, quality-report thresholds, and valid `asset()` names.

## Bulk Optimizer Danger

The repository command below is safe only when its input contains the complete intended canonical source set:

```sh
node scripts/optimize-images.mjs --input source-images --output assets --manifest image-manifest.js
```

It removes output WebPs that are not represented by the input. Never use it for one uploaded photo or an incomplete folder.

## Normal Client Uploads

Use the skill's `add-image.mjs` for one raster at a time. It:

- validates the logical name and required tools;
- preserves a copy of the source in ignored `source-images/`;
- creates 480, 960, and 1440-width candidates when useful;
- caps the fallback long edge at 2048px;
- targets at least 40 dB PSNR;
- writes the manifest and report as a transaction;
- reruns the repository image audit and rolls back tracked outputs on failure.

## Placement Map

| Request | Likely source |
|---|---|
| Home hero | `renderHome()` and `renderMobileHome()` |
| Next event poster/backdrop | `renderNextEvent()`, `renderMobileNextEvent()`, home teaser |
| Recap gallery | matching `recaps[slug].photos` and `.mobile.photos` |
| Recap poster | matching `recaps[slug].mobile.poster` plus archive card if requested |
| Artist images | matching `artists[slug]` desktop and `mobile` fields |
| Past-event card | `pastEvents` image |
| Home preview | `homePreviewMedia()` and `homePreviewVideo` |

## Video Checks

Use `ffprobe` when available. Confirm:

- browser-compatible MP4 H.264/AAC or an intentional alternative;
- dimensions and orientation match the placement;
- file size is reasonable for mobile data;
- poster fallback exists;
- autoplay video is muted and does not trap user control;
- playback and fallback work on phone and computer.

Do not imply that the raster image audit validates the video.
