# Plain-English Design Translation

Use this map internally. Do not ask clients to adopt the terms in the right column.

| What a client may say | Inspect or implement internally |
|---|---|
| top menu, bar at the top | header and primary navigation |
| big picture at the top | hero image or poster |
| box, event box, tile | card or repeated content item |
| page area, block, chunk | section or grouped content region |
| the words over the photo | image overlay content and contrast |
| space inside the box | internal padding |
| space between boxes | layout gap or margin |
| more breathing room | modest nearby spacing and line-height |
| put them beside each other | responsive row or grid with a phone fallback |
| put them one under another | vertical stack |
| centre it | alignment within the intended container, not absolute positioning |
| move it higher/lower | document order or natural spacing first |
| make it full width | container width and edge behaviour at each breakpoint |
| keep it visible at the top | sticky header or element; confirm if always-visible behaviour is truly desired |
| photo is too zoomed or cut off | aspect ratio, `object-fit`, focal position, and mobile crop |
| photo looks stretched | preserve intrinsic aspect ratio and remove forced distortion |
| make it pop | hierarchy, contrast, scale, or accent - not random decoration |
| cleaner, less busy | reduce competing emphasis, tighten hierarchy, and remove unnecessary decoration |
| more premium | improve rhythm, typography, alignment, and restraint while preserving brand character |
| it feels empty | adjust density or media scale; never invent copy |
| button | action link or actual button depending on behaviour |
| link is broken | destination, target behaviour, repeated copies, and accessible label |
| phone menu | mobile navigation toggle and open panel |
| make this match that | reuse the other view's established pattern and classes |

## Localization Order

When the target is unclear, use this order before asking:

1. Attached screenshot, selected file, or referenced page.
2. Exact visible words or image subject.
3. Page plus relative position: top, below the poster, last row, beside Tickets.
4. Existing component patterns and DOM inspection.
5. One plain question with visible choices.

Do not ask "Which div/class/component?"

## Responsive Defaults

- Assume a visible change applies to phone and computer layouts.
- Keep equivalent facts and actions consistent even when markup differs.
- At phone width, prefer a readable stack, comfortable tap targets, no sideways scrolling, and an intentional crop.
- At computer width, preserve hierarchy and avoid over-stretched text or imagery.
- If the user asks for a phone-only fix, verify the computer version remains unchanged.

## Ambiguity Ladder

- Low risk: infer and implement. Example: a small spacing adjustment in the named area.
- Medium risk: implement the most consistent existing pattern and show a preview.
- High impact: ask one visible choice. Example: "Should the image fill the whole box and crop a little, or show the whole image with empty space around it?"

When frustration is present, reduce choices rather than expanding the explanation.
