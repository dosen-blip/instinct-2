# Release and Recovery Runbook

## Repository and Deployment

- Remote: `https://github.com/dosen-blip/instinct-2.git`
- Production branch: `main`
- Workflow: `.github/workflows/static.yml`
- Public domain: `instinctgroove.com`
- The workflow installs WebP tooling, runs the image audit and the archive audit, uploads the static repository content, and deploys GitHub Pages.
- The rendering system (`hero-3d/`, `world/`, `mobile/`, `assets/vendor/`, the `<!-- world -->` block in every page, `client-handoff-pack/rendering-manifest.json`) arrives only in the studio's own commits. Client tasks never stage it.

## Before Commit

```sh
git status --short --branch
git remote -v
git fetch origin main
git log --oneline --decorate -5
node scripts/rekey.mjs      # only after editing app.js, styles.css, archive.css, content.js, catalog.js or image-manifest.js
node .agents/skills/publish-instinct-site/scripts/verify-site.mjs
```

Inspect `git diff` and stage explicit task-owned paths (with the pages `rekey.mjs` touched). Do not include untracked `CLAUDE.md` unless the user explicitly requests it. `git diff --stat -- hero-3d world mobile assets/vendor client-handoff-pack/rendering-manifest.json` must be empty.

## Remote Advanced or Push Rejected

1. Keep the task commit safe.
2. Fetch current `origin/main`.
3. Rebase or replay the task commit onto current `origin/main` in an isolated branch/worktree when unrelated work exists.
4. Resolve compatible changes by preserving remote work and the requested visible result.
5. For a genuine content decision, ask one plain question such as: "Someone else changed the venue while I was updating the ticket link. Should the newer venue stay?"
6. Rerun preflight and visual checks.
7. Push normally.

Do not force-push `main`.

## Monitor the Exact Deployment

After push, capture the commit SHA and find the matching run rather than watching an older run:

```sh
git rev-parse HEAD
gh run list --workflow static.yml --branch main --limit 10 --json databaseId,headSha,status,conclusion,url
gh run watch RUN_ID --exit-status
```

Confirm Pages state when useful:

```sh
gh api repos/dosen-blip/instinct-2/pages
```

## Public Verification

- Load the exact affected URL, not only the home page.
- Verify the requested words, image, link, layout, or interaction.
- Test phone and computer behaviour for responsive changes.
- Check both `http://instinctgroove.com` and `https://instinctgroove.com` separately.
- Treat certificate, DNS, caching, content, and workflow state as separate signals.
- Never call the site fully healthy if HTTPS certificate validation fails.

Allow for normal CDN caching, but verify rather than assuming. If content appears stale, compare the Pages deployment commit and retry with a cache-busting query before blaming the client browser.

## Failure Cases

### Preflight fails

Fix the local issue before commit. Explain only the visible impact unless details are requested. Each problem comes with its fix:

- a rendering-system file changed: `git checkout -- <path>` (never edit the file or the manifest to pass);
- a page's head differs: copy a sibling page whole and change only its title;
- cache keys stale or mixed: `node scripts/rekey.mjs`;
- a new blur, blend, fixed layer, filter, big shadow or scroll listener: remove it or get the look another way.

### Workflow fails before deployment

The new version did not become production through that run. Confirm the previous site, diagnose logs, fix forward, and rerun.

### Workflow succeeds but public check fails

Check custom-domain DNS/TLS, CDN cache, correct route, and whether the workflow deployed the expected SHA. Do not claim success.

### Serious live regression

Create a narrow forward fix when fast and safe. Otherwise create a new revert commit for only the task commit, push, monitor, and verify. Never rewrite `main` history.

### Rendering regression after a studio release

If the opening, the wall, the lights, the vines, the page slide or the phone version broke right after a studio release (its commit touches `hero-3d/`, `world/`, `mobile/` or the `<!-- world -->` blocks):

```sh
git log --oneline -5 -- world hero-3d mobile    # find the studio commit
git revert --no-edit <studio commit sha>        # a new commit; history is kept
node .agents/skills/publish-instinct-site/scripts/verify-site.mjs
git push origin main
```

The revert brings back the studio's previous files, page blocks and manifest together, so the preflight passes. Monitor the run, verify the public pages, and tell the client in one sentence that the previous version of the scene is back and the studio has been told. Never hand-edit `world/`, `hero-3d/` or `mobile/` to repair a release.

### Authentication missing

Keep the local commit safe. Ask the client for the smallest plain action needed to reconnect GitHub; never ask for a password or token in chat.
