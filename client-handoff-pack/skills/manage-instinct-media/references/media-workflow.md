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
| Event poster or cover | `content.js` event `cover`, `posters`, announcement `poster` |
| Event photos (gallery) | `content.js` media records (`image`, `curated`, credit) and the event's `mediaIds` |
| Artist photo | `content.js` artist `portrait` |
| Featured drinks | `content.js` event `drinks[].image` |
| Home crew photo | `asset('home-team')` in `renderHome()`, `asset('mobile-mcp-home-crew')` in `renderMobileHome()` |
| Home film and its poster | `homePreviewMedia()`; `assets/home-preview.mp4`, posters `home-preview` / `mobile-home-preview` |
| Home opening artwork | `asset('home-hero')` / `asset('mobile-mcp-home-hero')`: only a fallback now. Computers show the 3D opening and phones the pre-rendered plates, so a change there is a studio request |

## Not Part of This Workflow

The rendering system's images live outside `assets/`: the wall, leaf atlases and concrete textures (`world/assets/`, `hero-3d/assets/`), the phone hero plates (`mobile/hero/`) and the vendored Three.js files (`assets/vendor/`). They are tuned and encoded by the studio (some deliberately lossless, some lossy at measured settings), are not in `image-manifest.js`, and are not audited by `scripts/audit-images.mjs`. Never add, replace, re-encode or optimize them; the preflight reports any change with the command to restore it.

## Video Checks

Use `ffprobe` when available. Confirm:

- browser-compatible MP4 H.264/AAC or an intentional alternative;
- dimensions and orientation match the placement;
- file size is reasonable for mobile data;
- poster fallback exists;
- an autoplaying video is muted and does not trap user control, and the phone home film does not autoplay (the phone layer starts it after the intro, near the screen);
- playback and fallback work on phone and computer.

Do not imply that the raster image audit validates the video.
