---
name: publish-instinct-site
description: Safely commit, sync, push, deploy, recover, and verify Instinct Groove website changes. Use when a client says update the website, make it live, publish, push, go live, undo a live change, fix a failed deployment, check publication status, or when a concrete site edit is complete and the user did not request preview-only work.
---

# Publish Instinct Site

Turn a verified local change into a proven public result without making the client manage Git or GitHub mechanics.

## Publication Gate

- Publish a concrete completed change unless the user said preview, draft, mock up, explore, show me first, or do not publish.
- Do not publish a bare "update the website" when no visible result was supplied; ask what should differ.
- Commit and push only task-owned files.
- Publication is complete only after commit on `main`, successful matching Pages run, and public-page verification.

## Workflow

1. Inspect `git status --short --branch`, current branch, remotes, recent commits, and `origin/main`.
2. Preserve unrelated tracked and untracked work. If isolation is needed, use a temporary branch or worktree from current `origin/main`.
3. Run:

```sh
node .agents/skills/publish-instinct-site/scripts/verify-site.mjs
```

4. Complete local visual and interaction checks on affected routes at phone and computer widths.
5. Inspect the final diff. Stage explicit task paths only.
6. Commit with a human-readable message describing the visible result.
7. Fetch `origin/main` immediately before integration. If it advanced, replay the task commit onto it.
8. Resolve mechanical or clearly compatible overlaps internally, preserve both intended changes, and rerun all checks.
9. If a conflict represents a real content choice, keep both versions safe and ask one visible-content question without mentioning Git terminology.
10. Push normally to `main`. Never force-push `main`.
11. Identify the workflow run matching the pushed commit, wait for it to finish, and require a successful conclusion.
12. Verify the affected public URL and requested content or interaction. Check custom-domain HTTP and HTTPS health separately.
13. Report the visible result and honest live status in plain English.

Read [references/release-recovery.md](references/release-recovery.md) for exact monitoring, conflict, rollback, and failure handling.

## Non-Negotiable Safety

- Never run `git reset --hard`, destructive checkout, `git clean`, or delete unknown work.
- Never use `git push --force` or `--force-with-lease` on `main`.
- Never stage unrelated files with broad `git add .` when other work exists.
- Never report "live" because push alone succeeded.
- Never expose secrets in commits, logs, URLs, or the public Pages artifact.
- Never hide a factual conflict. Ask only for the visible choice the client must own.
- If a release is bad, create a forward fix or a new revert commit; do not rewrite published history.

## Client-Facing Status

Success:

> Done - [visible result] is live on [page]. I checked it on both phone and computer layouts, including [important link or interaction].

Not live:

> The change is ready and checked, but it is not live yet because [plain reason]. [One next action].

If the workflow fails before deployment, explain that the safety check stopped the new version and the previous public version remains. Verify that claim before saying it.
