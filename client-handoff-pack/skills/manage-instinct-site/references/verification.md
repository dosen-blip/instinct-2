# Verification Matrix

Always run:

```sh
node .agents/skills/publish-instinct-site/scripts/verify-site.mjs
```

Then add the checks that match the task.

| Change | Required checks |
|---|---|
| Wording or facts | Search old and new text; inspect every affected route; confirm desktop/mobile copies match |
| Layout or spacing | Phone and computer screenshots; overflow; text wrapping; nearby sections; focus state |
| Navigation | Every route; active state; phone toggle; keyboard use; external destination |
| Event details | Home, Next Event, ticket status, links, desktop/mobile, archive implications |
| Recap or artist | Route shell, navigation, neighbours, lineup cards, gallery/lightbox, title |
| Link or button | Correct URL, new-tab behaviour if intended, repeated copies, accessible label |
| Photo or poster | Media pipeline, focal crop, intrinsic ratio, alt text, image audit, phone/computer |
| Video | Playback, poster fallback, type, muted/autoplay rules, file size, phone/computer |
| Global styles | Sample every page type at phone and computer widths |

For visual checks, serve the repository locally and use the available browser inspection tool. Check the browser console for errors. A screenshot alone does not verify links or keyboard behaviour.
