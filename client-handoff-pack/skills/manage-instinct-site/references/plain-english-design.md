# Plain-English Design Translation

Use this map internally. Do not ask clients to adopt the terms in the right column.

| What a client may say | Inspect or implement internally |
|---|---|
| top menu, bar at the top | header and primary navigation |
| big picture at the top (home) | the 3D opening on computers, the pre-rendered plates on phones: studio-side; on other pages, the page's poster or photo |
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

## The Scene Behind the Page

Every page sits on a lit concrete wall with ivy, lamps, fireflies and growing vines; on computers, pages slide along it. Many mood words describe that scene, which the studio maintains. First work out which layer the client means, from the page and any screenshot:

| What a client may say | Usually means | Who changes it |
|---|---|---|
| darker, moodier, brighter | the wall's light and haze | Studio |
| darker or lighter box, card, panel or text | the page's own colours in CSS | You |
| the glow, the light, the lamp, the spotlight | the lamps over headings and the room light | Studio |
| the sign, the big INSTINCT letters, the intro, the strike, the black at the start | the home opening (3D on computers, plates on phones) | Studio |
| more or fewer vines, leaves, plants, greenery | the ivy and growing vines | Studio |
| the bugs, the lights floating around, the sparks | the fireflies | Studio |
| the wall, the background, the concrete, the texture | the lit wall | Studio |
| the page slide, the swipe, the pan, the camera move | the page transition | Studio |
| the glowing button | a lit button: its words and link are yours, its glow is the studio's | Both |
| the photo looks dark or lit oddly | photos are lit like prints on the wall; crop and choice of photo are yours, the lighting is the studio's | Both |
| more space, bigger heading, move this box | page layout | You |
| a new section or block | page content: give it an `archive-section` with an `<h2>` so it gets a lamp | You |

For the studio's part: do not edit the rendering files, and do not fake the effect with new layers, overlays, filters, blurs or blend modes over the page (they also make scrolling stutter). Say once: "That is part of the site's lighting and animation system, which the studio looks after; I can pass your request on to them." Offer to write it down in the client's words, then do any part that is yours.

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
- The site picks computer or phone mode when a page loads (720px). After resizing across that width, reload before judging.
- Keep equivalent facts and actions consistent even when markup differs.
- At phone width, prefer a readable stack, comfortable tap targets, no sideways scrolling, and an intentional crop.
- At computer width, preserve hierarchy and avoid over-stretched text or imagery.
- If the user asks for a phone-only fix, verify the computer version remains unchanged.

## Ambiguity Ladder

- Low risk: infer and implement. Example: a small spacing adjustment in the named area.
- Medium risk: implement the most consistent existing pattern and show a preview.
- High impact: ask one visible choice. Example: "Should the image fill the whole box and crop a little, or show the whole image with empty space around it?"

When frustration is present, reduce choices rather than expanding the explanation.
