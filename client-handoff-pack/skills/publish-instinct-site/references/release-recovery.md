# Release and Recovery Runbook

## Repository and Deployment

- Remote: `https://github.com/dosen-blip/instinct-2.git`
- Production branch: `main`
- Workflow: `.github/workflows/static.yml`
- Public domain: `instinctgroove.com`
- The workflow installs WebP tooling, runs the image audit, uploads the static repository content, and deploys GitHub Pages.

## Before Commit

```sh
git status --short --branch
git remote -v
git fetch origin main
git log --oneline --decorate -5
node .agents/skills/publish-instinct-site/scripts/verify-site.mjs
```

Inspect `git diff` and stage explicit task-owned paths. Do not include untracked `CLAUDE.md` unless the user explicitly requests it.

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

Fix the local issue before commit. Explain only the visible impact unless details are requested.

### Workflow fails before deployment

The new version did not become production through that run. Confirm the previous site, diagnose logs, fix forward, and rerun.

### Workflow succeeds but public check fails

Check custom-domain DNS/TLS, CDN cache, correct route, and whether the workflow deployed the expected SHA. Do not claim success.

### Serious live regression

Create a narrow forward fix when fast and safe. Otherwise create a new revert commit for only the task commit, push, monitor, and verify. Never rewrite `main` history.

### Authentication missing

Keep the local commit safe. Ask the client for the smallest plain action needed to reconnect GitHub; never ask for a password or token in chat.
